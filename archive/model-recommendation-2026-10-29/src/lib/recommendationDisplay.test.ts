import { it } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, DEMO_REQUEST } from './aiGuide.ts'
import { primaryAccessCandidates } from './modelAccess.ts'
import { recommendationDisplay } from './recommendationDisplay.ts'

it('keeps task judgments independent of web display routes and preserves the supported joint recommendations',()=>{
  const comparison=compareCandidates({text:DEMO_REQUEST,overrides:{}}),before=JSON.stringify(comparison)
  const result=recommendationDisplay(comparison,primaryAccessCandidates(comparison.recommendations))
  assert.equal(result.length,comparison.decision!.weighted!.rows.length)
  assert.equal(result.filter(row=>row.rank===1&&row.tied&&row.score===100).length,2)
  assert.ok(result.some(row=>row.score===null&&row.rank===null))
  assert.ok(result.every(row=>row.candidate.model&&row.reason))
  assert.equal(JSON.stringify(comparison),before)
})
it('does not hide task evidence after candidate selection changes execution readiness or prices',()=>{
  const comparison=structuredClone(compareCandidates({text:'알고리즘 문제 풀이',overrides:{}}))
  const signature=()=>recommendationDisplay(comparison,comparison.recommendations).map(row=>[row.candidate.model!.id,row.score,row.rank]).sort()
  const before=signature()
  comparison.recommendations.reverse()
  for(const candidate of comparison.recommendations){candidate.mapping.status='unknown';candidate.plan.tier='paid';candidate.plan.price.amount=99999}
  assert.deepEqual(signature(),before)
})
