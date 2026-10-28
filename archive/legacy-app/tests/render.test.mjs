// Server rendering verifies our empty/evidence UI contracts, not browser layout or interactions.
import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      for (const extension of ['.ts', '.tsx']) {
        const url = new URL(specifier + extension, context.parentURL)
        if (existsSync(fileURLToPath(url))) return next(url.href, context)
      }
    }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText }
    return next(url, context)
  },
})
const { analyzeRequest, selectCandidate } = await import('../src/lib/recommend.ts')
const { fixture } = await import('../src/lib/fixtures/recommendation.ts')
const { default: Dashboard } = await import('../src/components/RecommendationDashboard.tsx')
const { default: Workflow } = await import('../src/components/WorkflowBuilder.tsx')
const { default: Prompts } = await import('../src/components/PromptPanel.tsx')
const { default: RequestForm } = await import('../src/components/RequestForm.tsx')
const { default: ConditionPanel } = await import('../src/components/ConditionPanel.tsx')
const { default: Catalog, initialCatalog } = await import('../src/components/ServiceCatalog.tsx')
const { resolveConditions } = await import('../src/lib/taskSession.ts')
const { catalogById } = await import('../src/data/catalog.ts')
const { ModelEvaluationReferenceView } = await import('../src/components/ModelEvaluationReference.tsx')
const { modelEvidenceFixture } = await import('../src/lib/fixtures/modelEvidence.ts')
const noop = () => {}
const request = { text: '자료 분석', budget: 'free', priority: 'quality', tasks: ['analysis'], requiredFeatures: ['pdf'] }
function dashboard(analysis, steps = analysis.workflow) {
  return renderToStaticMarkup(createElement(Dashboard, { analysis, steps, activeStepId: steps[0]?.id ?? '', onStep: noop, onEdit: noop, onPrompt: noop, onWorkflow: noop }))
}
function prompts(analysis, workflow, selected) {
  return renderToStaticMarkup(createElement(Prompts, { analysis, workflow, selected, activeStepId: workflow[0]?.id ?? '', onStep: noop, onCandidate: noop, onSelect: noop, onWorkflow: noop, onEdit: noop }))
}
it('renders missing evidence honestly without NaN, zero substitute or verified badge', () => {
  const html = dashboard(analyzeRequest(request))
  assert.match(html, /점수 보류/); assert.match(html, /추천 근거 보기/); assert.match(html, /PDF 업로드/)
  assert.match(html, /2026-10-21/); assert.doesNotMatch(html, /NaN|검증 완료|MVP 예시 데이터/)
})
it('renders no-candidate results, workflow and disabled prompt copy', () => {
  const data = fixture(); data.plans.forEach(p => { p.features.pdf.status = 'unsupported' })
  const analysis = analyzeRequest(request, data)
  assert.match(dashboard(analysis), /후보가 없습니다/)
  assert.match(renderToStaticMarkup(createElement(Workflow, { analysis, steps: analysis.workflow, onChange: noop, onBack: noop, onPrompts: noop })), /조건에 맞는 후보 없음/)
  const html = prompts(analysis, analysis.workflow, 'chatgpt')
  assert.match(html, /후보가 없습니다/); assert.match(html, /<button[^>]*disabled=""[^>]*>.*?프롬프트 복사/s)
})
it('renders ambiguous requests and an editable interpretation', () => {
  const draft = { text: '도와줘', budget: 'free', priority: 'quality' }
  assert.match(dashboard(analyzeRequest(draft)), /작업 확인이 필요/)
  const html = renderToStaticMarkup(createElement(RequestForm, { draft, onChange: noop, onSubmit: noop }))
  assert.match(html, /작업이 명확하지 않습니다/); assert.match(html, /type="checkbox"/)
})
it('shows the same manually chosen candidate in card, prompt and usage guidance', () => {
  const analysis = analyzeRequest(request, fixture())
  const workflow = selectCandidate(analysis.workflow, analysis.workflow[0].id, 'choice-1')
  const html = prompts(analysis, workflow, 'gemini')
  assert.match(html, /Gemini · Test Free/); assert.match(html, /test-b \(standard\)/); assert.match(html, /fixture limit/)
  assert.match(dashboard(analysis, workflow), /현재 선택 · 변경 가능/)
  const reset = analyzeRequest({ ...request, text: '코딩', tasks: ['coding'] }, fixture())
  assert.match(prompts(reset, reset.workflow, 'chatgpt'), /코드 작성 및 오류 검토/)
  assert.doesNotMatch(prompts(reset, reset.workflow, 'chatgpt'), /자료 분석 · 핵심 요약/)
})
it('renders historical model evidence even when every plan mapping is unknown', () => {
  const analysis = analyzeRequest(request)
  const html = renderToStaticMarkup(createElement(ModelEvaluationReferenceView, { snapshot: modelEvidenceFixture(), candidates: analysis.recommendations }))
  assert.match(html, /2025년 공개 투표 데이터 재분석 · 현재 모델 순위를 의미하지 않습니다/)
  assert.match(html, /historical-b-2025/)
  assert.match(html, /1080\.0.*1120\.0/s)
  assert.match(html, /CC-BY-4.0/)
  assert.match(html, /플랜 연결 미확인/)
  assert.match(html, /추론 설정.*미제공/s)
  assert.doesNotMatch(html, /현재 글쓰기 순위|검증 완료/)
})
it('renders missing model snapshot and disconnected groups without a shared rank', () => {
  const empty = renderToStaticMarkup(createElement(ModelEvaluationReferenceView, { snapshot: null, candidates: [] }))
  assert.match(empty, /모델 평가 스냅샷을 사용할 수 없습니다/)
  assert.match(dashboard(analyzeRequest(request)), /모델 평가 참고/)
  const data = modelEvidenceFixture()
  const group = structuredClone(data.components[0]); group.id = 'component-2'
  group.modelIds = ['old-C','old-D']; group.models.forEach((m, i) => { m.id = group.modelIds[i] })
  data.components.push(group)
  const html = renderToStaticMarkup(createElement(ModelEvaluationReferenceView, { snapshot: data, candidates: [] }))
  assert.match(html, /component-1/); assert.match(html, /component-2/)
  assert.match(html, /집단 간 점수는 비교할 수 없습니다/)
  assert.doesNotMatch(html, /<th[^>]*>순위/)
})
it('offers generic editable preparation for registered services without inventing a plan', () => {
  const html = renderToStaticMarkup(createElement(Prompts, { analysis: null, workflow: [], selected: 'chatgpt', activeStepId: '', onStep: noop, onCandidate: noop, onSelect: noop, onWorkflow: noop, onEdit: noop, exploration: { service: catalogById.kimi } }))
  assert.match(html,/Kimi/); assert.match(html,/플랜 미확인/)
  assert.match(html,/textarea[^>]+id="prompt-editor"/)
  assert.match(html,/직접 붙여넣어/); assert.match(html,/공식 서비스 열기/)
  assert.doesNotMatch(html,/Kimi · Free|맞춤 검증 완료/)
})
it('renders custom edits with a context conflict and previous draft recovery', () => {
  const a = analyzeRequest(request,fixture())
  const html = renderToStaticMarkup(createElement(Prompts, { analysis: a, workflow: a.workflow, selected: 'chatgpt', activeStepId: a.workflow[0].id, onStep: noop, onCandidate: noop, onSelect: noop, onWorkflow: noop, onEdit: noop, drafts: { 'step-1': { text: '사용자가 편집한 초안', context: 'previous-context', previous: { text: '이전 초안', context: 'older' } } } }))
  assert.match(html,/사용자가 편집한 초안/); assert.match(html,/아직 반영되지/); assert.match(html,/이전 초안 복구/)
})
it('retains only the manually edited field when answering a missing PDF question', () => {
  const raw = { text: '무료 PDF 논문 요약', budget: 'unknown', budgetSource: 'inferred', priority: 'quality' }
  let changed
  const tree = ConditionPanel({ draft: resolveConditions(raw), rawDraft: raw, questions: ['pdfType'], onChange: value => { changed = value }, onContinue: noop, onBack: noop })
  function* elements(node) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { for (const child of node) yield* elements(child); return }
    yield node
    yield* elements(node.props?.children)
  }
  const select = [...elements(tree)].find(node => node.type === 'select')
  select.props.onChange({ target: { value: 'text' } })
  assert.equal(changed.pdfType,'text'); assert.equal(changed.tasks,undefined); assert.equal(changed.requiredFeatures,undefined)
  assert.deepEqual(resolveConditions({ ...changed, text: '무료 python 코드 디버깅' }).tasks,['coding'])
})
it('renders unknown catalog details without a synthetic comparison option', () => {
  const html = renderToStaticMarkup(createElement(Catalog, { state: { ...initialCatalog, query: 'Kimi', detail: 'kimi' }, onChange: noop, onPrepare: noop, onTask: noop }))
  assert.match(html,/가상 무료 플랜을 만들지 않았습니다/)
  assert.doesNotMatch(html,/Kimi · Free/)
})
