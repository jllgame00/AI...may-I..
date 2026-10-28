import { it } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import { compareEvaluationResults, evidenceForModel } from './currentEvidence.ts'
import { compareCandidates, buildGuideBundle, executionRoutes, guideContext, interpretTask } from './aiGuide.ts'
import { syncDrafts, editDraft, placeholders } from './promptSession.ts'
import type { PromptRequest } from '../types.ts'

const request: PromptRequest = { text:'Python 버그 수정',tasks:['coding'],overrides:{},usageRoute:'api' }
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
it('filters paths independently of subscription plans and shows API metering without a monthly price', () => {
  const api=compareCandidates(request).recommendations.filter(c=>!c.plan.unassigned&&!c.configuration)
  assert.equal(api.length,5)
  assert.ok(api.every(c=>c.mapping.routeKind==='api' && c.plan.billingKind==='usage' && c.score===null))
  assert.ok(api.every(c=>c.service.name===`${c.model?.provider} API`))
  const chat=compareCandidates({...request,usageRoute:'chat'}).recommendations.filter(c=>!c.plan.unassigned&&!c.configuration)
  assert.ok(chat.every(c=>c.mapping.routeKind==='chat'))
  assert.ok(!chat.some(c=>c.model?.id==='gpt-6.1-sol'))
  const work=compareCandidates({...request,usageRoute:'work'}).recommendations.filter(c=>!c.configuration)
  assert.equal(work.length,3)
  assert.ok(work.every(c=>c.plan.id==='chatgpt-plus' && c.mapping.routeKind==='work'))
})
it('keeps feature-based candidates despite missing performance or other candidate information', () => {
  const result=compareCandidates({...request,usageRoute:'consumer',text:'환영 이메일',tasks:['writing']})
  assert.equal(result.recommendations.filter(c=>!c.accessAlternative).length,30)
  assert.ok(result.recommendations.every(c=>c.suitability==='조건 비교 가능' && c.evidence?.every(e=>e.domain==='writing')))
  const data=structuredClone(snapshot);data.models=[];data.evaluations=[]
  assert.equal(compareCandidates({...request,usageRoute:'consumer',},data).recommendations.filter(c=>c.suitability==='조건 비교 가능').length,10)
})
it('never turns coding or workflow evaluations into writing or survey success scores', () => {
  for(const task of ['writing','analysis'] as const) {
    const result=compareCandidates({...request,text:'설문 통계 보고서',tasks:[task]})
    assert.ok(result.recommendations.every(c=>c.evidence?.every(e=>e.domain==='writing' && task==='writing') && c.score===null))
  }
})
it('propagates exact model, mode, route and billing into stages and preserves edited drafts on a model change', () => {
  const candidates=compareCandidates(request).recommendations
  const a=candidates.find(c=>c.model?.id==='gpt-6.1-terra')!,b=candidates.find(c=>c.model?.id==='claude-opus-5-5')!
  const first=buildGuideBundle(request,{default:a.id,byStage:{}})
  assert.ok(first.steps[0].text.includes(a.model!.id))
  assert.ok(placeholders(first.steps[0].text).every(p=>!snapshot.models.some(m=>p.includes(m.id))))
  assert.match(first.steps[0].text,/사용량 과금|토큰/)
  assert.equal(executionRoutes(a)[0].url,a.mapping.url)
  const t=first.steps[0];let drafts=syncDrafts({},[t],guideContext(t))
  drafts[t.id]=editDraft(drafts[t.id],'직접 편집한 초안')
  const next=buildGuideBundle(request,{default:b.id,byStage:{}}).steps[0]
  drafts=syncDrafts(drafts,[next],guideContext(next))
  assert.equal(drafts[t.id].text,'직접 편집한 초안')
  assert.notEqual(drafts[t.id].context,guideContext(next))
  assert.ok(next.text.includes(b.model!.id));assert.doesNotMatch(next.text,/모델별 최적화가 검증/)
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
  const c=result.recommendations.find(c=>c.model?.id==='gpt-6.1-terra')!
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
  assert.match(prompt,/필수 기능: 이미지 입력/)
  assert.doesNotMatch(prompt,/텍스트 입력 경로이므로/)
  assert.deepEqual(interpretTask({...imageRequest,inputMode:'summary'}).requiredFeatures,[])
})
