import { it } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, DEMO_REQUEST } from './aiGuide.ts'
import { primaryAccessCandidates } from './modelAccess.ts'
import { recommendationDisplay } from './recommendationDisplay.ts'
import type { Comparison } from '../types.ts'

const survey=()=>structuredClone(compareCandidates({text:DEMO_REQUEST,overrides:{}}))
const display=(c:Comparison)=>recommendationDisplay(c,primaryAccessCandidates(c.recommendations,c.analysis.requiredFeatures))

it('gives the two survey models joint recommendations without inventing a performance order',()=>{
  const c=survey(),before=JSON.stringify(c),result=display(c)
  assert.deepEqual(result.map(e=>[e.candidate.model?.name,e.rank,e.tied,e.basis]),[
    ['Claude Opus 5.5',1,true,'features'],['Claude Sonnet 5.5',1,true,'features'],
  ])
  assert.ok(result.every(e=>/필수 기능.*웹/.test(e.reason)))
  assert.equal(JSON.stringify(c),before)
})

it('does not rank unknown input, missing functionality or unspecified service models',()=>{
  const c=survey()
  c.recommendations=c.recommendations.filter(e=>e.assessment?.start!=='ready')
  assert.deepEqual(display(c),[])
  const unknown=compareCandidates({text:'설문 통계를 분석해줘',inputMode:'unknown',overrides:{}})
  assert.deepEqual(display(unknown),[])
})

it('does not use prices, free tiers, model names or array order to assign ranks',()=>{
  const c=survey()
  c.recommendations.reverse()
  for(const candidate of c.recommendations){
    candidate.plan.price.amount=123456;candidate.plan.tier='paid'
    if(candidate.model)candidate.model.name='changed '+candidate.id
  }
  assert.deepEqual(display(c).map(e=>[e.rank,e.tied]),[[1,true],[1,true]])
})

function evaluated():Comparison {
  const c=survey(),candidates=display(c).map(e=>e.candidate)
  c.analysis={...c.analysis,tasks:['coding'],survey:false}
  const group=compareCandidates({text:'알고리즘 문제 풀이',overrides:{}}).decision!.representative!
  const evaluation=group.entries[0].evaluation!
  c.decision!.representative={...group,fit:3,entries:candidates.map((candidate,i)=>({
    candidate,rank:i+1,tied:false,relevance:'indirect',reason:'fixture',relation:'fixture',limitation:'fixture',
    evaluation:{...evaluation,modelId:candidate.model!.id,modelVersion:candidate.model!.version,domain:'coding',evaluationType:'model',rawScore:i?90:60,higherIsBetter:true},
  }))}
  return c
}

it('uses task-related comparable model evidence only after the feature and web gate, with competition ties',()=>{
  const c=evaluated(),result=display(c)
  assert.deepEqual(result.map(e=>[e.candidate.model?.name,e.rank,e.basis]),[
    ['Claude Sonnet 5.5',1,'evaluation'],['Claude Opus 5.5',2,'evaluation'],
  ])
  assert.match(result[0].reason,/90/)
  assert.match(result[1].reason,/60/)
  c.decision!.representative!.entries[0].evaluation!.rawScore=90
  assert.deepEqual(display(c).map(e=>[e.rank,e.tied]),[[1,true],[1,true]])
  c.decision!.representative!.entries[0].evaluation!.higherIsBetter=false
  assert.ok(display(c).every(e=>e.basis==='features'))
})

it('uses lower-is-better scores and preserves joint first followed by third',()=>{
  const c=evaluated()
  const third=structuredClone(display(c)[0].candidate)
  third.id='third-web-route';third.model!.id='third-model';third.mapping.modelId='third-model'
  c.recommendations.push(third)
  const entries=c.decision!.representative!.entries
  entries.push({...entries[0],candidate:third,evaluation:{...entries[0].evaluation!,modelId:'third-model',rawScore:90}})
  for(const e of entries)e.evaluation!.higherIsBetter=false
  assert.deepEqual(display(c).map(e=>[e.rank,e.tied]),[[1,false],[2,true],[2,true]])
  entries[0].evaluation!.rawScore=90
  entries[1].evaluation!.rawScore=60
  entries[2].evaluation!.rawScore=60
  assert.deepEqual(display(c).map(e=>[e.rank,e.tied]),[[1,true],[1,true],[3,false]])
})

it('does not treat missing scores, agent runs, wrong versions or unrelated evidence as lower performance',()=>{
  for(const change of [{rawScore:null},{evaluationType:'agent' as const},{modelVersion:'other'},{domain:'math' as const}]){
    const c=evaluated()
    Object.assign(c.decision!.representative!.entries[0].evaluation!,change)
    assert.deepEqual(display(c).map(e=>[e.rank,e.tied,e.basis]),[[1,true,'features'],[1,true,'features']])
  }
})

it('recomputes eligibility rather than keeping a fixed first model',()=>{
  const c=survey()
  const opus=c.recommendations.find(e=>e.model?.id==='claude-opus-5-5')!
  opus.mapping.status='unknown'
  assert.deepEqual(display(c).map(e=>[e.candidate.model?.name,e.rank,e.tied]),[['Claude Sonnet 5.5',1,false]])
})
