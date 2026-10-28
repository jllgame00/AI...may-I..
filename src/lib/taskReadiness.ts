import type { CandidateAssessment, FeatureId, FeatureSupport, Recommendation } from '../recommendationTypes'

export function hasSupportSource(support:FeatureSupport|undefined):boolean {
  return !!support?.sources.some(s=>s.url&&s.checkedAt)
}
export function candidateFeatureSupport(c:Recommendation,feature:FeatureId):FeatureSupport|undefined {
  return c.mapping.features?.[feature]??c.plan.features[feature]
}
export function exactWebModel(c:Recommendation):boolean {
  return ['chat','work'].includes(c.mapping.routeKind??'') && c.accessStatus==='연결 근거 확인' &&
    c.mapping.status==='confirmed' && c.mapping.selectable && c.mapping.selection==='manual' && !!c.model &&
    c.mapping.modelId===c.model.id && c.mapping.modelVersion===c.model.version && c.mapping.sources.some(s=>s.url&&s.checkedAt)
}
// An all-required-conditions gate, never a feature count or benchmark score.
export function taskReady(c:Recommendation,required:FeatureId[]):boolean {
  return c.inputStatus!=='unknown' && exactWebModel(c) && required.every(f=>c.plan.features[f]?.status==='supported'&&hasSupportSource(c.plan.features[f]))
}
export function assessCandidate(c:Recommendation,required:FeatureId[],rank:number|null=null):CandidateAssessment {
  const supported=required.filter(f=>c.plan.features[f]?.status==='supported'&&hasSupportSource(c.plan.features[f]))
  const pending=required.filter(f=>!supported.includes(f))
  const unsupported=pending.some(f=>c.plan.features[f]?.status==='unsupported'&&hasSupportSource(c.plan.features[f]))
  const exact=exactWebModel(c)
  const web=c.plan.webAccess
  const service=!!web&&web.status==='confirmed'&&web.routeKind===c.mapping.routeKind&&c.mapping.url===web.url&&web.sources.some(s=>s.url&&s.checkedAt)
  return {
    input:{status:c.inputStatus??'confirmed'},
    features:{status:unsupported?'unsupported':pending.length?'needs-check':'confirmed',supported,pending},
    model:{status:exact?'confirmed':'unknown',mode:c.mapping.mode&&(c.model?.modes??[c.model?.reasoning]).includes(c.mapping.mode)?'confirmed':'unknown'},
    route:{status:exact||service?'confirmed':'unknown',scope:exact?'model':'service'},
    performance:{status:c.model&&rank!==null?'comparable':'unconfirmed',rank:c.model?rank:null},
    account:{status:'unchecked',checks:[...new Set([...(c.plan.accountChecks??[]),...(c.mapping.accountChecks??[]),'사용할 계정의 모델·도구 활성화와 남은 사용량을 확인하세요.'])]},
    start:candidateGroup(c,required),
  }
}
export function candidateGroup(c:Recommendation,required:FeatureId[]):'ready'|'model-check'|'needs-check' {
  return c.inputStatus==='unknown'?'needs-check':taskReady(c,required)?'ready':!c.model?'model-check':'needs-check'
}
export function neutralCandidateOrder(a:Recommendation,b:Recommendation):number {
  return (a.model?.name??a.model?.id??`${a.service.name} ${a.plan.name}`).localeCompare(b.model?.name??b.model?.id??`${b.service.name} ${b.plan.name}`,'en',{numeric:true}) || a.id.localeCompare(b.id,'en')
}
export function taskCandidateOrder(a:Recommendation,b:Recommendation,required:FeatureId[]):number {
  const groups=['ready','model-check','needs-check']
  return groups.indexOf(candidateGroup(a,required))-groups.indexOf(candidateGroup(b,required)) || neutralCandidateOrder(a,b)
}
