import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { validateCatalog } from '../src/lib/providerValidation.ts'
import type { ProviderCatalog } from '../src/providerTypes.ts'
export function checkedCatalog(value:unknown):ProviderCatalog {
  try {const errors=validateCatalog(value as ProviderCatalog);if(errors.length)throw new Error(errors.join('; '));return value as ProviderCatalog}catch(e){throw new Error(`Invalid provider catalog: ${e instanceof Error?e.message:'schema'}`)}
}
export async function recoverCatalog(paths:string[]):Promise<ProviderCatalog> {
  for(const path of paths)try{return checkedCatalog(JSON.parse(await readFile(path,'utf8')))}catch{}
  throw new Error('No valid provider snapshot; refusing overwrite')
}
export async function saveCatalog(primary:string,backup:string,data:ProviderCatalog):Promise<void> {
  checkedCatalog(data)
  const json=JSON.stringify(data,null,2)+'\n'
  for(const path of [backup,primary]){await mkdir(dirname(path),{recursive:true});await writeFile(path+'.tmp',json);await rename(path+'.tmp',path)}
}
export const catalogHash=(data:ProviderCatalog)=>createHash('sha256').update(JSON.stringify(data)).digest('hex')
