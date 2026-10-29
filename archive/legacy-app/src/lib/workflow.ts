import { chatkhuEnvironment } from '../data/executionEnvironments.ts'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { candidateLabel, recommendForTask, selectedCandidate } from './recommend.ts'
import { dependentStepIds, stepContract } from './decompose.ts'
import type { ExecutionEnvironment, ExecutionModel, FeatureId, RequestInput, StepDefinition, WorkflowStep } from '../types'
export { decomposeRequest, stepKindLabels } from './decompose.ts'

const dated = (sources: ExecutionModel['sources']) => sources.some(s => !!s.url && !!s.checkedAt)
export function executionChoices(step: WorkflowStep, environment: ExecutionEnvironment = chatkhuEnvironment) {
  return environment.models.filter(m => m.environmentId === environment.id).map(model => {
    const selectable = model.availability.status === 'supported' && dated(model.availability.sources) && dated(model.sources) && !!model.modelId && !!model.version && !!model.mode && !!model.route
    const missing = step.requiredFeatures.filter(f => model.capabilities[f]?.status !== 'supported' || !dated(model.capabilities[f]?.sources ?? []))
    const unsupported = step.requiredFeatures.some(f => model.capabilities[f]?.status === 'unsupported')
    return { model, selectable: selectable && !unsupported, suitability: unsupported ? '확인된 조건 불일치' : selectable && !missing.length && step.kind !== 'unknown' ? '조건 비교 가능' : '확인 후 선택',
      reason: `${selectable ? '이 환경의 모델·버전·모드·경로 선택 근거 확인' : '모델·버전·모드·경로 또는 선택 가능 근거 미확인'}${missing.length ? ` · 필수 도구 ${missing.join(', ')} 미확인/제한적` : ' · 별도 필수 도구 미확인 없음'}. 품질 순위가 아닙니다.` }
  }).sort((a,b) => a.model.modelId.localeCompare(b.model.modelId) || (a.model.version ?? '').localeCompare(b.model.version ?? '') || (a.model.mode ?? '').localeCompare(b.model.mode ?? ''))
}
export function executionDescription(step: WorkflowStep, environment: ExecutionEnvironment = chatkhuEnvironment) {
  if (step.environmentId === 'consumer-web') {
    const c = selectedCandidate(step)
    return { label: `일반 소비자 웹 서비스 · ${c ? candidateLabel(c) : '플랜·모델 연결 미확인'}`, route: c?.plan.route ?? '서비스·플랜·경로 미선택', model: null, url: null, notes: c ? [...c.holds,...c.plan.limits] : ['일반 서비스 목록은 ChatKHU에서 실행 가능하다는 근거가 아닙니다.'] }
  }
  const choice = executionChoices(step,environment).find(c => c.model.id === step.executionModelId)
  const model = choice?.selectable ? choice.model : null
  return { label: model ? `${environment.name} · ${model.modelId} · 버전 ${model.version} · 모드 ${model.mode}` : `${environment.name} · 모델·버전·모드·도구 연결 미확인`,
    route: model?.route ?? 'ChatKHU 내 실제 이용 경로 미확인', model, url: environment.url,
    notes: [environment.note, ...(choice ? [choice.reason] : ['실제 모델 목록이 없어 현재 모델 후보를 추천·선택할 수 없습니다. 일반 단계 초안만 준비합니다.'])] }
}
export function setExecutionEnvironment(steps: WorkflowStep[], id: string, environmentId: WorkflowStep['environmentId']): WorkflowStep[] {
  const target = steps.find(s => s.id === id)
  if (!target) throw new Error('없는 작업 단계입니다.')
  if (target.environmentId === environmentId) return steps
  const dependent = dependentStepIds(steps,id)
  return steps.map(s => s.id === id ? { ...s, environmentId, userRunStatus: 'not-run', needsReview: true } : dependent.has(s.id) ? { ...s, needsReview: true } : s)
}
export function selectExecutionModel(steps: WorkflowStep[], id: string, modelId: string, environment: ExecutionEnvironment = chatkhuEnvironment): WorkflowStep[] {
  const target = steps.find(s => s.id === id)
  if (!target || !executionChoices(target,environment).some(c => c.model.id === modelId && c.selectable)) throw new Error('실제 선택 가능한 모델·모드 근거가 없습니다.')
  if (target.executionModelId === modelId && target.environmentId === 'chatkhu') return steps
  const dependent = dependentStepIds(steps,id)
  return steps.map(s => s.id === id ? { ...s, environmentId: 'chatkhu', executionModelId: modelId, userRunStatus: 'not-run', needsReview: true } : dependent.has(s.id) ? { ...s, needsReview: true } : s)
}
export function editWorkflowStep(steps: WorkflowStep[], id: string, patch: Partial<Pick<StepDefinition,'title'|'kind'|'output'>>, request: RequestInput): WorkflowStep[] {
  const target = steps.find(s => s.id === id)
  if (!target) throw new Error('없는 작업 단계입니다.')
  const dependent = dependentStepIds(steps,id)
  let next = { ...target, ...patch, origin: 'user' as const, needsReview: true, userRunStatus: 'not-run' as const }
  if (patch.kind && patch.kind !== target.kind) {
    const contract = stepContract(patch.kind)
    const required: FeatureId[] = target.requiredFeatures.filter(f => f !== 'imageGeneration')
    if (patch.kind === 'image-generation') required.push('imageGeneration')
    const candidates = patch.kind === 'unknown' ? { recommendations: [], excluded: [] } : recommendForTask(patch.kind === 'outline' ? 'writing' : patch.kind,request,required,recommendationSnapshot)
    next = { ...next, ...contract, title: patch.title ?? contract.title, output: patch.output ?? contract.output, requiredFeatures: required, ...candidates, candidateId: null, serviceId: null, executionModelId: null }
  }
  return steps.map(s => s.id === id ? next : dependent.has(s.id) ? { ...s, needsReview: true } : s)
}
