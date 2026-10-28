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
it('collapses review candidates with their actual count and exposes the restored expansion state',()=>{
  const request={text:DEMO_REQUEST,overrides:{}},comparison=compareCandidates(request)
  for(const needsCheckOpen of [false,true]){
    const html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop,needsCheckOpen})
    const disclosure=html.match(/<details[^>]*id="needs-check-candidates"[^>]*>/)?.[0]
    assert.ok(disclosure,'review candidates must be inside a disclosure')
    assert.equal(disclosure.includes('open=""'),needsCheckOpen)
    const section=html.match(/<section[^>]*data-group="needs-check"[^>]*>[\s\S]*?<\/section>/)[0]
    const count=(section.match(/<article /g)??[]).length
    assert.ok(count>0)
    assert.ok(html.includes(`aria-expanded="${needsCheckOpen}"`))
    assert.match(html,/aria-controls="needs-check-options"/)
    assert.ok(html.includes(`추가 확인이 필요한 후보 보기 (${count})</summary>`))
    assert.match(section,/id="needs-check-options"/)
    assert.match(section,/FP8 제공으로 평가 실행 조건과 차이/)
    assert.match(section,/<button[^>]*id="choose-/)
  }
})
it('omits the review disclosure when there are no review candidates',()=>{
  const request={text:DEMO_REQUEST,overrides:{}},comparison=compareCandidates(request)
  comparison.recommendations=comparison.recommendations.filter(c=>c.assessment.start!=='needs-check')
  const html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop,needsCheckOpen:true})
  assert.doesNotMatch(html,/needs-check-candidates|추가 확인이 필요한 후보 보기/)
  assert.match(html,/작업을 시작할 후보/)
  assert.match(html,/다른 서비스에서 시작하기/)
})
it('shows two tied survey recommendations, shares repeated guidance and collapses four unspecified services',()=>{
  const {html}=comparisonHtml({text:DEMO_REQUEST,overrides:{}})
  assert.match(html,/<h1[^>]*>이 작업에 사용할 모델<\/h1>/)
  const ready=html.match(/<section class="candidate-section" data-group="ready">[\s\S]*?<\/section>/)[0]
  assert.equal((ready.match(/<article /g)??[]).length,2)
  assert.equal((ready.match(/추천 공동 1위/g)??[]).length,2)
  assert.equal((html.match(/엑셀 파일을 첨부해 계산·분석하고 결과표를 만들 수 있습니다\./g)??[]).length,1)
  assert.equal((html.match(/개인 계정의 도구 활성화·파일 한도·남은 사용량은 확인하지 않았습니다\./g)??[]).length,1)
  assert.doesNotMatch(ready,/candidate-limit|추천 2위|추천 3위/)
  const services=html.match(/<details class="other-services"[^>]*>[\s\S]*?<section class="candidate-section" data-group="model-check">[\s\S]*?<\/section><\/details>/)[0]
  assert.match(services,/<summary id="other-services">다른 서비스에서 시작하기 \(4\)<\/summary>/)
  assert.doesNotMatch(services.split('>')[0],/open/)
  assert.equal((services.match(/<article /g)??[]).length,4)
  assert.match(services,/코드 실행 지원과 사용할 모델을 서비스에서 확인/)
  assert.match(html,/FP8 제공으로 평가 실행 조건과 차이/)
})
it('limits featured recommendations to three without removing tied or selected candidates',()=>{
  const request={text:DEMO_REQUEST,inputMode:'summary',requiredFeatures:[],overrides:{}},comparison=compareCandidates(request)
  const html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  const ready=html.match(/<section class="candidate-section" data-group="ready">[\s\S]*?<\/section>/)[0]
  assert.equal((ready.match(/<article /g)??[]).length,3)
  assert.match(html,/나머지 모델 후보/)
  const selected=comparison.recommendations.filter(c=>c.assessment.start==='ready').at(-1)
  const chosen=render(Comparison,{comparison,request,selected:selected.id,onSelect:noop,onEdit:noop})
  assert.ok(chosen.includes(`id="choose-${encodeURIComponent(selected.id)}"`))
  assert.match(chosen,/선택됨/)
})
it('separates ready models, unspecified-model services, performance evidence and personal checks in the actual result',()=>{
  const {comparison,html}=comparisonHtml({text:DEMO_REQUEST,overrides:{}})
  assert.match(html,/작업을 시작할 후보/)
  assert.match(html,/모델 확인이 필요한 서비스 후보/)
  assert.match(html,/추가 확인이 필요한 후보/)
  assert.equal((html.match(/설문 분석 성능 순위는 제공하지 않습니다/g)??[]).length,1)
  assert.doesNotMatch(html,/다른 웹 후보 보기/)
  const cards=[...html.matchAll(/<article class="candidate-card"[^>]*>[\s\S]*?<\/article>/g)].map(m=>m[0])
  assert.ok(cards.some(c=>c.includes('data-candidate-kind="ready"')))
  assert.ok(cards.some(c=>c.includes('data-candidate-kind="model-check"')))
  for(const card of cards){
    const visible=card.split('<details>')[0]
    assert.doesNotMatch(visible,/AIME|Last Exam|직접 성능 비교가 부족/)
    assert.match(visible,/<button[^>]*id="choose-/)
    if(card.includes('data-candidate-kind="ready"'))assert.doesNotMatch(visible,/개인 계정의 도구 활성화/)
    if(card.includes('data-candidate-kind="model-check"'))assert.match(visible,/모델 미지정/)
  }
  const service=comparison.recommendations.find(c=>!c.model&&c.assessment.features.status==='confirmed')
  let selected
  const tree=Comparison({comparison,request:{text:DEMO_REQUEST,overrides:{}},selected:null,onSelect:id=>{selected=id},onEdit:noop})
  function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const found=find(child,predicate);if(found)return found}return null}if(predicate(node))return node;return find(node.props?.children,predicate)}
  const button=find(tree,node=>node.props?.id===`choose-${encodeURIComponent(service.id)}`)
  assert.ok(button);button.props.onClick();assert.equal(selected,service.id)
  const request={text:DEMO_REQUEST,overrides:{}},selection={default:selected,byStage:{}},bundle=buildGuideBundle(request,selection)
  const workspace=render(Workspace,{session:{request,comparison,selection,bundle,drafts:{},checks:{},activeStageId:'statistics'},onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop})
  assert.match(workspace,/id="prompt-statistics"/)
  assert.match(workspace,/학년별 만족도 차이/)
  assert.match(workspace,/공부 시간과 성적의 관계/)
  assert.ok(workspace.includes(`href="${service.mapping.url}"`))
})
it('keeps an already selected confirmed plan route visible when another plan offers the same model',()=>{
  const request={text:DEMO_REQUEST,overrides:{}},comparison=compareCandidates(request)
  const modelRoutes=comparison.recommendations.filter(c=>c.assessment.start==='ready')
  const alternatives=modelRoutes.filter(c=>modelRoutes.some(other=>other.id!==c.id&&other.model.id===c.model.id))
  assert.ok(alternatives.length>=2)
  for(const selected of alternatives){
    const html=render(Comparison,{comparison,request,selected:selected.id,onSelect:noop,onEdit:noop})
    assert.ok(html.includes(`id="choose-${encodeURIComponent(selected.id)}"`))
    assert.match(html,/선택됨/)
    const selection={default:selected.id,byStage:{}},bundle=buildGuideBundle(request,selection)
    const workspace=render(Workspace,{session:{request,comparison,selection,bundle,drafts:{},checks:{},activeStageId:'statistics'},onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop})
    assert.ok(workspace.includes(`value="${selected.id}" selected=""`))
  }
})
it('renders three flow steps, broad task input and exact brand without budget or route controls',()=>{
  const html=render(App)
  assert.match(html,/AI\.\.may I\.\.\?/);assert.match(html,/Ai\.\.\.Khu/)
  assert.match(html,/요청 해석 확인/);assert.match(html,/<textarea[^>]+id="request-text"/)
  assert.match(html,/작업 입력·해석/);assert.match(html,/모델 비교·선택/);assert.match(html,/프롬프트·활용/)
  assert.doesNotMatch(html,/name="budget"|name="priority"|usage-route|원본 파일 업로드.*type="file"/)
})
it('keeps comparable algorithm ranks separate from public execution readiness and preserves ties',()=>{
  for(const tied of [false,true]){
    const data=structuredClone(snapshot);if(tied)data.evaluations.find(e=>e.id==='east-qwen235-2507-lcb').rawScore=48.9
    const {html}=comparisonHtml({text:'알고리즘 문제 풀이',overrides:{}},data)
    const featured=[...html.matchAll(/<article class="candidate-card"[^>]*>[\s\S]*?<\/article>/g)].filter(m=>m[0].includes('벤치마크 원점수 순위')).map(m=>m[0]).join('')
    assert.equal((featured.match(/<article /g)??[]).length,3)
    assert.match(featured,/LiveCodeBench v6/);assert.match(featured,/48\.9/);assert.match(featured,/45\.2/)
    if(tied)assert.equal((featured.match(/벤치마크 원점수 순위: 집합 내 공동 1위/g)??[]).length,2)
    else assert.match(featured,/51\.8/)
    assert.match(html,/성능 순위를 뜻하지 않습니다/)
    assert.match(html,/웹 선택 가능 여부/)
  }
})
it('preserves all model and service choices beneath the featured recommendations and keeps peer order neutral',()=>{
  const {html}=comparisonHtml({text:DEMO_REQUEST,overrides:{}})
  const featured=html.slice(html.indexOf('id="recommended-options"'),html.indexOf('<details class="evidence-section"'))
  assert.equal((featured.match(/<article /g)??[]).length,24)
  assert.doesNotMatch(html,/다른 웹 후보 보기|동등한 우선 검토/)
  assert.doesNotMatch(featured,/평가 집합.*위/)
  for(const section of featured.matchAll(/<section class="candidate-section"[\s\S]*?<\/section>/g)){
    const names=[...section[0].matchAll(/<article[\s\S]*?<h2>([^<]+)<\/h2>/g)].map(m=>m[1])
    assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'en',{numeric:true})))
  }
  const visible=[...featured.matchAll(/<article[\s\S]*?<\/article>/g)].map(m=>m[0].split('<details>')[0]).join('')
  assert.doesNotMatch(visible,/AIME|Last Exam|79\.8|17\.7|59\.4/)
  assert.match(featured,/엑셀 파일/)
  assert.match(featured,/계산·분석/)
  assert.match(visible,/기능·경로 확인/)
  assert.match(html,/개인 계정.*확인하지 않았/)
  assert.match(html,/직접 비교.*설문 분석 성능/)
  assert.match(html,/이름순.*중립 정렬.*성능 순위/)
  assert.match(html,/전체 비교 범위·다른 평가·출처/)
})
it('shows the verified route for a model and exposes sourced unsupported exclusions separately',()=>{
  const data=structuredClone(snapshot)
  const mapping=data.mappings.find(m=>m.modelId==='claude-opus-5-5'&&m.routeKind==='chat')
  data.mappings=data.mappings.filter(m=>m!==mapping)
  data.mappings.push({...mapping,id:'a-unknown',status:'confirmed',selectable:true,selection:'unknown'},
    {...mapping,id:'z-verified',status:'confirmed',selectable:true,selection:'manual'})
  const {html}=comparisonHtml({text:DEMO_REQUEST,overrides:{}},data)
  const first=[...html.matchAll(/<article class="candidate-card"[^>]*>[\s\S]*?<\/article>/g)].find(m=>m[0].includes('id="choose-z-verified"'))[0]
  assert.match(first,/Claude Opus 5\.5/)
  assert.match(first,/id="choose-z-verified"/)
  assert.match(first,/기능·경로 확인/)
  const plan=data.plans.find(p=>p.id==='claude-pro')
  plan.features.code={status:'unsupported',note:'fixture unsupported',sources:[{url:'https://example.com/web-unsupported',checkedAt:'2026-10-29'}]}
  const {html:excluded}=comparisonHtml({text:DEMO_REQUEST,overrides:{}},data)
  assert.doesNotMatch(excluded,/id="choose-z-verified"/)
  assert.match(excluded,/필수 조건 미지원으로 제외/)
  assert.match(excluded,/코드 실행 도구 공식 미지원/)
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
  const card=[...html.matchAll(/<article[\s\S]*?<\/article>/g)].find(m=>m[0].includes('LiveCodeBench'))[0]
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
  assert.match(html,/개인 계정의 도구 활성화·파일 한도·남은 사용량/)
  assert.match(html,/다음 단계로 가져갈 내용/);assert.match(html,/학년별 만족도 차이/)
  assert.match(html,/id="stage-review"/);assert.match(html,/원자료·요구사항과 직접 대조/)
})
it('keeps missing evaluation scores distinct from zero',async()=>{
  const {EvaluationFact}=await import('../src/components/CurrentModelEvidence.tsx')
  const html=render(EvaluationFact,{result:{...snapshot.evaluations[0],rawScore:null}})
  assert.match(html,/점수 미확인/);assert.doesNotMatch(html,/>0%/)
})
