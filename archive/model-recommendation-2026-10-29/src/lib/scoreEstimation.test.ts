import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { auditSnapshot, estimateTables, recommendationIndex, selectPublished } from './scoreEstimation.ts'
import type { EstimationTable } from './scoreEstimation.ts'

test('audit preserves actual counts and treats syndicated measurements once',()=>{
  const data=structuredClone(recommendationSnapshot),first=data.evaluations![0]
  data.evaluations!.push({...first,id:'syndicated',publisher:'republisher',source:{...first.source,url:'https://example.org/reprint'}})
  const audit=auditSnapshot(data)
  assert.equal(audit.modelCount,28)
  assert.equal(audit.observationCount,112)
  assert.equal(audit.measurements.length,auditSnapshot(recommendationSnapshot).measurements.length)
  assert.ok(audit.duplicates.some(d=>d.ids.includes('syndicated')))
})
test('a repost listed before its reviewed original cannot erase or multiply a comparison',()=>{
  const data=structuredClone(recommendationSnapshot),original=data.evaluations!.find(e=>e.id==='east-qwen235-2507-lcb')!
  const before=auditSnapshot(data)
  data.evaluations!.unshift({...original,id:'a-repost',publisher:'republisher',source:{...original.source,url:'https://example.org/reprint'}})
  const after=auditSnapshot(data)
  assert.deepEqual(after.tables.map(t=>[t.id,t.rows.length]),before.tables.map(t=>[t.id,t.rows.length]))
})
test('current data cannot manufacture global scores, agent modes or version inheritance',()=>{
  const audit=auditSnapshot(recommendationSnapshot),results=estimateTables(audit.tables)
  assert.ok(audit.tables.length>0)
  assert.ok(results.length>0)
  assert.ok(results.every(r=>!r.passed))
  const automation=audit.tables.find(t=>t.id==='automationbench-1.0.6-api')??audit.tables.find(t=>t.rows.some(r=>r.evaluation.benchmark==='AutomationBench'))!
  assert.ok(automation)
  assert.equal(new Set(automation.rows.map(r=>r.configId)).size,automation.rows.length)
  const data=structuredClone(recommendationSnapshot)
  data.models[0].version='unmeasured-new-version'
  assert.ok(!auditSnapshot(data).tables.some(t=>t.rows.some(r=>r.evaluation.modelId===data.models[0].id)))
})
const tables=(count:number):EstimationTable[]=>Array.from({length:count},(_,b)=>({id:`b${b}`,domain:'coding',type:'model',rows:['a','b','c'].map((id,i)=>({measurementId:`${b}-${id}`,configId:id,evaluation:{...recommendationSnapshot.evaluations![0],id:`${b}-${id}`,modelId:id,modelVersion:'1',benchmark:`b${b}`,domain:'coding',rawScore:90-i*20,higherIsBetter:true,effort:'fixed',evaluationType:'model'}}))}))
test('BT predicts hidden observations, reports disconnected folds, and uses fixed scale',()=>{
  const result=estimateTables(tables(12)).find(r=>r.scope==='coding')!
  assert.ok(result.passed,JSON.stringify(result.validation))
  assert.equal(result.validation.evaluableFolds,36)
  assert.ok(result.validation.brier!<result.validation.baselineBrier!)
  assert.equal(result.scores.find(s=>s.configId==='a')!.rank,1)
  assert.equal(result.scores.find(s=>s.configId==='c')!.rank,3)
  assert.equal(recommendationIndex(0),50)
  assert.equal(recommendationIndex(Math.log(3)),75)
  const single=estimateTables(tables(1)).find(r=>r.scope==='coding')!
  assert.equal(single.validation.evaluableFolds,0)
  assert.equal(single.validation.disconnectedFolds,3)
  assert.equal(single.passed,false)
  assert.ok(single.scores.every(s=>s.score===null&&s.rank===null))
})
test('validation failure retains only previously passed exact configurations',()=>{
  const good=estimateTables(tables(12)),bad=estimateTables(tables(1))
  const published=selectPublished(good,[])
  assert.ok(published.length>0)
  const retained=selectPublished(bad,published)
  assert.ok(retained.every(r=>r.stale))
  assert.deepEqual(retained.map(r=>r.scores),published.map(r=>r.scores))
  assert.deepEqual(selectPublished(bad,[]),[])
})
test('general-domain input produces one result per component, never duplicate publication groups',()=>{
  const results=estimateTables(tables(12).map(t=>({...t,domain:'general'})))
  assert.equal(results.length,new Set(results.map(r=>r.id)).size)
})
