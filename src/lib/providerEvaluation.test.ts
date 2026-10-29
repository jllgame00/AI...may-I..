// All outputs and "real" provenance mutations in this file are isolated unit-test
// fixtures. They are never exported to the evaluation registry or audit results.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluationCases, evaluationDataset, fixtureManifest } from '../data/providerEvaluationCases.ts'
import { providerCatalog } from '../data/providerCatalog.ts'
import { assessSufficiency, automaticGrades, blindPacket, plannedRun, validateEvaluationDataset } from './providerEvaluation.ts'
import type { ComparisonScope, EvaluationRun, EvaluationScore } from '../evaluationTypes'
const xlsx=evaluationCases[1],pdf=evaluationCases[2],survey=evaluationCases[0]
const time='2026-10-29T06:00:00Z'
function output(caseId=xlsx.caseId):EvaluationRun {
  const c=evaluationCases.find(c=>c.caseId===caseId)!
  return {...plannedRun(c,'openai','chatgpt','chatgpt-free',fixtureManifest.bundleSha256,1),runId:'test-only-1',executionStatus:'completed',testedAt:time,provenance:'synthetic',outputReference:'unit-test-only.json',outputSha256:'a'.repeat(64),executionEvidence:'unit-test-only-capture',sessionId:'test-session-1',evaluatorId:'collector-test',environmentKey:'web-fresh-v1',region:'KR',settings:{mode:'default',tools:'file-analysis',accountKind:'personal',language:'ko'},actualResult:structuredClone(c.expectedResult)}
}
const metric=(run:EvaluationRun,id:string)=>automaticGrades(run,evaluationCases.find(c=>c.caseId===run.caseId)!,time).find(s=>s.metricId===id)!.score

test('unexecuted and failed runs cannot be graded, including when a fake result was attached',()=>{
  const run=output()
  for(const executionStatus of ['planned','failed','blocked'] as const)assert.throws(()=>automaticGrades({...run,executionStatus},xlsx,time),/completed/)
  assert.deepEqual(evaluationDataset.runs,[]);assert.deepEqual(evaluationDataset.scores,[])
})
test('XLSX grades detect wrong arithmetic, filters, charts and wrong original input',()=>{
  const run=output();assert.ok(automaticGrades(run,xlsx,time).every(s=>s.score===1))
  for(const [key,id,bad] of [['totalRevenue','total',2001],['averageRevenue','average',166],['filteredRevenue','filter',1110],['inputFileName','input-identity','new.xlsx']] as const){
    const changed=structuredClone(run);changed.actualResult![key]=bad;assert.equal(metric(changed,id),0)
  }
  const chart=structuredClone(run);chart.actualResult!.chart={type:'bar',labels:['2026-03','2026-02','2026-01'],values:[500,740,760]}
  assert.equal(metric(chart,'chart-data'),0)
  const strings=structuredClone(run);strings.actualResult!.totalRevenue='2000';assert.equal(metric(strings,'total'),0)
})
test('malformed output is a failed check rather than a crash or a default success',()=>{
  for(const c of evaluationCases){const run=output(c.caseId);run.actualResult={};assert.ok(automaticGrades(run,c,time).every(s=>s.score===0))}
})
test('survey checks missing and duplicate questions without treating actual form creation as required',()=>{
  const run=output(survey.caseId)
  run.actualResult={questions:['year','frequency','purpose','satisfaction','barrier','improvement'].map(id=>({id,text:`${id} 문항`,type:'text',options:[]})),formCreated:false}
  assert.equal(metric(run,'required-questions'),1);assert.equal(metric(run,'no-form-claim'),1)
  const qs=run.actualResult.questions as object[];qs[5]=qs[0]
  assert.equal(metric(run,'required-questions'),0);assert.equal(metric(run,'question-format'),0)
})
test('PDF specified numbers, page references and handoff are checked independently from speech time',()=>{
  const run=output(pdf.caseId);run.actualResult!.summaryFacts=structuredClone(pdf.expectedResult.facts);run.actualResult!.scriptFacts=structuredClone(pdf.expectedResult.facts)
  run.actualResult!.script=Array(500).fill('합성').join(' ')
  assert.equal(metric(run,'summary-facts'),1);assert.equal(metric(run,'handoff-facts'),1);assert.equal(metric(run,'script-length'),1)
  ;(run.actualResult!.scriptFacts as {page:number}[])[0].page=3
  assert.equal(metric(run,'handoff-facts'),0)
  assert.ok(!automaticGrades(run,pdf,time).some(s=>s.metricId==='delivery'))
})
test('dataset validation rejects orphaned, unexecuted, forged and out-of-bounds scores',()=>{
  const run=output(),scores=automaticGrades(run,xlsx,time)
  assert.deepEqual(validateEvaluationDataset({version:'test-only',runs:[run],scores},evaluationCases,providerCatalog,'2026-10-29'),[])
  scores[0].score=999
  assert.ok(validateEvaluationDataset({version:'test-only',runs:[run],scores},evaluationCases,providerCatalog,'2026-10-29').length)
  run.executionStatus='planned';run.planId='claude-free'
  assert.ok(validateEvaluationDataset({version:'test-only',runs:[run],scores},evaluationCases,providerCatalog,'2026-10-29').some(e=>e.includes('scope')))
})
test('blind packet omits identifiers and masks company/service names in the output',()=>{
  const run=output();run.actualResult!.interpretation='OpenAI ChatGPT and Anthropic Claude'
  const packet=blindPacket(run,xlsx,'opaque-random-token',providerCatalog,{rawOutput:'OpenAI ChatGPT total 2000. This raw transcript is a unit fixture.',attachments:[]})
  assert.doesNotMatch(JSON.stringify(packet),/OpenAI|ChatGPT|Anthropic|Claude|test-only-1|chatgpt-free|collector-test/)
  assert.equal(packet.packetId,'opaque-random-token')
  assert.match(packet.rawOutput,/total 2000/)
})

function scope(run:EvaluationRun):ComparisonScope{return {caseId:run.caseId,providerId:run.providerId,serviceId:run.serviceId,planId:run.planId,channel:run.channel,region:run.region,environmentKey:run.environmentKey,fixtureHash:run.fixtureHash,promptVersion:run.promptVersion,rubricVersion:run.rubricVersion,asOf:'2026-10-29',accessiblePlanIds:['chatgpt-free']}}
function humanScores(run:EvaluationRun):EvaluationScore[]{return xlsx.metrics.filter(m=>m.gradingMethod==='manual').flatMap(m=>['judge-a','judge-b'].map(evaluatorId=>({runId:run.runId,metricId:m.metricId,score:3,maximumScore:4,evidence:'Unit-test-only annotation, not an actual service evaluation.',gradingMethod:'manual' as const,verifiedAt:time,evaluatorId,blindPacketId:`opaque-${run.runId}`,independent:true})))}
test('future admission requires verified real outputs, two repetitions, complete independent grading and accessible scope',()=>{
  const first=output(),second={...output(),runId:'test-only-2',repetition:2,sessionId:'test-session-2',executionEvidence:'unit-test-second-capture'}
  const dataset={version:'unit-test-only',runs:[first,second],scores:[...automaticGrades(first,xlsx,time),...automaticGrades(second,xlsx,time),...humanScores(first),...humanScores(second)]}
  assert.equal(assessSufficiency(dataset,xlsx,scope(first),()=>true).sufficient,false)
  first.provenance='real';second.provenance='real'
  // Identical artifact bytes cannot establish independent repeated trials.
  assert.equal(assessSufficiency(dataset,xlsx,scope(first),()=>true).sufficient,false)
  second.outputSha256='b'.repeat(64)
  assert.equal(assessSufficiency(dataset,xlsx,scope(first)).sufficient,false)
  const admitted=assessSufficiency(dataset,xlsx,scope(first),()=>true)
  assert.equal(admitted.sufficient,true);assert.equal(admitted.score,null)
  second.sessionId=first.sessionId!
  assert.equal(assessSufficiency(dataset,xlsx,scope(first),()=>true).sufficient,false)
  second.sessionId='test-session-2'
  dataset.scores.push(...xlsx.metrics.filter(m=>m.gradingMethod==='manual').map(m=>({runId:first.runId,metricId:m.metricId,score:0,maximumScore:4,evidence:'Unblinded collector note must not affect measured reviewer statistics',gradingMethod:'manual' as const,verifiedAt:time,evaluatorId:first.evaluatorId,independent:false})))
  const statistics=assessSufficiency(dataset,xlsx,scope(first),()=>true)
  assert.equal(statistics.uncertainty.find(m=>m.metricId==='interpretation')!.mean,3)
  assert.equal(statistics.uncertainty.find(m=>m.metricId==='interpretation')!.observations,2)
  assert.equal(assessSufficiency(dataset,xlsx,{...scope(first),accessiblePlanIds:[]},()=>true).sufficient,false)
  assert.equal(assessSufficiency(dataset,pdf,{...scope(first),caseId:pdf.caseId},()=>true).sufficient,false)
  assert.equal(assessSufficiency(dataset,xlsx,{...scope(first),environmentKey:'different'},()=>true).sufficient,false)
  second.settings={tools:'different'}
  assert.equal(assessSufficiency(dataset,xlsx,scope(first),()=>true).sufficient,false)
  second.settings={...first.settings}
  assert.equal(assessSufficiency(dataset,xlsx,{...scope(first),asOf:'2027-02-01'},()=>true).sufficient,false)
  dataset.scores=dataset.scores.filter(s=>s.evaluatorId!=='judge-b')
  assert.equal(assessSufficiency(dataset,xlsx,scope(first),()=>true).sufficient,false)
})

test('measured evidence admission rejects every mismatching task and consumer-route dimension',()=>{
  // Isolated unit fixtures only; this does not create or register real results.
  const first={...output(),provenance:'real' as const},second={...output(),provenance:'real' as const,runId:'unit-scope-second',repetition:2,sessionId:'unit-scope-second-session',executionEvidence:'unit-scope-second-log',outputSha256:'b'.repeat(64)}
  const data={version:'unit-fixtures-only',runs:[first,second],scores:[...automaticGrades(first,xlsx,time),...automaticGrades(second,xlsx,time),...humanScores(first),...humanScores(second)]}
  const expected=scope(first)
  const accepted=assessSufficiency(data,xlsx,expected,()=>true)
  assert.equal(accepted.sufficient,true);assert.equal(accepted.score,null)
  const mismatches:Partial<ComparisonScope>[]=[
    {caseId:survey.caseId},{providerId:'anthropic'},{serviceId:'claude'},{planId:'chatgpt-plus'},
    {channel:'api'},{region:'US'},{environmentKey:'other-environment'},{fixtureHash:'c'.repeat(64)},
    {promptVersion:'different-prompt'},{rubricVersion:'different-rubric'},{accessiblePlanIds:[]},
  ]
  for(const mismatch of mismatches){
    const result=assessSufficiency(data,xlsx,{...expected,...mismatch},()=>true)
    assert.equal(result.sufficient,false,JSON.stringify(mismatch));assert.equal(result.score,null)
    assert.deepEqual(result.eligibleRunIds,[])
    assert.ok(result.uncertainty.every(metric=>metric.observations===0&&metric.mean===null))
  }
  for(const provenance of ['demo','synthetic'] as const){
    const result=assessSufficiency({...data,runs:data.runs.map(r=>({...r,provenance}))},xlsx,expected,()=>true)
    assert.equal(result.sufficient,false);assert.equal(result.score,null)
  }
})
