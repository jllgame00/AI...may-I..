import { referenceComparison as compareCandidates } from './fixtures/catalog.ts'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSnapshot as data } from '../data/recommendationSnapshot.ts'
import { buildGuideBundle } from './aiGuide.ts'
import { sourceComparisonGroups } from './evaluationGroups.ts'
import { planPrice } from './usageConditions.ts'
import { syncDrafts, editDraft } from './promptSession.ts'
import { guideContext, executionRoutes } from './aiGuide.ts'

it('connects at least twenty exact models and fifty sourced observations without counting modes as models',()=>{
  assert.ok(data.models.length>=20)
  assert.equal(new Set(data.models.map(m=>m.id)).size,data.models.length)
  assert.ok(data.evaluations!.length>=50)
  assert.equal(new Set(data.evaluations!.map(e=>e.id)).size,data.evaluations!.length)
  for(const e of data.evaluations!){
    assert.ok(data.models.some(m=>m.id===e.modelId && m.version===e.modelVersion))
    assert.ok(e.source.url.startsWith('https://') && e.source.checkedAt && e.terms)
    assert.ok(['model','agent'].includes(e.evaluationType!))
  }
})
it('separates provider coding configuration cohorts and never mixes benchmark versions',()=>{
  const candidates=compareCandidates({text:'코딩 버그 수정',tasks:['coding'],overrides:{}}).recommendations
  const groups=sourceComparisonGroups(candidates)
  assert.deepEqual(groups.map(g=>[g.benchmark,g.version,g.rows.map(r=>r.result.rawScore)]),[
    ['CursorBench','4.0',[46.3,40.4]],['DeepSWE','1.1',[71,65.2]],['Terminal-Bench','4.0',[37.6,20.3]],
  ])
  for(const group of groups){assert.ok(group.rows.every(r=>r.result.kind==='provider'));assert.match(group.scope,/실행 구성/)}
  assert.ok(!groups.flatMap(g=>g.rows).some(r=>r.result.id==='western-grok46-deepswe'))
})
it('keeps survey candidates conditional on features and uses only writing evidence for writing',()=>{
  const survey=compareCandidates({text:'설문 통계 보고서',tasks:['analysis','writing'],inputMode:'summary',overrides:{}})
  assert.equal(new Set(survey.recommendations.filter(c=>c.model).map(c=>c.model!.id)).size,data.models.length)
  assert.ok(survey.recommendations.every(c=>c.evidence?.length===0))
  const writing=compareCandidates({text:'환영 이메일',tasks:['writing'],overrides:{}})
  assert.equal(new Set(writing.recommendations.filter(c=>c.evidence?.length).map(c=>c.model?.id)).size,5)
  assert.ok(writing.recommendations.every(c=>c.evidence?.every(e=>e.domain==='writing')))
  const file=compareCandidates({text:'설문 파일 분석',tasks:['analysis'],inputMode:'file',overrides:{}})
  assert.ok(file.recommendations.filter(c=>c.plan.unassigned).every(c=>c.suitability==='확인 후 선택'))
})
it('keeps source raw precision and pass-at-five distinct from another release result',()=>{
  const first=data.evaluations!.find(e=>e.id==='western-small31-humaneval')!
  const second=data.evaluations!.find(e=>e.id==='western-small32-humanevalplus')!
  assert.equal(first.rawScore,88.41)
  assert.equal(second.rawScore,92.9)
  assert.match(second.subset!,/Pass@5/)
  assert.notEqual(first.modelVersion,second.modelVersion)
  const grok=data.evaluations!.find(e=>e.id==='western-grok47-deepswe')!
  assert.equal(grok.effort,'high')
})
it('preserves checkpoint and API reference facts outside copied prompts',()=>{
  const request={text:'Python 코드 검토',tasks:['coding' as const],overrides:{}}
  const cs=compareCandidates(request).recommendations
  const self=cs.find(c=>c.model?.id==='deepseek-ai/DeepSeek-R1-0528'&&c.mapping.routeKind==='self-hosted'&&!c.configuration)!
  const api=cs.find(c=>c.model?.id==='gemini-4-argon'&&!c.configuration)!
  assert.match(planPrice(self),/미확인/);assert.doesNotMatch(planPrice(api),/무료 플랜|무료 API/)
  const first=buildGuideBundle(request,{default:self.id,byStage:{}}).steps[0]
  assert.doesNotMatch(first.text,/가중치 체크포인트|API 모델 ID/)
  assert.equal(executionRoutes(self)[0].url,self.model!.route!.url)
  const drafts=syncDrafts({},[first],guideContext(first));drafts[first.id]=editDraft(drafts[first.id],'확장 모델 편집 초안')
  const next=buildGuideBundle(request,{default:api.id,byStage:{}}).steps[0]
  assert.doesNotMatch(next.text,/gemini-4-argon|소비자 채팅 구독/)
  assert.equal(syncDrafts(drafts,[next],guideContext(next))[first.id].text,'확장 모델 편집 초안')
})
it('never turns an unpublished agent effort into a literal null setting in Work or chat instructions',()=>{
  for(const [text,task,id] of [
    ['과학 연구 문제','analysis','configuration:astra-science-sol-report'],
    ['코드 오류 수정','coding','configuration:sonnet-terminal'],
  ] as const){
    const request={text,tasks:[task],overrides:{}}
    const c=compareCandidates(request).recommendations.find(c=>c.id===id)!
    assert.equal(c.mapping.mode,null)
    const prompt=buildGuideBundle(request,{default:id,byStage:{}}).steps[0].text
    assert.doesNotMatch(prompt,/\/ null|effort null/)
    assert.doesNotMatch(prompt,/추론 설정|에이전트/)
  }
})
it('preserves every researched model in the reference catalog without inventing a subscription',()=>{
  const request={text:'코드 오류 수정',tasks:['coding' as const],overrides:{},inputMode:'summary' as const}
  const candidates=compareCandidates(request).recommendations
  for(const model of data.models){
    const c=candidates.find(c=>c.model?.id===model.id)!
    assert.ok(c,model.id)
    assert.doesNotMatch(buildGuideBundle(request,{default:c.id,byStage:{}}).steps[0].text,/모델 ID|선택한 AI/)
    if(model.route){assert.equal(c.plan.tier,'unknown');assert.equal(c.mapping.modelReference,true);assert.ok(!data.plans.some(p=>p.id===c.plan.id))}
  }
})
it('compares only source-declared cohorts and keeps agent configuration out of copy',()=>{
  const request={text:'업무 자동화 워크플로 분석',tasks:['analysis' as const],overrides:{},inputMode:'summary' as const}
  const candidates=compareCandidates(request).recommendations
  const groups=sourceComparisonGroups(candidates)
  const group=groups.find(g=>g.id==='zapier-automationbench-1.0.6')!
  assert.ok(group)
  assert.equal(group.rows.length,10)
  assert.equal(group.rows[0].result.rawScore,51.29)
  const chosen=group.rows[0].candidate
  const text=buildGuideBundle(request,{default:chosen.id,byStage:{}}).steps[0].text
  assert.doesNotMatch(text,/gemini-4-argon|AutomationBench|실행 구성/)
  assert.equal(chosen.model!.id,'gemini-4-argon');assert.equal(chosen.configuration!.effort,'high')
  const changed=structuredClone(candidates)
  for(const c of changed)for(const e of c.evidence??[])if(e.id===group.rows[0].result.id)e.benchmarkVersion='other'
  assert.equal(sourceComparisonGroups(changed).find(g=>g.id===group.id)!.rows.length,9)
})
it('rejects source-cohort rows with mismatched publisher, unit, subset, evaluation target or model release',()=>{
  const candidates=compareCandidates({text:'업무 자동화 워크플로 분석',tasks:['analysis'],overrides:{}}).recommendations
  const group=sourceComparisonGroups(candidates).find(g=>g.id==='zapier-automationbench-1.0.6')!
  for(const patch of [{kind:'provider'},{publisher:'Other'},{evaluator:'Other'},{unit:'index'},{subset:'Sales'},{evaluationType:'model'},{modelVersion:'next'}, {source:{url:'https://example.org',checkedAt:'2026-10-28'}}]){
    const changed=structuredClone(candidates)
    Object.assign(changed.find(c=>c.id===group.rows[0].candidate.id)!.configuration!,patch)
    assert.equal(sourceComparisonGroups(changed).find(g=>g.id===group.id)!.rows.length,9)
  }
})
it('does not mistake web research or general paper analysis for executing a business workflow or science exam',()=>{
  const workflow=compareCandidates({text:'업무 자동화 워크플로 분석',tasks:['analysis'],overrides:{}})
  assert.ok(workflow.recommendations.every(c=>c.evidence?.every(e=>e.benchmark!=='BrowseComp')))
  const web=compareCandidates({text:'웹 검색으로 정보 탐색 자료 분석',tasks:['analysis'],overrides:{}})
  assert.ok(web.recommendations.some(c=>c.evidence?.some(e=>e.benchmark==='BrowseComp')))
  const paper=compareCandidates({text:'연구 자료와 논문 요약 분석',tasks:['analysis'],overrides:{}})
  assert.ok(paper.recommendations.every(c=>c.evidence?.length===0))
})
