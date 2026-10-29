import { it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { createHash } from 'node:crypto'
it('current entry-point import graph cannot reach any archived model recommendation engine',()=>{
  const root=process.cwd(),seen=new Set(),queue=[resolve('src/main.tsx')]
  while(queue.length){
    const file=queue.pop();if(seen.has(file))continue;seen.add(file)
    assert.ok(relative(resolve('src'),file).split(/[\\/]/)[0]!=='..',file)
    const text=readFileSync(file,'utf8')
    for(const match of text.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)){
      const spec=match[1];if(!spec.startsWith('.'))continue
      const full=resolve(dirname(file),spec),resolved=['','.ts','.tsx','.json','.css'].map(ext=>full+ext).find(existsSync)
      assert.ok(resolved,`${file} -> ${spec}`);queue.push(resolved)
    }
  }
  for(const file of seen)assert.doesNotMatch(file,/weightedRecommendation|scoreEstimation|taskRanking|recommendationSnapshot|baselineSnapshot|modelEvidence/)
})
it('all 106 pre-existing files including uncommitted edits remain byte-identical in the archive',()=>{
  const root='archive/model-recommendation-2026-10-29',manifest=JSON.parse(readFileSync(`${root}/preservation-manifest.json`,'utf8'))
  assert.equal(Object.keys(manifest).length,106)
  for(const [file,expected] of Object.entries(manifest)){const path=resolve(root,file.replaceAll('\\','/'));assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),expected,file)}
})
it('new policy has no imports of the archived score tables and active data has no evaluation records',()=>{
  const files=['src/lib','src/data'].flatMap(dir=>readdirSync(dir).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>`${dir}/${f}`))
  for(const file of files)assert.doesNotMatch(readFileSync(file,'utf8'),/from\s*['"][^'"]*(?:archive|recommendationSnapshot|weightedRecommendation|modelEvidence|scoreEstimation)/)
  const data=JSON.parse(readFileSync('src/data/provider-catalog.json','utf8'))
  assert.equal(data.evaluations,undefined)
})
it('production entry graph never imports the offline evidence register, grader, runs or fixtures',()=>{
  const seen=new Set(),queue=[resolve('src/main.tsx')]
  while(queue.length){
    const file=queue.pop();if(seen.has(file))continue;seen.add(file)
    assert.doesNotMatch(file,/providerEvaluation|providerEvidenceRegister|evaluations[\\/]/)
    const source=readFileSync(file,'utf8')
    for(const match of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)){
      if(!match[1].startsWith('.'))continue
      const base=resolve(dirname(file),match[1])
      const target=['','.ts','.tsx','.json','.css'].map(ext=>base+ext).find(existsSync)
      assert.ok(target);queue.push(target)
    }
  }
})
it('retired research and evaluation files and the retained Arena source preserve original bytes',()=>{
  const manifest=JSON.parse(readFileSync('archive/production-cleanup-preservation.json','utf8'))
  for(const row of [...manifest.movedFiles,...manifest.removedDuplicates.map(row=>({...row,path:row.retainedPath}))]){
    assert.equal(createHash('sha256').update(readFileSync(row.path)).digest('hex'),row.sha256,row.path)
  }
})
