import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { providerCatalog as seed } from './provider-catalog-seed.ts'
import { recoverCatalog, checkedCatalog, saveCatalog, catalogHash } from './provider-data-core.ts'
import { PROVIDER_POLICY } from '../src/data/providerPolicy.ts'
const primary='src/data/provider-catalog.json',backup='.refresh-cache/provider-last-good.json'
if(process.argv.includes('--validate')){
  const data=checkedCatalog(JSON.parse(await readFile(primary,'utf8')))
  console.log(`Provider snapshot valid: ${data.providers.length} providers / ${data.services.length} services / ${data.plans.length} plans`)
}else{
  const importIndex=process.argv.indexOf('--import')
  const next=importIndex>=0?checkedCatalog(JSON.parse(await readFile(process.argv[importIndex+1],'utf8'))):process.argv.includes('--restore')?await recoverCatalog([backup,primary]).catch(()=>checkedCatalog(seed)):await recoverCatalog([primary,backup])
  const digest=catalogHash(next),now=new Date().toISOString()
  await saveCatalog(primary,backup,next)
  await mkdir('.refresh-cache',{recursive:true})
  await writeFile('.refresh-cache/provider-state.json',JSON.stringify({version:next.version,policyVersion:PROVIDER_POLICY.version,storedAt:now,digest,externalCollectionAt:null,action:importIndex>=0?'reviewed-import':process.argv.includes('--restore')?'restore':'validate-and-preserve'},null,2))
  console.log(JSON.stringify({providers:next.providers.length,services:next.services.length,version:next.version,digest,storedAt:now,externalCollectionAt:null,note:'공식 검토 스냅샷 검증·보존. 외부 수집을 실행하거나 출처 확인일을 변경하지 않았습니다.'}))
}
