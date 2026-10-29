import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { estimationDatasetKey, publicationFor, validArtifact } from './scorePublication.ts'
import { recomputeEstimation } from '../../scripts/estimate-core.ts'

test('publication rejects changed data and never transfers an old release score',()=>{
  const data=structuredClone(recommendationSnapshot),artifact=recomputeEstimation(data,null,'2026-10-29T00:00:00.000Z')
  assert.equal(publicationFor(data,artifact).state,'withheld')
  assert.equal(artifact.computedAt,'2026-10-29T00:00:00.000Z')
  assert.equal(artifact.lastExternalCollectionAt,null)
  data.models[0].version='new'
  assert.notEqual(estimationDatasetKey(data),artifact.datasetKey)
  assert.equal(publicationFor(data,artifact).state,'outdated')
  assert.deepEqual(publicationFor(data,artifact).published,[])
})
test('a malformed previous artifact is ignored and recomputation records actual success',()=>{
  const artifact=recomputeEstimation(recommendationSnapshot,{published:[{passed:true}]} as never,'2026-10-29T01:00:00.000Z')
  assert.deepEqual(artifact.published,[])
  const again=recomputeEstimation(recommendationSnapshot,artifact,'2026-10-29T02:00:00.000Z')
  assert.equal(again.history.length,2)
  assert.equal(again.history.at(-1)!.at,'2026-10-29T02:00:00.000Z')
  assert.ok(again.datasetHash)
})
test('corrupted public score shapes cannot reach cards or last-good recovery',()=>{
  const artifact=recomputeEstimation(recommendationSnapshot,null),result=artifact.attempts[0]
  const malformed={...artifact,published:[{...result,passed:true,scores:[{modelId:'x',modelVersion:'1',theta:0,score:50}]}]}
  assert.equal(validArtifact(malformed),false)
  assert.equal(publicationFor(recommendationSnapshot,malformed).state,'outdated')
  const repeated={...artifact,attempts:[result,result]}
  assert.equal(validArtifact(repeated),false)
  assert.equal(validArtifact({...artifact,published:[{...result,passed:true,stale:true,datasetHash:123}]}),false)
})
