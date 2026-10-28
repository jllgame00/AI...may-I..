import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

registerHooks({
  resolve(specifier,context,next){
    if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))for(const ext of ['.ts','.tsx']){const url=new URL(specifier+ext,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context)}
    return next(specifier,context)
  },
  load(url,context,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context)},
})
const {default:App}=await import('../src/App.tsx')
const {default:Editor}=await import('../src/components/PromptEditor.tsx')
const {default:Fields}=await import('../src/components/ConditionFields.tsx')
const {default:Comparison}=await import('../src/components/CandidateComparison.tsx')
const {default:Workspace}=await import('../src/components/StageWorkspace.tsx')
const {compareCandidates,buildGuideBundle,DEMO_REQUEST}=await import('../src/lib/aiGuide.ts')
const {recommendationSnapshot:snapshot}=await import('../src/data/recommendationSnapshot.ts')
const render=(component,props={})=>renderToStaticMarkup(createElement(component,props))
const noop=()=>{}
function comparisonHtml(request,data=snapshot){const comparison=compareCandidates(request,data);return {comparison,html:render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})}}
it('renders three flow steps, broad task input and exact brand without budget or route controls',()=>{
  const html=render(App)
  assert.match(html,/AI\.\.may I\.\.\?/);assert.match(html,/Ai\.\.\.Khu/)
  assert.match(html,/요청 해석 확인/);assert.match(html,/<textarea[^>]+id="request-text"/)
  assert.match(html,/작업 입력·해석/);assert.match(html,/모델 비교·선택/);assert.match(html,/프롬프트·활용/)
  assert.doesNotMatch(html,/name="budget"|name="priority"|usage-route|원본 파일 업로드.*type="file"/)
})
it('renders scoped algorithm ranks and ties before alternative web choices',()=>{
  for(const tied of [false,true]){
    const data=structuredClone(snapshot);if(tied)data.evaluations.find(e=>e.id==='east-qwen235-2507-lcb').rawScore=48.9
    const {html}=comparisonHtml({text:'알고리즘 문제 풀이',overrides:{}},data)
    const featured=html.slice(html.indexOf('id="recommended-options"'),html.indexOf('<details class="other-candidates"'))
    assert.equal((featured.match(/<article /g)??[]).length,3)
    assert.match(featured,/LiveCodeBench v6/);assert.match(featured,/48\.9/);assert.match(featured,/45\.2/)
    if(tied)assert.equal((featured.match(/평가 집합 공동 1위/g)??[]).length,2)
    else assert.match(featured,/51\.8/)
    assert.match(html,/전체 모델의 절대 순위가 아니며/)
    assert.match(html,/정확한 평가 버전의 웹 제공/)
  }
})
it('renders a small unranked survey shortlist and keeps all other candidates and evidence in details',()=>{
  const {html}=comparisonHtml({text:DEMO_REQUEST,overrides:{}})
  const featured=html.slice(html.indexOf('id="recommended-options"'),html.indexOf('<details class="other-candidates"'))
  assert.equal((featured.match(/<article /g)??[]).length,3)
  assert.doesNotMatch(featured,/평가 집합.*위/)
  assert.match(featured,/수학|추론/)
  assert.match(html,/통계.*직접 비교/)
  assert.match(html,/이름순이며 우열을 뜻하지 않습니다/)
  assert.match(html,/전체 비교 범위·다른 평가·출처/)
})
it('never exposes API or installation candidate selection and keeps every DOM selection ID unique',()=>{
  const {comparison,html}=comparisonHtml({text:'React 오류 수정',overrides:{}})
  const ids=[...html.matchAll(/id="choose-([^"]+)"/g)].map(m=>decodeURIComponent(m[1]))
  assert.equal(ids.length,new Set(ids).size)
  assert.ok(ids.every(id=>comparison.recommendations.some(c=>c.id===id&&['chat','work'].includes(c.mapping.routeKind))))
  assert.ok(!ids.some(id=>id.startsWith('configuration:')))
  assert.match(html,/DeepSWE 1\.1/);assert.match(html,/CursorBench 4\.0/)
  assert.match(html,/API·설치·에이전트 전용/)
})
it('keeps technical facts and complete evaluation provenance behind details after the selection button',()=>{
  const {html}=comparisonHtml({text:'알고리즘 문제 풀이',overrides:{}})
  const card=html.slice(html.indexOf('<article'),html.indexOf('</article>'))
  assert.ok(card.indexOf('근거·상세 보기')>card.indexOf('class="button primary"'))
  assert.ok(card.indexOf('모델 ID:')>card.indexOf('근거·상세 보기'))
  assert.match(card,/평가 실행 조건·비교 한계·이용 조건/)
  assert.match(card,/https:\/\/huggingface.co/)
})
it('renders preserved edits, regeneration choice and previous draft recovery',()=>{
  const html=render(Editor,{template:{id:'main',title:'요청문',text:'새 조건 초안'},draft:{text:'직접 작성한 내용',context:'old',previous:{text:'이전',context:'older'}},context:'new',onChange:noop,primary:true})
  assert.match(html,/직접 작성한 내용/);assert.match(html,/아직 반영되지/);assert.match(html,/이전 초안 복구/);assert.match(html,/새 조건으로 초안 만들기/)
  assert.doesNotMatch(html,/새 조건 초안<\/textarea>/)
})
it('requires acknowledgment for unfilled placeholders while retaining visible editable text',()=>{
  const html=render(Editor,{template:{id:'main',title:'요청문',text:'[자료]'},draft:{text:'[자료]',context:'a',previous:null},context:'a',onChange:noop})
  assert.match(html,/직접 채울 부분 1개/);assert.match(html,/빈칸을 확인했어요/);assert.match(html,/<button[^>]+id="copy-main"[^>]+disabled=""/)
})
it('condition edits emit only the changed field rather than freezing all inference',()=>{
  let change
  const request={text:'대학생에게 5분 발표 대본',overrides:{}}
  const tree=Fields({request,fields:['length'],onChange:(field,value)=>{change=[field,value]}})
  tree.props.children[0].props.children[1].props.onChange({target:{value:'3분'}})
  assert.deepEqual(change,['length','3분']);assert.deepEqual(request.overrides,{})
})
it('puts the editable prompt, external link, critical availability and handoff on one workspace',()=>{
  const request={text:DEMO_REQUEST,overrides:{}},comparison=compareCandidates(request),c=comparison.recommendations[0]
  const selection={default:c.id,byStage:{}},bundle=buildGuideBundle(request,selection)
  const session={request,comparison,selection,bundle,drafts:{},checks:{},activeStageId:'statistics'}
  const html=render(Workspace,{session,onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop})
  assert.match(html,/id="prompt-statistics"/);assert.match(html,/id="copy-statistics"/);assert.match(html,/id="open-service"/)
  assert.match(html,/정확한 모델 버전의 웹 제공|엑셀.*지원|파일.*지원/)
  assert.match(html,/다음 단계로 가져갈 내용/);assert.match(html,/학년별 만족도 차이/)
  assert.match(html,/id="stage-review"/);assert.match(html,/원자료·요구사항과 직접 대조/)
})
it('keeps missing evaluation scores distinct from zero',async()=>{
  const {EvaluationFact}=await import('../src/components/CurrentModelEvidence.tsx')
  const html=render(EvaluationFact,{result:{...snapshot.evaluations[0],rawScore:null}})
  assert.match(html,/점수 미확인/);assert.doesNotMatch(html,/>0%/)
})
