import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_REQUEST } from '../data/services.ts'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import * as engine from './recommend.ts'
import { buildPrompt } from './prompts.ts'
import { fixture } from './fixtures/recommendation.ts'
import type { RequestInput } from '../recommendationTypes.ts'
const input:RequestInput={text:'자료 분석',priority:'quality',tasks:['analysis'],requiredFeatures:['pdf']}
const run=(data=fixture(),overrides:Partial<RequestInput>={})=>engine.analyzeRequest({...input,...overrides},data)
describe('task-first evidence recommendation engine',()=>{
  it('keeps compatible paid and free plans without budget filters',()=>{
    assert.equal(run().recommendations.length,3)
    assert.ok(run().recommendations.some(c=>c.plan.tier==='paid'))
  })
  it('excludes only explicitly unsupported required features',()=>{
    const data=fixture();data.plans[0].features.pdf.status='unsupported'
    const result=run(data)
    assert.ok(!result.recommendations.some(c=>c.plan.id==='plan-0'))
    assert.match(result.workflow[0].excluded[0].reasons.join(' '),/PDF/)
  })
  it('keeps unknown feature support pending without a fabricated score',()=>{
    const data=fixture();data.plans[0].features.pdf.status='unknown'
    const c=run(data).recommendations.find(c=>c.plan.id==='plan-0')!
    assert.equal(c.eligibility,'conditional');assert.equal(c.score,null);assert.equal(c.scores.features,null)
  })
  it('requires a dated feature source',()=>{
    const data=fixture();data.plans[0].features.pdf.sources=[{url:'',checkedAt:''}]
    assert.equal(run(data).recommendations.find(c=>c.plan.id==='plan-0')!.scores.features,null)
  })
  it('never synthesizes totals from former normalized or weighted observation slots',()=>{
    const data=fixture()
    for(const o of data.observations){o.rawScore=100;o.composite=true}
    assert.ok(run(data).recommendations.every(c=>c.score===null && c.scores.benchmark===null && c.benchmarks.length===0 && !('cost' in c.scores)))
  })
  it('does not convert missing, zero or contradictory historical observations to a current ranking',()=>{
    for(const value of [null,0,100]){
      const data=fixture();for(const o of data.observations)o.rawScore=value
      assert.ok(run(data).recommendations.every(c=>c.score===null && !c.nearTie))
    }
  })
  it('keeps model-route access separate from task feature compatibility',()=>{
    const data=fixture();data.mappings[0].status='unknown'
    const c=run(data).recommendations.find(c=>c.plan.id==='plan-0')!
    assert.equal(c.suitability,'조건 비교 가능');assert.equal(c.accessStatus,'연결 미확인')
    assert.equal(c.scores.features,100)
  })
  it('keeps unknown prices outside task and access decisions',()=>{
    const data=fixture();data.plans[2].price={amount:null,currency:null,period:null,region:'미확인'}
    const c=run(data).recommendations.find(c=>c.plan.id==='plan-2')!
    assert.equal(c.suitability,'조건 비교 가능');assert.equal(c.accessStatus,'연결 근거 확인')
    assert.ok(c.holds.every(h=>!/가격|결제|예산/.test(h)))
  })
  it('keeps multi-stage analysis/writing and never auto-ranks by synthetic fixture scores',()=>{
    const result=engine.analyzeRequest({text:DEFAULT_REQUEST,priority:'quality'},fixture())
    assert.deepEqual(result.workflow.map(s=>s.kind),['analysis','writing','writing'])
    assert.deepEqual(result.workflow.map(s=>s.candidateId),['choice-0','choice-0','choice-0'])
  })
  it('does not silently classify an ambiguous task as writing',()=>{
    assert.equal(engine.classifyTask('React error를 수정해줘'),'coding')
    assert.equal(engine.analyzeRequest({...input,text:'뭘 하면 좋을까',tasks:undefined},fixture()).workflow.length,0)
  })
  it('honors explicit task and feature overrides',()=>{
    const result=run(fixture(),{text:'뭘 하면 좋을까',tasks:['writing','coding'],requiredFeatures:[]})
    assert.deepEqual([...new Set(result.workflow.map(s=>s.kind))],['writing','coding'])
    assert.deepEqual(result.requiredFeatures,[])
  })
  it('does not force selection when every feature is explicitly unsupported',()=>{
    const data=fixture();for(const p of data.plans)p.features.pdf.status='unsupported'
    const result=run(data)
    assert.equal(result.recommendations.length,0)
    assert.ok(result.workflow.every(s=>s.candidateId===null))
    assert.match(buildPrompt(result,'chatgpt',result.workflow),/후보 없음|선택.*없|미배정/)
  })
  it('keeps all six subscription plans and separates Work permissions from Chat',()=>{
    const result=run(recommendationSnapshot)
    assert.equal(new Set(result.recommendations.filter(c=>!c.plan.unassigned&&!c.accessAlternative).map(c=>c.plan.id)).size,6)
    for(const c of result.recommendations){assert.equal(c.score,null);assert.equal(c.scores.features,c.plan.id==='gemini-pro'?100:null)}
    assert.ok(result.recommendations.filter(c=>c.mapping.routeKind==='work').every(c=>c.suitability==='확인 후 선택' && c.accessStatus==='연결 근거 확인'))
  })
  it('preserves independent candidates when one mapping or performance source is incomplete',()=>{
    const data=fixture();data.mappings[0].status='unknown';data.observations=[]
    assert.equal(run(data).recommendations.length,3)
    assert.ok(run(data).recommendations.every(c=>c.suitability==='조건 비교 가능'))
  })
  it('keeps manual selection, service, model, plan and prompt consistent',()=>{
    const result=run(),before=JSON.stringify(result)
    const changed=engine.selectCandidate(result.workflow,result.workflow[0].id,'choice-1')
    const prompt=buildPrompt(result,'gemini',changed,changed[0].id)
    assert.match(prompt,/Gemini · Test Free/);assert.match(prompt,/standard/);assert.match(prompt,/fixture limit/)
    assert.doesNotMatch(prompt,/예산:|무료만 사용|무료 선호/)
    assert.equal(JSON.stringify(result),before)
    assert.throws(()=>engine.selectCandidate(changed,changed[0].id,'invalid'))
  })
  it('supports a different model within one plan without changing other stages',()=>{
    const data=fixture();data.mappings.push({...data.mappings[1],id:'alternate-model',planId:'plan-0'})
    const result=run(data,{tasks:['analysis','writing']})
    const changed=engine.selectCandidate(result.workflow,result.workflow[0].id,'alternate-model')
    assert.equal(changed[1].candidateId,result.workflow[1].candidateId)
    assert.match(buildPrompt(result,'chatgpt',changed,changed[0].id),/ChatGPT · Test Free · test-b \(standard\)/)
  })
  it('preserves image planning without claiming image generation',()=>{
    const result=engine.analyzeRequest({...input,text:'이미지 콘셉트와 포스터',tasks:undefined})
    assert.match(buildPrompt(result,'claude',result.workflow),/이미지가 생성되었다고 말하지 마세요/)
  })
  it('rejects blank input, preserves user text and is deterministic without mutation',()=>{
    assert.throws(()=>run(fixture(),{text:' '}))
    const data=fixture(),before=JSON.stringify(data)
    assert.deepEqual(run(data),run(data));assert.equal(JSON.stringify(data),before)
    const text='<script>alert(1)</script>'+'가'.repeat(2900)
    assert.equal(run(data,{text}).request.text,text)
  })
})
