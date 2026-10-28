import { it } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, buildGuideBundle } from './aiGuide.ts'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import { syncDrafts, editDraft } from './promptSession.ts'
import { taskRecommendations } from './taskRanking.ts'
import type { RecommendationSnapshot } from '../recommendationTypes.ts'

const coding={text:'알고리즘 문제 풀이를 Python 코드로 작성해줘',overrides:{}}
const ids=(r:ReturnType<typeof compareCandidates>)=>r.decision?.entries.map(e=>e.candidate.model?.id)
it('ranks the actual coding comparison on one source and period instead of names or input order',()=>{
  const result=compareCandidates(coding)
  assert.equal(result.decision?.mode,'ranked')
  assert.deepEqual(ids(result)?.slice(0,3),['Qwen/Qwen3-235B-A22B-Instruct-2507','moonshotai/Kimi-K2-Instruct','deepseek-ai/DeepSeek-V3-0324'])
  assert.deepEqual(result.decision?.entries.slice(0,3).map(e=>[e.rank,e.evaluation?.rawScore]),[[1,51.8],[2,48.9],[3,45.2]])
  assert.ok(result.decision?.examinedCount!>=107)
  const data=structuredClone(snapshot)
  data.models.reverse();data.mappings.reverse();data.evaluations!.reverse()
  assert.deepEqual(ids(compareCandidates(coding,data)),ids(result))
})
it('changes real recommendations when source scores change and reports joint ranks',()=>{
  const data=structuredClone(snapshot)
  data.evaluations!.find(e=>e.id==='east-qwen235-2507-lcb')!.rawScore=40
  assert.equal(ids(compareCandidates(coding,data))?.[0],'moonshotai/Kimi-K2-Instruct')
  data.evaluations!.find(e=>e.id==='east-qwen235-2507-lcb')!.rawScore=48.9
  const entries=compareCandidates(coding,data).decision!.entries
  assert.deepEqual(entries.slice(0,3).map(e=>[e.rank,e.tied]),[[1,true],[1,true],[3,false]])
})
it('omits missing and incompatible observations without zero scores or borrowing another version',()=>{
  for(const change of [{rawScore:null},{rawScore:NaN},{benchmarkVersion:'v7'},{subset:'different period'},{effort:'thinking'},{evaluationType:'agent' as const},{modelVersion:'other'},{source:{url:'https://example.com',checkedAt:'2026-10-28'}}]){
    const data=structuredClone(snapshot)
    Object.assign(data.evaluations!.find(e=>e.id==='east-qwen235-2507-lcb')!,change)
    const result=compareCandidates(coding,data)
    assert.ok(!result.decision!.entries.some(e=>e.candidate.model?.id==='Qwen/Qwen3-235B-A22B-Instruct-2507'))
    assert.ok(result.recommendations.some(c=>c.model?.id==='Qwen/Qwen3-235B-A22B-Instruct-2507'))
    assert.ok(result.recommendations.every(c=>c.score!==0))
  }
})
it('keeps survey and general writing unranked while supplying task-specific functional choices',()=>{
  const survey=compareCandidates({text:'설문 통계값으로 집단 평균 차이를 분석해줘',inputMode:'summary',overrides:{}})
  assert.equal(survey.decision?.mode,'review')
  assert.ok(survey.decision!.entries.length>3)
  assert.ok(survey.decision?.entries.every(e=>e.rank===null && e.evaluation?.domain!=='coding'))
  assert.ok(survey.decision?.gaps.length)
  const writing=compareCandidates({text:'동아리 모집 글을 한국어 500자로 작성해줘',overrides:{}})
  assert.equal(writing.decision?.mode,'review')
  assert.ok(writing.decision?.entries.every(e=>e.rank===null && e.evaluation?.domain==='writing'))
  const data=structuredClone(snapshot)
  for(const e of data.evaluations!)if(e.domain==='coding')e.rawScore=999
  assert.deepEqual(ids(compareCandidates({text:'설문 통계값으로 집단 평균 차이를 분석해줘',inputMode:'summary',overrides:{}},data)),ids(survey))
})
it('uses creative-writing evidence only for creative work and explains indirect Korean applicability',()=>{
  const result=compareCandidates({text:'한국어 창작 단편 소설을 써줘',tasks:['writing'],overrides:{}})
  assert.equal(result.decision?.mode,'review')
  assert.deepEqual(result.decision?.groups.find(g=>g.benchmark==='Creative Writing')?.entries.map(e=>e.evaluation?.rawScore),[88.1,87.5,81.6])
  assert.ok(result.decision?.entries.every(e=>e.relevance==='indirect' && /추론/.test(e.relation)))
})
it('preserves model selection and edited stage prompts after applying recommendation rankings',()=>{
  const result=compareCandidates(coding),c=result.recommendations.find(c=>c.model?.id===result.decision!.entries[0].candidate.model?.id)!
  const selection={default:c.id,byStage:{}}
  const first=buildGuideBundle(coding,selection)
  let drafts=syncDrafts({},first.steps,first.context)
  drafts[first.steps[0].id]=editDraft(drafts[first.steps[0].id],'내가 수정한 프롬프트')
  const next=buildGuideBundle(coding,{default:result.recommendations.find(c=>c.model?.id===result.decision!.entries[1].candidate.model?.id)!.id,byStage:{}})
  drafts=syncDrafts(drafts,next.steps,next.context)
  assert.equal(drafts[first.steps[0].id].text,'내가 수정한 프롬프트')
  assert.ok(result.recommendations.some(candidate=>candidate.id===selection.default))
})

function strictFixture():RecommendationSnapshot {
  const data=structuredClone(snapshot)
  const template=data.evaluations!.find(e=>e.id==='east-qwen235-2507-lcb')!
  const rows:[string,string,number][]=[['Qwen/Qwen3-235B-A22B-Instruct-2507','Qwen3-235B-A22B-Instruct-2507',20],['moonshotai/Kimi-K2-Instruct','Kimi-K2-Instruct',10],['deepseek-ai/DeepSeek-V3-0324','DeepSeek-V3-0324',30]]
  data.evaluations=rows.map(([modelId,modelVersion,rawScore],i)=>({...template,id:`strict-${i}`,modelId,modelVersion,rawScore,
    benchmark:'HumanEval error rate fixture',benchmarkVersion:'1',subset:'main',unit:'errors',higherIsBetter:false,effort:'default',tools:'none',harness:'h1',environment:'linux1',trials:5,fallbacks:'none'}))
  return data
}
it('uses lower-is-better and fully disclosed cohorts without changing selected web settings',()=>{
  const result=compareCandidates(coding,strictFixture())
  assert.deepEqual(result.decision?.entries.map(e=>[e.candidate.model?.id,e.rank]),[['moonshotai/Kimi-K2-Instruct',1],['Qwen/Qwen3-235B-A22B-Instruct-2507',2],['deepseek-ai/DeepSeek-V3-0324',3]])
  assert.equal(result.decision?.entries[0].candidate.mapping.mode,'non-thinking')
})
it('does not compare official indices with different components or agent versions',()=>{
  for(const incompatible of ['components','agent','source scope']){
    const data=strictFixture()
    data.evaluations=data.evaluations!.slice(0,2)
    if(incompatible==='components')for(const [i,e] of data.evaluations.entries())e.index={name:e.benchmark,version:e.benchmarkVersion,components:[i?'different':'coding'],scope:'model index'}
    else if(incompatible==='agent')for(const [i,e] of data.evaluations.entries())Object.assign(e,{evaluationType:'agent',agentName:'agent',agentVersion:i?'2':'1'})
    else data.evaluations[1].source={url:'https://example.com/different-source',checkedAt:'2026-10-28',scope:'other comparison'}
    assert.equal(compareCandidates(coding,data).decision?.mode,'review',incompatible)
  }
})
it('does not emit duplicate model ranks when observations conflict within a source column',()=>{
  const data=structuredClone(snapshot)
  const e=data.evaluations!.find(e=>e.id==='east-qwen235-2507-lcb')!
  data.evaluations!.push({...e,rawScore:99})
  const entries=compareCandidates(coding,data).decision!.entries
  assert.ok(!entries.some(e=>e.candidate.model?.id==='Qwen/Qwen3-235B-A22B-Instruct-2507'))
})
it('does not misclassify email or report rewrites as poetry because of 다시',()=>{
  for(const text of ['고객 환영 이메일을 다시 작성해줘','보고서 결론을 다시 써줘']){
    const result=compareCandidates({text,overrides:{}})
    assert.equal(result.decision?.mode,'review',text)
  }
  assert.equal(compareCandidates({text:'봄을 주제로 시 작성해줘',overrides:{}}).decision?.mode,'review')
})
it('keeps performance rank independent of plan prices and web availability labels',()=>{
  const data=structuredClone(snapshot),before=compareCandidates(coding)
  for(const plan of data.plans){plan.price.amount=100000;plan.tier='paid'}
  const after=compareCandidates(coding,data)
  assert.deepEqual(after.decision?.entries.map(e=>[e.candidate.model?.id,e.rank,e.evaluation?.rawScore]),before.decision?.entries.map(e=>[e.candidate.model?.id,e.rank,e.evaluation?.rawScore]))
  const changedAccess=before.recommendations.map(c=>({...c,accessStatus:'연결 근거 확인' as const,mapping:{...c.mapping,status:'confirmed' as const},suitability:'조건 비교 가능' as const}))
  const direct=taskRecommendations('coding',coding.text,[],changedAccess,snapshot)
  assert.deepEqual(direct.entries.map(e=>[e.candidate.model?.id,e.rank]),before.decision?.entries.map(e=>[e.candidate.model?.id,e.rank]))
})
it('keeps a coding fallback about code when every coding score is missing',()=>{
  const data=structuredClone(snapshot)
  for(const e of data.evaluations!)if(e.domain==='coding')e.rawScore=null
  const decision=compareCandidates(coding,data).decision!
  assert.equal(decision.mode,'review')
  assert.ok(decision.entries.every(e=>e.rank===null&&e.evaluation===null))
  assert.ok(decision.entries.every(e=>/코드|버그|패치/.test(e.reason)&&!/통계|변수 설명/.test(e.reason)))
})
