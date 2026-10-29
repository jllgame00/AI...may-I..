import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { auditSnapshot, estimateTables, selectPublished, ESTIMATION_VERSION, PROTOCOL_VERSION, SCALE_VERSION } from '../src/lib/scoreEstimation.ts'
import { estimationDatasetKey, estimationInput, validArtifact } from '../src/lib/scorePublication.ts'
import type { EstimationArtifact } from '../src/lib/scorePublication.ts'
import type { RecommendationSnapshot } from '../src/recommendationTypes.ts'

export function recomputeEstimation(data:RecommendationSnapshot,previous:EstimationArtifact|null,now=new Date().toISOString()):EstimationArtifact {
  const old=validArtifact(previous)?previous:null
  const datasetHash=createHash('sha256').update(estimationInput(data)).digest('hex')
  const attempts=estimateTables(auditSnapshot(data).tables)
  const published=selectPublished(attempts,old?.published??[]).map(result=>result.stale?{...old!.published.find(r=>r.id===result.id)!,stale:true}:{...result,computedAt:now,datasetHash})
  return {schemaVersion:1,modelVersion:ESTIMATION_VERSION,scaleVersion:SCALE_VERSION,protocolVersion:PROTOCOL_VERSION,datasetVersion:data.version,datasetKey:estimationDatasetKey(data),datasetHash,computedAt:now,lastExternalCollectionAt:old?.lastExternalCollectionAt??null,attempts,published,history:[...(old?.history??[]),{at:now,datasetHash,passed:attempts.filter(r=>r.passed).length,retained:published.filter(r=>r.stale).length,change:old?.datasetHash===datasetHash?'동일 데이터 재검증':'데이터 또는 추정 입력 변경'}].slice(-30)}
}
export async function saveEstimation(data:RecommendationSnapshot,lastExternalCollectionAt?:string):Promise<EstimationArtifact> {
  const primary='src/data/score-estimation.json',backup='.refresh-cache/score-estimation-last-good.json'
  const candidates:EstimationArtifact[]=[]
  for(const file of [primary,backup])try{const parsed=JSON.parse(await readFile(file,'utf8'));if(validArtifact(parsed))candidates.push(parsed)}catch{}
  candidates.sort((a,b)=>b.computedAt.localeCompare(a.computedAt))
  const previous=candidates[0]??null
  // Unexpected execution/storage failure leaves the existing files intact.
  const artifact=recomputeEstimation(data,previous)
  if(lastExternalCollectionAt)artifact.lastExternalCollectionAt=lastExternalCollectionAt
  const json=JSON.stringify(artifact,null,2)+'\n'
  for(const file of [backup,primary]){await mkdir(dirname(file),{recursive:true});await writeFile(file+'.tmp',json);await rename(file+'.tmp',file)}
  return artifact
}
