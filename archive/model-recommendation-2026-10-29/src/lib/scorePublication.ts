import { ESTIMATION_VERSION, PROTOCOL_VERSION, SCALE_VERSION } from './scoreEstimation.ts'
import type { EstimationResult } from './scoreEstimation.ts'
import type { RecommendationSnapshot } from '../recommendationTypes'

export interface EstimationArtifact {
  schemaVersion:1; modelVersion:string; scaleVersion:string; protocolVersion:string
  datasetVersion:string; datasetKey:string; datasetHash:string; computedAt:string
  lastExternalCollectionAt:string|null
  attempts:EstimationResult[]; published:(EstimationResult&{computedAt?:string;datasetHash?:string})[]
  history:{at:string;datasetHash:string;passed:number;retained:number;change:string}[]
  error?:string
}
export interface ScorePublication {
  state:'withheld'|'published'|'outdated'; artifact:EstimationArtifact|null
  published:EstimationArtifact['published']; attempts:EstimationResult[]
}
export const estimationInput=(data:RecommendationSnapshot)=>JSON.stringify({version:data.version,models:data.models.map(m=>[m.id,m.version]),evaluations:data.evaluations??[]})
// Browser freshness guard only. The artifact also stores a cryptographic SHA-256.
export function estimationDatasetKey(data:RecommendationSnapshot):string {
  let h=2166136261
  for(const c of estimationInput(data)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16)
}
export function validArtifact(value:unknown):value is EstimationArtifact {
  const a=value as EstimationArtifact
  const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(s=>typeof s==='string')
  const integer=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=0
  const unit=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1
  const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))
  const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
  const unique=(rows:{id:string}[])=>new Set(rows.map(r=>r.id)).size===rows.length
  const result=(r:EstimationResult)=>{
    if(!r||typeof r.id!=='string'||typeof r.scope!=='string'||!['model','agent'].includes(r.type)||!strings(r.configIds)||!strings(r.tableIds)||!strings(r.reasons)||typeof r.passed!=='boolean'||!Array.isArray(r.sources)||!r.sources.every(s=>s&&typeof s.url==='string'&&s.url.startsWith('https://')&&date(s.checkedAt))||!Array.isArray(r.scores)||!r.validation)return false
    const v=r.validation
    const provenance=r as EstimationArtifact['published'][number]
    if(provenance.datasetHash!==undefined&&!hash(provenance.datasetHash)||provenance.computedAt!==undefined&&!date(provenance.computedAt)||r.stale!==undefined&&typeof r.stale!=='boolean')return false
    if(![v.totalFolds,v.evaluableFolds,v.disconnectedFolds,v.predictions].every(integer)||v.evaluableFolds+v.disconnectedFolds!==v.totalFolds||![v.brier,v.baselineBrier,v.winRateBrier,v.accuracy,v.leaveOutAgreement,v.perturbAgreement].every(n=>n===null||unit(n))||!unit(v.leaveOutConnected))return false
    if(new Set(r.scores.map(s=>s?.configId)).size!==r.scores.length)return false
    return r.scores.every(s=>s&&typeof s.configId==='string'&&r.configIds.includes(s.configId)&&typeof s.modelId==='string'&&typeof s.modelVersion==='string'&&(s.effort===null||typeof s.effort==='string')&&s.type===r.type&&Number.isFinite(s.theta)&&(s.score===null?s.rank===null:integer(s.score)&&s.score<=100&&integer(s.rank)&&s.rank!>=1)&&typeof s.nearTie==='boolean'&&Array.isArray(s.sensitivity)&&s.sensitivity.length===2&&s.sensitivity.every(n=>integer(n)&&n<=100)&&s.sensitivity[0]<=s.sensitivity[1]&&integer(s.observations)&&integer(s.tables)&&strings(s.evaluators)&&s.evaluators.length>0&&typeof s.sourceConcentrated==='boolean'&&typeof s.uncertain==='boolean'&&s.execution&&['agentName','agentVersion','tools','harness','environment','fallbacks'].every(k=>{const value=s.execution[k as keyof typeof s.execution];return value===null||typeof value==='string'}))
  }
  return !!a&&a.schemaVersion===1&&a.modelVersion===ESTIMATION_VERSION&&a.scaleVersion===SCALE_VERSION&&a.protocolVersion===PROTOCOL_VERSION&&typeof a.datasetVersion==='string'&&typeof a.datasetKey==='string'&&hash(a.datasetHash)&&date(a.computedAt)&&(a.lastExternalCollectionAt===null||date(a.lastExternalCollectionAt))&&Array.isArray(a.history)&&a.history.every(h=>h&&date(h.at)&&hash(h.datasetHash)&&integer(h.passed)&&integer(h.retained)&&typeof h.change==='string')&&Array.isArray(a.attempts)&&Array.isArray(a.published)&&[...a.attempts,...a.published].every(result)&&unique(a.attempts)&&unique(a.published)&&a.published.every(r=>r.passed)
}
export function publicationFor(data:RecommendationSnapshot,value:unknown):ScorePublication {
  if(!validArtifact(value)||value.datasetKey!==estimationDatasetKey(data))return {state:'outdated',artifact:null,published:[],attempts:[]}
  const published=value.published.map(r=>({...r,scores:r.scores.filter(s=>data.models.some(m=>m.id===s.modelId&&m.version===s.modelVersion))})).filter(r=>r.scores.some(s=>s.score!==null))
  return {state:published.length?'published':'withheld',artifact:value,published,attempts:value.attempts}
}
