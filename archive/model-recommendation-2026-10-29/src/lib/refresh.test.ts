import { it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { collectSources, parseCard, parseDiscovery, readRecoverable, saveSnapshot, cardSources, validateSnapshot } from '../../scripts/refresh-core.ts'
import { baselineSnapshot } from '../data/baselineSnapshot.ts'
import { mergeRefreshSnapshot } from './refreshSnapshot.ts'
import { compareCandidates } from './aiGuide.ts'

const config=cardSources[0]
it('accepts official API license tags for new identities while leaving web and features unknown',()=>{
  const m=parseDiscovery(JSON.stringify([{id:'Qwen/NewRelease',author:'Qwen',pipeline_tag:'text-generation',sha:'a'.repeat(40),tags:['license:apache-2.0']}]),'2026-10-28')[0]
  assert.equal(m.version,'a'.repeat(40));assert.deepEqual(m.capabilities,[]);assert.deepEqual(m.modes,[]);assert.equal(m.route?.kind,'self-hosted')
  assert.throws(()=>parseDiscovery(JSON.stringify([{id:'other/NewRelease',author:'Qwen'}]),'2026-10-28'))
})
const rows=baselineSnapshot.evaluations!.filter(e=>e.source.url.endsWith(config.model))
const fixture=`---\nlicense: apache-2.0\n---\n| ${config.headers.join(' | ')} |\n`+[
  ['MMLU-Pro',81.2,79.8,86.6,81.1,75.2,83],['GPQA',68.4,66.9,74.9,75.1,62.9,77.5],['AIME25',46.6,26.7,33.9,49.5,24.7,70.3],['LiveCodeBench v6 (25.02-25.05)',45.2,35.8,44.6,48.9,32.9,51.8],['Creative Writing v3',81.6,84.9,83.8,88.1,80.4,87.5],['WritingBench',74.5,75.5,79.2,86.2,77,85.2],
].map(r=>`| ${r.join(' | ')} |`).join('\n')
it('parses actual source columns, rejects empty/schema/score/license changes without manufacturing scores',()=>{
  const values=parseCard(fixture,config,rows)
  assert.equal(values.find(e=>e.id==='east-qwen235-2507-lcb')?.rawScore,51.8)
  for(const invalid of ['',fixture.replace('51.8','150'),fixture.replace('51.8','-'),fixture.replace('51.8','99'),fixture.replace('apache-2.0','other'),fixture.replace('Kimi K2','Kimi next')])assert.throws(()=>parseCard(invalid,config,rows))
})
it('isolates failed sources, preserves last good data and separates check from data change time',async()=>{
  const fetcher=(async(url:Parameters<typeof fetch>[0])=>new Response(String(url).includes('235B')?fixture:'', {status:String(url).includes('235B')?200:503})) as typeof fetch
  const first=await collectSources({schemaVersion:1,sources:{}},rows,fetcher,'2026-10-28T01:00:00Z')
  assert.equal(first.sources.qwen235.state,'ok');assert.equal(first.sources.qwen30.state,'stale');assert.equal(first.sources.aa.state,'disabled')
  const same=await collectSources(first,rows,fetcher,'2026-10-28T02:00:00Z')
  assert.equal(same.sources.qwen235.changedAt,first.sources.qwen235.changedAt)
  assert.notEqual(same.sources.qwen235.checkedAt,first.sources.qwen235.checkedAt)
  const failed=await collectSources(same,rows,(async()=>new Response('')) as typeof fetch,'2026-10-28T03:00:00Z')
  assert.deepEqual(failed.sources.qwen235.updates,first.sources.qwen235.updates)
  assert.equal(failed.sources.qwen235.state,'stale')
})
it('recovers across processes from a corrupt primary and refuses to overwrite without any valid recovery',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ai-guide-refresh-'))
  try{
    const p=join(dir,'current.json'),b=join(dir,'backup.json'),snapshot={schemaVersion:1 as const,sources:{}}
    await saveSnapshot(p,b,snapshot)
    await writeFile(p,'corrupt')
    assert.deepEqual(await readRecoverable(p,b),snapshot)
    await writeFile(b,'corrupt')
    await assert.rejects(()=>readRecoverable(p,b),/refusing/)
    assert.equal(await readFile(p,'utf8'),'corrupt')
    assert.throws(()=>validateSnapshot({schemaVersion:1,sources:{x:{updates:[{id:'x',rawScore:NaN}]}}}))
  }finally{await rm(dir,{recursive:true,force:true})}
})
it('rejects empty successful source responses before they can replace recovery data',()=>{
  assert.throws(()=>validateSnapshot({schemaVersion:1,sources:{qwen235:{checkedAt:'2026-10-29T00:00:00Z',changedAt:null,hash:null,state:'ok',updates:[]}}}))
})
it('connects a changed real source column through normalization into calculated recommendation ranks',async()=>{
  const changed=await collectSources({schemaVersion:1,sources:{}},rows,(async(url)=>new Response(String(url).includes('235B')?fixture.replace('51.8','48.9'):'',{status:String(url).includes('235B')?200:503})) as typeof fetch)
  const data=mergeRefreshSnapshot(baselineSnapshot,changed)
  const d=compareCandidates({text:'알고리즘 문제 풀이',overrides:{}},data).decision!
  assert.deepEqual(d.entries.slice(0,2).map(e=>[e.rank,e.tied,e.evaluation?.rawScore]),[[1,true,48.9],[1,true,48.9]])
})
it('retains a complete recovery source when a newer valid file only contains an empty failed source',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ai-guide-recovery-'))
  try{
    const p=join(dir,'current.json'),b=join(dir,'backup.json')
    const good=await collectSources({schemaVersion:1,sources:{}},rows,(async(url)=>new Response(String(url).includes('235B')?fixture:'',{status:String(url).includes('235B')?200:503})) as typeof fetch,'2026-10-28T00:00:00Z')
    await saveSnapshot(p,b,good)
    await writeFile(p,JSON.stringify({schemaVersion:1,sources:{qwen235:{checkedAt:'2026-10-29T00:00:00Z',changedAt:null,hash:null,state:'stale',updates:[]}}}))
    const restored=await readRecoverable(p,b)
    assert.deepEqual(restored.sources.qwen235.updates,good.sources.qwen235.updates)
    assert.equal(restored.sources.qwen235.state,'stale')
    assert.ok(restored.sources.qwen30)
  }finally{await rm(dir,{recursive:true,force:true})}
})
it('rejects valid-looking score corruption when the stored fingerprint no longer matches',async()=>{
  const good=await collectSources({schemaVersion:1,sources:{}},rows,(async(url)=>new Response(String(url).includes('235B')?fixture:'',{status:String(url).includes('235B')?200:503})) as typeof fetch)
  good.sources.qwen235.updates[0].rawScore-=1
  assert.throws(()=>validateSnapshot(good))
})
