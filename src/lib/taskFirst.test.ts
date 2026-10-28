import { it } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { compareCandidates, buildGuideBundle, guideContext } from './aiGuide.ts'
import { syncDrafts, editDraft } from './promptSession.ts'
import { analyzeRequest } from './recommend.ts'
import { fixture } from './fixtures/recommendation.ts'
import type { PromptRequest } from '../types.ts'

const request:PromptRequest={text:'Python 코드 버그 수정',tasks:['coding'],overrides:{},usageRoute:'consumer'}
it('makes recommendation identity, order, task fit and access independent of price and free tier', () => {
  const before=compareCandidates(request)
  const changed=structuredClone(recommendationSnapshot)
  for(const p of changed.plans){p.tier=p.tier==='free'?'paid':'free';p.price={amount:null,currency:null,period:null,region:'미확인'}}
  const project=(r:ReturnType<typeof compareCandidates>)=>r.recommendations.map(c=>({id:c.id,suitability:c.suitability,accessStatus:c.accessStatus,score:c.score,evidence:c.evidence?.map(e=>e.id)}))
  assert.deepEqual(project(compareCandidates(request,changed)),project(before))
  assert.ok(before.recommendations.filter(c=>c.mapping.routeKind==='work').every(c=>c.suitability==='조건 비교 가능'))
})
it('shows exact model task evidence separately from unconfirmed consumer subscription entitlement', () => {
  const comparison=compareCandidates(request)
  const c=comparison.recommendations.find(c=>c.plan.id==='claude-pro' && c.model?.id==='claude-sonnet-5-5')!
  assert.equal(c.suitability,'조건 비교 가능');assert.equal(c.accessStatus,'연결 미확인')
  assert.equal(c.evidence!.length,3);assert.equal(c.mapping.status,'unknown')
  assert.match(buildGuideBundle(request,{default:c.id,byStage:{}}).steps[0].text,/정확한 모델 제공은 미확인/)
})
it('has no weighted price or synthetic aggregate scoring even for former legacy fixtures', () => {
  const result=analyzeRequest({text:'Python 코드 수정',tasks:['coding'],priority:'quality'},fixture())
  assert.equal(result.recommendations.length,3)
  assert.ok(result.recommendations.every(c=>c.score===null && c.scores.benchmark===null && !('cost' in c.scores)))
})
it('keeps drafts through a price-independent model change and regenerates the correct route instructions', () => {
  const apiRequest:PromptRequest={...request,usageRoute:'api'}
  const cs=compareCandidates(apiRequest).recommendations
  const a=cs.find(c=>c.model?.id==='gpt-6.1-terra')!,b=cs.find(c=>c.model?.id==='claude-opus-5-5')!
  const first=buildGuideBundle(apiRequest,{default:a.id,byStage:{}}).steps[0]
  const next=buildGuideBundle(apiRequest,{default:b.id,byStage:{}}).steps[0]
  const drafts=syncDrafts({},[first],guideContext(first))
  drafts[first.id]=editDraft(drafts[first.id],'직접 편집한 초안')
  assert.equal(syncDrafts(drafts,[next],guideContext(next))[first.id].text,'직접 편집한 초안')
  assert.match(next.text,/claude-opus-5-5/);assert.match(next.text,/https:\/\/platform.claude.com\//)
  assert.doesNotMatch(next.text,/예산:|무료만 사용|무료 선호/)
})
it('never confirms exact model access without explicit mapping version provenance', () => {
  const data=structuredClone(recommendationSnapshot)
  const m=data.mappings.find(m=>m.modelId==='gpt-6.1-terra' && m.routeKind==='api')!
  delete m.modelVersion
  const c=compareCandidates({...request,usageRoute:'api'},data).recommendations.find(c=>c.id===m.id)!
  assert.equal(c.accessStatus,'연결 미확인')
  assert.equal(c.suitability,'조건 비교 가능')
  assert.ok(c.holds.some(h=>h.includes('플랜 연결 미확인')))
})
