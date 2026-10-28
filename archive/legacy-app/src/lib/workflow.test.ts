import { it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeRequest, selectCandidate } from './recommend.ts'
import { decomposeRequest, editWorkflowStep, setExecutionEnvironment, selectExecutionModel, executionChoices, executionDescription } from './workflow.ts'
import { buildStagePrompt, stagePromptContext } from './prompts.ts'
import { chatkhuEnvironment } from '../data/executionEnvironments.ts'
import { regenerateDraft, updateDraft } from './taskSession.ts'
import type { ExecutionEnvironment } from '../types'
const request = { text: '논문을 분석해서 발표 이미지와 대본을 만들어줘', budget: 'free' as const, priority: 'quality' as const }

it('decomposes requested outputs with dependencies and marks suggested structure', () => {
  const steps = decomposeRequest(request)
  assert.deepEqual(steps.map(s => s.kind),['analysis','outline','image-generation','writing'])
  assert.equal(steps[1].origin,'suggested')
  assert.equal(steps[2].origin,'request')
  assert.ok(steps[3].dependencies.includes(steps[2].id))
  assert.match(steps[2].output,/이미지 파일/)
  assert.ok(steps[0].handoff.some(s => s.includes('출처')))
})
it('does not add document, outline, image or script stages to a simple email', () => {
  assert.deepEqual(decomposeRequest({ ...request, text: '고객에게 환영 이메일을 써줘' }).map(s => s.kind),['writing'])
  assert.deepEqual(decomposeRequest({ ...request, text: 'Python 코드 오류를 고쳐줘' }).map(s => s.kind),['coding'])
})
it('distinguishes image generation from image planning and leaves ambiguous work editable', () => {
  assert.equal(decomposeRequest({ ...request, text: '포스터 이미지를 생성해줘' })[0].kind,'image-generation')
  assert.equal(decomposeRequest({ ...request, text: '이미지 생성용 프롬프트만 작성해줘' })[0].kind,'image')
  assert.equal(decomposeRequest({ ...request, text: '도와줘' })[0].kind,'unknown')
  assert.equal(analyzeRequest({ ...request, text: '도와줘' }).decompositionStatus,'draft')
})
it('keeps ChatKHU models empty rather than inferring them from consumer plans', () => {
  const a = analyzeRequest(request)
  assert.equal(chatkhuEnvironment.models.length,0)
  assert.ok(a.workflow.every(s => s.environmentId === 'chatkhu' && s.executionModelId === null))
  assert.deepEqual(executionChoices(a.workflow[0],chatkhuEnvironment),[])
  assert.match(executionDescription(a.workflow[0],chatkhuEnvironment).label,/연결 미확인/)
})
function environment(): ExecutionEnvironment {
  const source = { url: 'https://example.test/manual-evidence', checkedAt: '2026-10-28' }
  return { id: 'chatkhu', name: 'ChatKHU', url: null, note: 'synthetic test only', models: [
    { id: 'test-mode-a', modelId: 'test-model', version: 'v1', mode: 'standard', environmentId: 'chatkhu', route: 'test ChatKHU UI', plan: null, availability: { status: 'supported', note: 'fixture', sources: [source] }, capabilities: {}, sources: [source] },
    { id: 'test-mode-b', modelId: 'test-model', version: 'v1', mode: 'reasoning', environmentId: 'chatkhu', route: 'test ChatKHU UI', plan: null, availability: { status: 'supported', note: 'fixture', sources: [source] }, capabilities: {}, sources: [source] },
  ] }
}
it('keeps model/mode choices stage-local and invalidates dependent preparation only', () => {
  const a = analyzeRequest({ ...request, requiredFeatures: [] })
  const registry = environment()
  const one = selectExecutionModel(a.workflow,a.workflow[0].id,'test-mode-a',registry)
  const two = selectExecutionModel(one,one[1].id,'test-mode-b',registry)
  assert.equal(two[0].executionModelId,'test-mode-a')
  assert.equal(two[1].executionModelId,'test-mode-b')
  assert.equal(two[2].needsReview,true)
  assert.throws(() => selectExecutionModel(two,two[0].id,'fake-model',registry))
  assert.notEqual(executionDescription(two[0],registry).label,executionDescription(two[1],registry).label)
})
it('does not call unknown image tools supported even for an available model', () => {
  const step = analyzeRequest(request).workflow.find(s => s.kind === 'image-generation')!
  assert.ok(executionChoices(step,environment()).every(c => c.suitability !== '조건 비교 가능'))
  assert.ok(step.recommendations.every(c => c.suitability !== '조건 비교 가능'))
})
it('connects the selected stage model, mode, output, handoff and prompt without filling prior results', () => {
  const a = analyzeRequest({ ...request, requiredFeatures: [] })
  const steps = selectExecutionModel(a.workflow,a.workflow[1].id,'test-mode-b',environment())
  const prompt = buildStagePrompt(a,steps,steps[1].id,environment())
  assert.match(prompt,/test-model/); assert.match(prompt,/reasoning/); assert.match(prompt,/ChatKHU/)
  assert.match(prompt,/앞 단계에서確認/)
  assert.ok(prompt.includes(steps[1].output))
  assert.doesNotMatch(prompt,/Plus|최고 모델|자동 실행 완료/)
})
it('marks dependent stages on edits but preserves unrelated choices and user drafts', () => {
  const a = analyzeRequest(request)
  const before = stagePromptContext(a,a.workflow,a.workflow[0].id)
  const changed = editWorkflowStep(a.workflow,a.workflow[0].id,{ title: '근거만 분석', output: '핵심 주장 표' },a.request)
  assert.equal(changed[0].title,'근거만 분석'); assert.equal(changed[0].origin,'user')
  assert.ok(changed.slice(1).every(s => s.needsReview))
  assert.equal(changed[1].executionModelId,a.workflow[1].executionModelId)
  const edited = updateDraft({ text: 'initial', context: before, previous: null },'사용자 편집 초안')
  assert.notEqual(edited.context,stagePromptContext(a,changed,changed[0].id))
  assert.equal(edited.text,'사용자 편집 초안')
  assert.equal(regenerateDraft(edited,'new', 'new-context').previous?.text,'사용자 편집 초안')
})
it('keeps consumer service selection distinct from ChatKHU and from other stages', () => {
  const a = analyzeRequest(request)
  const steps = setExecutionEnvironment(a.workflow,a.workflow[0].id,'consumer-web')
  const changed = selectCandidate(steps,steps[0].id,steps[0].recommendations[0].id)
  assert.equal(changed[0].environmentId,'consumer-web')
  assert.equal(changed[1].environmentId,'chatkhu')
  assert.match(buildStagePrompt(a,changed,changed[0].id),/일반 소비자 웹 서비스/)
})
