import { it } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, buildGuideBundle } from './aiGuide.ts'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import { primaryAccessCandidates } from './modelAccess.ts'
import { taskReady } from './taskReadiness.ts'
import { syncDrafts, editDraft } from './promptSession.ts'
import { applyWebTaskSupport } from '../data/webTaskSupport.ts'

const request={text:'대학생 120명의 설문 엑셀에서 학년별 만족도 차이와 공부 시간·성적의 관계를 분석하고 A4 4장 보고서를 작성하고 싶다.',overrides:{}}

it('actual reviewed app data yields executable choices independently of performance and personal account checks',()=>{
  const result=compareCandidates(request)
  const ready=primaryAccessCandidates(result.recommendations,result.analysis.requiredFeatures).filter(c=>taskReady(c,result.analysis.requiredFeatures))
  assert.ok(ready.length>0)
  for(const c of ready){
    assert.equal(c.assessment?.features.status,'confirmed')
    assert.equal(c.assessment?.model.status,'confirmed')
    assert.equal(c.assessment?.route.status,'confirmed')
    assert.equal(c.assessment?.account.status,'unchecked')
    assert.ok(c.assessment?.account.checks.length)
    assert.equal(c.assessment?.performance.status,'unconfirmed')
    assert.equal(c.assessment?.performance.rank,null)
    assert.equal(c.score,null)
  }
  assert.ok(result.decision!.entries.every(e=>e.rank===null))
})
it('keeps every unspecified-model service route visible without attaching a named-model evaluation',()=>{
  const result=compareCandidates(request)
  const services=result.recommendations.filter(c=>!c.model)
  assert.ok(services.length>0)
  const visible=primaryAccessCandidates(result.recommendations,result.analysis.requiredFeatures)
  for(const c of services){
    assert.ok(visible.some(v=>v.id===c.id))
    assert.equal(c.mapping.modelId,null)
    assert.deepEqual(c.evidence,[])
    assert.equal(c.assessment?.model.status,'unknown')
    assert.equal(c.assessment?.performance.status,'unconfirmed')
    assert.equal(c.assessment?.performance.rank,null)
    assert.ok(!result.decision!.entries.some(e=>e.candidate.id===c.id&&e.evaluation))
  }
  assert.ok(services.some(c=>c.assessment?.features.status==='confirmed'&&c.assessment.route.status==='confirmed'))
})
it('public support survives unchecked account settings and absent unrelated benchmark numbers',()=>{
  const before=compareCandidates(request),data=structuredClone(snapshot)
  data.evaluations=[]
  const after=compareCandidates(request,data)
  const states=(r:typeof before)=>r.recommendations.map(c=>[c.id,c.assessment?.features.status,c.assessment?.model.status,c.assessment?.route.status,c.assessment?.account.status])
  assert.deepEqual(states(after),states(before))
  assert.ok(after.recommendations.some(c=>c.assessment?.features.status==='confirmed'))
})
it('reviews every registered release using the same source and version boundary without changing evaluation data',()=>{
  assert.ok(snapshot.models.every(m=>m.webReview?.checkedAt&&m.webReview.sources.length&&m.webReview.note))
  const data=structuredClone(snapshot)
  const before=structuredClone(data.evaluations)
  const mapping=data.mappings.find(m=>m.routeKind==='chat'&&m.status==='confirmed'&&m.modelId)!
  mapping.modelVersion='unreviewed-next-release';mapping.status='unknown';mapping.selectable=false
  const reviewed=applyWebTaskSupport(data)
  assert.equal(reviewed.mappings.find(m=>m.id===mapping.id)!.status,'unknown')
  assert.deepEqual(reviewed.evaluations,before)
  for(const m of reviewed.mappings.filter(m=>m.status==='confirmed'&&m.modelId&&m.routeKind==='chat')){
    assert.ok(m.sources.some(s=>s.url.includes('academy.claude.com')&&s.checkedAt))
  }
})
it('service selection builds the existing survey prompts and preserves edited drafts on an exact-model switch',()=>{
  const result=compareCandidates(request)
  const service=result.recommendations.find(c=>!c.model&&c.assessment?.features.status==='confirmed')!
  const model=result.recommendations.find(c=>c.assessment?.start==='ready')!
  assert.ok(service&&model)
  const bundle=buildGuideBundle(request,{default:service.id,byStage:{}})
  assert.deepEqual(bundle.steps.map(s=>s.id),['statistics','interpretation','report','review'])
  assert.match(bundle.steps[0].text,/학년별 만족도 차이/)
  assert.match(bundle.steps[0].text,/공부 시간과 성적의 관계/)
  assert.doesNotMatch(bundle.steps[0].text,/AIME|Last Exam|claude-|gpt-|https:/)
  let drafts=syncDrafts({},bundle.steps,bundle.context)
  drafts.statistics=editDraft(drafts.statistics,'사용자가 편집한 통계 분석 초안\n수정 내용 유지')
  const next=buildGuideBundle(request,{default:model.id,byStage:{}})
  assert.deepEqual(next.steps.map(s=>s.text),bundle.steps.map(s=>s.text))
  drafts=syncDrafts(drafts,next.steps,next.context)
  assert.equal(drafts.statistics.text,'사용자가 편집한 통계 분석 초안\n수정 내용 유지')
})
it('does not claim input requirements are confirmed when survey input format remains unresolved',()=>{
  const result=compareCandidates({text:'설문 결과를 분석해 줘',overrides:{}})
  assert.equal(result.analysis.inputMode,'unknown')
  assert.ok(result.recommendations.every(c=>c.assessment?.start!=='ready'))
  assert.ok(result.recommendations.every(c=>c.assessment?.input.status==='unknown'))
})
it('keeps published exact web availability confirmed when reasoning mode alone is unknown',()=>{
  const result=compareCandidates(request)
  const c=result.recommendations.find(c=>c.mapping.status==='confirmed'&&c.mapping.routeKind==='chat'&&c.mapping.mode===null&&c.model)!
  assert.ok(c)
  assert.equal(c.assessment?.model.status,'confirmed')
  assert.equal(c.assessment?.model.mode,'unknown')
  assert.equal(c.assessment?.route.status,'confirmed')
  assert.equal(c.assessment?.performance.status,'unconfirmed')
})
