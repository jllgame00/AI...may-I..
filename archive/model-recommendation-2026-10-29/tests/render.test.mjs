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
it('keeps failed estimated quality separate from actual task support and folded diagnostics',()=>{
  const {html}=comparisonHtml({text:DEMO_REQUEST,overrides:{}})
  assert.match(html,/공개 평가 추정 점수는 검증 근거 부족으로 보류/)
  assert.match(html,/<details><summary>추정 점수 검증 결과<\/summary>/)
  assert.doesNotMatch(html,/data-estimation-model=/)
  assert.match(html,/필수 기능 3개 확인/)
})
it('connects passed synthetic estimates to integer top-three cards without reranking filtered candidates',async()=>{
  const {estimateTables}=await import('../src/lib/scoreEstimation.ts')
  const {default:EstimatedComparison}=await import('../src/components/EstimatedComparison.tsx')
  const request={text:'알고리즘 Python 문제를 풀어줘',overrides:{}},comparison=compareCandidates(request)
  const candidates=comparison.decision.weighted.rows.slice(0,3).map(r=>r.candidate)
  const tables=Array.from({length:12},(_,b)=>({id:`synthetic-${b}`,domain:'coding',type:'model',rows:candidates.map((c,i)=>({measurementId:`${b}-${i}`,configId:`config-${i}`,evaluation:{...snapshot.evaluations[0],id:`${b}-${i}`,modelId:c.model.id,modelVersion:c.model.version,benchmark:`synthetic-${b}`,rawScore:90-i*20,higherIsBetter:true,effort:'medium',evaluationType:'model'}}))}))
  const group=estimateTables(tables).find(r=>r.scope==='coding')
  assert.equal(group.passed,true)
  comparison.decision.estimation={state:'published',artifact:null,attempts:[group],published:[group]}
  const before=render(EstimatedComparison,{comparison})
  assert.equal((before.match(/data-estimation-model=/g)??[]).length,3)
  for(const s of group.scores)assert.ok(before.includes(`집합 내 ${s.rank}위 · ${s.score}점`))
  assert.match(before,/공개 평가 기반 추정 추천 점수/)
  assert.match(before,/신뢰구간이 아닙니다/)
  assert.match(before,/웹 실행:/)
  comparison.recommendations=[]
  assert.equal(render(EstimatedComparison,{comparison}),before)
  group.stale=true
  assert.match(render(EstimatedComparison,{comparison}),/마지막 정상 공개 결과 유지/)
})
it('labels actual functional support instead of quality points and explains the complete joint group before the first three',()=>{
  const survey=comparisonHtml({text:DEMO_REQUEST,overrides:{}}).html
  const card=survey.match(/<article[\s\S]*?<\/article>/)[0].split('<details>')[0]
  assert.match(card,/필수 기능 3개 확인/)
  assert.doesNotMatch(card,/100|점수|1위/)
  const writing=comparisonHtml({text:'한국어 홍보 글을 써줘',overrides:{}}).html
  const beforeCards=writing.slice(0,writing.indexOf('<article'))
  assert.match(beforeCards,/공동 추천 모델 \(전체 20개\)/)
  assert.match(beforeCards,/20개 중 3개를 모델명순/)
  assert.match(beforeCards,/표시 순서는 성능 순위를 뜻하지 않습니다/)
  const writingCard=writing.match(/<article[\s\S]*?<\/article>/)[0].split('<details>')[0]
  assert.match(writingCard,/공식 텍스트 생성·출력 용도 확인/)
  assert.doesNotMatch(writingCard,/점수|1위|100/)
})
it('renders task-matched limited scope and disables selection only for a confirmed task violation',()=>{
  const data=structuredClone(snapshot),mapping=data.mappings.find(m=>m.routeKind==='work'&&m.features?.spreadsheet)
  mapping.features.spreadsheet={status:'limited',note:'규칙 검증용 자료: 최대 10행의 시트 분석',sources:[{url:'https://example.org/limited-sheet',checkedAt:'2026-10-29'}],constraints:{maxRows:10}}
  for(const [text,status,canSelect] of [['엑셀 5행을 분석해줘','recommended',true],['엑셀 11행을 분석해줘','unsupported',false],['엑셀 자료를 분석해줘','conditional',true]]){
    const request={text,tasks:['analysis'],requiredFeatures:['spreadsheet'],overrides:{}}
    const {html}=comparisonHtml(request,data)
    const card=[...html.matchAll(/<article[\s\S]*?<\/article>/g)].find(m=>m[0].includes(`data-model-id="${mapping.modelId}"`))[0]
    assert.ok(card.includes(`data-judgment="${status}"`))
    assert.equal(card.includes(`id="choose-${encodeURIComponent(mapping.id)}"`),canSelect)
    assert.match(card,/행 수 10행 이하/)
    if(status==='recommended')assert.match(card,/필수 기능 1개 확인/)
    if(status==='unsupported')assert.match(card,/이 작업 범위 불충족/)
  }
})
function comparisonHtml(request,data=snapshot){const comparison=compareCandidates(request,data);return {comparison,html:render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})}}
function weightedFixture() {
  const request={text:DEMO_REQUEST,overrides:{}},comparison=compareCandidates(request)
  const candidates=[...new Map(comparison.recommendations.filter(c=>c.model).map(c=>[c.model.id,c])).values()]
  comparison.decision.weighted={policyVersion:'fixture',scope:{profile:'survey'},mode:'functional',criteria:[{id:'upload',label:'파일 첨부',weight:1,rule:'공식 지원'}],cohort:null,
    explanation:'공식 도구 지원으로 판단합니다.',rows:candidates.map(candidate=>({candidate,judgment:'needs-check',basis:'none',reason:'공식 지원 근거 확인 필요',score:null,rank:null,tied:false,coverage:0,components:[{id:'upload',label:'파일 첨부',status:'unknown',weight:1,value:null,contribution:null,reason:'지원 근거 없음',sources:[]}],gaps:['파일 지원 확인'],evaluation:null,evidence:[]}))}
  return {request,comparison}
}
const sectionFor=(html,group)=>html.match(new RegExp('<section[^>]*data-group="'+group+'"[^>]*>[\\s\\S]*?</section>'))?.[0]
function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const found=find(child,predicate);if(found)return found}return null}if(predicate(node))return node;if(typeof node.type==='function')return find(node.type(node.props),predicate);return find(node.props?.children,predicate)}
it('features at most three task recommendations and folds all other judgments independently of route',()=>{
  const {request,comparison}=weightedFixture(),weighted=comparison.decision.weighted,base=weighted.rows[0]
  const make=(name,judgment)=>({...base,judgment,basis:'functional',score:judgment==='recommended'?100:null,rank:judgment==='recommended'?1:null,tied:true,reason:name+' 근거',candidate:{...base.candidate,id:name,model:{...base.candidate.model,id:name,name}}})
  weighted.rows=[make('Echo','needs-check'),make('Delta','recommended'),make('Bravo','recommended'),make('Alpha','recommended'),make('Charlie','recommended'),make('Foxtrot','conditional'),make('Golf','unsupported')]
  const html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  const featured=sectionFor(html,'recommended')
  assert.ok(featured)
  assert.deepEqual([...featured.matchAll(/<h2>([^<]+)<\/h2>/g)].slice(1).map(m=>m[1]),['Alpha','Bravo','Charlie'])
  assert.match(html,/나머지 공동 추천 \(1\)/)
  assert.match(html,/<details class="other-services" id="needs-check-candidates">/)
  assert.match(html,/<summary id="needs-check-summary" aria-expanded="false" aria-controls="needs-check-options">추가 확인이 필요한 후보 보기 \(3\)/)
  assert.match(sectionFor(html,'needs-check'),/Foxtrot 근거/)
  assert.match(sectionFor(html,'needs-check'),/조건부 추천/)
  assert.match(featured,/필수 기능/)
  assert.match(featured,/공동 추천/)
})
it('uses App-owned disclosure state and forwards native toggles without forcing selected rows open',()=>{
  const {request,comparison}=weightedFixture()
  for(const open of [false,true]){
    let change
    const props={comparison,request,selected:comparison.decision.weighted.rows[0].candidate.id,onSelect:noop,onEdit:noop,needsCheckOpen:open,onNeedsCheckToggle:value=>{change=value}}
    const html=render(Comparison,props)
    const disclosure=html.match(/<details[^>]*id="needs-check-candidates"[^>]*>/)?.[0]
    assert.ok(disclosure)
    assert.equal(disclosure.includes('open=""'),open)
    assert.ok(html.includes(`aria-expanded="${open}"`))
    const element=find(Comparison(props),node=>node.props?.id==='needs-check-candidates')
    element.props.onToggle({currentTarget:{open:!open}})
    assert.equal(change,!open)
  }
})
it('shows ranked raw benchmark recommendations even when the service score and web route are unknown',()=>{
  const {request,comparison}=weightedFixture(),weighted=comparison.decision.weighted,base=weighted.rows[0]
  const evaluation={...snapshot.evaluations.find(e=>e.benchmark==='LiveCodeBench'),rawScore:51.8}
  weighted.mode='benchmark';weighted.criteria=[]
  weighted.cohort={id:'raw',benchmark:'LiveCodeBench',version:'v6',publisher:'Source',kind:'source-table',modelCount:2,entries:[],limitation:'평가 환경 일부 미공개',selectionReason:'작업 관련',period:null,evaluatedAt:null,fit:4}
  weighted.rows=[{...base,judgment:'recommended',basis:'benchmark',reason:'같은 집합의 코딩 평가',score:null,rank:1,tied:false,evaluation,candidate:{...base.candidate,mapping:{...base.candidate.mapping,routeKind:'unconfirmed'}}}]
  const html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  const section=sectionFor(html,'recommended')
  assert.match(section,/집합 내 1위/)
  assert.match(section,/벤치마크 원점수: 51.8/)
  assert.match(section,/LiveCodeBench v6.*Source/)
  assert.match(section,/모델 평가/)
  assert.doesNotMatch(section,/필요한 작업 근거가 부족|서비스의 추천 점수: 미산정/)
  assert.doesNotMatch(section,/id="choose-/)
})
it('does not describe differently ranked benchmark recommendations as joint recommendations',()=>{
  const {request,comparison}=weightedFixture(),weighted=comparison.decision.weighted,base=weighted.rows[0]
  const evaluation=snapshot.evaluations.find(e=>e.benchmark==='LiveCodeBench')
  weighted.mode='benchmark';weighted.criteria=[]
  weighted.cohort={id:'four-ranked',benchmark:'LiveCodeBench',version:'v6',publisher:'Source',kind:'source-table',modelCount:4,entries:[],limitation:'Same source table',selectionReason:'coding',period:null,evaluatedAt:null,fit:4}
  weighted.rows=['Alpha','Bravo','Charlie','Delta'].map((name,index)=>({...base,judgment:'recommended',basis:'benchmark',score:null,rank:index+1,tied:false,evaluation:{...evaluation,rawScore:90-index*10},candidate:{...base.candidate,id:name,model:{...base.candidate.model,id:name,name}}}))
  const html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  assert.match(html,/나머지 추천 후보 \(1\)/)
  assert.doesNotMatch(html,/나머지 공동 추천|표시 순서는 우열을 뜻하지 않습니다/)
  assert.match(html,/집합 내 4위/)
})
it('describes an unconfirmed execution route as unknown without inferring installation or API setup',()=>{
  const {request,comparison}=weightedFixture(),weighted=comparison.decision.weighted,base=weighted.rows[0]
  comparison.recommendations=[]
  weighted.rows=[{...base,candidate:{...base.candidate,mapping:{...base.candidate.mapping,routeKind:'unconfirmed',url:undefined}}}]
  const html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  const visible=html.match(/<article[\s\S]*?<\/article>/)[0].split('<details>')[0]
  assert.match(visible,/정확한 이용 경로 미확인/)
  assert.doesNotMatch(visible,/설치|API|설정 필요|id="choose-/)
})
it('weighted fixture leaves API evidence read only and distinguishes unsupported, limited and unknown web tools',()=>{
  const {request,comparison}=weightedFixture(),weighted=comparison.decision.weighted,base=weighted.rows[0]
  const source={url:'https://example.com/tool',checkedAt:'2026-10-29'}
  const candidate={...base.candidate,id:'api-fixture',mapping:{...base.candidate.mapping,routeKind:'api',url:'https://example.com/api'},plan:{...base.candidate.plan,features:{...base.candidate.plan.features,code:{status:'supported',note:'API native code',sources:[source]}}}}
  comparison.analysis.requiredFeatures=['code']
  weighted.rows=[{...base,candidate}]
  comparison.recommendations=[]
  let html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  assert.match(html,/API.*참고/)
  assert.doesNotMatch(html,/id="choose-api-fixture"|계산 실행: 지원 확인/)
  assert.match(html,/웹 모델 제공:.*미확인/)
  assert.match(html,/계정.*미확인/)
  const web=base.candidate
  for(const [status,label] of [['unsupported','미지원 확인'],['limited','작업 조건 확인 필요'],['unknown','미확인']]){
    const c={...web,plan:{...web.plan,features:{...web.plan.features,code:{status,note:status,sources:[source]}}}}
    comparison.recommendations=[c];weighted.rows=[{...base,candidate:c}]
    html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
    assert.ok(html.includes(`계산 실행: ${label}`))
    assert.equal(html.includes(`id="choose-${encodeURIComponent(c.id)}"`),status!=='unsupported')
    assert.match(html,/추가 확인 필요/)
  }
})
it('renders real survey full and conditional recommendations and writing joint recommendations',()=>{
  const {html}=comparisonHtml({text:DEMO_REQUEST,overrides:{}})
  const featured=sectionFor(html,'recommended')
  assert.equal((featured.match(/<article /g)??[]).length,2)
  assert.match(featured,/Claude Opus 5.5/);assert.match(featured,/Claude Sonnet 5.5/)
  const additional=sectionFor(html,'needs-check')
  for(const name of ['GPT-6 Astra','GPT-6.1 Sol','GPT-6.1 Terra'])assert.ok(additional.includes(name))
  assert.equal((additional.match(/class="candidate-judgment">조건부 추천/g)??[]).length,3)
  assert.match(html,/추가 확인이 필요한 후보 보기 \(26\)/)
  const writing=comparisonHtml({text:'한국어 홍보 글을 써줘',overrides:{}}).html
  assert.equal((sectionFor(writing,'recommended').match(/<article /g)??[]).length,3)
  assert.match(writing,/나머지 공동 추천 \(17\)/)
  assert.match(writing,/추가 확인이 필요한 후보 보기 \(8\)/)
})
it('carries a real survey card selection into the workspace and promotes rendered Work models after sourced tool support changes',()=>{
  const request={text:DEMO_REQUEST,overrides:{}},comparison=compareCandidates(request)
  const astra=comparison.recommendations.find(c=>c.model?.id==='gpt-6-astra'&&c.mapping.routeKind==='work')
  assert.ok(astra)
  let chosen
  const tree=Comparison({comparison,request,selected:null,onSelect:id=>{chosen=id},onEdit:noop,needsCheckOpen:true})
  const button=find(tree,node=>node.props?.id===`choose-${encodeURIComponent(astra.id)}`)
  assert.ok(button,'the real conditional Work card remains selectable after checking its limits')
  button.props.onClick()
  assert.equal(chosen,astra.id)
  const selection={default:chosen,byStage:{}},bundle=buildGuideBundle(request,selection)
  const workspace=render(Workspace,{session:{request,comparison,selection,bundle,drafts:{},checks:{},activeStageId:'statistics'},onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop})
  assert.match(workspace,/GPT-6 Astra/)
  assert.match(workspace,/학년별 만족도 차이/)
  assert.match(workspace,/공부 시간과 성적의 관계/)
  assert.ok(workspace.includes(`value="${astra.id}" selected=""`))
  assert.match(workspace,/id="prompt-statistics"/)

  const changed=structuredClone(snapshot)
  for(const mapping of changed.mappings)if(mapping.routeKind==='work'&&mapping.features?.spreadsheet)mapping.features.spreadsheet={...mapping.features.spreadsheet,status:'supported'}
  const promoted=comparisonHtml(request,changed).html
  assert.equal((sectionFor(promoted,'recommended').match(/<article /g)??[]).length,3)
  assert.match(promoted,/나머지 공동 추천 \(2\)/)
  assert.match(promoted,/추가 확인이 필요한 후보 보기 \(23\)/)
  const cards=[...promoted.matchAll(/<article[^>]*data-judgment="recommended"[\s\S]*?<\/article>/g)].map(match=>match[0])
  assert.equal(cards.length,5)
  for(const name of ['Claude Opus 5.5','Claude Sonnet 5.5','GPT-6 Astra','GPT-6.1 Sol','GPT-6.1 Terra'])assert.ok(cards.some(card=>card.includes(name)),name)
  for(const card of cards){assert.match(card,/공동 추천/);assert.match(card,/필수 기능 3개 확인/)}
  assert.doesNotMatch(promoted,/class="candidate-judgment">조건부 추천/)
})
it('keeps unspecified services collapsed and preserves the legacy comparison fallback',()=>{
  const request={text:DEMO_REQUEST,overrides:{}},comparison=compareCandidates(request)
  const html=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  assert.match(html,/<details class="other-services"><summary id="other-services">다른 서비스에서 시작하기/)
  delete comparison.decision.weighted
  for(const needsCheckOpen of [false,true]){
    const legacy=render(Comparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop,needsCheckOpen})
    const disclosure=legacy.match(/<details[^>]*id="needs-check-candidates"[^>]*>/)?.[0]
    assert.ok(disclosure)
    assert.equal(disclosure.includes('open=""'),needsCheckOpen)
    assert.ok(legacy.includes(`aria-expanded="${needsCheckOpen}"`))
  }
})
it('retains raw benchmark group ranks in recommendations and folded provenance',()=>{
  for(const tied of [false,true]){
    const data=structuredClone(snapshot)
    if(tied)data.evaluations.find(e=>e.id==='east-qwen235-2507-lcb').rawScore=48.9
    const {html}=comparisonHtml({text:'알고리즘 문제 풀이',overrides:{}},data)
    const raw=html.slice(html.indexOf('<details class="evidence-section">'))
    assert.match(raw,/원점수 집합: LiveCodeBench v6/)
    assert.match(raw,/집합 내 (?:공동 )?1위/)
    assert.match(raw,/48\.9/);assert.match(raw,/45\.2/)
    if(tied)assert.equal((raw.match(/집합 내 공동 1위/g)??[]).length,2)
    else assert.match(raw,/51\.8/)
    assert.match(raw,/서비스의 추천 점수가 아닌 원점수/)
    assert.match(sectionFor(html,'recommended'),/집합 내 (?:공동 )?1위/)
  }
})
it('keeps models with sourced unsupported execution visible while disabling that web selection',()=>{
  const data=structuredClone(snapshot)
  for(const plan of data.plans.filter(p=>p.serviceId==='claude'))plan.features.code={status:'unsupported',note:'fixture unsupported',sources:[{url:'https://example.com/web-unsupported',checkedAt:'2026-10-29'}]}
  const {html}=comparisonHtml({text:DEMO_REQUEST,overrides:{}},data)
  const cards=[...html.matchAll(/<article[^>]*data-model-id="claude-[^"]+"[\s\S]*?<\/article>/g)].map(m=>m[0])
  assert.equal(cards.length,2)
  for(const card of cards){
    assert.match(card,/미지원 확인/)
    assert.doesNotMatch(card,/id="choose-/)
  }
})
it('renders effective sourced mapping tool overrides consistently with real recommendation and web selection',()=>{
  const request={text:DEMO_REQUEST,overrides:{}}
  for(const [mappingStatus,planStatus] of [['supported','unsupported'],['unsupported','supported']]){
    const data=structuredClone(snapshot),url=`https://example.com/mapping-code-${mappingStatus}`
    const override={status:mappingStatus,note:`mapping code ${mappingStatus} override`,sources:[{url,checkedAt:'2026-10-29'}]}
    for(const plan of data.plans.filter(p=>p.serviceId==='claude'))plan.features.code={status:planStatus,note:'plan code fallback must be overridden',sources:[{url:'https://example.com/plan-code-fallback',checkedAt:'2026-10-29'}]}
    for(const mapping of data.mappings.filter(m=>m.modelId==='claude-opus-5-5'&&m.routeKind==='chat'))mapping.features={...mapping.features,code:override}
    const {comparison,html}=comparisonHtml(request,data)
    const row=comparison.decision.weighted.rows.find(r=>r.candidate.model?.id==='claude-opus-5-5')
    const card=html.match(/<article[^>]*data-model-id="claude-opus-5-5"[\s\S]*?<\/article>/)?.[0]
    assert.ok(card)
    assert.equal(row.judgment,mappingStatus==='supported'?'recommended':'unsupported')
    if(mappingStatus==='supported')assert.equal(row.score,100)
    assert.match(card,mappingStatus==='supported'?/계산 실행: 지원 확인/:/계산 실행: 미지원 확인/)
    assert.equal(card.includes(`id="choose-${encodeURIComponent(row.candidate.id)}"`),mappingStatus==='supported')
    assert.ok(card.includes(`계산 실행: mapping code ${mappingStatus} override`))
    assert.ok(card.includes(`href="${url}"`))
    assert.doesNotMatch(card,/plan code fallback must be overridden|https:\/\/example.com\/plan-code-fallback/)
  }
})
it('preserves service selection and its survey workspace',()=>{
  const comparison=compareCandidates({text:DEMO_REQUEST,overrides:{}})
  const service=comparison.recommendations.find(c=>!c.model&&c.assessment.features.status==='confirmed')
  let selected
  const tree=Comparison({comparison,request:{text:DEMO_REQUEST,overrides:{}},selected:null,onSelect:id=>{selected=id},onEdit:noop})
  function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const found=find(child,predicate);if(found)return found}return null}if(predicate(node))return node;if(typeof node.type==='function')return find(node.type(node.props),predicate);return find(node.props?.children,predicate)}
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
