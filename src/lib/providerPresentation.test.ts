import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, buildGuideBundle } from './aiGuide.ts'
import { accessSummary, providerStageOptions } from './providerPresentation.ts'
const request={text:'포스터 이미지를 생성해줘',overrides:{}}
test('paid representative with limited free alternatives never claims the whole company requires payment',()=>{
  const comparison=compareCandidates(request),row=comparison.recommendations.find(r=>r.plan.tier==='paid')!
  const summary=accessSummary(row,row.alternatives)
  assert.match(summary.selected,/이 추천 경로는 유료/)
  assert.match(summary.free,/무료.*확인 필요/)
  assert.doesNotMatch(JSON.stringify(summary),/1580|JPY|USD|Plus|Pro|Standard/)
})
test('stage company selector deduplicates plan options and retains an existing compatible selection',()=>{
  const comparison=compareCandidates(request),stage=buildGuideBundle(request,{default:null,byStage:{}}).steps[0]
  const all=providerStageOptions(comparison,stage)
  assert.equal(new Set(all.map(o=>o.provider.id)).size,all.length)
  const selected='chatgpt-plus'
  const retained=providerStageOptions(comparison,stage,selected)
  assert.equal(retained.find(o=>o.provider.id==='openai')!.id,selected)
})
test('a free label requires reviewed evidence for the exact service and plan',()=>{
  const row=structuredClone(compareCandidates({text:'글 작성',overrides:{}}).recommendations.find(r=>r.plan.tier==='free')!)
  assert.match(accessSummary(row).selected,/무료로 사용 가능/)
  row.evidence.forEach(e=>{e.verification='unverified'})
  assert.equal(accessSummary(row).selected,'무료·유료 조건 확인 필요')
  assert.equal(accessSummary(row).free,'이 작업의 무료 경로 미확인')
})
