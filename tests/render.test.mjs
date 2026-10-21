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
