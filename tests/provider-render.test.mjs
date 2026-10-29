import './react-loader.mjs'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const {default:App}=await import('../src/App.tsx')
const {default:CandidateComparison}=await import('../src/components/CandidateComparison.tsx')
const {default:Workspace}=await import('../src/components/StageWorkspace.tsx')
const {default:Analysis}=await import('../src/components/AnalysisPanel.tsx')
import { compareCandidates, buildGuideBundle, stageOptions } from '../src/lib/aiGuide.ts'
import { providerCatalog } from '../src/data/providerCatalog.ts'
import { syncDrafts, editDraft } from '../src/lib/promptSession.ts'
const noop=()=>{},render=(c,p={})=>renderToStaticMarkup(createElement(c,p))
for(const text of ['설문 문항을 작성해줘','기존 XLSX 설문 결과를 분석해줘','PDF 논문을 분석해줘','5분 발표 대본을 작성해줘','코드 오류를 수정해줘','포스터 이미지를 생성해줘','무료로 포스터 이미지를 생성해줘','XLSX 자료를 분석하고 발표자료와 발표 대본을 작성해줘'])it(`renders provider flow with real data: ${text}`,()=>{
  const request={text,overrides:{}},comparison=compareCandidates(request)
  const html=render(CandidateComparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  assert.match(html,/이 작업에 맞는 AI 회사/)
  assert.doesNotMatch(html,/집합 내|벤치마크 원점수|100점|1위|2위|3위|GPT-6|Sonnet 5/)
  const main=html.split('id="recommended-options"')[1].split('</div></div>')[0]
  const ids=[...main.matchAll(/data-provider-id="([^"]+)"/g)].map(m=>m[1])
  assert.ok(ids.length<=3);assert.equal(new Set(ids).size,ids.length)
  assert.match(html,/<details class="other-services" id="needs-check-candidates">/)
  const bundle=buildGuideBundle(request,{default:null,byStage:{}}),first=bundle.steps[0],options=stageOptions(comparison,first)
  assert.ok(options.length>0)
  const option=options.find(o=>o.status==='eligible')??options[0],selection={default:option.id,byStage:{[first.id]:option.id}}
  const drafts=syncDrafts({},bundle.steps,bundle.context);drafts[first.id]=editDraft(drafts[first.id],'직접 편집한 초안\n  공백 유지')
  const workspace=render(Workspace,{session:{request,comparison,bundle,drafts,selection,checks:{}},onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop})
  assert.match(workspace,/직접 편집한 초안/);assert.match(workspace,/프롬프트 복사/);assert.match(workspace,/stage-candidate/)
  assert.ok(workspace.includes(option.provider.name));assert.ok(workspace.includes(option.service.name))
  assert.ok(bundle.steps.every(s=>s.text.includes(text)))
})
it('renders explicit budget controls and a neutral company flow',()=>{
  assert.match(render(App),/회사·서비스 선택/)
  const html=render(Analysis,{request:{text:'무료로 글 작성',overrides:{}},onChange:noop})
  assert.match(html,/budget-mode/);assert.match(html,/budget-amount/);assert.match(html,/budget-currency/)
  assert.ok(html.includes('value="free" selected=""'))
})
it('provider display changes with sourced plan facts rather than brand priority',()=>{
  const request={text:'글 작성',overrides:{}},data=structuredClone(providerCatalog)
  for(const p of data.plans)if(p.serviceId==='claude')p.capabilities.textGeneration={status:'unknown',note:'fixture removed proof',evidenceIds:[]}
  const comparison=compareCandidates(request,data)
  assert.ok(!comparison.recommendations.some(r=>r.provider.id==='anthropic'))
  assert.ok(comparison.conditional.some(r=>r.provider.id==='anthropic'))
})
it('company detail is about service, features, usage and prompts without plan prices or research internals',()=>{
  const request={text:'이미지를 생성해줘',overrides:{}},comparison=structuredClone(compareCandidates(request))
  for(const row of [...comparison.recommendations,...comparison.remaining,...comparison.conditional,...comparison.excluded]){
    row.plan.name='INTERNAL_PLAN_NAME';row.plan.price.amount=98765
    row.plan.limits=['SecretModel-X v9 · 98765원'];row.reason='SecretModel-X benchmark 99'
    row.checks.forEach(c=>{c.note='SecretModel-X v9 benchmark 99'})
    row.evidence.forEach(e=>{e.scope='SecretModel-X v9 · 가격 98765원'})
  }
  const html=render(CandidateComparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop})
  assert.doesNotMatch(html,/SecretModel|INTERNAL_PLAN_NAME|98,?765|벤치마크|제안 비중|다른 서비스·플랜|통화코드/)
  assert.match(html,/회사 상세보기/);assert.match(html,/실제 사용 방법/);assert.match(html,/맞춤 프롬프트/)
  assert.match(html,/유료 이용 필요/);assert.match(html,/무료/)
})
it('workspace keeps plan names, model research and prices internal while retaining the edited prompt',()=>{
  const request={text:'이미지를 생성해줘',overrides:{}},comparison=structuredClone(compareCandidates(request))
  for(const row of comparison.byWork.image.flatMap(r=>[r,...r.alternatives])){
    row.plan.name='INTERNAL_PLAN_NAME';row.plan.price.amount=98765
    row.checks.forEach(c=>{c.note='SecretModel-X v9 benchmark 99'})
    row.evidence.forEach(e=>{e.scope='SecretModel-X v9 98765원'})
    row.gaps=['SecretModel-X v9 98765원']
  }
  const bundle=buildGuideBundle(request,{default:null,byStage:{}}),stage=bundle.steps[0]
  const selected=stageOptions(comparison,stage).find(o=>o.status==='eligible')
  const drafts=syncDrafts({},bundle.steps,bundle.context)
  drafts[stage.id]=editDraft(drafts[stage.id],'사용자가 보존한 편집 초안')
  const html=render(Workspace,{session:{request,comparison,bundle,drafts,selection:{default:selected.id,byStage:{}},checks:{}},onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop})
  assert.doesNotMatch(html,/SecretModel|INTERNAL_PLAN_NAME|98,?765|벤치마크|통화코드/)
  assert.match(html,/사용자가 보존한 편집 초안/);assert.match(html,/공식 이용 안내/)
  assert.match(html,/이 추천 경로는 유료 이용 필요/);assert.match(html,/필수 기능 사용 확인/)
})
