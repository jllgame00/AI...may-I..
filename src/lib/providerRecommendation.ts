import { providerCatalog } from '../data/providerCatalog.ts'
import { PROVIDER_POLICY, capabilityLabels } from '../data/providerPolicy.ts'
import { analyzeRequirements } from './providerRequirements.ts'
import { validateCatalog } from './providerValidation.ts'
import { normalizeRequest } from './request.ts'
import type { CapabilityCheck, CapabilityId, Evidence, PlanAssessment, ProviderCatalog, ProviderComparison, ProviderPlan, ProviderRecommendation, ProviderRequirements, WorkRequirement } from '../providerTypes'
import type { PromptRequest } from '../types'
const uniqueEvidence=(rows:Evidence[])=>[...new Map(rows.map(e=>[e.id,e])).values()]
function evidenceFor(ids:string[],plan:ProviderPlan,data:ProviderCatalog):Evidence[] {return data.evidence.filter(e=>ids.includes(e.id)&&e.verification==='reviewed'&&e.serviceId===plan.serviceId&&e.planIds.includes(plan.id))}
function check(id:CapabilityId,plan:ProviderPlan,req:ProviderRequirements,data:ProviderCatalog):CapabilityCheck {
  const cap=plan.capabilities[id],evidence=evidenceFor(cap?.evidenceIds??[],plan,data)
  let status=cap?.status??'unknown',note=cap?.note??'이 서비스·플랜 기능의 공식 근거 미확보'
  if(!evidence.length)status='unknown'
  if(cap&&evidence.length&&status!=='unknown'&&status!=='unsupported'){
    const formats=id==='fileUpload'?req.inputFormats:['spreadsheetAnalysis'].includes(id)?req.inputFormats.filter(f=>['xlsx','xls','csv'].includes(f)):[]
    let unresolved=formats.some(f=>!cap.formats?.includes(f))
    if(unresolved){status='limited';note+=' · 요청 형식의 구체적 지원 근거를 확인해야 합니다.'}
    const quantities=[['maxFileSizeMB',req.bounds.fileSizeMB],['maxFiles',req.bounds.fileCount],['maxRows',req.bounds.rowCount],['maxItems',req.bounds.itemCount]] as const
    const limits=quantities.filter(([key])=>cap.limits?.[key]!==undefined)
    const relevant=id==='fileUpload'?['maxFileSizeMB','maxFiles']:id==='spreadsheetAnalysis'?['maxRows']:id==='imageGeneration'||id==='videoGeneration'?['maxItems']:[]
    if(quantities.some(([key,value])=>relevant.includes(key)&&value!==null&&cap.limits?.[key]===undefined)){unresolved=true;status='limited';note+=' · 명시한 처리량에 대한 용량 근거가 부족합니다.'}
    if(limits.some(([key,value])=>value!==null&&value>cap.limits![key]!)){status='unsupported';note+=' · 요청 분량이 확인된 제한을 넘습니다.'}
    else if(status==='limited'&&!unresolved&&limits.length&&limits.every(([,value])=>value!==null)&&!cap.conditions?.length){status='supported';note+=' · 명시한 요청은 확인된 제한 안입니다.'}
  }
  return {id,status,declaredStatus:cap?.status??'unknown',note,evidence}
}
function budgetCheck(plan:ProviderPlan,req:ProviderRequirements,data:ProviderCatalog):{status:PlanAssessment['budgetStatus'];note:string} {
  const b=req.budget,p=plan.price,proof=evidenceFor(p.evidenceIds,plan,data).length>0
  if(b.freeOnly===true){if(plan.tier==='paid')return {status:'unmet',note:'무료 필수 조건과 유료 플랜 불일치'};if(plan.tier!=='free'||p.amount!==0||!proof)return {status:'unknown',note:'이 플랜의 무료 제공 근거 미확인'}}
  if(b.maxMonthly!==null){
    if(plan.tier==='free'&&p.amount===0&&proof)return {status:'met',note:'확인된 무료 플랜 · 사용량/기능 제한 별도'}
    if(!proof||p.amount===null||p.period!=='month'||!b.currency||p.currency!==b.currency||!p.country||!b.country||p.country!==b.country||p.taxIncluded!==true)return {status:'unknown',note:'월 결제 총액·통화·국가·세금의 비교 근거 부족 (환율 변환 없음)'}
    if(p.amount>b.maxMonthly)return {status:'unmet',note:'확인된 월 결제 총액이 예산 초과'}
  }
  return {status:'met',note:b.freeOnly===null&&b.maxMonthly===null?'예산 미정 · 비용 우열을 판단하지 않음':'제시된 예산 조건에 불일치 없음'}
}
function assess(req:ProviderRequirements,data:ProviderCatalog,required:CapabilityId[]):PlanAssessment[] {
  return data.plans.map(plan=>{
    const service=data.services.find(s=>s.id===plan.serviceId)!,provider=data.providers.find(p=>p.id===service.providerId)!,checks=required.map(c=>check(c,plan,req,data)),preferredChecks=req.preferred.map(c=>check(c,plan,req,data)),budget=budgetCheck(plan,req,data)
    const status=checks.some(c=>c.status==='unsupported')||budget.status==='unmet'?'excluded':!required.length||checks.some(c=>c.status!=='supported')||budget.status==='unknown'?'conditional':'eligible'
    const evidence=uniqueEvidence([...checks.flatMap(c=>c.evidence),...preferredChecks.flatMap(c=>c.evidence),...evidenceFor(plan.evidenceIds,plan,data),...evidenceFor(plan.price.evidenceIds,plan,data)])
    return {id:plan.id,provider,service,plan,status,checks,preferredChecks,budgetStatus:budget.status,gaps:[...checks.filter(c=>c.status!=='supported').map(c=>`${capabilityLabels[c.id]}: ${c.status==='unsupported'?'조건 불일치':c.status==='limited'?'제한 확인 필요':'미확인'} · ${c.note}`),...(budget.status!=='met'?[budget.note]:[]),...(!required.length?['작업 목표·필수 기능 미정']:[])],strengths:checks.filter(c=>c.status==='supported').map(c=>capabilityLabels[c.id]),evidence}
  })
}
const statusOrder={eligible:0,conditional:1,excluded:2}
const confirmedFree=(o:PlanAssessment)=>o.plan.tier==='free'&&o.plan.price.amount===0&&o.plan.price.evidenceIds.some(id=>o.evidence.some(e=>e.id===id&&e.serviceId===o.service.id&&e.planIds.includes(o.id)&&e.verification==='reviewed'))
function groupCompanies(options:PlanAssessment[],preferFree=false):ProviderRecommendation[] {
  const ids=[...new Set(options.map(o=>o.provider.id))]
  return ids.map(id=>{
    const choices=options.filter(o=>o.provider.id===id).sort((a,b)=>statusOrder[a.status]-statusOrder[b.status]||a.checks.filter(c=>c.status!=='supported').length-b.checks.filter(c=>c.status!=='supported').length||(preferFree?Number(!confirmedFree(a))-Number(!confirmedFree(b)):0)||b.preferredChecks.filter(c=>c.status==='supported').length-a.preferredChecks.filter(c=>c.status==='supported').length||Number(a.plan.tier!=='free')-Number(b.plan.tier!=='free')||a.id.localeCompare(b.id,'en'))
    const option=choices[0]
    return {...option,alternatives:choices.slice(1),reason:option.status==='eligible'?'이 서비스·플랜에서 요청한 필수 기능과 예산 조건을 확인했습니다. 개인 계정의 활성화·남은 사용량은 직접 확인하세요.':option.status==='conditional'?'필수 기능·플랜 또는 예산의 미확인 조건을 먼저 확인하세요.':'확인된 필수 조건과 맞지 않아 이 작업의 우선 추천에서 제외합니다.'}
  }).sort((a,b)=>(preferFree?Number(!confirmedFree(a))-Number(!confirmedFree(b)):0)||a.provider.name.localeCompare(b.provider.name,'en'))
}
function optionsForWork(work:WorkRequirement,req:ProviderRequirements,data:ProviderCatalog=providerCatalog):PlanAssessment[]{return assess(req,data,work.required)}
export function compareProviders(request:PromptRequest,data:ProviderCatalog=providerCatalog):ProviderComparison {
  request=normalizeRequest(request)
  const errors=validateCatalog(data);if(errors.length)throw new Error(`회사 데이터 검증 실패: ${errors.join('; ')}`)
  const requirements=analyzeRequirements(request),allOptions=assess(requirements,data,requirements.required),preferFree=requirements.budget.preferFree===true&&requirements.budget.freeOnly!==true,companies=groupCompanies(allOptions,preferFree),eligible=companies.filter(c=>c.status==='eligible')
  return {context:JSON.stringify(request),policyVersion:PROVIDER_POLICY.version,dataVersion:data.version,requirements,recommendations:eligible.slice(0,PROVIDER_POLICY.maxFeatured),remaining:eligible.slice(PROVIDER_POLICY.maxFeatured),conditional:companies.filter(c=>c.status==='conditional'),excluded:companies.filter(c=>c.status==='excluded'),byWork:Object.fromEntries(requirements.works.map(work=>[work.id,groupCompanies(optionsForWork(work,requirements,data),preferFree)])),allOptions}
}
