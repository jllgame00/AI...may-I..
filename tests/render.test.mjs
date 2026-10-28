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
const { default: Comparison,planPrice } = await import('../src/components/CandidateComparison.tsx')
const { compareCandidates,buildGuideBundle } = await import('../src/lib/aiGuide.ts')
const { default: StageWorkspace } = await import('../src/components/StageWorkspace.tsx')
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
it('renders exact model facts, raw evidence, critical limits and unique selection IDs in the required order', () => {
  const request={text:'Python 버그 수정',tasks:['coding'],overrides:{},budget:'paid',usageRoute:'consumer'}
  const comparison=compareCandidates(request)
  const html=renderToStaticMarkup(createElement(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop}))
  assert.match(html,/GPT-6\.1 Terra/);assert.match(html,/Terminal-Bench 4\.0/);assert.match(html,/50\.3%/)
  assert.match(html,/선택한 medium 설정과 동일한 결과로 볼 수 없음/)
  const start=html.lastIndexOf('<article',html.indexOf('모델 ID: gpt-6.1-terra'))
  const card=html.slice(start,html.indexOf('</article>',start))
  const markers=['모델 ID:','plan-name','현재 작업에 맞는 이유','작업 관련 성능 근거','비용·무료 범위·중요 제한','출처·확인일','class="button primary"']
  for(let i=1;i<markers.length;i++)assert.ok(card.indexOf(markers[i])>card.indexOf(markers[i-1]),markers[i])
  const ids=[...html.matchAll(/id="(choose-[^"]+)"/g)].map(m=>m[1])
  assert.equal(ids.length,new Set(ids).size)
  assert.match(html,/이번에 확인한 정확한 모델 5개 · 실제 평가 결과 13건/)
})
it('renders API billing as metered tokens and preserves missing-score labels', async () => {
  const request={text:'Python 버그 수정',tasks:['coding'],overrides:{},budget:'paid',usageRoute:'api'}
  const c=compareCandidates(request).recommendations.find(c=>c.model?.id==='gpt-6.1-terra')
  assert.match(planPrice(c),/100만 토큰당/);assert.match(planPrice(c),/월 구독료 아님/)
  assert.doesNotMatch(planPrice(c),/\/ 월/)
  const { EvaluationFact }=await import('../src/components/CurrentModelEvidence.tsx')
  const { recommendationSnapshot }=await import('../src/data/recommendationSnapshot.ts')
  const html=renderToStaticMarkup(createElement(EvaluationFact,{result:{...recommendationSnapshot.evaluations[0],rawScore:null}}))
  assert.match(html,/점수 미확인/);assert.doesNotMatch(html,/>0%/)
})
it('keeps model-plan entitlement warnings and model limits visible in the stage context', () => {
  const request={text:'Python 버그 수정',tasks:['coding'],overrides:{},budget:'paid',usageRoute:'consumer'}
  const comparison=compareCandidates(request)
  const candidate=comparison.recommendations.find(c=>c.plan.id==='claude-pro' && c.model?.id==='claude-opus-5-5')
  const selection={default:candidate.id,byStage:{}}
  const bundle=buildGuideBundle(request,selection)
  const session={request,comparison,selection,bundle,drafts:{},checks:{},activeStageId:bundle.steps[0].id}
  const html=renderToStaticMarkup(createElement(StageWorkspace,{session,onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop}))
  const context=html.slice(html.indexOf('class="stage-context"'),html.indexOf('</section>',html.indexOf('class="stage-context"')))
  assert.match(context,/정확한 평가 모델·버전·선택 모드와 플랜 연결 미확인/)
  assert.match(context,/thinking 끄기 불가/)
})
it('does not describe unconfirmed exact-model selection as impossible', () => {
  const request={text:'환영 이메일',tasks:['writing'],overrides:{},budget:'free'}
  const comparison=compareCandidates(request)
  const html=renderToStaticMarkup(createElement(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop}))
  assert.doesNotMatch(html,/모델 선택 불가/)
})
