import { createHash } from 'node:crypto'
import { readFileSync, existsSync, statSync, realpathSync } from 'node:fs'
import { resolve, relative, isAbsolute } from 'node:path'
import { evidenceRegister } from '../src/data/providerEvidenceRegister.ts'
import { evaluationCases, fixtureManifest } from '../src/data/providerEvaluationCases.ts'
import { compareProviders } from '../src/lib/providerRecommendation.ts'
import { resolveFeature } from '../src/lib/providerEvidence.ts'
import type { EvaluationCase, EvaluationRun } from '../src/evaluationTypes'

export const fileHash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex')
export function artifactPath(path:string,root=process.cwd()):string{
  if(!path||isAbsolute(path))throw new Error('Use workspace-relative artifact paths')
  const full=realpathSync(resolve(root,path)),rel=relative(realpathSync(root),full)
  if(rel.startsWith('..')||isAbsolute(rel)||!statSync(full).isFile()||statSync(full).size===0)throw new Error('Invalid artifact path')
  return full
}
export function validateFixtures(root=process.cwd()):string[]{
  const errors:string[]=[]
  for(const [name,expected] of Object.entries(fixtureManifest.files)){
    const path=resolve(root,'evaluations/fixtures',name)
    if(!existsSync(path)||fileHash(path)!==expected)errors.push(`fixture hash mismatch ${name}`)
  }
  const canonical=JSON.stringify(Object.fromEntries(Object.entries(fixtureManifest.files).sort(([a],[b])=>a.localeCompare(b))))
  if(createHash('sha256').update(canonical).digest('hex')!==fixtureManifest.bundleSha256)errors.push('fixture bundle hash mismatch')
  return errors
}
export function capturedArtifactValid(run:EvaluationRun,root=process.cwd()):boolean{
  try{
    const paths=[run.outputReference,run.executionEvidence].map(p=>artifactPath(p??'',root))
    const capture=JSON.parse(readFileSync(paths[0],'utf8'))
    const execution=JSON.parse(readFileSync(paths[1],'utf8'))
    // Human-reviewed transcript remains authoritative. The structured extraction
    // must be retained with it; a self-reported success flag is insufficient.
    return fileHash(paths[0])===run.outputSha256&&typeof capture.rawOutput==='string'&&!!capture.rawOutput.trim()&&JSON.stringify(capture.actualResult)===JSON.stringify(run.actualResult)&&Array.isArray(capture.attachments)&&capture.attachments.every((a:{path:string;sha256:string})=>fileHash(artifactPath(a.path,root))===a.sha256)&&!!run.sessionId&&execution.sessionId===run.sessionId&&execution.runId===run.runId&&execution.testedAt===run.testedAt&&execution.fixtureHash===run.fixtureHash&&execution.freshConversation===true&&execution.accountRouteConfirmed===true&&typeof execution.preflightVerifiedBy==='string'&&!!execution.preflightVerifiedBy.trim()
  }catch{return false}
}
export function evaluationCandidates(c:EvaluationCase){
  const text={survey:'설문 문항 작성','xlsx-analysis':'기존 XLSX 파일 분석','pdf-script':'PDF 분석 후 발표 대본 작성'}[c.taskCategory]
  const options=compareProviders({text,overrides:{}}).allOptions
  return options.filter(o=>{
    if(o.plan.tier==='unknown'||o.status==='excluded')return false
    if(c.taskCategory!=='pdf-script')return o.status==='eligible'
    const claim=resolveFeature(evidenceRegister,o.service.id,null,'pdfAnalysis')
    return claim.status==='supported'||claim.status==='limited'
  }).map(o=>({providerId:o.provider.id,serviceId:o.service.id,planId:o.plan.id,status:'preflight-required',existingGate:o.status,unconfirmed:c.requiredCapabilities.filter(id=>resolveFeature(evidenceRegister,o.service.id,o.plan.id,id).status!=='supported')}))
}
export function caseById(id:string):EvaluationCase{
  const c=evaluationCases.find(c=>c.caseId===id);if(!c)throw new Error(`Unknown case ${id}`);return c
}
