import { baselineSnapshot } from '../src/data/baselineSnapshot.ts'
import { collectSources, readRecoverable, saveSnapshot, validateSnapshot } from './refresh-core.ts'
import { readFile } from 'node:fs/promises'
import { mergeRefreshSnapshot } from '../src/lib/refreshSnapshot.ts'
import { applyWebTaskSupport } from '../src/data/webTaskSupport.ts'
import { saveEstimation } from './estimate-core.ts'

const primary='src/data/refresh-snapshot.json',backup='.refresh-cache/last-good.json'
let previous=await readRecoverable(primary,backup)
// A persisted workflow cache may be newer than the versioned seed.
try {const cached=await readRecoverable(backup,primary);if(Math.max(...Object.values(cached.sources).map(s=>Date.parse(s.checkedAt)))>Math.max(0,...Object.values(previous.sources).map(s=>Date.parse(s.checkedAt))))previous=cached}catch{}
if(process.argv.includes('--restore')){
  await saveSnapshot(primary,backup,previous)
  await saveEstimation(applyWebTaskSupport(mergeRefreshSnapshot(baselineSnapshot,previous)))
}
else if(process.argv.includes('--validate')){ const checked=validateSnapshot(JSON.parse(await readFile(primary,'utf8'))); console.log('Refresh snapshot valid:',Object.keys(checked.sources).length,'sources') }
else {
  const next=await collectSources(previous,baselineSnapshot.evaluations??[])
  await saveSnapshot(primary,backup,next)
  // Only record actual successful source responses from this collection, not
  // stale attempts or a local estimation/restore as a successful collection.
  const successful=Object.entries(next.sources).filter(([id,s])=>s.state==='ok'&&s.checkedAt!==previous.sources[id]?.checkedAt).map(([,s])=>s.checkedAt).sort().at(-1)
  await saveEstimation(applyWebTaskSupport(mergeRefreshSnapshot(baselineSnapshot,next)),successful)
  for(const [id,s] of Object.entries(next.sources))console.log(JSON.stringify({id,state:s.state,checkedAt:s.checkedAt,changedAt:s.changedAt,observations:s.updates.length,models:s.models?.length??0,reason:s.reason??null}))
}
