import type { FeatureId, FeatureSupport, Model, Recommendation, RecommendationSnapshot, RequestInput, ScoringTask, ServicePlan } from '../recommendationTypes'
import { relevantEvidence } from './currentEvidence.ts'
import { featureLabels } from '../data/recommendationPolicy.ts'
import { accessOptions, accessOrder } from './modelAccess.ts'
import { hasSupportSource } from './taskReadiness.ts'

function accessDescriptor(model:Model):ServicePlan {
  const unknown:FeatureSupport={status:'unknown',note:'실행 경로의 기능·도구 권한 미확인',sources:[]}
  // UI compatibility descriptor, not a commercial plan or an entitlement mapping.
  return {id:`unassigned:${model.id}`,serviceId:'catalog',unassigned:true,name:'소비자 구독 플랜 연결 미확인',tier:'unknown',
    price:{amount:null,currency:null,period:null,region:'미확인'},features:{pdf:unknown,web:unknown,...model.nativeFeatures},
    limits:['소비자 서비스의 정확한 버전 선택·권한·사용 한도 미확인.',model.route?.note??'실행 경로 미확인'],
    freeScope:'무료 제공을 확인하지 않았습니다. 공개 가중치도 장비·호스팅 비용이 발생할 수 있습니다.',upgrade:'공식 문서에서 실행 환경·이용 약관·요금·한도를 직접 확인하세요.',sources:model.sources??[]}
}
export function catalogCandidates(task:ScoringTask|'image',request:RequestInput,required:FeatureId[],data:RecommendationSnapshot):Recommendation[] {
  return data.models.filter(m=>m.route && !data.mappings.some(p=>p.modelId===m.id)).flatMap(model=>{
    const reviewed=accessOptions(model).filter(r=>r.exactVersion==='confirmed'||(r.kind==='web'&&r.exactVersion==='unconfirmed'))
    const options=reviewed.length?reviewed.sort((a,b)=>['web','api','self-hosted'].indexOf(a.kind)-['web','api','self-hosted'].indexOf(b.kind)):[null]
    return options.map((selected,index)=>{
    const plan=accessDescriptor(model)
    if(selected?.kind==='web'){const unknown:FeatureSupport={status:'unknown',note:'이 웹 채팅 경로의 기능 근거 미확보',sources:[]};plan.features={pdf:unknown,web:unknown}}
    if(selected?.exactVersion==='confirmed')plan.limits=['정확한 버전의 경로 근거를 확인했으나 계정별 권한·요금·사용 한도·실제 실행은 별도 확인 대상입니다.',selected.note]
    if(required.some(f=>plan.features[f]?.status==='unsupported'&&hasSupportSource(plan.features[f])))return null
    const missing=required.filter(f=>plan.features[f]?.status!=='supported'||!plan.features[f]?.sources.some(s=>s.url&&s.checkedAt))
    const mapping={id:index?`model:${model.id}:access:${selected!.id}`:`model:${model.id}`,planId:plan.id,modelId:model.id,modelVersion:model.version,modelReference:true,status:selected?.exactVersion==='confirmed'?'confirmed' as const:'unknown' as const,selectable:selected?.exactVersion==='confirmed',selection:selected?'manual' as const:'unknown' as const,
      hostedModelId:selected?.hostedModelId,accessRouteId:selected?.id,
      mode:model.modes?.includes(model.reasoning)?model.reasoning:null,
      routeKind:selected?(selected.kind==='web'?'chat' as const:selected.kind):model.route!.kind==='unknown'?'unconfirmed' as const:model.route!.kind,
      routeLabel:selected?selected.label:model.route!.kind==='self-hosted'?'공식 가중치 · 자체 호스팅 (직접 설정)':model.route!.kind==='api'?'공식 API 문서 · 계정·요금 별도 확인':'실행 경로 미확인 · 공식 발표 참고',
      url:selected?.url??model.route!.url,note:`${selected?.note??model.route!.note} 소비자 구독 플랜으로의 연결은 별도 확인 대상입니다.`,sources:selected?.sources??model.sources??[]}
    const evidence=relevantEvidence(task,request.text,required,model,mapping,data)
    return {id:mapping.id,accessAlternative:index>0,service:{id:'catalog' as const,name:model.provider,subtitle:'정확한 모델 평가 · 소비자 플랜 연결 미확인',letter:model.provider[0]},plan,mapping,model,
      score:null,scores:{benchmark:null,features:missing.length?null:100},benchmarks:[],nearTie:false,status:'conditional' as const,eligibility:missing.length?'conditional' as const:'confirmed' as const,
      suitability:missing.length?'확인 후 선택' as const:'조건 비교 가능' as const,accessStatus:selected?.exactVersion==='confirmed'?'연결 근거 확인' as const:'연결 미확인' as const,
      holds:[...(selected?[selected.note]:[]),...missing.map(f=>`${featureLabels[f]}: 이 실행 경로의 지원·도구 권한 미확인`),'소비자 구독 플랜의 모델·버전·모드 선택 가능 여부 미확인',...(!evidence.length?['현재 작업에 직접 연결할 성능 근거 부족']:[])],evidence,
      reason:`${model.capabilities?.join(' · ')??'공식 모델 기능'}를 확인했습니다. ${evidence.length?'아래 작업 관련 평가를 참고하세요.':'직접 적용할 평가가 부족해 기능 조건으로 검토하는 후보입니다.'}`,
      evidenceNote:'원점수는 해당 버전·평가 설정에 한정됩니다. 에이전트 결과는 모델 단독 채팅 성능과 구분하며 소비자 플랜 제공을 뜻하지 않습니다.'}
    }).filter((c):c is NonNullable<typeof c>=>c!==null)
  })
}

export function configurationCandidates(candidates:Recommendation[]):Recommendation[] {
  const configs=new Map<string,Recommendation>()
  for(const c of [...candidates].sort((a,b)=>accessOrder(a)-accessOrder(b)))for(const e of c.evidence??[]) {
    if(e.evaluationType!=='agent')continue
    const id=`configuration:${e.id}`
    if(configs.has(id))continue
    const mode=(c.model?.modes??[]).includes(e.effort??'')?e.effort:null
    configs.set(id,{...c,id,configuration:e,mapping:{...c.mapping,id,mode,status:'unknown',selectable:false},evidence:[e],accessStatus:'연결 미확인',
      holds:['평가 실행 구성의 에이전트·버전·도구·환경 재현 및 접근 권한 별도 확인',...c.holds],
      reason:`${e.benchmark} ${e.benchmarkVersion}의 모델·도구 실행 구성을 검토하는 후보입니다. 일반 채팅 모델의 순위로 해석하지 마세요.`,
      evidenceNote:'평가에서 사용한 실행 구성입니다. 원문에 없는 에이전트 버전·환경은 미확인 상태이며 동일 결과의 재현을 보장하지 않습니다.'})
  }
  return [...configs.values()]
}
