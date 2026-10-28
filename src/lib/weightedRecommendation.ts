import { collectComparisonSets, validObservations } from './evidenceComparisons.ts'
import { primaryAccessCandidates } from './modelAccess.ts'
import { codingMetricFit, inferCodingIntent } from './codingIntent.ts'
import { candidateFeatureSupport, neutralCandidateOrder } from './taskReadiness.ts'
import { featureSupportForTask } from './featureConstraints.ts'
import type { CodingIntent, FeatureId, FeatureSupport, Model, ModelEvaluation, Recommendation, RecommendationSnapshot, ScoringTask, Source, TaskScoreComponent, TaskScoreScope, WeightedTaskDecision, WeightedTaskRow } from '../recommendationTypes'

export const TASK_SCORE_POLICY_VERSION='task-specific-evidence-v2'
const featureNames:Record<FeatureId,string>={upload:'파일 첨부 용도',spreadsheet:'시트 자료 분석·처리 용도',code:'계산·코드 실행 용도',pdf:'PDF 처리 용도',web:'웹 검색 용도',imageInput:'이미지 입력 용도',imageGeneration:'이미지 생성 용도'}
export function taskScoreScope(task:ScoringTask,text:string,intent:CodingIntent|null):TaskScoreScope {
  if(task==='coding')return {profile:`coding-${intent??'unspecified'}`}
  if(task==='analysis')return {profile:/설문|통계|상관|표준편차/.test(text)?'survey':'analysis'}
  return {profile:'writing',language:/영어로|영문|in English/i.test(text)?'en':'ko',genre:/홍보|모집|광고/.test(text)?'promotional':/소설|창작|시를|시 작성/.test(text)?'creative':/이메일|메일|편지/.test(text)?'email':/보고서/.test(text)?'report':'general'}
}
const sourced=(s:Source)=>/^https:\/\//.test(s.url)&&!!s.checkedAt
const isWeb=(c:Recommendation)=>c.mapping.routeKind==='chat'||c.mapping.routeKind==='work'
function fallback(model:Model):Recommendation {
  const unknown:FeatureSupport={status:'unknown',note:'이 경로의 웹 도구 지원 미확인',sources:[]},id=`reference:${model.id}@${model.version}`
  return {id,model,service:{id:'catalog',name:model.provider,subtitle:'모델 근거 · 경로 별도 확인',letter:model.provider[0]??'?'},
    plan:{id,name:'실행 경로 미확인',serviceId:'catalog',unassigned:true,tier:'unknown',price:{amount:null,currency:null,period:null,region:'미확인'},features:{pdf:unknown,web:unknown},limits:[],freeScope:'미확인',upgrade:'미확인',sources:[]},
    mapping:{id,planId:id,modelId:model.id,modelVersion:model.version,modelReference:true,status:'unknown',selectable:false,mode:null,selection:'unknown',routeKind:'unconfirmed',note:'작업 근거와 실제 실행 경로를 따로 확인하세요.',sources:[]},score:null,scores:{benchmark:null,features:null},benchmarks:[],nearTie:false,status:'conditional',eligibility:'conditional',suitability:'필수 정보 부족',accessStatus:'연결 미확인',reason:'이용 경로 별도 확인',holds:[]}
}
function documentedPurpose(model:Model,task:ScoringTask,scope:TaskScoreScope,evaluations:ModelEvaluation[]):FeatureSupport {
  // Optional exact-release reviews can add explicit negative/limited evidence;
  // their absence is not a new mandatory scoring field.
  const reviews=(model.taskEvidence??[]).filter(e=>e.modelId===model.id&&e.modelVersion===model.version&&e.scope.profile===scope.profile&&e.scope.language===scope.language&&e.scope.genre===scope.genre&&e.purpose.sources.some(sourced))
  if(reviews.length===1)return reviews[0].purpose
  if(reviews.length>1)return {status:'unknown',note:'같은 범위의 용도 검토가 중복되어 확인 필요',sources:[]}
  const sources=(model.sources??[]).filter(s=>sourced(s)&&!/요금|가격|pricing/i.test(`${s.scope??''} ${s.url}`))
  const pattern=task==='coding'?/코드.*(?:출력|생성|작성)|코딩|프로그래밍/:/텍스트.*(?:출력|생성|작업)|text.*(?:output|generation)/i
  const statement=model.capabilities?.find(c=>pattern.test(c))
  if(statement&&sources.length)return {status:'supported',note:`공식 모델 설명: ${statement}. ${task==='coding'?'코드 작업':'텍스트 초안 작업'}에 적용하는 용도 판단이며 작업 품질을 측정한 점수가 아닙니다.`,sources}
  if(task==='coding'){
    const official=evaluations.filter(e=>e.modelId===model.id&&e.modelVersion===model.version&&e.domain==='coding'&&e.kind==='provider'&&sourced(e.source))
    if(official.length)return {status:'supported',note:'공식 공개 코딩 과제 기록으로 코드 작업 용도를 확인합니다. 서로 다른 평가 원점수를 대신 합산하지 않습니다.',sources:official.map(e=>e.source)}
  }
  return {status:'unknown',note:'현재 저장된 공식 설명에서 명시적인 생성·출력·작업 용도를 확인하지 못했습니다. 입력 모달리티·모델 이름만으로 출력 품질을 추정하지 않습니다.',sources}
}
function directScope(e:ModelEvaluation,scope:TaskScoreScope,intent:CodingIntent|null):boolean {
  if(e.taskScope&&(e.taskScope.profile!==scope.profile||e.taskScope.language!==scope.language||e.taskScope.genre!==scope.genre))return false
  if(scope.profile.startsWith('coding-'))return e.domain==='coding'&&!!intent&&(!!e.taskScope||codingMetricFit(e.benchmark,intent).value===4)
  return !!e.taskScope&&(scope.profile==='writing'?e.domain==='writing':e.domain===(scope.profile==='survey'?'statistics':'analysis'))
}

export function weightedTaskRecommendations(task:ScoringTask,text:string,required:FeatureId[],candidates:Recommendation[],data:RecommendationSnapshot,references:Recommendation[]=[],intent:CodingIntent|null=task==='coding'?inferCodingIntent(text):null):WeightedTaskDecision {
  const scope=taskScoreScope(task,text,intent),choices=new Map<string,Recommendation>()
  for(const list of [candidates,references])for(const c of primaryAccessCandidates(list,required))if(c.model&&!choices.has(c.model.id))choices.set(c.model.id,c)
  const models=new Map(data.models.map(m=>[m.id,choices.get(m.id)?.model?.version===m.version?choices.get(m.id)!:fallback(m)]))
  const observations=validObservations(data.evaluations??[]).filter(e=>models.get(e.modelId)?.model?.version===e.modelVersion)
  const direct=observations.filter(e=>directScope(e,scope,intent))
  const groups=collectComparisonSets(direct,references,models,intent)
  const cohort=groups.find(g=>task==='coding'?g.fit===4:g.kind==='same-conditions')??null
  const mode=cohort?'benchmark' as const:'functional' as const
  // Define the whole rubric ONCE per task, not by each candidate's omissions.
  // These criteria combine documented functionality and its official use; no
  // separate empty purpose/quality component is introduced.
  const features=[...new Set(required)]
  const base=(f:FeatureId)=>f==='upload'?1:2
  const total=features.reduce((sum,f)=>sum+base(f),0)
  const criteria:WeightedTaskDecision['criteria']=mode==='benchmark'?[]:features.length?features.map(id=>({id,label:featureNames[id],weight:base(id)/total,rule:'공식 기능·용도와 작업 조건을 대조합니다. 제한 안이면 충족, 벗어나면 불충족, 필요한 조건이 미확인이면 조건부로 판정합니다.'})):[{id:task==='coding'?'code-purpose':'text-purpose',label:task==='coding'?'공식 코드 작업 용도':'공식 텍스트 생성·출력 용도',weight:1,rule:'날짜가 있는 공식 모델 출처와 명시적인 생성·출력·작업 설명을 확인합니다. 한국어·장르의 실측 품질은 판정 항목으로 만들지 않습니다.'}]
  const rows:WeightedTaskRow[]=data.models.map(model=>{
    const candidate=models.get(model.id)!,entry=cohort?.entries.find(e=>e.candidate.model?.id===model.id)
    const evidence=observations.filter(e=>e.modelId===model.id&&(directScope(e,scope,intent)||(task==='coding'?e.domain==='coding':task==='writing'?e.domain==='writing':['math','reasoning'].includes(e.domain)))).map(e=>({evaluation:e,relevance:directScope(e,scope,intent)?'direct' as const:'indirect' as const,reason:directScope(e,scope,intent)?'작업에 관련된 원점수 기록입니다. 표시된 모델·에이전트 구성과 출처 비교 집합 범위에서만 해석합니다.':'다른 작업·설정의 참고 기록이며 현재 작업의 직접 성능 점수로 대입하지 않습니다.'}))
    evidence.sort((a,b)=>a.evaluation.benchmark.localeCompare(b.evaluation.benchmark,'en')||a.evaluation.id.localeCompare(b.evaluation.id,'en'))
    if(mode==='benchmark')return {candidate,judgment:entry?'recommended':'needs-check',basis:entry?'benchmark':'none',reason:entry?`${cohort!.benchmark} ${cohort!.version} 출처 비교 집합의 ${entry.tied?'공동 ':''}${entry.rank}위입니다.`:'현재 작업의 공통 비교 집합 밖입니다. 성능이 낮다는 뜻은 아닙니다.',score:null,rank:entry?.rank??null,tied:entry?.tied??false,coverage:entry?100:0,components:[],gaps:entry?[]:['같은 작업·버전·설정의 비교 자료 미확인'],evaluation:entry?.evaluation??null,evidence} satisfies WeightedTaskRow
    const purpose=documentedPurpose(model,task,scope,observations)
    const components:TaskScoreComponent[]=criteria.map(criterion=>{
      const support=criterion.id==='text-purpose'||criterion.id==='code-purpose'?purpose:isWeb(candidate)?candidateFeatureSupport(candidate,criterion.id as FeatureId):undefined
      const resolved=featureSupportForTask(support,criterion.id,text)
      const status=resolved.status
      const value=status==='supported'?100:status==='unsupported'?0:null
      return {...criterion,status,declaredStatus:resolved.declaredStatus,checks:resolved.checks,value,contribution:value===null?null:value*criterion.weight,reason:resolved.note,sources:resolved.sources}
    })
    const statuses=components.map(c=>c.status)
    const judgment=statuses.includes('unsupported')?'unsupported':statuses.includes('unknown')?'needs-check':statuses.includes('limited')?'conditional':'recommended'
    const score=components.every(c=>c.value!==null)?components.reduce((n,c)=>n+c.contribution!,0):null
    const coverage=Math.round(100*components.reduce((n,c)=>n+(c.status==='unknown'?0:c.weight),0))
    const gaps=components.filter(c=>c.status!=='supported').map(c=>`${c.label}: ${c.status==='limited'?'제한적 지원':c.status==='unsupported'?'미지원 확인':'미확인'} · ${c.reason}`)
    const unresolved=components.flatMap(c=>c.checks??[]).filter(c=>c.result!=='met').map(c=>c.condition)
    return {candidate,judgment,basis:'functional',reason:judgment==='recommended'?features.length?'요청한 필수 기능과 해당 공식 활용 범위를 확인했습니다.':'공식 설명에서 요청문을 작성할 텍스트·코드 작업 용도를 확인했습니다.':judgment==='conditional'?`조건부 추천: ${unresolved.join(' · ')}`:judgment==='unsupported'?unresolved.length?`작업 조건이 확인된 제한을 벗어납니다: ${unresolved.join(' · ')}`:'요청한 필수 기능의 미지원이 확인된 경로입니다.':'필수 기능 또는 공식 용도 근거를 추가로 확인해야 합니다.',score,rank:null,tied:false,coverage,components,gaps,evaluation:null,evidence} satisfies WeightedTaskRow
  })
  if(mode==='functional'){
    const recommended=rows.filter(r=>r.judgment==='recommended')
    for(const r of recommended){r.rank=1+recommended.filter(other=>other.score!>r.score!).length;r.tied=recommended.filter(other=>other.score===r.score).length>1}
  }
  const order={recommended:0,conditional:1,'needs-check':2,unsupported:3}
  rows.sort((a,b)=>order[a.judgment]-order[b.judgment]||(a.rank??Infinity)-(b.rank??Infinity)||neutralCandidateOrder(a.candidate,b.candidate))
  const explanation=mode==='benchmark'?`${cohort!.benchmark} ${cohort!.version} · ${cohort!.publisher}의 ${cohort!.modelCount}개 모델/구성 비교를 활용합니다. 원점수와 해당 집합 안의 순위이며 자체 가중 점수나 현재 웹의 성공률이 아닙니다. ${cohort!.limitation}`:features.length?'공식 기능·용도의 지원 범위로 판단합니다. 내부 가중치는 파일 첨부 1, 나머지 필수 처리 기능 2의 비율로 이 작업 전체에 공통 적용합니다. 제한 조건과 요청이 모두 확인되면 범위 안은 충족, 범위 밖은 불충족이며, 필요한 조건이 미확인이면 조건부입니다. 후보별로 가중치를 재분배하지 않습니다. 내부 가중합은 실측 성능이나 통계 정확도가 아닙니다.':'공식적인 생성·출력·작업 용도 하나를 내부 100% 기준으로 사용합니다. 확인되는 기능·용도에 따른 공동 추천이며 실측 성능이나 한국어·장르 품질 순위는 아닙니다. 확인되지 않은 품질 항목을 새 필수 조건으로 만들지 않습니다.'
  return {policyVersion:TASK_SCORE_POLICY_VERSION,scope,mode,criteria,cohort,rows,explanation}
}
