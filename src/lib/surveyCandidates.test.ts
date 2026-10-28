import { it } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, DEMO_REQUEST, buildGuideBundle } from './aiGuide.ts'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import { taskRecommendations } from './taskRanking.ts'
import { syncDrafts, editDraft } from './promptSession.ts'
import type { Recommendation } from '../recommendationTypes'
import { candidateSummary } from './candidatePresentation.ts'

const request={text:DEMO_REQUEST,overrides:{}}
const names=(r:ReturnType<typeof compareCandidates>)=>r.decision!.entries.map(e=>e.candidate.model!.name)

it('requires calculation execution when the survey uses an Excel file, preserving explicit summary input',()=>{
  assert.deepEqual(compareCandidates(request).analysis.requiredFeatures,['spreadsheet','upload','code'])
  assert.deepEqual(compareCandidates({...request,inputMode:'summary'}).analysis.requiredFeatures,[])
})
it('keeps all twenty web review candidates regardless of indirect observations and attaches web routes',()=>{
  const result=compareCandidates(request)
  assert.equal(result.decision!.entries.length,20)
  const readyIds=new Set(result.recommendations.filter(c=>c.assessment?.start==='ready').map(c=>c.id))
  for(const ready of [true,false]){
    const equal=result.decision!.entries.filter(e=>readyIds.has(e.candidate.id)===ready).map(e=>e.candidate.model!.name!)
    assert.deepEqual(equal,[...equal].sort((a,b)=>a.localeCompare(b,'en',{numeric:true})))
  }
  assert.ok(result.decision!.entries.every(e=>e.rank===null&&e.equal&&['chat','work'].includes(e.candidate.mapping.routeKind!)))
  assert.ok(result.decision!.entries.every(e=>!e.reason.includes('AIME')&&!e.reason.includes('Last Exam')))
  const data=structuredClone(snapshot)
  data.evaluations=[]
  assert.deepEqual(names(compareCandidates(request,data)),names(result))
})
it('never sorts survey choices by cross-benchmark scores, observation counts, or source order',()=>{
  const data=structuredClone(snapshot),before=compareCandidates(request)
  data.models.reverse();data.plans.reverse();data.mappings.reverse()
  data.evaluations=data.evaluations!.reverse().flatMap((e,i)=>[{...e,rawScore:99999-i},...Array.from({length:i%7},(_,n)=>({...e,id:`extra-${i}-${n}`,rawScore:n}))])
  const after=compareCandidates(request,data)
  assert.deepEqual(names(after),names(before))
  assert.deepEqual(after.recommendations.map(c=>c.id),before.recommendations.map(c=>c.id))
})
it('prioritizes any provider only with sourced exact web access AND every required feature confirmed',()=>{
  const result=compareCandidates(request)
  const base=result.recommendations.find(c=>c.model?.id==='deepseek-ai/DeepSeek-R1')!
  const deep={...base,id:'fixture-b',model:{...base.model!,id:'fixture-b',name:'B candidate'},mapping:{...base.mapping,modelId:'fixture-b'}}
  const claude={...base,id:'fixture-a',model:{...base.model!,id:'fixture-a',name:'A candidate'},mapping:{...base.mapping,modelId:'fixture-a'}}
  const source={url:'https://example.com/verified-web-fixture',checkedAt:'2026-10-29'}
  const verified={...deep,accessStatus:'연결 근거 확인' as const,mapping:{...deep.mapping,status:'confirmed' as const,selection:'manual' as const,selectable:true,sources:[source]},plan:{...deep.plan,features:{...deep.plan.features,upload:{status:'supported' as const,note:'fixture',sources:[source]},spreadsheet:{status:'supported' as const,note:'fixture',sources:[source]},code:{status:'supported' as const,note:'fixture',sources:[source]}}}}
  const decide=(c:Recommendation)=>taskRecommendations('analysis',DEMO_REQUEST,['upload','spreadsheet','code'],[claude,c],snapshot,[])
  assert.equal(decide(verified).entries[0].candidate.id,deep.id)
  assert.match(decide(verified).entries[0].reason,/웹 모델.*필수 기능.*확인/)
  for(const c of [
    {...verified,mapping:{...verified.mapping,status:'unknown' as const}},
    {...verified,mapping:{...verified.mapping,selection:'automatic' as const}},
    {...verified,plan:{...verified.plan,features:{...verified.plan.features,code:{status:'unknown' as const,note:'unknown',sources:[]}}}},
    {...verified,plan:{...verified.plan,features:{...verified.plan.features,code:{status:'supported' as const,note:'no proof',sources:[]}}}},
  ])assert.equal(decide(c).entries[0].candidate.id,claude.id)
})
it('distinguishes sourced unsupported tools, limited support, and unknown without borrowing native API tools',()=>{
  const c=compareCandidates(request).recommendations.find(c=>c.model?.id==='deepseek-ai/DeepSeek-R1')!
  const source={url:'https://example.com/web-tool-fixture',checkedAt:'2026-10-29'}
  const fixture={...c,model:{...c.model!,nativeFeatures:{code:{status:'supported' as const,note:'API only',sources:[source]}}},plan:{...c.plan,features:{...c.plan.features,
    upload:{status:'unsupported' as const,note:'web unsupported',sources:[source]},
    spreadsheet:{status:'limited' as const,note:'web limited',sources:[source]},
  }}}
  assert.deepEqual(candidateSummary(fixture,['upload','spreadsheet','code']).requirements,[
    '웹 모델 제공: 정확한 모델·버전 미확인','파일 첨부: 미지원 확인','엑셀 입력·분석: 제한적 지원 확인 · 작업 한도 확인 필요','계산 실행: 미확인',
  ])
})
it('combines official service tools and dated model entitlement without asserting personal account access',()=>{
  const before=structuredClone(snapshot)
  const result=compareCandidates(request)
  const c=result.recommendations.find(c=>c.model?.id==='claude-opus-5-5')!
  for(const f of ['upload','spreadsheet','code'] as const){
    assert.equal(c.plan.features[f]?.status,'supported')
    assert.ok(c.plan.features[f]?.sources.some(s=>s.checkedAt==='2026-10-29'))
  }
  assert.equal(c.accessStatus,'연결 근거 확인')
  assert.equal(c.eligibility,'confirmed')
  assert.equal(c.assessment?.account.status,'unchecked')
  assert.ok(c.mapping.sources.some(s=>s.url.includes('academy.claude.com')))
  assert.deepEqual(snapshot,before)
})
it('keeps survey prompt edits and selected models when candidate evidence changes',()=>{
  const result=compareCandidates(request),id=result.recommendations.find(c=>c.model?.id==='claude-opus-5-5')!.id
  const selection={default:id,byStage:{}}
  const bundle=buildGuideBundle(request,selection)
  let drafts=syncDrafts({},bundle.steps,bundle.context)
  drafts.statistics=editDraft(drafts.statistics,'사용자가 편집한 설문 분석 초안')
  const data=structuredClone(snapshot);data.evaluations=[]
  assert.ok(compareCandidates(request,data).recommendations.some(c=>c.id===id))
  drafts=syncDrafts(drafts,buildGuideBundle(request,selection).steps,bundle.context)
  assert.equal(drafts.statistics.text,'사용자가 편집한 설문 분석 초안')
})
it('retains a fully verified web route before deduplicating another route for the same model',()=>{
  const data=structuredClone(snapshot)
  const mapping=data.mappings.find(m=>m.modelId==='claude-opus-5-5'&&m.routeKind==='chat')!
  data.mappings=data.mappings.filter(m=>m!==mapping)
  data.mappings.push({...mapping,id:'a-unknown-selection',status:'confirmed',selectable:true,selection:'unknown'},
    {...mapping,id:'z-confirmed-selection',status:'confirmed',selectable:true,selection:'manual'})
  const result=compareCandidates(request,data)
  assert.equal(result.decision!.entries.find(e=>e.candidate.model?.id===mapping.modelId)!.candidate.id,'z-confirmed-selection')
  assert.match(result.decision!.basis,/모든 필수 기능이 확인된 후보를 먼저/)
})
it('excludes a required tool only with sourced unsupported evidence, retaining unsourced states as unknown',()=>{
  const data=structuredClone(snapshot)
  const plan=data.plans.find(p=>p.id==='claude-pro')!
  plan.features.code={status:'unsupported',note:'unverified assertion',sources:[]}
  const unknown=compareCandidates(request,data)
  assert.ok(unknown.recommendations.some(c=>c.model?.id==='claude-opus-5-5'))
  assert.ok(!unknown.excluded.some(c=>c.plan.id==='claude-pro'))
  plan.features.code.sources=[{url:'https://example.com/unsupported-fixture',checkedAt:'2026-10-29'}]
  const unsupported=compareCandidates(request,data)
  assert.ok(!unsupported.recommendations.some(c=>c.model?.id==='claude-opus-5-5'))
  assert.ok(unsupported.excluded.some(c=>c.plan.id==='claude-pro'))
})
