import type { ComparisonScope, EvaluationCase, EvaluationDataset, EvaluationRun, EvaluationScore, RunCapture } from '../evaluationTypes'
import type { ProviderCatalog } from '../providerTypes'
import { providerCatalog } from '../data/providerCatalog.ts'
import { validEvidenceDate } from './providerValidation.ts'

const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const nonempty=(v:unknown):v is string=>typeof v==='string'&&!!v.trim()
const numeric=(a:unknown,b:unknown)=>typeof a==='number'&&Number.isFinite(a)&&typeof b==='number'&&Math.abs(a-b)<=.000001
const exact=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
const sha=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)

export function plannedRun(c:EvaluationCase,providerId:string,serviceId:string,planId:string,fixtureHash:string,repetition:number):EvaluationRun{
  return {runId:`${c.caseId}-${planId}-${repetition}`,caseId:c.caseId,providerId,serviceId,planId,channel:'web',testedAt:null,executionStatus:'planned',provenance:'real',outputReference:null,outputSha256:null,actualResult:null,evaluationMethod:'structured-and-human',evaluatorId:'',notes:'Not executed. Complete preflight before running.',promptVersion:c.promptVersion,rubricVersion:c.rubricVersion,fixtureHash,environmentKey:'',region:'unspecified',repetition,executionEvidence:null,sessionId:null,settings:{}}
}

export function automaticGrades(run:EvaluationRun,c:EvaluationCase,verifiedAt:string):EvaluationScore[]{
  if(run.executionStatus!=='completed'||!run.testedAt||!run.outputReference||!sha(run.outputSha256)||!run.actualResult)throw new Error('Only a completed captured run can be graded')
  if(run.caseId!==c.caseId||run.promptVersion!==c.promptVersion||run.rubricVersion!==c.rubricVersion)throw new Error('Case/prompt/rubric mismatch')
  const a=object(run.actualResult),e=c.expectedResult,checks:Record<string,boolean>={}
  if(c.taskCategory==='survey'){
    const questions=array(a.questions).map(object),ids=questions.map(q=>q.id),required=array(e.questionIds)
    checks['required-questions']=questions.length===e.questionCount&&required.every(id=>questions.some(q=>q.id===id&&nonempty(q.text)))&&new Set(ids).size===questions.length
    checks['question-format']=questions.length===e.questionCount&&new Set(ids).size===questions.length&&questions.every(q=>nonempty(q.id)&&nonempty(q.text)&&['single','multiple','text'].includes(String(q.type))&&Array.isArray(q.options)&&(q.type==='text'?q.options.length===0:q.options.length>=2&&q.options.every(nonempty)&&new Set(q.options).size===q.options.length))
    checks['no-form-claim']=a.formCreated===false
  }else if(c.taskCategory==='xlsx-analysis'){
    checks['input-identity']=a.inputFileName===e.inputFileName&&a.inputSheet===e.inputSheet&&a.inputSha256===e.inputSha256&&a.rowCount===e.rowCount
    checks.total=numeric(a.totalRevenue,e.totalRevenue);checks.average=numeric(a.averageRevenue,e.averageRevenue);checks.filter=numeric(a.filteredRevenue,e.filteredRevenue)
    const groups=object(a.groupRevenue),expectedGroups=object(e.groupRevenue)
    checks.groups=Object.keys(groups).length===Object.keys(expectedGroups).length&&Object.entries(expectedGroups).every(([key,value])=>numeric(groups[key],value))
    const chart=object(a.chart),expectedChart=object(e.chart)
    checks['chart-data']=chart.type===expectedChart.type&&exact(chart.labels,expectedChart.labels)&&array(chart.values).length===array(expectedChart.values).length&&array(expectedChart.values).every((v,i)=>numeric(array(chart.values)[i],v))
  }else if(c.taskCategory==='pdf-script'){
    checks['input-identity']=a.inputFileName===e.inputFileName&&a.inputSha256===e.inputSha256
    const facts=(v:unknown)=>{
      const actual=array(v).map(object),expected=array(e.facts).map(object)
      return actual.length===expected.length&&new Set(actual.map(f=>f.factId)).size===actual.length&&expected.every(f=>actual.some(g=>g.factId===f.factId&&numeric(g.value,f.value)&&g.page===f.page))
    }
    checks['summary-facts']=facts(a.summaryFacts);checks['handoff-facts']=facts(a.scriptFacts)
    const words=nonempty(a.script)?a.script.trim().split(/\s+/u).length:0,band=e.wordBand as number[]
    checks['script-length']=words>=band[0]&&words<=band[1]
  }
  return c.metrics.filter(m=>m.gradingMethod==='automatic').map(m=>({runId:run.runId,metricId:m.metricId,score:checks[m.metricId]?1:0,maximumScore:m.maximumScore,evidence:JSON.stringify({check:m.description,passed:checks[m.metricId]===true,outputReference:run.outputReference,outputSha256:run.outputSha256,provenance:run.provenance}),gradingMethod:'automatic',verifiedAt,evaluatorId:'automatic-v1'}))
}

export function validateEvaluationDataset(data:EvaluationDataset,cases:EvaluationCase[],catalog:ProviderCatalog,asOf=new Date().toISOString().slice(0,10)):string[]{
  const errors:string[]=[]
  if(!data||!data.version||!Array.isArray(data.runs)||!Array.isArray(data.scores))return ['invalid evaluation dataset schema']
  if(new Set(data.runs.map(r=>r.runId)).size!==data.runs.length)errors.push('duplicate runId')
  const scoreIds=data.scores.map(s=>`${s.runId}/${s.metricId}/${s.evaluatorId}`)
  if(new Set(scoreIds).size!==scoreIds.length)errors.push('duplicate evaluation score')
  for(const r of data.runs){
    const c=cases.find(c=>c.caseId===r.caseId),service=catalog.services.find(s=>s.id===r.serviceId)
    if(!c||!service||service.providerId!==r.providerId||!catalog.plans.some(p=>p.id===r.planId&&p.serviceId===r.serviceId)||!['web','api'].includes(r.channel)||(r.channel==='api'&&service?.access==='web'))errors.push(`invalid run scope ${r.runId}`)
    if(c&&(r.promptVersion!==c.promptVersion||r.rubricVersion!==c.rubricVersion))errors.push(`invalid run version ${r.runId}`)
    if(!['real','synthetic','demo'].includes(r.provenance)||!['planned','completed','failed','blocked'].includes(r.executionStatus)||r.evaluationMethod!=='structured-and-human'||!sha(r.fixtureHash)||!Number.isInteger(r.repetition)||r.repetition<1||!nonempty(r.region)||!r.runId||!r.settings||typeof r.settings!=='object'||Object.values(r.settings).some(v=>typeof v!=='string'))errors.push(`invalid run metadata ${r.runId}`)
    if(r.testedAt!==null&&!validEvidenceDate(r.testedAt,asOf))errors.push(`invalid testedAt ${r.runId}`)
    if(r.executionStatus==='planned'&&(r.testedAt!==null||r.actualResult!==null||r.outputReference!==null||r.outputSha256!==null))errors.push(`unexecuted output ${r.runId}`)
    if(r.executionStatus==='completed'&&(!r.testedAt||!nonempty(r.outputReference)||!sha(r.outputSha256)||!r.actualResult||Array.isArray(r.actualResult)||typeof r.actualResult!=='object'||!nonempty(r.executionEvidence)||!nonempty(r.sessionId)||!nonempty(r.evaluatorId)||!nonempty(r.environmentKey)))errors.push(`uncaptured completed run ${r.runId}`)
    if(r.executionStatus==='completed'&&r.provenance==='real'&&['mode','tools','accountKind','language'].some(key=>!nonempty(r.settings?.[key])))errors.push(`missing comparison settings ${r.runId}`)
  }
  for(const s of data.scores){
    const r=data.runs.find(r=>r.runId===s.runId),c=cases.find(c=>c.caseId===r?.caseId),m=c?.metrics.find(m=>m.metricId===s.metricId)
    if(!r||r.executionStatus!=='completed'||!c||!m){errors.push(`score without completed matching run/metric ${s.runId}/${s.metricId}`);continue}
    if(!Number.isFinite(s.score)||s.score<0||s.score>m.maximumScore||s.maximumScore!==m.maximumScore||s.gradingMethod!==m.gradingMethod||!nonempty(s.evidence)||!nonempty(s.evaluatorId)||!validEvidenceDate(s.verifiedAt,asOf)||Date.parse(s.verifiedAt)<Date.parse(r.testedAt??''))errors.push(`invalid score ${s.runId}/${s.metricId}`)
    if(m.gradingMethod==='automatic'){
      try{const expected=automaticGrades(r,c,s.verifiedAt).find(g=>g.metricId===s.metricId);if(!expected||expected.score!==s.score||s.evaluatorId!=='automatic-v1')errors.push(`forged automatic score ${s.runId}/${s.metricId}`)}catch{errors.push(`ungradable score ${s.runId}/${s.metricId}`)}
    }
  }
  return errors
}

export function blindPacket(run:EvaluationRun,c:EvaluationCase,packetId:string,catalog:ProviderCatalog,capture:Pick<RunCapture,'rawOutput'|'attachments'>){
  if(run.executionStatus!=='completed'||!run.actualResult)throw new Error('Only completed output can be blinded')
  // Only the output is copied. The run ID, plan, settings, collector, notes and
  // internalModel never enter the packet. Reviewer must check residual clues.
  const names=[...catalog.providers.map(p=>p.name),...catalog.services.map(s=>s.name)].sort((a,b)=>b.length-a.length)
  const redact=(value:string)=>{for(const name of names)value=value.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'[익명]');return value}
  return {packetId,caseId:c.caseId,prompt:c.prompt,inputFixture:c.inputFixture,expectedResult:c.expectedResult,rubricVersion:c.rubricVersion,metrics:c.metrics.filter(m=>m.gradingMethod==='manual'),output:redact(JSON.stringify(run.actualResult,null,2)),rawOutput:redact(capture.rawOutput),attachments:capture.attachments,review:{evaluatorId:'',independent:true,anonymizationVerifiedBy:'',scores:c.metrics.filter(m=>m.gradingMethod==='manual').map(m=>({metricId:m.metricId,score:null,maximumScore:m.maximumScore,gradingMethod:'manual',evidence:'',verifiedAt:null})),notes:'Coordinator must inspect and mask residual identity clues in text, images, metadata and audio before distributing to independent reviewers.'}}
}

function acceptedGrades(data:EvaluationDataset,run:EvaluationRun,metricId:string,method:'manual'|'automatic'){
  return data.scores.filter(s=>s.runId===run.runId&&s.metricId===metricId&&s.gradingMethod===method&&(method==='automatic'||(s.independent===true&&nonempty(s.blindPacketId)&&s.evaluatorId!==run.evaluatorId)))
}

export function assessSufficiency(data:EvaluationDataset,c:EvaluationCase,scope:ComparisonScope,verifyArtifact:(run:EvaluationRun)=>boolean=()=>false){
  const reasons:string[]=[]
  // Other cases are permitted in storage; validate them in the dataset-wide CLI.
  const subset={...data,runs:data.runs.filter(r=>r.caseId===c.caseId),scores:data.scores.filter(s=>data.runs.some(r=>r.runId===s.runId&&r.caseId===c.caseId))}
  const invalid=validateEvaluationDataset(subset,[c],providerCatalog,scope.asOf)
  if(invalid.length)reasons.push(...invalid)
  if(scope.caseId!==c.caseId||scope.promptVersion!==c.promptVersion||scope.rubricVersion!==c.rubricVersion)reasons.push('Case/prompt/rubric scope mismatch')
  if(!validEvidenceDate(scope.asOf)||scope.region==='unspecified'||!scope.environmentKey.trim())reasons.push('A dated, region-specific comparison environment is required')
  if(!scope.accessiblePlanIds.includes(scope.planId))reasons.push('The user cannot access this plan')
  const keys=['caseId','providerId','serviceId','planId','channel','region','environmentKey','fixtureHash','promptVersion','rubricVersion'] as const
  const matching=subset.runs.filter(r=>keys.every(k=>r[k]===scope[k]))
  const admitted=matching.filter(r=>{
    if(r.provenance!=='real'||r.executionStatus!=='completed'||!r.testedAt||!verifyArtifact(r))return false
    const age=(Date.parse(scope.asOf+'T23:59:59Z')-Date.parse(r.testedAt))/86400000
    if(age<0||age>90)return false
    return c.metrics.every(m=>{
      const grades=acceptedGrades(data,r,m.metricId,m.gradingMethod)
      if(m.gradingMethod==='automatic')return grades.length===1
      const independent=grades.filter(s=>s.gradingMethod==='manual'&&s.independent===true&&nonempty(s.blindPacketId)&&s.evaluatorId!==r.evaluatorId)
      return new Set(independent.map(s=>s.evaluatorId)).size>=2&&new Set(independent.map(s=>s.blindPacketId)).size===1
    })
  })
  if(new Set(admitted.map(r=>JSON.stringify(Object.entries(r.settings).sort()))).size>1||new Set(admitted.map(r=>r.internalModel??'unspecified')).size>1)reasons.push('Account settings or reproducibility conditions differ')
  if(admitted.length<2||new Set(admitted.map(r=>r.repetition)).size<2||new Set(admitted.map(r=>r.outputSha256)).size<2||new Set(admitted.map(r=>r.sessionId)).size!==admitted.length||new Set(admitted.map(r=>r.executionEvidence)).size!==admitted.length)reasons.push('Need at least two independently captured real repetitions with complete blinded grading')
  const uncertainty=c.metrics.map(m=>{
    const perRun=(reasons.length?[]:admitted).map(r=>{
      const values=acceptedGrades(data,r,m.metricId,m.gradingMethod).map(s=>s.score)
      return {runId:r.runId,mean:values.reduce((sum,v)=>sum+v,0)/values.length,reviewers:values.length,reviewerRange:Math.max(...values)-Math.min(...values)}
    })
    const values=perRun.map(r=>r.mean)
    if(!values.length)return {metricId:m.metricId,observations:0,mean:null,minimum:null,maximum:null,range:null,standardDeviation:null,perRun:[]}
    const mean=values.reduce((a,b)=>a+b,0)/values.length
    return {metricId:m.metricId,observations:values.length,mean,minimum:Math.min(...values),maximum:Math.max(...values),range:Math.max(...values)-Math.min(...values),standardDeviation:values.length>1?Math.sqrt(values.reduce((sum,v)=>sum+(v-mean)**2,0)/(values.length-1)):null,perRun}
  })
  // No company score, aggregate, ranking, confidence interval or significance
  // claim is produced by this pilot gate, even after admission.
  return {sufficient:reasons.length===0,score:null,eligibleRunIds:reasons.length?[]:admitted.map(r=>r.runId),reasons,uncertainty}
}
