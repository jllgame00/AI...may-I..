import { serviceById, taskLabels } from '../data/services.ts'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { featureLabels, POLICY_VERSION, scoreWeights, scoringTaskLabels, taskEvaluations } from '../data/recommendationPolicy.ts'
import type { Analysis, BenchmarkDetail, EvaluationConditions, FeatureId, FeatureSupport, PlanModelMapping, Recommendation, RecommendationSnapshot, RequestInput, ScoringTask, ServicePlan, TaskKind, WorkflowStep } from '../types'
export { scoreWeights } from '../data/recommendationPolicy.ts'

export function classifyTask(text: string): TaskKind {
  if (/또는|아니면|할까|\bor\b/i.test(text)) return 'unknown'
  if (/코딩|코드|개발|디버|버그|파이썬|python|react|typescript|javascript|프로그래밍/i.test(text)) return 'coding'
  if (/이미지|포스터|그림|일러스트|로고|사진|썸네일/.test(text)) return 'image'
  if (/연구|논문|자료|분석|리서치/.test(text)) return 'research'
  if (/요약|회의록|정리/.test(text)) return 'summary'
  if (/발표|대본|글|이메일|메일|편지|작성|써줘|써 줘|문장|초안/.test(text)) return 'writing'
  return 'unknown'
}
export function interpretRequest(text: string) {
  const kind = classifyTask(text)
  const tasks: ScoringTask[] = []
  if (kind !== 'unknown' && kind !== 'image') {
    if (/연구|논문|자료|분석|리서치|요약|회의록|정리/.test(text)) tasks.push('analysis')
    if (/코딩|코드|개발|디버|버그|파이썬|python|react|typescript|javascript|프로그래밍/i.test(text)) tasks.push('coding')
    if (/발표|대본|글쓰기|이메일|편지|문장|초안|글을|글의/.test(text) || kind === 'writing') tasks.push('writing')
  }
  const requiredFeatures: FeatureId[] = []
  // Suggestions remain editable: keywords cannot reliably resolve negation or optionality.
  if (/pdf/i.test(text) && !/pdf\s*(없이|필요\s*없|제외)/i.test(text)) requiredFeatures.push('pdf')
  if (/웹|검색|최신|인터넷/.test(text) && !/(검색|웹)\s*(없이|필요\s*없|제외)/.test(text)) requiredFeatures.push('web')
  if (/파일\s*(업로드|첨부)/.test(text) && !/첨부\s*없이/.test(text)) requiredFeatures.push('upload')
  if (/이미지\s*(입력|분석)|사진\s*분석/.test(text)) requiredFeatures.push('imageInput')
  if (/스프레드시트|엑셀|시트\s*분석/.test(text)) requiredFeatures.push('spreadsheet')
  if (/코드\s*실행|파이썬\s*실행/.test(text)) requiredFeatures.push('code')
  return { kind, tasks, requiredFeatures }
}

const conditionKeys: (keyof EvaluationConditions)[] = ['evaluationId', 'version', 'environment', 'agentVersion', 'evaluationMode', 'unit', 'higherIsBetter', 'evaluatedAt']
function benchmarkDetails(task: ScoringTask | 'image', modelId: string | null, data: RecommendationSnapshot): BenchmarkDetail[] {
  if (task === 'image') return []
  return taskEvaluations[task].map(slot => {
    // One canonical cohort per slot, shared by EVERY candidate. Per-model cohort
    // selection could rank independently normalized, incomparable scores together.
    const cohorts = data.cohorts.filter(c => c.evaluationId === slot.id)
    const cohort = cohorts.length === 1 ? cohorts[0] : null
    const base: BenchmarkDetail = { evaluationId: slot.id, label: slot.label, weight: slot.weight, normalized: null, observation: null, cohort, reason: `${slot.reason}: 비교 가능한 관측값 없음` }
    if (!cohort || modelId === null || !cohort.modelIds.includes(modelId) || !cohort.environment || !cohort.version || !cohort.evaluationMode || (slot.id === 'swe-verified' && !cohort.agentVersion) || new Set(cohort.modelIds).size < 2 || new Set(cohort.modelIds).size !== cohort.modelIds.length) return base
    const observations = cohort.modelIds.map(id => data.observations.filter(o => o.modelId === id && conditionKeys.every(k => o[k] === cohort[k])))
    // All members must be present exactly once. Never shrink the reference set around missing data.
    if (observations.some(rows => rows.length !== 1)) return { ...base, reason: `${slot.reason}: 비교 집합 누락·중복 또는 평가 조건 불일치` }
    const rows = observations.map(group => group[0])
    if (rows.some(o => o.rawScore === null || !Number.isFinite(o.rawScore) || o.composite || o.redistribution.status !== 'allowed' || !o.redistribution.licenseUrl || !o.source.url || !o.source.checkedAt || !data.models.some(m => m.id === o.modelId && m.version && m.reasoning && m.evaluationMode === o.evaluationMode))) {
      return { ...base, reason: `${slot.reason}: 원점수·모델·재배포 근거 부족 또는 종합 지수 혼입` }
    }
    const observation = rows.find(o => o.modelId === modelId)!
    const values = rows.map(o => o.rawScore as number)
    const min = Math.min(...values), max = Math.max(...values), value = observation.rawScore as number
    const normalized = min === max ? 50 : 100 * (cohort.higherIsBetter ? value - min : max - value) / (max - min)
    return { ...base, observation, normalized, reason: slot.reason }
  })
}
function costScore(plan: ServicePlan, budget: RequestInput['budget']): number | null {
  if (budget === 'unknown') return null
  if (plan.tier === 'free') return 100
  if (plan.price.amount === null || !Number.isFinite(plan.price.amount) || plan.price.amount <= 0 || !plan.price.currency || plan.price.period !== 'month') return null
  return budget === 'prefer-free' ? 50 : 100
}
export function featureSupport(plan: ServicePlan, feature: FeatureId): FeatureSupport {
  return plan.features[feature] ?? { status: 'unknown', note: '이 플랜·경로의 근거 미확보', sources: [] }
}
function unknownMapping(plan: ServicePlan): PlanModelMapping {
  return { id: `${plan.id}-unconfirmed`, planId: plan.id, modelId: null, status: 'unknown', selectable: false, mode: null, note: '정확한 모델·모드 연결 미확인', sources: [] }
}
export function recommendForTask(task: ScoringTask | 'image', request: RequestInput, required: FeatureId[], data: RecommendationSnapshot) {
  const excluded: WorkflowStep['excluded'] = []
  const recommendations: Recommendation[] = []
  for (const plan of data.plans) {
    const reasons: string[] = []
    if (request.budget === 'free' && plan.tier === 'paid') reasons.push('무료만 사용 조건: 유료 플랜 제외')
    if (request.maxKrw !== undefined && request.maxKrw !== null && plan.tier === 'paid' && plan.price.currency === 'KRW' && plan.price.period === 'month' && plan.price.amount !== null && plan.price.amount > request.maxKrw) reasons.push('확인된 한국 월 표시 가격이 원화 예산 상한을 초과합니다')
    for (const feature of required) if (featureSupport(plan, feature).status === 'unsupported') reasons.push(`${featureLabels[feature]} 공식 미지원`)
    if (reasons.length) { excluded.push({ plan, reasons }); continue }
    const mappings = data.mappings.filter(m => m.planId === plan.id)
    for (const mapping of mappings.length ? mappings : [unknownMapping(plan)]) {
      const model = data.models.find(m => m.id === mapping.modelId) ?? null
      const linked = mapping.status === 'confirmed' && mapping.selectable && !!mapping.mode && !!model?.version && model.reasoning === mapping.mode && mapping.sources.some(s => s.url && s.checkedAt)
      const benchmarks = benchmarkDetails(task, linked ? mapping.modelId : null, data)
      const missingFeatures = required.filter(f => featureSupport(plan, f).status !== 'supported' || !featureSupport(plan, f).sources.some(s => s.url && s.checkedAt))
      const holds = missingFeatures.map(f => `${featureLabels[f]}: ${featureSupport(plan, f).status === 'limited' ? '제한적 지원 · 이 작업이 제한 안에 드는지 미확인' : '플랜 지원 미확인'}`)
      if (!linked) holds.push('정확한 평가 모델·버전·선택 모드와 플랜 연결 미확인')
      const benchmark = benchmarks.length > 0 && benchmarks.every(b => b.normalized !== null) ? benchmarks.reduce((sum, b) => sum + b.normalized! * b.weight, 0) : null
      if (benchmark === null) holds.push(task === 'image' ? '이미지 기획은 이번 벤치마크 정책 대상 밖' : '작업별 비교 가능한 평가 또는 공개 이용 근거 부족')
      const features = missingFeatures.length ? null : 100
      const cost = costScore(plan, request.budget)
      if (cost === null) holds.push('월 구독료·통화·결제 주기 미확인')
      const priceHold = request.budget === 'unknown' || (plan.tier === 'paid' && (cost === null || !/한국/.test(plan.price.region) || plan.price.currency !== 'KRW' || /미확인/.test(plan.price.region)))
      if (priceHold) holds.push(request.budget === 'unknown' ? '예산 미정 · 무료만/무료 선호/유료 허용을 확정하지 않음' : '한국 결제 총액·세금·지역 조건을 확인한 뒤 선택하세요. 원화 예산 이내로 확정하지 않습니다.')
      const suitability: Recommendation['suitability'] = missingFeatures.length || priceHold ? '확인 후 선택' : '조건 비교 가능'
      const score = linked && benchmark !== null && features !== null && cost !== null ? Math.round((benchmark * scoreWeights.benchmark + features * scoreWeights.features + cost * scoreWeights.cost) * 10) / 10 : null
      const confirmed = required.filter(f => !missingFeatures.includes(f)).map(f => featureLabels[f])
      const label = task === 'image' ? '이미지 콘셉트·프롬프트 설계' : scoringTaskLabels[task]
      recommendations.push({
        id: mapping.id, service: serviceById[plan.serviceId], plan, mapping, model,
        score, scores: { benchmark, features, cost }, holds, benchmarks, nearTie: false,
        eligibility: missingFeatures.length || priceHold ? 'conditional' : 'confirmed', status: score === null ? 'conditional' : 'scored', suitability,
        reason: `${label} 단계입니다. ${confirmed.length ? `${confirmed.join('·')} 지원을 확인했습니다.` : required.length ? '필수 기능 지원을 먼저 확인하세요.' : '추가 필수 기능이 지정되지 않았습니다.'} ${score === null ? '성능 순위는 보류하고 기능·예산 조건으로 비교합니다.' : '이 작업의 개별 평가와 기능·예산 정책을 반영했습니다.'}`,
      })
    }
  }
  recommendations.sort((a, b) => {
    const status = Number(b.status === 'scored') - Number(a.status === 'scored') || Number(b.eligibility === 'confirmed') - Number(a.eligibility === 'confirmed')
    if (status) return status
    if (a.score !== null && b.score !== null && a.score !== b.score) return b.score - a.score
    return (request.budget === 'prefer-free' ? Number(a.plan.tier === 'paid') - Number(b.plan.tier === 'paid') : 0) || a.service.name.localeCompare(b.service.name, 'en') || a.plan.name.localeCompare(b.plan.name, 'en') || a.id.localeCompare(b.id, 'en')
  })
  for (const item of recommendations) item.nearTie = item.score !== null && recommendations.some(other => other.id !== item.id && other.score !== null && Math.abs(item.score! - other.score) <= 3)
  return { recommendations, excluded }
}

export function analyzeRequest(input: RequestInput, data: RecommendationSnapshot = recommendationSnapshot): Analysis {
  const text = input.text.trim()
  if (!text) throw new Error('어떤 작업을 하고 싶은지 입력해 주세요.')
  const interpreted = interpretRequest(text)
  const tasks = [...new Set(input.tasks ?? interpreted.tasks)]
  const image = input.tasks === undefined && interpreted.kind === 'image'
  const requiredFeatures = [...new Set(input.requiredFeatures ?? interpreted.requiredFeatures)]
  const request = { ...input, text, tasks: image ? undefined : tasks, requiredFeatures }
  const kind: TaskKind = image ? 'image' : tasks.length > 1 ? 'research' : tasks[0] === 'analysis' ? (interpreted.kind === 'summary' ? 'summary' : 'research') : tasks[0] ?? 'unknown'
  const workflow: WorkflowStep[] = []
  const add = (task: ScoringTask | 'image', title: string, description: string, output: string) => {
    // By default, file/search acquisition belongs to the first preparation stage.
    // Later stages use the user's verified summary. Explicit all-stage overrides remain possible.
    const stageFeatures = request.featureScope === 'all' || workflow.length === 0 ? requiredFeatures : requiredFeatures.filter(f => f === 'code' && task === 'coding')
    const candidates = recommendForTask(task, request, stageFeatures, data)
    const first = candidates.recommendations.find(r => r.suitability === '조건 비교 가능')
    workflow.push({ id: `step-${workflow.length + 1}`, kind: task, title, description, output, ...candidates, candidateId: first?.id ?? null, serviceId: first?.service.id ?? null })
  }
  if (image) add('image', '이미지 콘셉트와 생성 프롬프트 설계', '텍스트 기획만 진행하고 실제 이미지는 사용자가 지원 도구에서 생성합니다.', '콘셉트 · 문구 · 생성용 프롬프트')
  for (const task of tasks) {
    if (task === 'analysis') add(task, '자료 분석 · 핵심 요약 및 논점 추출', '원문의 핵심 주장·수치·출처와 미확인 사실을 구분합니다.', '자료별 요약 · 논점 · 출처 목록')
    else if (task === 'coding') add(task, '코드 작성 및 오류 검토', '요구사항·재현 조건을 정리하고 수정안과 검증 방법을 작성합니다.', '코드 · 실행 방법 · 검증 항목')
    else {
      add(task, /발표|대본/.test(text) ? '발표 구조 설계' : '독자와 글의 구조 정리', '대상 독자와 핵심 메시지, 지시사항을 정리합니다.', '개요 · 핵심 메시지')
      add(task, /발표|대본/.test(text) ? '발표 대본 작성' : '초안 작성과 표현 다듬기', '구조에 따라 초안을 쓰고 논리와 표현을 검토합니다.', '완성 초안 · 검토 항목')
    }
  }
  const recommendations = workflow[0]?.recommendations ?? []
  return {
    request, kind, label: image ? taskLabels.image : tasks.length ? tasks.map(t => scoringTaskLabels[t]).join(' → ') : taskLabels.unknown,
    features: requiredFeatures.map(f => featureLabels[f]), requiredFeatures, recommendations, workflow,
    conclusion: !workflow.length ? '작업을 확인한 뒤 추천을 시작해 주세요' : !recommendations.some(r => r.suitability === '조건 비교 가능') ? '조건 비교 가능한 후보가 없습니다 · 확인 후 선택할 수 있어요' : '입력한 조건으로 후보를 정리했어요',
    detail: !workflow.length ? '요청 수정에서 수행할 작업을 직접 선택하세요.' : !recommendations.length ? '제외 이유를 확인하세요. PDF 대신 텍스트 붙여 넣기, 웹 검색 대신 직접 제공한 출처 활용이 가능한지 검토한 뒤 조건을 수정하세요.' : '조건부 후보는 미확인 항목을 먼저 확인하세요. 표시 순서는 확실한 성능 우위를 의미하지 않습니다.',
    dataVersion: data.version, policyVersion: POLICY_VERSION, checkedAt: data.checkedAt, sources: data.sources,
    interpretationNotes: [input.tasks === undefined ? '키워드 기반 작업 제안입니다. 작업과 순서를 직접 수정할 수 있습니다.' : '사용자가 선택한 작업·순서를 반영했습니다.', ...(input.requiredFeatures === undefined && requiredFeatures.length ? ['기능은 키워드로 제안했습니다. 부정·선택적 표현이 있다면 필수 기능을 수정하세요.'] : [])],
  }
}
export function selectCandidate(steps: WorkflowStep[], stepId: string, candidateId: string): WorkflowStep[] {
  const target = steps.find(s => s.id === stepId)
  const candidate = target?.recommendations.find(r => r.id === candidateId)
  if (!candidate) throw new Error('현재 조건에서 선택할 수 없는 후보입니다.')
  if (target?.candidateId === candidateId) return steps
  const index = steps.findIndex(s => s.id === stepId)
  return steps.map((s, i) => s.id === stepId ? { ...s, candidateId, serviceId: candidate.service.id, needsReview: false } : i > index ? { ...s, needsReview: true } : s)
}
export function selectedCandidate(step: WorkflowStep | undefined): Recommendation | null {
  return step?.recommendations.find(r => r.id === step.candidateId) ?? null
}
export function candidateLabel(candidate: Recommendation): string {
  return `${candidate.service.name} · ${candidate.plan.name}${candidate.mapping.status === 'confirmed' && candidate.mapping.mode ? ` · ${candidate.model?.id ?? '모델 미확인'} (${candidate.mapping.mode})` : ' · 모델·모드 미확인'}`
}
