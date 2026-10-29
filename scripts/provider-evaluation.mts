import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { providerCatalog } from '../src/data/providerCatalog.ts'
import { evidenceRegister } from '../src/data/providerEvidenceRegister.ts'
import { evaluationCases, evaluationDataset, fixtureManifest } from '../src/data/providerEvaluationCases.ts'
import { evidenceMatrix, validateEvidenceRegister } from '../src/lib/providerEvidence.ts'
import { automaticGrades, blindPacket, plannedRun, validateEvaluationDataset } from '../src/lib/providerEvaluation.ts'
import { artifactPath, capturedArtifactValid, caseById, evaluationCandidates, validateFixtures } from './provider-evaluation-core.ts'
import type { EvaluationDataset, RunCapture } from '../src/evaluationTypes.ts'

const [command='validate',...args]=process.argv.slice(2)
const print=(v:unknown)=>console.log(JSON.stringify(v,null,2))
const json=async(path:string)=>JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''))
const validate=(data:EvaluationDataset)=>[...validateEvidenceRegister(evidenceRegister,providerCatalog),...validateFixtures(),...validateEvaluationDataset(data,evaluationCases,providerCatalog),...data.runs.filter(r=>r.fixtureHash!==fixtureManifest.bundleSha256).map(r=>`fixture version/hash ${r.runId}`),...data.runs.filter(r=>r.executionStatus==='completed'&&!capturedArtifactValid(r)).map(r=>`missing or mismatched capture ${r.runId}`)]
try{
  if(command==='validate'){
    const data:EvaluationDataset=args[0]?await json(args[0]):evaluationDataset,errors=validate(data)
    print({status:errors.length?'invalid':'valid',externalServiceRuns:data.runs.filter(r=>r.provenance==='real'&&r.executionStatus==='completed').length,scores:data.scores.length,errors})
    if(errors.length)process.exitCode=1
  }else if(command==='audit'){
    const errors=validate(evaluationDataset);if(errors.length)throw new Error(errors.join('; '))
    const cells=evidenceMatrix(evidenceRegister,providerCatalog)
    const realRuns=evaluationDataset.runs.filter(r=>r.provenance==='real'&&r.executionStatus==='completed')
    const externalAIExecuted=evaluationDataset.runs.some(r=>r.provenance==='real'&&r.executionStatus!=='planned'&&r.testedAt!==null)
    const result={version:evidenceRegister.version,generatedAt:new Date().toISOString(),evidenceReviewedAt:'2026-10-29',productionCatalogChanged:false,externalAIExecuted,providers:providerCatalog.providers.map(p=>({...p,services:providerCatalog.services.filter(s=>s.providerId===p.id).map(s=>({id:s.id,name:s.name,url:s.url,planIds:providerCatalog.plans.filter(p=>p.serviceId===s.id).map(p=>p.id)}))})),sources:evidenceRegister.sources,cells,backlog:cells.filter(c=>c.status==='unknown').map(c=>({providerId:c.providerId,serviceId:c.serviceId,planId:c.planId,channel:c.channel,featureId:c.featureId,reason:c.unknownReason})),cases:evaluationCases,candidates:evaluationCases.map(c=>({caseId:c.caseId,candidates:evaluationCandidates(c)})),runs:evaluationDataset.runs,scores:evaluationDataset.scores}
    await writeFile('docs/provider-evidence-audit.json',JSON.stringify(result,null,2)+'\n')
    print({file:'docs/provider-evidence-audit.json',providers:result.providers.length,services:providerCatalog.services.length,cells:cells.length,reviewedCells:cells.filter(c=>c.status!=='unknown').length,unknown:result.backlog.length,realRuns:realRuns.length,scores:evaluationDataset.scores.length,externalAIExecuted})
  }else if(command==='prepare'){
    const c=caseById(args[0]),plan=providerCatalog.plans.find(p=>p.id===args[1]);if(!plan)throw new Error('Select a registered plan ID')
    const service=providerCatalog.services.find(s=>s.id===plan.serviceId)!
    if(!evaluationCandidates(c).some(o=>o.planId===plan.id))throw new Error('Route not shortlisted; complete evidence/preflight review before adding it')
    const {expectedResult:answerKey,...publicCase}=c
    void answerKey
    const template={version:'manual-session-v1',case:publicCase,captureTemplate:{rawOutput:'',actualResult:{},attachments:[]},executionTemplate:{runId:'',sessionId:'',testedAt:null,fixtureHash:fixtureManifest.bundleSha256,freshConversation:false,accountRouteConfirmed:false,preflightVerifiedBy:'',steps:[]},dataset:{version:'provider-evaluation-v1',runs:[1,2].map(n=>plannedRun(c,service.providerId,service.id,plan.id,fixtureManifest.bundleSha256,n)),scores:[]}}
    if(args[2]==='--write-template'){
      await mkdir('.qa/evaluation',{recursive:true})
      const file=`.qa/evaluation/${c.caseId}-${plan.id}-template.json`
      await writeFile(file,JSON.stringify(template,null,2)+'\n',{flag:'wx'});print({file,executionStatus:'planned',runs:2,scores:0})
    }else print(template)
  }else if(command==='grade'||command==='blind'){
    const data:EvaluationDataset=await json(args[0]),run=data.runs.find(r=>r.runId===args[1]);if(!run)throw new Error('Run ID not found')
    const errors=validate(data);if(errors.length)throw new Error(errors.join('; '))
    if(!capturedArtifactValid(run))throw new Error('A captured output and execution evidence are required')
    const c=caseById(run.caseId)
    if(command==='grade')print({provenance:run.provenance,registryWritten:false,scores:automaticGrades(run,c,new Date().toISOString())})
    else{
      const packetId=randomUUID(),dir='.qa/evaluation'
      await mkdir(dir,{recursive:true})
      const capture:RunCapture=await json(run.outputReference!)
      const attachments=[]
      if(capture.attachments.length)await mkdir(`${dir}/${packetId}-assets`,{recursive:true})
      for(const [i,a] of capture.attachments.entries()){
        const path=`${dir}/${packetId}-assets/asset-${i+1}${extname(a.path)}`
        await copyFile(artifactPath(a.path),path)
        attachments.push({path,sha256:a.sha256})
      }
      await writeFile(`${dir}/${packetId}.json`,JSON.stringify(blindPacket(run,c,packetId,providerCatalog,{...capture,attachments}),null,2)+'\n',{flag:'wx'})
      await writeFile(`${dir}/${packetId}.private.json`,JSON.stringify({packetId,runId:run.runId},null,2)+'\n',{flag:'wx'})
      print({packet:`${dir}/${packetId}.json`,privateMapping:`${dir}/${packetId}.private.json`})
    }
  }else throw new Error('Commands: validate [dataset.json], audit, prepare <caseId> <planId>, grade|blind <dataset.json> <runId>')
}catch(e){console.error(e instanceof Error?e.message:String(e));process.exitCode=1}
