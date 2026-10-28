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
const { default: Comparison } = await import('../src/components/CandidateComparison.tsx')
const { compareCandidates,buildGuideBundle } = await import('../src/lib/aiGuide.ts')
const { default: StageWorkspace } = await import('../src/components/StageWorkspace.tsx')
const { planPrice } = await import('../src/lib/usageConditions.ts')
const noop = () => {}
it('removes budget inputs and keeps costs out of model comparison until a model is selected', () => {
  const inputHtml=renderToStaticMarkup(createElement(App))
  assert.doesNotMatch(inputHtml,/name="budget"|무료만 사용|무료 선호|비용 절약/)
  const request={text:'Python 버그 수정',tasks:['coding'],overrides:{},usageRoute:'consumer'}
  const comparison=compareCandidates(request)
  const html=renderToStaticMarkup(createElement(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop}))
  assert.doesNotMatch(html,/입력 USD|100만 토큰당|비용·무료 범위|무료만 사용|무료 선호/)
  assert.match(html,/작업 조건/);assert.match(html,/연결 미확인/)
  const c=comparison.recommendations.find(c=>c.model?.id==='gpt-6.1-terra')
  const selection={default:c.id,byStage:{}},bundle=buildGuideBundle(request,selection)
  const session={request,comparison,selection,bundle,drafts:{},checks:{},activeStageId:bundle.steps[0].id}
  const selected=renderToStaticMarkup(createElement(StageWorkspace,{session,onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop}))
  assert.match(selected,/선택 후 이용 조건/);assert.match(selected,/유료 구독/)
})
it('starts with exact brand, task and analysis action without budget selection', () => {
  const html = renderToStaticMarkup(createElement(App))
  assert.match(html,/AI\.\.may I\.\.\?/); assert.match(html,/요청 분석하고 AI 비교하기/)
  assert.match(html,/<textarea[^>]+id="request-text"/)
  assert.doesNotMatch(html,/name="budget"|무료만 사용|무료 선호/); assert.match(html,/결과 품질 우선/)
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
  const request={text:'Python 버그 수정',tasks:['coding'],overrides:{},usageRoute:'consumer'}
  const comparison=compareCandidates(request)
  const html=renderToStaticMarkup(createElement(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop}))
  assert.match(html,/GPT-6\.1 Terra/);assert.match(html,/Terminal-Bench 4\.0/);assert.match(html,/50\.3%/)
  assert.match(html,/선택한 medium 설정과 동일한 결과로 볼 수 없음/)
  const start=html.lastIndexOf('<article',html.indexOf('모델 ID: gpt-6.1-terra'))
  const card=html.slice(start,html.indexOf('</article>',start))
  const markers=['모델 ID:','현재 작업에 맞는 이유','작업 관련 성능 근거','실제 이용 경로 확인','출처·확인일','class="button primary"']
  for(let i=1;i<markers.length;i++)assert.ok(card.indexOf(markers[i])>card.indexOf(markers[i-1]),markers[i])
  const ids=[...html.matchAll(/id="(choose-[^"]+)"/g)].map(m=>m[1])
  assert.equal(ids.length,new Set(ids).size)
  assert.ok(ids.every(id=>!/[\t\n\f\r ]/.test(id)),'selection DOM IDs must contain no ASCII whitespace even when an official model identifier does')
  assert.match(html,/이번에 확인한 정확한 모델 25개 · 실제 평가 결과 107건/)
})
it('renders API billing as metered tokens and preserves missing-score labels', async () => {
  const request={text:'Python 버그 수정',tasks:['coding'],overrides:{},usageRoute:'api'}
  const c=compareCandidates(request).recommendations.find(c=>c.model?.id==='gpt-6.1-terra')
  assert.match(planPrice(c),/100만 토큰당/);assert.match(planPrice(c),/월 구독료 아님/)
  assert.doesNotMatch(planPrice(c),/\/ 월/)
  const { EvaluationFact }=await import('../src/components/CurrentModelEvidence.tsx')
  const { recommendationSnapshot }=await import('../src/data/recommendationSnapshot.ts')
  const html=renderToStaticMarkup(createElement(EvaluationFact,{result:{...recommendationSnapshot.evaluations[0],rawScore:null}}))
  assert.match(html,/점수 미확인/);assert.doesNotMatch(html,/>0%/)
})
it('keeps model-plan entitlement warnings and model limits visible in the stage context', () => {
  const request={text:'Python 버그 수정',tasks:['coding'],overrides:{},usageRoute:'consumer'}
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
  const request={text:'환영 이메일',tasks:['writing'],overrides:{},}
  const comparison=compareCandidates(request)
  const html=renderToStaticMarkup(createElement(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop}))
  assert.doesNotMatch(html,/모델 선택 불가/)
})
it('renders provider coding cohorts as separate configuration comparisons with real selection handlers',async()=>{
  const {default:Groups}=await import('../src/components/EvaluationComparisons.tsx')
  const candidates=compareCandidates({text:'코드 오류 수정',tasks:['coding'],overrides:{}}).recommendations
  const html=renderToStaticMarkup(createElement(Groups,{candidates,onSelect:noop}))
  assert.match(html,/CursorBench 4\.0/);assert.match(html,/DeepSWE 1\.1/);assert.match(html,/Terminal-Bench 4\.0/)
  assert.match(html,/제공사 발표이며 독립 평가가 아닙니다/)
  assert.match(html,/Grok 4\.7 · high · 71%/)
  let chosen=null
  const tree=Groups({candidates,onSelect:id=>{chosen=id}})
  const section=tree.props.children[0][0]
  const rows=section.props.children.find(c=>c?.type==='ol').props.children
  rows[0].props.children.find(c=>c?.type==='button').props.onClick()
  assert.equal(chosen,'configuration:western-grok47-cursor')
})
it('shows exact checkpoint use without inventing a consumer plan or free API price',()=>{
  const request={text:'코드 오류 수정',tasks:['coding'],overrides:{}}
  const comparison=compareCandidates(request)
  const c=comparison.recommendations.find(c=>c.model?.id==='deepseek-ai/DeepSeek-R1-0528'&&c.mapping.routeKind==='self-hosted'&&!c.configuration)
  const selection={default:c.id,byStage:{}}
  const bundle=buildGuideBundle(request,selection)
  const html=renderToStaticMarkup(createElement(StageWorkspace,{session:{request,comparison,selection,bundle,drafts:{},checks:{}},onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop}))
  assert.match(html,/소비자 구독 플랜 연결 미확인/);assert.match(html,/가중치 체크포인트/)
  assert.match(html,/공식 가중치 · 직접 설치 필요/);assert.match(html,/가격·사용 한도 미확인/)
  assert.doesNotMatch(html,/무료 플랜 · AI 구독료 없음/)
})
it('groups easier access separately from performance and retains installation and unknown paths',()=>{
  const request={text:'코드 오류 수정',tasks:['coding'],overrides:{}}
  const comparison=compareCandidates(request)
  const html=renderToStaticMarkup(createElement(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop}))
  const group=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)))
  assert.equal((group('web-candidates','API 설정 필요 ·').match(/class="candidate-card/g)??[]).length,4)
  assert.equal((group('api-candidates','id="pending-options"').match(/class="candidate-card/g)??[]).length,18)
  assert.match(html,/직접 설치 필요 · 15개 경로/)
  assert.match(html,/정확 버전 이용 경로 미확인 · 1개/)
  assert.match(html,/107건은 서로 다른 평가·버전·시점/)
  assert.match(html,/과거 고정 체크포인트/);assert.match(html,/FP8/)
  const ids=[...html.matchAll(/id="(choose-[^"]+)"/g)].map(m=>m[1])
  assert.equal(ids.length,new Set(ids).size)
})
it('reports AA public integration separately from accessible originals and API authentication',async()=>{
  const {default:AAStatus}=await import('../src/components/AAConnectionStatus.tsx')
  const html=renderToStaticMarkup(createElement(AAStatus))
  assert.match(html,/현재 앱 수치 연결 0건/)
  assert.match(html,/실제 API 응답이 없어요/)
  assert.match(html,/모델 Coding Index 필드와 에이전트 Coding Agent Index는 다르고/)
  assert.match(html,/모든 공개 활용을 금지한다는 뜻은 아니에요/)
})
