import type {Model,ModelEvaluation} from '../recommendationTypes'
export const AA_ENDPOINT='https://artificialanalysis.ai/api/v2/data/llms/models'
export const AA_FIELDS=['artificial_analysis_intelligence_index','artificial_analysis_coding_index','artificial_analysis_math_index','mmlu_pro','gpqa','hle','livecodebench','scicode','math_500','aime'] as const
export interface AACapture {endpoint:string;fetchedAt:string;payload:unknown}
interface AAMapping {aaId:string;creatorId:string;modelId:string;modelVersion:string;effort:string;identitySource:string}
interface AADefinition {field:string;benchmark:string;benchmarkVersion:string;domain:string;unit:string;higherIsBetter:boolean;scope:string;components:string[];versionSource:string}
export interface AAReview {mappings:AAMapping[];definitions:AADefinition[]}
export interface AAReviewed {observations:ModelEvaluation[];issues:string[];unmappedIds:string[];fetchedAt:string}
const object=(x:unknown):Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{}
const nonempty=(s:unknown):s is string=>typeof s==='string'&&!!s.trim()&&!['미확인','미공개','unknown'].includes(s)
const aaSource=(s:unknown):s is string=>typeof s==='string'&&/^https:\/\/artificialanalysis\.ai\//.test(s)
const metricDomains:Record<string,string>={artificial_analysis_intelligence_index:'general',artificial_analysis_coding_index:'coding',artificial_analysis_math_index:'math',mmlu_pro:'knowledge',gpqa:'science',hle:'reasoning',livecodebench:'coding',scicode:'coding',math_500:'math',aime:'math'}
const indexNames:Record<string,string>={artificial_analysis_intelligence_index:'Artificial Analysis Intelligence Index',artificial_analysis_coding_index:'Artificial Analysis Coding Index',artificial_analysis_math_index:'Artificial Analysis Math Index'}
const validDay=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s
const validInstant=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(s)&&validDay(s.slice(0,10))&&Number.isFinite(Date.parse(s))
function validAAObservation(e:ModelEvaluation,models:Model[]):boolean{
  if(!e||!e.aa)return false
  const a=e.aa,model=models.find(m=>m.id===e.modelId&&m.version===e.modelVersion)
  if(!model?.modes?.includes(e.effort??'')||e.effort!==a.effort||!nonempty(a.apiModelId)||!nonempty(a.creatorId)||!AA_FIELDS.includes(a.field as typeof AA_FIELDS[number]))return false
  if(e.id!==`aa:${a.apiModelId}:${a.field}:${a.benchmarkVersion}:${a.capturedAt}`)return false
  if(e.benchmark!==a.benchmark||e.benchmarkVersion!==a.benchmarkVersion||!nonempty(e.benchmarkVersion)||metricDomains[a.field]!==e.domain||!aaSource(a.versionSource)||!nonempty(a.scope))return false
  if(indexNames[a.field]&&e.benchmark!==indexNames[a.field])return false
  if(e.evaluationType!=='model'||typeof e.rawScore!=='number'||!Number.isFinite(e.rawScore)||typeof e.higherIsBetter!=='boolean'||!nonempty(e.unit)||e.kind!=='independent'||e.publisher!=='Artificial Analysis'||e.evaluator!=='Artificial Analysis')return false
  if(!aaSource(e.source?.url)||!validDay(e.source?.checkedAt)||!validInstant(a.capturedAt)||e.source.checkedAt!==a.capturedAt.slice(0,10))return false
  if(indexNames[a.field]&&(!e.index||e.index.name!==e.benchmark||e.index.version!==e.benchmarkVersion||e.index.scope!==a.scope||!Array.isArray(e.index.components)||!e.index.components.length||!e.index.components.every(nonempty)||JSON.stringify(e.index.components)!==JSON.stringify(a.components)))return false
  return true
}

// Pure local validation. Not imported by the browser; no credentials or network.
export function reviewAAResponse(capture:AACapture,review:AAReview,models:Model[]):AAReviewed {
  if(capture.endpoint!==AA_ENDPOINT||!validInstant(capture.fetchedAt))throw new Error('공식 API capture URL/실제 수집일 필요. 문서 예제를 실응답으로 대체할 수 없음.')
  const payload=object(capture.payload)
  if(payload.status!==200||!Array.isArray(payload.data))throw new Error('정상 AA API 응답 형식이 아님')
  const observations:ModelEvaluation[]=[],issues:string[]=[],unmappedIds:string[]=[]
  const seen=new Set<string>()
  for(const item of payload.data){
    const row=object(item),creator=object(row.model_creator),scores=object(row.evaluations)
    const mapping=review.mappings.find(m=>m.aaId===row.id)
    if(!mapping){if(typeof row.id==='string')unmappedIds.push(row.id);continue}
    const model=models.find(m=>m.id===mapping.modelId&&m.version===mapping.modelVersion)
    if(!model||creator.id!==mapping.creatorId||!aaSource(mapping.identitySource)||!model.modes?.includes(mapping.effort)){
      issues.push(`exact identity/configuration review failed: ${mapping.aaId}`);continue
    }
    for(const definition of review.definitions){
      const allowed=AA_FIELDS.includes(definition.field as typeof AA_FIELDS[number])
      const domains=['coding','factuality','workflow','browsing','vision','science','reasoning','math','knowledge','writing','general']
      if(!allowed||!nonempty(definition.benchmark)||!nonempty(definition.benchmarkVersion)||!nonempty(definition.unit)||!nonempty(definition.scope)||!aaSource(definition.versionSource)||!domains.includes(definition.domain)||metricDomains[definition.field]!==definition.domain||typeof definition.higherIsBetter!=='boolean'||!Array.isArray(definition.components)||!definition.components.every(nonempty)){
        issues.push(`metric/version/scope review failed: ${definition.field}`);continue
      }
      const composite=definition.field.startsWith('artificial_analysis_')
      if(composite&&!definition.components.length){issues.push(`composite components missing: ${definition.field}`);continue}
      // Official model coding index is not the Coding Agent Index; never rename it.
      if(/coding agent/i.test(definition.benchmark)){issues.push('Coding Agent Index is not documented by the LLM endpoint');continue}
      const value=scores[definition.field]
      if(typeof value!=='number'||!Number.isFinite(value)){issues.push(`missing numeric result: ${mapping.aaId}/${definition.field}`);continue}
      const id=`aa:${mapping.aaId}:${definition.field}:${definition.benchmarkVersion}:${capture.fetchedAt}`
      if(seen.has(id)){issues.push(`duplicate result: ${id}`);continue}seen.add(id)
      observations.push({id,modelId:model.id,modelVersion:model.version,benchmark:definition.benchmark,benchmarkVersion:definition.benchmarkVersion,
        aa:{field:definition.field,apiModelId:mapping.aaId,creatorId:mapping.creatorId,benchmark:definition.benchmark,benchmarkVersion:definition.benchmarkVersion,effort:mapping.effort,capturedAt:capture.fetchedAt,versionSource:definition.versionSource,scope:definition.scope,components:definition.components},
        subset:null,domain:definition.domain as ModelEvaluation['domain'],rawScore:value,unit:definition.unit,higherIsBetter:definition.higherIsBetter,effort:mapping.effort,
        evaluationType:'model',agentName:null,agentVersion:null,tools:null,harness:null,environment:null,trials:null,fallbacks:null,
        evaluator:'Artificial Analysis',publisher:'Artificial Analysis',kind:'independent',publishedAt:null,evaluatedAt:null,
        source:{url:mapping.identitySource,checkedAt:capture.fetchedAt.slice(0,10),scope:`API ${definition.field}; stable id ${mapping.aaId}; version source ${definition.versionSource}`},
        limitations:`${definition.scope} 실제 평가일·미공개 실행 환경은 추정하지 않음. API 모델 종합/구성 평가는 일반 채팅 성공률이 아님. 구성 평가와 합산하지 않음.`,
        terms:'Source: Artificial Analysis (artificialanalysis.ai). 공개 원점수 반영은 구조화 표시와 모델 선택 안내 사용 범위를 허용하는 별도 근거 검토 후 수행. AA의 제품 보증·추천을 뜻하지 않음.',
        ...(composite?{index:{name:definition.benchmark,version:definition.benchmarkVersion,components:definition.components,scope:definition.scope}}:{})})
    }
  }
  const valid=observations.filter(e=>validAAObservation(e,models))
  if(valid.length!==observations.length)issues.push('public metric identity/configuration validation failed')
  return {observations:valid,issues,unmappedIds,fetchedAt:capture.fetchedAt}
}
export function publicAAObservations(snapshot:unknown,models:Model[],today=new Date().toISOString().slice(0,10)):ModelEvaluation[]{
  const s=object(snapshot),auth=object(s.authorization)
  if(s.schemaVersion!==1||s.status!=='reviewed'||!validDay(s.reviewedAt)||s.reviewedAt>today||auth.modelSelectionGuidance!==true||auth.structuredPublicDisplay!==true||!nonempty(auth.reference)||!validDay(auth.expiresAt)||auth.expiresAt<today||!Array.isArray(s.observations))return []
  const seen=new Set<string>()
  return (s.observations as ModelEvaluation[]).filter(e=>{if(!validAAObservation(e,models)||e.source.checkedAt>today||seen.has(e.id))return false;seen.add(e.id);return true})
}
export function authorizeAAPublication(reviewed:AAReviewed,rights:unknown,today=new Date().toISOString().slice(0,10)){
  const r=object(rights)
  if(r.modelSelectionGuidance!==true||r.structuredPublicDisplay!==true||!nonempty(r.reference)||!validDay(r.reviewedAt)||r.reviewedAt>today||!validDay(r.expiresAt)||r.expiresAt<today)throw new Error('AA §2.4(c,d)·§2.5의 이 제품/구조화 공개 허용 범위 및 유효기간 검토 필요. API 키·일반 출처 표기와 별개.')
  return {schemaVersion:1,status:'reviewed',reviewedAt:r.reviewedAt,authorization:{modelSelectionGuidance:true,structuredPublicDisplay:true,expiresAt:r.expiresAt,reference:r.reference},
    scope:'이 카탈로그의 정확한 릴리스·설정에 연결하고 검증한 일부 관측만 포함. AA 전체 모델 순위나 전체 결과가 아님.',quarantined:reviewed.issues.length,unmapped:reviewed.unmappedIds.length,
    attribution:'Source: Artificial Analysis (artificialanalysis.ai)',attributionUrl:'https://artificialanalysis.ai/',observations:reviewed.observations}
}
