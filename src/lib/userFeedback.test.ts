import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as requirements from './providerRequirements.ts'
import {compareProviders} from './providerRecommendation.ts'
import {providerCatalog} from '../data/providerCatalog.ts'
import {buildGuideBundle,updateGuideRequest} from './aiGuide.ts'
import {resolveDeliverables} from './deliverables.ts'
import {usageSteps,providerStageOptions} from './providerPresentation.ts'
import type {PromptRequest,Session} from '../types.ts'

const request=(text:string):PromptRequest=>({text,overrides:{}})
test('free preference is distinct from undecided and paid permission without inventing a country',()=>{
  const unknown=requirements.analyzeRequirements(request('홍보 글 작성')).budget
  const preferred=requirements.analyzeRequirements(request('가능하면 무료로 홍보 글 작성')).budget
  assert.equal(unknown.freeOnly,null);assert.ok(!unknown.preferFree)
  assert.equal(preferred.freeOnly,null);assert.equal(preferred.preferFree,true)
  assert.equal(preferred.country,null);assert.equal(preferred.currency,null)
  assert.ok(!requirements.analyzeRequirements(request('가능하면 무료로 홍보 글 작성')).questions.some(q=>q.id==='budget'))
  assert.equal(requirements.analyzeRequirements(request('무료만 이용해서 홍보 글 작성')).budget.freeOnly,true)
  assert.equal(requirements.analyzeRequirements(request('유료도 괜찮아요. 홍보 글 작성')).budget.freeOnly,false)
})
test('all four budget choices preserve explicit monetary limits and existing manual task choices',()=>{
  const original={...request('한국에서 월 2만원 이하로 PPT 자료를 만들어줘'),tasks:['slides'] as const}
  for(const mode of ['free','prefer-free','paid-ok','unknown'] as const){
    const changed=requirements.setBudgetPreference({...original,tasks:[...original.tasks]},mode)
    assert.equal(changed.text,original.text);assert.deepEqual(changed.tasks,['slides'])
    const b=requirements.analyzeRequirements(changed).budget
    assert.equal(b.maxMonthly,20000);assert.equal(b.currency,'KRW');assert.equal(b.country,'KR')
    assert.equal(b.freeOnly,mode==='free'?true:mode==='paid-ok'?false:null)
    assert.equal(b.preferFree,mode==='prefer-free')
  }
})
test('free preference prioritizes proved free eligible paths and keeps paid eligible paths',()=>{
  const data=structuredClone(providerCatalog)
  for(const p of data.plans)if(!['claude-pro','gemini-free'].includes(p.id))p.capabilities.textGeneration={status:'unknown',note:'test-only missing support',evidenceIds:[]}
  const neutral=compareProviders(request('홍보 글 작성'),data)
  assert.deepEqual(neutral.recommendations.map(o=>o.id),['claude-pro','gemini-free'])
  const preferred=compareProviders(request('가능하면 무료로 홍보 글 작성'),data)
  assert.deepEqual(preferred.recommendations.map(o=>o.id),['gemini-free','claude-pro'])
  assert.equal(preferred.allOptions.find(o=>o.id==='claude-pro')!.status,'eligible')
  const free=compareProviders(request('무료로 홍보 글 작성'),data)
  assert.equal(free.allOptions.find(o=>o.id==='claude-pro')!.budgetStatus,'unmet')
  data.plans.find(p=>p.id==='gemini-free')!.price.evidenceIds=[]
  assert.deepEqual(compareProviders(request('가능하면 무료로 홍보 글 작성'),data).recommendations.map(o=>o.id),['claude-pro','gemini-free'])
})
test('budget intention edits do not freeze monetary conditions parsed from the source text',()=>{
  const selected=requirements.setBudgetPreference(request('한국에서 월 2만원 이하로 홍보 글 작성'),'prefer-free')
  const edited=requirements.analyzeRequirements({...selected,text:'월 1만원 이하로 홍보 글 작성'}).budget
  assert.equal(edited.maxMonthly,10000);assert.equal(edited.currency,'KRW');assert.equal(edited.country,null)
  assert.equal(edited.preferFree,true)
  const explicit={...request('홍보 글 작성'),budget:{freeOnly:false,maxMonthly:15,currency:'USD',country:'US'}}
  assert.equal(requirements.analyzeRequirements(requirements.setBudgetPreference(explicit,'prefer-free')).budget.maxMonthly,15)
})
test('free preference never promotes an unknown free capability over a supported paid route',()=>{
  const r=compareProviders(request('가능하면 무료로 우리 학교 배경의 일러스트를 만들어줘'))
  assert.ok(r.recommendations.length)
  for(const row of r.recommendations)assert.ok(row.checks.every(c=>c.status==='supported'))
  assert.ok(r.allOptions.some(o=>o.plan.tier==='paid'&&o.status==='eligible'))
  assert.ok(!r.recommendations.some(o=>o.checks.some(c=>c.status==='unknown'||c.status==='limited')))
})
test('school illustration and promotion retain their final deliverables and truthful capability gates',()=>{
  for(const [text,category,capability] of [['우리 학교를 배경으로 한 일러스트를 만들어줘.','image','imageGeneration'],['동아리 신입생 모집 홍보 글을 작성해줘.','writing','textGeneration']] as const){
    const r=compareProviders(request(text));assert.ok(r.requirements.works.some(w=>w.category===category));assert.ok(r.requirements.required.includes(capability))
    assert.ok(r.recommendations.length);for(const row of r.recommendations)assert.ok(row.checks.every(c=>c.status==='supported'))
  }
  const bundle=buildGuideBundle(request('동아리 신입생 모집 홍보 글을 작성해줘.'),{default:null,byStage:{}})
  assert.equal(bundle.steps[0].deliverable?.kind,'promotion_final')
  assert.match(bundle.steps[0].text,/실제로 배포할 홍보/)
})
test('PPT files require slides creation while PPT outline or content planning requires text only',()=>{
  const file=request('인공지능 윤리를 주제로 발표할 PPT 자료를 만들어줘.')
  assert.deepEqual(resolveDeliverables(file).map(d=>d.kind),['slides'])
  const result=compareProviders(file)
  assert.deepEqual(result.requirements.works.map(w=>w.category),['slides']);assert.deepEqual(result.requirements.required,['slidesCreation'])
  assert.ok(result.recommendations.length)
  for(const o of result.recommendations)assert.equal(o.checks.find(c=>c.id==='slidesCreation')?.status,'supported')
  for(const text of ['PPT 개요를 만들어줘','PPT 내용을 기획해줘','발표자료의 목차만 작성해줘','PPT를 기획해줘','발표자료를 기획해줘','PPT 내용을 구성해줘','파워포인트 개요를 작성해줘']){
    const r=requirements.analyzeRequirements(request(text))
    assert.deepEqual(r.works.map(w=>w.category),['writing'],text);assert.deepEqual(r.required,['textGeneration'],text)
    assert.deepEqual(resolveDeliverables(request(text)).map(d=>d.kind),['presentation_outline'])
  }
})
test('unconfirmed image and slide routes guide verification instead of promising creation',()=>{
  for(const [text,capability] of [['이미지를 생성해줘','imageGeneration'],['발표자료를 만들어줘','slidesCreation']] as const){
    const r=compareProviders(request(text)),unknown=r.conditional.find(o=>o.checks.some(c=>c.id===capability&&c.status==='unknown'))!
    assert.ok(unknown);assert.match(usageSteps(unknown).join('\n'),/지원 여부.*먼저.*확인/)
  }
})
test('PPT planning does not erase a separately requested final file or turn reference material into a new output',()=>{
  for(const text of ['PPT 목차를 만들고 실제 PPT 파일도 만들어줘','발표자료 목차를 만들고 최종 슬라이드 파일도 생성해줘','PPT 목차와 실제 PPT 파일을 생성해줘']){
    const kinds=resolveDeliverables(request(text)).map(d=>d.kind)
    assert.ok(kinds.includes('presentation_outline'),text);assert.ok(kinds.includes('slides'),text)
    assert.ok(requirements.analyzeRequirements(request(text)).required.includes('slidesCreation'),text)
  }
  assert.deepEqual(resolveDeliverables(request('PPT 개요를 바탕으로 발표자료를 만들어줘')).map(d=>d.kind),['slides'])
  assert.deepEqual(resolveDeliverables(request('PPT 목차를 참고해 홍보 글을 작성해줘')).map(d=>d.kind),['promotion_final'])
  assert.deepEqual(requirements.analyzeRequirements(request('PPT 목차를 참고해 홍보 글을 작성해줘')).required,['textGeneration'])
})
test('manual multi-task selection survives other edits and source changes without losing drafts',()=>{
  const initial:Session={request:{...request('홍보 글 작성'),tasks:['writing','image']},bundle:null,drafts:{keep:{text:'직접 쓴 초안',context:'original',previous:null}},checks:{}}
  const next=updateGuideRequest(initial,{...initial.request,text:'PPT 자료 생성',budget:{freeOnly:null,preferFree:true,maxMonthly:null,currency:null,country:null}})
  assert.deepEqual(requirements.analyzeRequirements(next.request).works.map(w=>w.category),['writing','image'])
  assert.strictEqual(next.drafts,initial.drafts)
  assert.deepEqual(requirements.analyzeRequirements({...next.request,tasks:[]}).works,[])
})
test('provider deduplication and selected Google service survive budget choices and stage display',()=>{
  for(const text of ['홍보 글 작성','가능하면 무료로 홍보 글 작성','무료로 홍보 글 작성','유료도 괜찮아요. 홍보 글 작성']){
    const r=compareProviders(request(text)),rows=[...r.recommendations,...r.remaining,...r.conditional,...r.excluded]
    assert.equal(new Set(rows.map(o=>o.provider.id)).size,rows.length)
    const bundle=buildGuideBundle(request(text),{default:null,byStage:{}})
    const options=providerStageOptions(r,bundle.guideStages![0],'notebooklm-unreviewed')
    assert.equal(new Set(options.map(o=>o.provider.id)).size,options.length)
    assert.equal(options.find(o=>o.provider.id==='google')?.service.id,'notebooklm')
  }
})
