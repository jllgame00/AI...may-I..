import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { evaluationCases, fixtureManifest } from '../src/data/providerEvaluationCases.ts'
import { capturedArtifactValid, evaluationCandidates, fileHash, validateFixtures } from '../scripts/provider-evaluation-core.ts'
import { plannedRun } from '../src/lib/providerEvaluation.ts'

// Read this small fixture's ZIP central directory, independently of its authoring
// library. Test code only; not a general user-upload parser.
function zipText(bytes,name){
  for(let i=0;i<bytes.length-46;i++)if(bytes.readUInt32LE(i)===0x02014b50){
    const n=bytes.readUInt16LE(i+28),extra=bytes.readUInt16LE(i+30),comment=bytes.readUInt16LE(i+32)
    if(bytes.subarray(i+46,i+46+n).toString()===name){
      const local=bytes.readUInt32LE(i+42),size=bytes.readUInt32LE(i+20)
      const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28)
      const data=bytes.subarray(start,start+size)
      return (bytes.readUInt16LE(i+10)===8?inflateRawSync(data):data).toString()
    }
    i+=45+n+extra+comment
  }
  throw new Error(`Missing ZIP entry ${name}`)
}
test('saved XLSX contains twelve numeric source rows whose independently calculated answers match the key',()=>{
  const bytes=readFileSync('evaluations/fixtures/sales-v1.xlsx'),xml=zipText(bytes,'xl/worksheets/sheet1.xml')
  const values=new Map([...xml.matchAll(/<(?:x:)?c\b[^>]*r="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/(?:x:)?c>/g)].map(m=>[m[1],Number(m[2].match(/<(?:x:)?v>([^<]+)<\/(?:x:)?v>/)?.[1])]))
  const revenue=Array.from({length:12},(_,i)=>values.get(`D${i+2}`)*values.get(`E${i+2}`))
  assert.deepEqual(revenue,[100,200,150,50,300,120,80,240,160,200,100,300])
  assert.equal(revenue.reduce((a,b)=>a+b,0),2000)
  assert.equal(evaluationCases[1].expectedResult.totalRevenue,2000)
  assert.equal(evaluationCases[1].expectedResult.filteredRevenue,940)
  assert.equal(revenue.filter((_,i)=>i%2===1&&values.get(`D${i+2}`)>=10).reduce((a,b)=>a+b,0),940)
  assert.doesNotMatch(zipText(bytes,'xl/workbook.xml'),/Answer|Expected|Truth/i)
  assert.deepEqual(validateFixtures(),[])
})
test('fixture tampering, missing captures and structured results that diverge from the retained capture are rejected',()=>{
  const root=mkdtempSync(join(tmpdir(),'provider-eval-')),dir=join(root,'evaluations/fixtures');mkdirSync(dir,{recursive:true})
  assert.ok(validateFixtures(root).length)
  const c=evaluationCases[1],run={...plannedRun(c,'openai','chatgpt','chatgpt-free',fixtureManifest.bundleSha256,1),outputReference:'capture.json',executionEvidence:'log.json',sessionId:'synthetic-test-session',actualResult:{totalRevenue:2000}}
  assert.equal(capturedArtifactValid(run,root),false)
  writeFileSync(join(root,'capture.json'),JSON.stringify({rawOutput:'Unit test synthetic only',actualResult:run.actualResult,attachments:[]}))
  writeFileSync(join(root,'log.json'),JSON.stringify({runId:run.runId,sessionId:run.sessionId,testedAt:run.testedAt,fixtureHash:run.fixtureHash,freshConversation:true,accountRouteConfirmed:true,preflightVerifiedBy:'unit-test-collector'}))
  run.outputSha256=fileHash(join(root,'capture.json'))
  assert.equal(capturedArtifactValid(run,root),true)
  run.actualResult.totalRevenue=999;assert.equal(capturedArtifactValid(run,root),false)
  run.outputReference='../outside.json';assert.equal(capturedArtifactValid(run,root),false)
})
test('task preflight shortlist excludes specialist image/video services from survey and file tasks',()=>{
  for(const c of evaluationCases){
    const candidates=evaluationCandidates(c)
    assert.ok(candidates.length>0)
    assert.ok(candidates.every(r=>r.status==='preflight-required'&&!['adobe','runway'].includes(r.providerId)))
  }
  assert.ok(!evaluationCandidates(evaluationCases[1]).some(r=>r.serviceId==='notebooklm'))
})
test('production entry graph never imports the offline evidence register, grader, runs or fixtures',()=>{
  const seen=new Set(),queue=[resolve('src/main.tsx')]
  while(queue.length){
    const file=queue.pop();if(seen.has(file))continue;seen.add(file)
    assert.doesNotMatch(file,/providerEvaluation|providerEvidenceRegister|evaluations[\\/]/)
    const source=readFileSync(file,'utf8')
    for(const match of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)){
      if(!match[1].startsWith('.'))continue
      const directory=file.slice(0,Math.max(file.lastIndexOf('/'),file.lastIndexOf('\\')))
      const base=resolve(directory,match[1])
      const target=['','.ts','.tsx','.json','.css'].map(ext=>base+ext).find(existsSync)
      assert.ok(target);queue.push(target)
    }
  }
})
