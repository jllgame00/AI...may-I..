import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { providerCatalog } from '../data/providerCatalog.ts'
import { recoverCatalog, saveCatalog, checkedCatalog } from '../../scripts/provider-data-core.ts'
test('invalid imports never overwrite the last good catalog and corrupt primary recovers backup',async()=>{
  const root=await mkdtemp(join(tmpdir(),'provider-qa-')),primary=join(root,'primary.json'),backup=join(root,'backup.json')
  try{
    await saveCatalog(primary,backup,providerCatalog)
    const before=await readFile(primary,'utf8')
    assert.throws(()=>checkedCatalog({providers:[]}))
    await assert.rejects(saveCatalog(primary,backup,{providers:[]} as never))
    assert.equal(await readFile(primary,'utf8'),before)
    await writeFile(primary,'broken json')
    assert.deepEqual(await recoverCatalog([primary,backup]),providerCatalog)
  }finally{await rm(root,{recursive:true,force:true})}
})
