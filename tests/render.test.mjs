import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

registerHooks({
  resolve(specifier,context,next) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) for (const extension of ['.ts','.tsx']) {
      const url = new URL(specifier+extension,context.parentURL)
      if (existsSync(fileURLToPath(url))) return next(url.href,context)
    }
    return next(specifier,context)
  },
  load(url,context,next) {
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url),'utf8'),{ compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText }
    return next(url,context)
  },
})
const { default: App } = await import('../src/App.tsx')
const { default: Editor } = await import('../src/components/PromptEditor.tsx')
const { default: Fields } = await import('../src/components/ConditionFields.tsx')
const noop = () => {}
it('starts with the exact brand, editable task, budget and analysis action', () => {
  const html = renderToStaticMarkup(createElement(App))
  assert.match(html,/AI\.\.may I\.\.\?/); assert.match(html,/요청 분석하고 AI 비교하기/)
  assert.match(html,/<textarea[^>]+id="request-text"/)
  assert.match(html,/무료만 사용/); assert.match(html,/결과 품질 우선/)
  assert.doesNotMatch(html,/Super Agent|progressbar|자동 실행 완료/)
})
it('renders preserved edits, stale-condition warning and previous draft recovery', () => {
  const html = renderToStaticMarkup(createElement(Editor,{ template: { id: 'main', title: '기본 프롬프트', text: '새 조건 초안' }, draft: { text: '직접 작성한 내용', context: 'old', previous: { text: '이전', context: 'older' } }, context: 'new', onChange: noop, primary: true }))
  assert.match(html,/직접 작성한 내용/); assert.match(html,/아직 반영되지/); assert.match(html,/이전 초안 복구/)
  assert.doesNotMatch(html,/새 조건 초안<\/textarea>/)
})
it('disables copy for unresolved placeholders and offers explicit acknowledgment', () => {
  const html = renderToStaticMarkup(createElement(Editor,{ template: { id: 'main', title: '기본 프롬프트', text: '[자료]' }, draft: { text: '[자료]', context: 'a', previous: null }, context: 'a', onChange: noop }))
  assert.match(html,/직접 채울 부분 1개/); assert.match(html,/빈칸을 확인했어요/)
  assert.match(html,/<button[^>]+id="copy-main"[^>]+disabled=""/)
})
it('condition edits emit only the requested field rather than freezing all inference', () => {
  let change
  const request = { text: '대학생에게 5분 발표 대본', overrides: {} }
  const tree = Fields({ request, fields: ['length'], onChange: (field,value) => { change = [field,value] } })
  const label = tree.props.children[0]
  const input = label.props.children[1]
  input.props.onChange({ target: { value: '3분' } })
  assert.deepEqual(change,['length','3분'])
  assert.deepEqual(request.overrides,{})
})
