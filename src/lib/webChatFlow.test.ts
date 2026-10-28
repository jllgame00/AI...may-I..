import { it } from 'node:test'
import assert from 'node:assert/strict'
import { buildGuideBundle, compareCandidates, updateGuideRequest } from './aiGuide.ts'
import { syncDrafts, editDraft, copyText, regenerateDraft, restoreDraft } from './promptSession.ts'
import type { PromptRequest, Session } from '../types.ts'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'

const survey:PromptRequest={text:'대학생 만족도 설문 CSV에서 학년별 평균과 표준편차, 집단 차이를 분석하고 A4 4장 보고서를 차분하게 작성해줘.',overrides:{},inputMode:'file'}
const bundle=(request:PromptRequest)=>buildGuideBundle(request,{default:null,byStage:{}})
it('file survey requests actual statistical analysis and distinct interpretation, report and review outputs',()=>{
  const b=bundle(survey)
  assert.deepEqual(b.steps.map(s=>s.id),['statistics','interpretation','report','review'])
  assert.match(b.steps[0].text,/평균.*표준편차/)
  assert.match(b.steps[0].text,/분석.*(수행|진행)|계산해/)
  assert.match(b.steps[0].text,/결과표|통계표/)
  assert.doesNotMatch(b.steps[0].text.split('원문의 조사 배경')[1],/분석하고\s+를|A4 4장/)
  assert.doesNotMatch(b.steps[0].purpose,/권한/)
  assert.match(b.steps[1].text,/의미|해석/);assert.match(b.steps[1].text,/한계/)
  assert.match(b.steps[2].text,/보고서 초안을 작성/);assert.match(b.steps[2].text,/A4 4장/)
  assert.match(b.steps[3].text,/수치.*주장|수치 불일치/);assert.match(b.steps[3].text,/출처/)
  assert.doesNotMatch(b.steps[3].text,/써 주세요|결과 형식: 보고서/)
})
it('copied prompts contain no recommendation metadata, even with an unconfirmed candidate selected',()=>{
  const candidates=compareCandidates(survey).recommendations
  for(const defaultId of [null,...candidates.slice(0,3).map(c=>c.id)]){
    for(const s of buildGuideBundle(survey,{default:defaultId,byStage:{}}).steps){
      assert.doesNotMatch(s.text,/전체 작업 목표|공통 작성 조건|선택한 AI|이용 경로|필수 기능|우선순위|모델 ID|플랜|크레딧|최적화|https:\/\//)
      assert.ok(s.text.length<1600)
    }
  }
})
it('task-specific prompts preserve user intent, comparison names and final-only presentation conditions',()=>{
  const coding=bundle({text:'React 장바구니의 수량 변경 버그를 수정하고 재현 테스트와 패치를 작성해줘.',overrides:{}})
  const writing=bundle({text:'대학생에게 동아리 모집 홍보 글을 친근하게 500자로 작성해줘.',overrides:{}})
  assert.match(coding.steps[0].text,/장바구니/);assert.match(coding.steps[0].text,/테스트/)
  assert.match(writing.steps[0].text,/동아리/);assert.match(writing.steps[0].text,/500자/)
  assert.notEqual(coding.steps[0].text,writing.steps[0].text)
  assert.match(coding.steps[0].text,/재현.*원인|원인.*재현/s)
  assert.match(coding.steps[0].text,/패치.*테스트|테스트.*패치/s)
  assert.match(writing.steps[0].text,/모집.*(일정|대상)|일정.*모집/s)
  assert.doesNotMatch(coding.steps[0].text,/설문|보고서 초안/)
  assert.match(bundle({text:'ChatGPT와 Claude의 서비스 차이를 비교해줘.',overrides:{}}).steps[0].text,/ChatGPT와 Claude/)
  const edited=bundle({...survey,overrides:{audience:'교수',length:'2쪽',tone:'정중하게'}})
  assert.match(edited.steps[2].text,/교수/);assert.match(edited.steps[2].text,/2쪽/)
  assert.doesNotMatch(edited.steps[0].text.split('원문의 조사 배경')[1],/A4 4장|2쪽/)
})
it('legacy priority and API or CLI route values cannot change web-chat recommendations',()=>{
  const request:PromptRequest={text:'Python 버그 수정',overrides:{}}
  const baseline=compareCandidates(request)
  for(const usageRoute of ['api','cli','work','consumer']){
    const legacy={...request,usageRoute,priority:'speed'}
    assert.deepEqual(compareCandidates(legacy),baseline)
    const session:Session={request:legacy,bundle:null,drafts:{main:{text:'내 초안',context:'old',previous:null}},checks:{}}
    const changed=updateGuideRequest(session,legacy)
    assert.equal('usageRoute' in changed.request,false);assert.equal('priority' in changed.request,false)
    assert.equal(changed.drafts.main.text,'내 초안')
  }
  assert.ok(baseline.recommendations.length>0)
  assert.ok(baseline.recommendations.every(c=>['chat','work'].includes(c.mapping.routeKind!)&&!c.configuration))
  assert.ok(baseline.recommendations.filter(c=>c.accessStatus==='연결 미확인').every(c=>c.suitability==='확인 후 선택'))
})
it('edits survive condition changes, regeneration and recovery and copy sends the exact visible text',async()=>{
  const first=bundle(survey),next=bundle({...survey,overrides:{length:'2쪽'}})
  let drafts=syncDrafts({},first.steps,first.context)
  drafts.report=editDraft(drafts.report,'직접 편집한 보고서 요청\n  공백과 줄바꿈 유지')
  drafts=syncDrafts(drafts,next.steps,next.context)
  assert.equal(drafts.report.text,'직접 편집한 보고서 요청\n  공백과 줄바꿈 유지')
  const restored=restoreDraft(regenerateDraft(drafts.report,next.steps[2].text,next.context))
  let copied=''
  assert.equal(await copyText(restored.text,async text=>{copied=text}),true)
  assert.equal(copied,'직접 편집한 보고서 요청\n  공백과 줄바꿈 유지')
})
it('API-only mappings remain references and API native capabilities never establish web support',()=>{
  const data=structuredClone(recommendationSnapshot)
  data.mappings=data.mappings.filter(m=>m.routeKind==='api')
  const request:PromptRequest={text:'Python 코드 검토',overrides:{}}
  const comparison=compareCandidates(request,data)
  assert.ok(comparison.references!.some(c=>c.mapping.routeKind==='api'))
  assert.ok(!comparison.recommendations.some(c=>c.model?.id==='gpt-6.1-terra'))
  const file=compareCandidates({...request,requiredFeatures:['imageInput']})
  for(const c of file.recommendations.filter(c=>c.plan.unassigned)){
    assert.notEqual(c.plan.features.imageInput?.status,'supported')
    assert.equal(c.suitability,'확인 후 선택')
  }
})
it('fixed quality policy preserves sourced modes and analysis-only surveys do not acquire a report stage',()=>{
  const comparison=compareCandidates({text:'통계 분석',overrides:{}})
  assert.equal(comparison.recommendations.find(c=>c.model?.id==='gpt-6.1-terra')!.mapping.mode,'medium')
  assert.ok(comparison.recommendations.every(c=>c.score===null))
  assert.deepEqual(bundle({text:'설문 통계 분석',overrides:{}}).steps.map(s=>s.id),['statistics','interpretation'])
})
it('preserves analysis questions that follow a report request and changes review format only as a criterion',()=>{
  const b=bundle({text:'설문 보고서를 작성해줘. 학년별 만족도와 전공별 평균 차이를 분석해줘. 분량: A4 4장',overrides:{}})
  assert.match(b.steps[0].text,/학년별 만족도/)
  assert.match(b.steps[0].text,/전공별 평균 차이/)
  assert.doesNotMatch(b.steps[0].text.split('원문의 조사 배경')[1],/A4 4장/)
  assert.match(b.steps[3].text,/위치와 수정 제안을 표로/)
})
it('keeps statistics-related model comparisons and concept questions on their actual task',()=>{
  const compared=bundle({text:'ChatGPT와 Claude의 통계 분석 기능을 비교해줘.',overrides:{}})
  assert.equal(compared.steps.length,1)
  assert.match(compared.steps[0].text,/ChatGPT와 Claude/)
  assert.match(compared.steps[0].text,/기능을 비교/)
  assert.doesNotMatch(compared.steps[0].text,/설문 문항|표본 수·결측|빈도·비율/)
  const concept=bundle({text:'통계 분석의 기본 개념을 쉽게 설명해줘.',overrides:{}})
  assert.equal(concept.steps.length,1)
  assert.match(concept.steps[0].text,/기본 개념/)
})
it('keeps satisfaction survey datasets statistical even when services or models are compared',()=>{
  for(const text of ['서비스 만족도 설문 CSV를 분석하고 두 집단의 평균 차이를 비교한 A4 4장 보고서를 작성해줘.','ChatGPT와 Claude 사용 만족도 설문 CSV를 분석하고 두 집단 평균을 비교한 보고서를 작성해줘.']){
    const b=bundle({text,overrides:{}})
    assert.deepEqual(b.steps.map(s=>s.id),['statistics','interpretation','report','review'])
    assert.match(b.steps[0].text,/만족도 설문 CSV/)
  }
})
