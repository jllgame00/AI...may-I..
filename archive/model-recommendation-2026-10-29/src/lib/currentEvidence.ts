import type { Model, ModelEvaluation, PlanModelMapping, RecommendationSnapshot, ScoringTask, FeatureId } from '../recommendationTypes'

export function evidenceForModel(model: Model | null, data: RecommendationSnapshot): ModelEvaluation[] {
  if (!model) return []
  return (data.evaluations ?? []).filter(e => e.modelId === model.id && e.modelVersion === model.version && e.source.url && e.source.checkedAt)
}
export function relevantEvidence(task: ScoringTask | 'image', text: string, required: FeatureId[], model: Model | null, mapping: PlanModelMapping, data: RecommendationSnapshot) {
  // An API release is not proof of a subscription entitlement. No evidence is
  // Model-reference evidence is separate from consumer plan entitlement.
  // Automatic routing cannot stand in for an exact model selection.
  if (!model || mapping.modelId!==model.id || mapping.selection==='automatic' || mapping.modelVersion!==model.version || (!mapping.modelReference && (!mapping.mode || !(model.modes ?? [model.reasoning]).includes(mapping.mode))) || !model.sources?.some(s=>s.url && s.checkedAt)) return []
  return evidenceForModel(model,data).filter(e => {
    if (e.rawScore === null || !Number.isFinite(e.rawScore)) return false
    if (task === 'coding') return e.domain === 'coding'
    if (task === 'writing' && e.domain === 'writing') return true
    if (e.domain === 'vision') return required.includes('imageInput') && !required.includes('imageGeneration')
    if (task !== 'analysis' || /설문|통계/.test(text)) return false
    if (e.domain === 'general') return !!e.index && /종합.*(모델|지수)|모델.*비교/.test(text)
    if (e.domain === 'math') return /수학|수리|경시|방정식/.test(text)
    if (e.domain === 'reasoning') return /추론|논리.*문제/.test(text)
    if (e.domain === 'knowledge') return /지식.*문제|상식.*문제/.test(text)
    if (e.domain === 'science') return /과학|물리|화학|생물|시뮬레이션|GPQA|연구.*(문제|실험)/i.test(text)
    if (e.domain === 'browsing') return /웹.*(검색|탐색|리서치)|정보.*탐색|브라우징/.test(text)
    if (e.domain === 'workflow') return /자동화|워크플로|업무.*실행/.test(text)
    return e.domain === 'factuality' && /사실|팩트|정확성/.test(text)
  })
}
export function compareEvaluationResults(a: ModelEvaluation, b: ModelEvaluation): { comparable: boolean; delta: number | null; reason: string } {
  if(a.modelId===b.modelId && a.modelVersion!==b.modelVersion)return {comparable:false,delta:null,reason:'동일 ID의 모델 릴리스 버전 다름'}
  if (a.rawScore === null || b.rawScore === null || !Number.isFinite(a.rawScore) || !Number.isFinite(b.rawScore)) return {comparable:false,delta:null,reason:'원점수 미확인'}
  if(a.evaluationType!==b.evaluationType)return {comparable:false,delta:null,reason:'모델 평가와 에이전트 구성 평가의 대상 다름'}
  if(JSON.stringify(a.index??null)!==JSON.stringify(b.index??null))return {comparable:false,delta:null,reason:'공식 지수의 이름·버전·구성·범위 다름'}
  if(a.evaluationType==='agent' && (!a.agentName || !b.agentName || !a.agentVersion || !b.agentVersion || a.agentName!==b.agentName || a.agentVersion!==b.agentVersion))return {comparable:false,delta:null,reason:'에이전트 이름·버전 미확인 또는 다름'}
  const fields = ['benchmark','benchmarkVersion','subset','unit','higherIsBetter','effort','tools','harness','environment','trials','fallbacks','evaluator'] as const
  for (const key of fields) {
    if (a[key] === null || b[key] === null || a[key] === '' || b[key] === '' || a[key] === '미공개' || b[key] === '미공개' || a[key] === '미확인' || b[key] === '미확인') return {comparable:false,delta:null,reason:`실행 조건 미확인: ${key}`}
    if (a[key] !== b[key]) return {comparable:false,delta:null,reason:`평가 조건 다름: ${key}`}
  }
  // Publication date is provenance, not an execution condition. Exact model
  // release matching happens before attachment; cross-model comparison is valid.
  return {comparable:true,delta:a.rawScore-b.rawScore,reason:'공개된 평가 버전·하위집합·실행 조건 일치. 오차·과제 적용 범위는 별도 확인.'}
}

export function mappingLabel(mapping: PlanModelMapping): string {
  return mapping.routeLabel ?? (mapping.routeKind === 'api' ? '개발자 API · 직접 실행' : mapping.routeKind === 'work' ? 'ChatGPT Work (웹)' : '개인 웹 채팅')
}
