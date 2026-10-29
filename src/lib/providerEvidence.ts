import { EVIDENCE_FEATURES } from '../evaluationTypes.ts'
import type { CostCondition, EvidenceCell, EvidenceFeature, EvidenceRegister, FeatureClaim } from '../evaluationTypes'
import type { ProviderCatalog, ProviderPlan } from '../providerTypes'
import { validEvidenceDate, validEvidenceURL } from './providerValidation.ts'

export const validHttps=validEvidenceURL
export function validateEvidenceRegister(data:EvidenceRegister,catalog:ProviderCatalog,asOf=new Date().toISOString().slice(0,10)):string[]{
  const errors:string[]=[]
  if(!data||!data.version||!Array.isArray(data.sources)||!Array.isArray(data.claims))return ['invalid evidence register schema']
  for(const rows of [data.sources,data.claims])if(new Set(rows.map(r=>r.id)).size!==rows.length)errors.push('duplicate evidence record')
  for(const s of data.sources){
    if(!catalog.services.some(service=>service.id===s.serviceId))errors.push(`invalid source service scope ${s.id}`)
    if(!validHttps(s.url))errors.push(`invalid source URL ${s.id}`)
    if(!validEvidenceDate(s.attemptedAt,asOf)||(s.checkedAt!==null&&!validEvidenceDate(s.checkedAt,asOf))||(s.checkedAt!==null&&s.checkedAt>s.attemptedAt))errors.push(`invalid source date ${s.id}`)
    if(!['official-product','official-pricing','official-help','experiment','external-evaluation'].includes(s.sourceType)||!['read','no-content','failed'].includes(s.access))errors.push(`invalid source type/access ${s.id}`)
    if((s.access==='read')!==(s.checkedAt!==null)||!s.observation?.trim())errors.push(`invalid source observation ${s.id}`)
  }
  for(const c of data.claims){
    const service=catalog.services.find(s=>s.id===c.serviceId)
    if(!service||service.providerId!==c.providerId||(c.scope==='service'&&c.planId!==null)||(c.scope==='route'&&!catalog.plans.some(p=>p.id===c.planId&&p.serviceId===c.serviceId))||!['service','route'].includes(c.scope)||c.channel!=='web')errors.push(`invalid claim scope ${c.id}`)
    if(!EVIDENCE_FEATURES.includes(c.featureId)||!['supported','limited','unsupported','unknown'].includes(c.status))errors.push(`invalid feature/status ${c.id}`)
    if(!['reviewed','unverified'].includes(c.verification)||!c.region||!Array.isArray(c.limitations)||!Array.isArray(c.sourceIds))errors.push(`invalid claim metadata ${c.id}`)
    const sources=data.sources.filter(s=>c.sourceIds.includes(s.id))
    if(sources.length!==new Set(c.sourceIds).size)errors.push(`missing source ${c.id}`)
    if(sources.some(s=>s.serviceId!==c.serviceId))errors.push(`invalid source service scope ${c.id}`)
    if(c.status!=='unknown'&&(c.verification!=='reviewed'||!sources.length||sources.some(s=>s.access!=='read'||!s.checkedAt)))errors.push(`unverified support claim ${c.id}`)
    if(c.status==='unknown'&&!c.unknownReason?.trim())errors.push(`missing unknown reason ${c.id}`)
    if(c.status==='limited'&&!c.limitations.length)errors.push(`missing limitations ${c.id}`)
  }
  return errors
}

export function resolveFeature(data:EvidenceRegister,serviceId:string,planId:string|null,featureId:EvidenceFeature,region='unspecified'):EvidenceCell{
  const matches=data.claims.filter(c=>c.serviceId===serviceId&&c.planId===planId&&c.featureId===featureId&&c.channel==='web'&&c.region===region)
  const verified=matches.filter(c=>c.verification==='reviewed'&&c.sourceIds.length&&c.sourceIds.every(id=>data.sources.some(s=>s.id===id&&s.serviceId===c.serviceId&&s.access==='read'&&s.checkedAt)))
  const sources=data.sources.filter(s=>matches.some(c=>c.sourceIds.includes(s.id)))
  const base:FeatureClaim=matches[0]??{id:`${serviceId}:${planId??'service'}:${featureId}`,providerId:'',serviceId,planId,scope:planId?'route':'service',channel:'web',featureId,status:'unknown',sourceIds:[],region,limitations:[],verification:'unverified',unknownReason:'No reviewed evidence for this exact scope; research required.'}
  if(!verified.length||new Set(verified.map(c=>c.status)).size!==1)return {...base,status:'unknown',verification:'unverified',unknownReason:verified.length?'Conflicting evidence; manual review required.':base.unknownReason??'No reviewed readable source for this scope.',sources}
  return {...verified[0],limitations:[...new Set(verified.flatMap(c=>c.limitations))],sourceIds:sources.map(s=>s.id),sources}
}

export function evidenceMatrix(data:EvidenceRegister,catalog:ProviderCatalog):EvidenceCell[]{
  return catalog.services.flatMap(service=>[null,...catalog.plans.filter(p=>p.serviceId===service.id).map(p=>p.id)].flatMap(planId=>EVIDENCE_FEATURES.map(featureId=>({...resolveFeature(data,service.id,planId,featureId),providerId:service.providerId}))))
}

export function costCondition(plan:ProviderPlan,required:EvidenceFeature[],data:EvidenceRegister,catalog:ProviderCatalog,budgetMismatch=false):CostCondition{
  if(budgetMismatch)return 'budget-mismatch'
  const cells=required.map(id=>resolveFeature(data,plan.serviceId,plan.id,id))
  if(!cells.length||cells.some(c=>c.status==='unknown'||c.status==='unsupported'))return 'unknown'
  if(plan.tier==='paid')return 'paid-required'
  const free=plan.tier==='free'&&plan.price.amount===0&&plan.price.evidenceIds.some(id=>catalog.evidence.some(e=>e.id===id&&e.verification==='reviewed'&&e.serviceId===plan.serviceId&&e.planIds.includes(plan.id)))
  return free?(cells.some(c=>c.status==='limited')||plan.limits.length>0?'free-with-limits':'free-available'):'unknown'
}
