import { referenceComparison as compareCandidates } from './fixtures/catalog.ts'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import { compareEvaluationResults, evidenceForModel } from './currentEvidence.ts'
import { buildGuideBundle, executionRoutes, guideContext, interpretTask } from './aiGuide.ts'
import { syncDrafts, editDraft, placeholders } from './promptSession.ts'
import type { PromptRequest } from '../types.ts'

const request: PromptRequest = { text:'Python 버그 수정',tasks:['coding'],overrides:{} }
it('preserves the original five exact official models and actually obtained provider and independent results', () => {
  assert.deepEqual(snapshot.models.filter(m=>['OpenAI','Anthropic'].includes(m.provider)).map(m=>m.id).sort(),['gpt-6.1-sol','gpt-6.1-terra','gpt-6-astra','claude-sonnet-5-5','claude-opus-5-5'].sort())
  assert.ok(snapshot.evaluations!.length>=13)
  assert.ok(snapshot.evaluations!.some(e=>e.kind==='independent' && e.publisher==='Zapier'))
  for(const e of snapshot.evaluations!) {
    assert.ok(e.source.checkedAt && e.source.url && e.modelVersion && e.benchmarkVersion && e.terms)
    assert.ok(e.rawScore===null || Number.isFinite(e.rawScore))
  }
})
it('never inherits scores across model releases or substitutes zero for missing values', () => {
  const model=snapshot.models.find(m=>m.id==='gpt-6.1-terra')!
  assert.ok(evidenceForModel(model,snapshot).length)
  assert.deepEqual(evidenceForModel({...model,version:'6.2'},snapshot),[])
  const result=snapshot.evaluations![0]
  assert.equal(compareEvaluationResults({...result,rawScore:null},result).delta,null)
  assert.equal(compareEvaluationResults(result,{...result,modelVersion:'different'}).comparable,false)
})
it('checks actual evaluation settings and unknowns, but not publication dates alone', () => {
  const a=snapshot.evaluations![0]
  const complete={...a,benchmarkVersion:'1.0',effort:'max',tools:'terminal',harness:'agent v1',environment:'linux v1',trials:5,fallbacks:'none',subset:'main'}
  assert.equal(compareEvaluationResults(complete,{...complete,id:'later',publishedAt:'2026-10-27',rawScore:complete.rawScore!+1}).comparable,true)
  for(const change of [{modelVersion:'new-release'},{benchmarkVersion:'other'},{subset:'other'},{effort:'low'},{tools:'none'},{harness:'agent v2'},{environment:'other'},{trials:1},{fallbacks:'default routing'},{harness:null}]) {
    const compared=compareEvaluationResults(complete,{...complete,...change})
    assert.equal(compared.comparable,false);assert.equal(compared.delta,null)
  }
})
it('preserves API, chat and Work catalog facts without inferring subscription entitlement',()=>{
 const refs=compareCandidates(request).recommendations
 const api=refs.filter(c=>c.mapping.routeKind==='api'&&!c.plan.unassigned&&!c.configuration)
 assert.equal(api.length,5);assert.ok(api.every(c=>c.plan.billingKind==='usage'&&c.score===null))
 assert.ok(refs.some(c=>c.mapping.routeKind==='chat'));assert.ok(refs.some(c=>c.mapping.routeKind==='work'))
})

it('preserves reference candidates despite missing performance',()=>{
 const cs=compareCandidates({...request,text:'환영 이메일',tasks:['writing']}).recommendations
 assert.ok(new Set(cs.filter(c=>c.model).map(c=>c.model!.id)).size===snapshot.models.length)
 assert.ok(cs.every(c=>c.evidence?.every(e=>e.domain==='writing')))
})

it('never turns coding or workflow evaluations into writing or survey success scores', () => {
  for(const task of ['writing','analysis'] as const) {
    const result=compareCandidates({...request,text:'설문 통계 보고서',tasks:[task]})
    assert.ok(result.recommendations.every(c=>c.evidence?.every(e=>e.domain==='writing' && task==='writing') && c.score===null))
  }
})
it('keeps model execution facts outside copied prompts and preserves edited drafts on a model change',()=>{
 const cs=compareCandidates(request).recommendations
 const a=cs.find(c=>c.model?.id==='gpt-6.1-terra')!,b=cs.find(c=>c.model?.id==='claude-opus-5-5')!
 const first=buildGuideBundle(request,{default:a.id,byStage:{}}).steps[0]
 assert.doesNotMatch(first.text,/gpt-6.1-terra|사용량 과금|모델 ID/)
 assert.ok(placeholders(first.text).length>0);assert.equal(executionRoutes(a)[0].url,a.mapping.url)
 let drafts=syncDrafts({},[first],guideContext(first));drafts[first.id]=editDraft(drafts[first.id],'직접 편집한 초안')
 const next=buildGuideBundle(request,{default:b.id,byStage:{}}).steps[0]
 assert.equal(syncDrafts(drafts,[next],guideContext(next))[first.id].text,'직접 편집한 초안')
 assert.equal(first.text,next.text)
})

it('only attaches model evidence to exact releases and valid modes, never automatic routing', () => {
  for(const change of [{modelVersion:'6.2'},{mode:null},{mode:'unsupported'},{selection:'automatic' as const}]) {
    const data=structuredClone(snapshot)
    const mapping=data.mappings.find(m=>m.modelId==='gpt-6.1-terra' && m.routeKind==='api')!
    Object.assign(mapping,change)
    const c=compareCandidates(request,data).recommendations.find(c=>c.id===mapping.id)!
    assert.deepEqual(c.evidence,[])
  }
})
it('uses confirmed native API image input without inventing upload or execution permissions', () => {
  const result=compareCandidates({...request,requiredFeatures:['imageInput']})
  const c=result.recommendations.find(c=>c.model?.id==='gpt-6.1-terra'&&c.mapping.routeKind==='api')!
  assert.equal(c.suitability,'조건 비교 가능')
  assert.equal(c.plan.features.imageInput?.status,'supported')
  assert.equal(compareCandidates({...request,requiredFeatures:['upload']}).recommendations.find(item=>item.id===c.id)?.suitability,'확인 후 선택')
})
it('keeps other confirmed evidence when one score is missing and never borrows it for a new release', () => {
  const data=structuredClone(snapshot)
  data.evaluations!.find(e=>e.id==='terra-terminal-max')!.rawScore=null
  const candidates=compareCandidates(request,data).recommendations
  assert.deepEqual(candidates.find(c=>c.model?.id==='gpt-6.1-terra')!.evidence,[])
  assert.ok(candidates.find(c=>c.model?.id==='claude-opus-5-5')!.evidence!.length)
  data.models.find(m=>m.id==='claude-opus-5-5')!.version='5.6'
  for(const m of data.mappings)if(m.modelId==='claude-opus-5-5')m.modelVersion='5.6'
  assert.deepEqual(compareCandidates(request,data).recommendations.find(c=>c.model?.id==='claude-opus-5-5')!.evidence,[])
})
it('keeps image understanding essential when summary mode was only an implicit default', () => {
  const imageRequest:PromptRequest={...request,text:'이미지 분석으로 주요 내용을 설명해 줘',tasks:['analysis']}
  const comparison=compareCandidates(imageRequest)
  assert.ok(comparison.analysis.requiredFeatures.includes('imageInput'))
  assert.equal(comparison.recommendations.find(c=>c.model?.id==='claude-opus-5-5')!.suitability,'확인 후 선택')
  const terra=comparison.recommendations.find(c=>c.model?.id==='gpt-6.1-terra')!
  const prompt=buildGuideBundle(imageRequest,{default:terra.id,byStage:{}}).steps[0].text
  assert.match(prompt,/이미지 분석/)
  assert.doesNotMatch(prompt,/텍스트 입력 경로이므로/)
  assert.deepEqual(interpretTask({...imageRequest,inputMode:'summary'}).requiredFeatures,[])
})
