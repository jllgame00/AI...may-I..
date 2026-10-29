import { it } from 'node:test'
import assert from 'node:assert/strict'
import { DEMO_REQUEST, buildGuideBundle, interpretTask, compareCandidates } from './aiGuide.ts'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { structureSurveyTask } from './surveyTask.ts'
import { resolveConditions } from './promptEngine.ts'
import * as promptSession from './promptSession.ts'

it('keeps the full source and honors manually edited research questions, material and explanation',()=>{
  const request={text:DEMO_REQUEST,overrides:{length:'A4 2장'},details:{researchQuestions:'전공별 만족도 비교\n수면 시간과 성적의 관계',material:'CSV 응답 자료',explanation:'중학생도 이해할 수준'}}
  const task=structureSurveyTask(request,resolveConditions(request))
  assert.equal(task.originalText,DEMO_REQUEST)
  assert.deepEqual(task.questions,['전공별 만족도 비교','수면 시간과 성적의 관계'])
  const bundle=buildGuideBundle(request,{default:null,byStage:{}})
  for(const s of bundle.steps){assert.match(s.text,/CSV 응답 자료/);assert.match(s.text,/중학생도 이해할 수준/);assert.doesNotMatch(s.text.split('원문의 조사 배경')[1],/학년별 만족도 차이/);assert.match(s.text,/수정한 조건을 우선/)}
  assert.match(bundle.steps[2].text,/A4 2장/)
  assert.doesNotMatch(bundle.steps[0].text,/A4 2장/)
})
it('creates real development and promotional stages with explicit handoffs',()=>{
  for(const [text,titles] of [
    ['React 장바구니의 수량 변경 버그를 수정해줘',['원인 분석','코드 수정','테스트·검토']],
    ['신입생 대상 동아리 모집 홍보 글을 친근하게 500자로 작성해줘',['메시지 구성','홍보 글 초안','검토·다듬기']],
  ] as const){
    const b=buildGuideBundle({text,overrides:{}},{default:null,byStage:{}})
    assert.deepEqual(b.steps.map(s=>s.title),titles)
    assert.ok(b.guideStages!.every(s=>s.handoff.length&&s.output&&s.purpose))
    assert.match(b.steps[1].text,/앞 단계/)
  }
  assert.deepEqual(interpretTask({text:'알고리즘 문제 풀이',overrides:{}}).tasks,['coding'])
})
it('preserves unrecognized survey context and additional requirements in copied prompts',()=>{
  const text='설문 결과를 분석해서 보고서를 작성해줘. 만족도를 비교해줘. 응답은 2025년 2학기에 온라인으로 수집했어. 가중치 변수 wt를 적용해줘.'
  for(const stage of buildGuideBundle({text,overrides:{}},{default:null,byStage:{}}).steps){assert.ok(stage.text.includes(text));assert.match(stage.text,/wt/)}
})
it('honors explicit feature removal and explicitly cleared output conditions',()=>{
  assert.deepEqual(interpretTask({text:'설문 결과는 엑셀에 있어. 분석해줘.',overrides:{},requiredFeatures:[]}).requiredFeatures,[])
  const b=buildGuideBundle({text:'홍보 글을 500자로 작성해줘.',overrides:{length:''}},{default:null,byStage:{}})
  assert.match(b.steps[1].text,/분량.*미정/)
  assert.match(b.steps[1].text,/원문.*우선|원래.*우선/)
})
it('asks for group-comparison and relationship assumptions, uncertainty and effect sizes without inventing values',()=>{
  const text=buildGuideBundle({text:DEMO_REQUEST,overrides:{}},{default:null,byStage:{}}).steps[0].text
  assert.match(text,/척도·집단 수·독립성/);assert.match(text,/산점도/);assert.match(text,/효과크기·신뢰구간/)
  assert.match(text,/수치나 유의확률을 만들지/)
})
it('does not promote unrelated algorithm scores into a repository recommendation when repository comparisons disappear',()=>{
  const data=structuredClone(recommendationSnapshot)
  data.evaluations=data.evaluations!.filter(e=>e.benchmark==='LiveCodeBench')
  const d=compareCandidates({text:'React 기존 코드 버그 수정',overrides:{}},data).decision!
  assert.equal(d.representative,null);assert.equal(d.mode,'review')
  assert.ok(d.groups.some(g=>g.benchmark==='LiveCodeBench'))
})
it('invalidates downstream review marks when an earlier prompt changes without replacing other drafts',()=>{
  assert.equal(typeof promptSession.updateSessionDraft,'function')
  const request={text:DEMO_REQUEST,overrides:{}},bundle=buildGuideBundle(request,{default:null,byStage:{}})
  const draft={text:'앞 단계 편집',context:'old',previous:null}
  const session={request,bundle,drafts:{report:{text:'보고서 편집 보존',context:'old',previous:null}},checks:{},reviewed:{statistics:true,report:true,review:true}}
  const next=promptSession.updateSessionDraft(session,'statistics',draft)
  assert.equal(next.drafts.report.text,'보고서 편집 보존');assert.equal(next.drafts.statistics.text,draft.text)
  assert.equal(next.reviewed?.report,false);assert.equal(next.reviewed?.review,false)
  assert.ok(next.needsReview?.includes('report'))
})
