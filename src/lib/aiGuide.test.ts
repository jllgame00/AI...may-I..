import { it } from 'node:test'
import assert from 'node:assert/strict'
import { interpretTask, compareCandidates, buildGuideBundle, selectForStages, stageCandidate, executionRoutes, comparisonMatches, updateGuideRequest } from './aiGuide.ts'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { syncDrafts, editDraft } from './promptSession.ts'
import { fixture } from './fixtures/recommendation.ts'
import type { PromptRequest } from '../types'

const demo: PromptRequest = { text: '설문 통계값으로 결과를 분석하고 A4 4장 보고서를 써야 해. 과제라 비용은 쓰고 싶지 않아.', overrides: {}, budget: 'free', priority: 'quality' }
it('detects analysis and writing, asks data form without assuming file upload', () => {
  const a = interpretTask(demo)
  assert.deepEqual(a.tasks,['analysis','writing']); assert.equal(a.needsInputMode,true)
  assert.deepEqual(a.requiredFeatures,[])
  assert.deepEqual(interpretTask({ ...demo,inputMode:'summary' }).requiredFeatures,[])
  assert.ok(interpretTask({ ...demo,inputMode:'file' }).requiredFeatures.includes('upload'))
})
it('compares real free conditions without assigning a fabricated quality rank', () => {
  const result = compareCandidates({ ...demo,inputMode:'summary' })
  assert.equal(result.recommendations.length,3)
  assert.ok(result.recommendations.every(c => c.plan.tier === 'free' && c.suitability === '조건 비교 가능' && c.score === null))
  assert.ok(result.recommendations.every(c => c.plan.sources.length))
  assert.equal(compareCandidates(demo).recommendations.some(c => c.suitability === '조건 비교 가능'),false)
})
it('keeps unsupported and unknown essential features separate with no forced choice', () => {
  const data = structuredClone(recommendationSnapshot)
  data.plans[0].features.upload = { status:'unsupported',note:'test',sources:data.plans[0].sources }
  const result = compareCandidates({ ...demo,inputMode:'file' },data)
  assert.ok(result.excluded.some(c => c.plan.id === data.plans[0].id))
  assert.ok(result.recommendations.some(c => c.suitability === '확인 후 선택'))
})
it('prepares four survey stages with explicit inputs, checks, handoff and no invented results', () => {
  const request = { ...demo,inputMode:'summary' as const }
  const c = compareCandidates(request).recommendations[0]
  const bundle = buildGuideBundle(request,{ default:c.id,byStage:{} })
  assert.deepEqual(bundle.steps.map(s => s.id),['statistics','interpretation','report','review'])
  for (const s of bundle.steps) {
    assert.ok(s.purpose && s.inputs.length && s.checks.length && s.handoff.length)
    assert.match(s.text,/\[.*\]/); assert.ok(s.text.includes(c.service.name) && s.text.includes(c.plan.name))
    assert.doesNotMatch(s.text,/표본\s*수\s*[:=]\s*\d|p\s*[=<]\s*0\./)
  }
  assert.match(bundle.steps[2].text,/A4\s*4장/)
})
it('uses a common selection until the user explicitly changes one stage', () => {
  const request = { ...demo,inputMode:'summary' as const }
  const cs = compareCandidates(request).recommendations
  const selection = selectForStages({ default:cs[0].id,byStage:{} },'interpretation',cs[1].id)
  assert.equal(stageCandidate(selection,'statistics',cs)?.id,cs[0].id)
  assert.equal(stageCandidate(selection,'interpretation',cs)?.id,cs[1].id)
  assert.equal(stageCandidate(selection,'report',cs)?.id,cs[0].id)
  const b = buildGuideBundle(request,selection)
  assert.ok(b.steps[1].text.includes(cs[1].service.name))
  assert.ok(b.steps[2].text.includes(cs[0].service.name))
})
it('keeps edited drafts stale after changing AI rather than overwriting them', () => {
  const request = { ...demo,inputMode:'summary' as const }, cs = compareCandidates(request).recommendations
  const b = buildGuideBundle(request,{ default:cs[0].id,byStage:{} })
  const drafts = syncDrafts({},b.steps,b.context)
  drafts.statistics = editDraft(drafts.statistics,'사용자 직접 수정')
  const next = buildGuideBundle(request,{ default:cs[1].id,byStage:{} })
  const kept = syncDrafts(drafts,next.steps,next.context)
  assert.equal(kept.statistics.text,'사용자 직접 수정'); assert.notEqual(kept.statistics.context,next.context)
})
it('never infers ChatKHU availability from consumer service membership', () => {
  const c = compareCandidates({ ...demo,inputMode:'summary' }).recommendations[0]
  assert.ok(executionRoutes(c).every(r => r.kind === 'official'))
  assert.ok(executionRoutes(c).every(r => r.url.startsWith('https://')))
})
it('does not discard explicit PDF/file needs merely because the task is writing', () => {
  const a=interpretTask({ ...demo,text:'PDF 파일 첨부해서 이메일을 작성하고 싶어요.' })
  assert.equal(a.inputMode,'file');assert.ok(a.needsInputMode)
  assert.ok(a.requiredFeatures.includes('upload'));assert.ok(a.requiredFeatures.includes('pdf'))
  assert.ok(interpretTask({ ...demo,inputMode:'file',requiredFeatures:[] }).requiredFeatures.includes('upload'))
  assert.equal(interpretTask({ ...demo,text:'환영 이메일',inputMode:'file' }).needsInputMode,true)
})
it('branches file-mode survey inputs and honors explicit report overrides including unknown length', () => {
  const request={ ...demo,inputMode:'file' as const,overrides:{format:'표',length:''} }
  const c=compareCandidates(request).recommendations[0]
  const b=buildGuideBundle(request,{default:c.id,byStage:{}})
  assert.match(b.steps[0].inputs.join(' '),/파일/)
  assert.match(b.steps[0].text,/파일.*권한|권한.*파일/)
  assert.match(b.steps[2].text,/결과 형식: 표/)
  assert.match(b.steps[2].text,/분량: 미정/)
  assert.match(b.steps[2].text,/원래 요청보다 우선/)
})
it('gates cached comparison and review after request edits while preserving drafts and selections', () => {
  const request={ ...demo,inputMode:'summary' as const },comparison=compareCandidates(request)
  const s={request,bundle:null,drafts:{statistics:{text:'직접 편집',context:'old',previous:null}},checks:{},comparison,selection:{default:comparison.recommendations[0].id,byStage:{}},reviewed:{statistics:true}}
  const changed=updateGuideRequest(s,{...request,budget:'paid'})
  assert.equal(comparisonMatches(changed.request,comparison),false)
  assert.equal(changed.reviewed?.statistics,false)
  assert.equal(changed.drafts.statistics.text,'직접 편집')
  assert.equal(changed.selection?.default,s.selection.default)
})
it('allows an alternate path only for an exact confirmed plan-model-version-mode connection', () => {
  const c=compareCandidates({...demo,inputMode:'summary'},fixture()).recommendations[0]
  const route={kind:'chatkhu' as const,url:'https://example.test/chatkhu',planId:c.plan.id,modelId:c.model!.id,version:c.model!.version,mode:c.mapping.mode!,sources:c.mapping.sources}
  assert.equal(executionRoutes(c,[route]).length,2)
  assert.equal(executionRoutes(c,[{...route,mode:'different'}]).length,1)
  assert.equal(executionRoutes(c,[{...route,sources:[]}]).length,1)
  assert.equal(executionRoutes({...c,mapping:{...c.mapping,status:'unknown'}},[route]).length,1)
})
