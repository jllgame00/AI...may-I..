import { it } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, DEMO_REQUEST, buildGuideBundle, selectForStages } from './aiGuide.ts'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import { mergeRefreshSnapshot } from './refreshSnapshot.ts'
const survey={text:DEMO_REQUEST,overrides:{}}
const algorithm={text:'알고리즘 문제 풀이를 Python 코드로 작성해줘',overrides:{}}
const repository={text:'React 기존 저장소의 장바구니 오류를 수정해줘',overrides:{}}
const writing={text:'신입생 대상 독서 동아리 모집 홍보 글을 한국어로 500자로 작성해줘',overrides:{}}
const decision=(request=survey,data=snapshot)=>compareCandidates(request,data).decision!.weighted!
const row=(d:ReturnType<typeof decision>,id:string)=>d.rows.find(r=>r.candidate.model!.id===id)!

it('applies a common actual survey tool/use rubric and recommends full support jointly without inventing statistical quality',()=>{
  const d=decision()
  assert.equal(d.mode,'functional')
  assert.deepEqual(d.criteria.map(c=>[c.id,c.weight]),[['spreadsheet',.4],['upload',.2],['code',.4]])
  const full=d.rows.filter(r=>r.judgment==='recommended')
  assert.deepEqual(full.map(r=>[r.candidate.model!.id,r.score,r.rank,r.tied]),[['claude-opus-5-5',100,1,true],['claude-sonnet-5-5',100,1,true]])
  assert.ok(full.every(r=>r.components.every(c=>c.sources.length&&c.status==='supported')))
  for(const id of ['gpt-6-astra','gpt-6.1-sol','gpt-6.1-terra']){
    const r=row(d,id)
    assert.equal(r.judgment,'conditional');assert.equal(r.score,null);assert.equal(r.rank,null)
    assert.deepEqual(r.components.map(c=>c.status),['limited','supported','supported'])
    assert.equal(r.components[0].value,null)
  }
  assert.match(d.explanation,/실측|측정/)
})
it('recomputes judgments from changed official support rather than hardcoding any model',()=>{
  const data=structuredClone(snapshot)
  for(const m of data.mappings)if(m.routeKind==='work'&&m.features?.spreadsheet)m.features.spreadsheet={...m.features.spreadsheet,status:'supported'}
  const d=decision(survey,data)
  assert.equal(d.rows.filter(r=>r.judgment==='recommended').length,5)
  assert.ok(d.rows.filter(r=>r.judgment==='recommended').every(r=>r.score===100&&r.rank===1&&r.tied))
  for(const p of data.plans)if(p.serviceId==='claude'&&p.features.code)p.features.code={...p.features.code,status:'unsupported'}
  const changed=decision(survey,data)
  assert.equal(changed.rows.filter(r=>r.judgment==='recommended').length,3)
  assert.equal(row(changed,'claude-opus-5-5').judgment,'unsupported')
  for(const m of data.mappings)if(m.routeKind==='work'&&m.features?.spreadsheet)m.features.spreadsheet={...m.features.spreadsheet,sources:[]}
  const unknown=decision(survey,data)
  assert.equal(row(unknown,'gpt-6-astra').judgment,'needs-check')
  assert.equal(row(unknown,'gpt-6-astra').components[0].value,null)
})
it('uses declared raw comparison groups for exact coding purpose without requiring other candidates to have scores',()=>{
  const a=decision(algorithm),r=decision(repository)
  assert.equal(a.mode,'benchmark');assert.equal(a.cohort!.id,'qwen-lcb-v6-feb-may')
  assert.deepEqual(a.rows.filter(r=>r.judgment==='recommended').map(r=>[r.evaluation!.rawScore,r.rank]),[[51.8,1],[48.9,2],[45.2,3]])
  assert.ok(a.rows.filter(r=>r.judgment==='recommended').every(r=>r.score===null&&r.evaluation!.evaluationType==='model'))
  assert.equal(r.cohort!.id,'grok47-deepswe1.1')
  assert.deepEqual(r.rows.filter(r=>r.judgment==='recommended').map(r=>[r.evaluation!.rawScore,r.rank]),[[71,1],[65.2,2]])
  assert.ok(r.rows.filter(r=>r.judgment==='recommended').every(r=>r.evaluation!.evaluationType==='agent'))
  assert.ok(r.rows.some(r=>r.judgment==='recommended'&&r.candidate.accessStatus==='연결 미확인'))
})
it('changes actual comparison order after a source refresh, preserves ties, and never fills missing raw values',()=>{
  const updated=mergeRefreshSnapshot(snapshot,{sources:{fixture:{checkedAt:'2026-10-29',changedAt:'2026-10-29',state:'ok',updates:[{id:'east-qwen235-2507-lcb',rawScore:40}]}}})
  assert.deepEqual(decision(algorithm,updated).rows.filter(r=>r.judgment==='recommended').map(r=>r.evaluation!.rawScore),[48.9,45.2,40])
  const tied=structuredClone(snapshot);tied.evaluations!.find(e=>e.id==='east-qwen235-2507-lcb')!.rawScore=48.9
  assert.deepEqual(decision(algorithm,tied).rows.filter(r=>r.judgment==='recommended').map(r=>[r.rank,r.tied]),[[1,true],[1,true],[3,false]])
  tied.evaluations!.find(e=>e.id==='east-qwen235-2507-lcb')!.rawScore=null
  assert.equal(row(decision(algorithm,tied),'Qwen/Qwen3-235B-A22B-Instruct-2507').judgment,'needs-check')
})
it('uses only a documented text drafting purpose for writing, jointly recommends known support and leaves other records unknown',()=>{
  const d=decision(writing)
  assert.equal(d.mode,'functional');assert.equal(d.criteria.length,1);assert.equal(d.criteria[0].weight,1)
  const known=d.rows.filter(r=>r.judgment==='recommended')
  assert.equal(known.length,20);assert.ok(known.every(r=>r.score===100&&r.rank===1&&r.tied))
  assert.ok(d.rows.filter(r=>r.judgment==='needs-check').every(r=>r.score===null))
  for(const id of ['gpt-6-astra','gpt-6.1-sol','gpt-6.1-terra','claude-opus-5-5','claude-sonnet-5-5'])assert.equal(row(d,id).judgment,'recommended')
  const data=structuredClone(snapshot);data.models[0].capabilities=['이미지 입력']
  assert.equal(row(decision(writing,data),data.models[0].id).judgment,'needs-check')
})
it('is independent of brand, price and array order and does not mutate input or prompt generation',()=>{
  const data=structuredClone(snapshot),before=JSON.stringify(data)
  const baseline=decision(survey,data).rows.map(r=>[r.candidate.model!.id,r.judgment,r.score,r.rank]).sort()
  assert.equal(JSON.stringify(data),before)
  data.models.reverse();data.mappings.reverse();data.evaluations!.reverse()
  for(const m of data.models){m.name='model '+m.id;m.provider='renamed'}
  for(const p of data.plans){p.price.amount=999;p.tier='paid'}
  assert.deepEqual(decision(survey,data).rows.map(r=>[r.candidate.model!.id,r.judgment,r.score,r.rank]).sort(),baseline)
  const comparison=compareCandidates(survey),candidate=comparison.decision!.weighted!.rows.find(r=>r.judgment==='recommended')!.candidate
  assert.ok(comparison.recommendations.some(c=>c.id===candidate.id))
  const selection={default:candidate.id,byStage:{}}
  const bundle=buildGuideBundle(survey,selection)
  assert.match(bundle.steps[0].text,/학년별 만족도 차이/)
  assert.equal(selectForStages(selection,'statistics',candidate.id).byStage.statistics,candidate.id)
})
