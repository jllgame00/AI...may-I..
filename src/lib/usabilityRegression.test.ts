import { it } from 'node:test'
import assert from 'node:assert/strict'
import { buildGuideBundle, compareCandidates } from './aiGuide.ts'
import { extractConditions, resolveConditions } from './promptEngine.ts'
import { structureSurveyTask } from './surveyTask.ts'
import { primaryAccessCandidates } from './modelAccess.ts'

export const surveyRequest = {text:'전공 수업에서 대학생 120명의 설문 결과를 분석해서 A4 4장짜리 보고서를 써야 해. 데이터는 엑셀에 있고, 학년별 만족도 차이와 공부 시간·성적의 관계를 보고 싶어. 통계를 잘 몰라서 분석 방법과 결과 해석도 쉽게 설명받고 싶어.',overrides:{}}
const generate = (request=surveyRequest) => buildGuideBundle(request,{default:null,byStage:{}})

it('preserves the verbatim survey request and structures both questions without word-deletion fragments',()=>{
  const original = structuredClone(surveyRequest)
  const b = generate()
  assert.deepEqual(surveyRequest,original)
  const structured=structureSurveyTask(surveyRequest,resolveConditions(surveyRequest))
  assert.equal(structured.originalText,original.text)
  assert.equal(Object.isFrozen(structured),true)
  assert.equal(Object.isFrozen(structured.questions),true)
  assert.equal(Object.isFrozen(structured.finalOutput),true)
  assert.equal(extractConditions(surveyRequest.text).length,'A4 4장')
  for(const stage of b.steps){
    assert.doesNotMatch(stage.text,/짜리\.|분석해서\s*[.!]|해석도\s*설명/)
    assert.match(stage.text,/학년별 만족도 차이/)
    assert.match(stage.text,/공부 시간과 성적의 관계/)
    assert.match(stage.text,/쉽게|쉬운/)
    assert.doesNotMatch(stage.text,/모델 ID|플랜|이용 경로|https:/)
  }
  for(const id of ['statistics','interpretation']){
    const text=b.steps.find(s=>s.id===id)!.text
    assert.match(text,/대학생 120명/);assert.match(text,/엑셀/)
    assert.doesNotMatch(text.split('원문의 조사 배경')[1],/A4 4장/)
    assert.match(text,/분석·해석 단계에는 최종 보고서 분량을 강제하지/)
  }
  assert.match(b.steps[2].text,/A4 4장/)
  assert.match(b.steps[3].text,/A4 4장/)
  assert.ok(b.main.text.startsWith(surveyRequest.text))
})
it('keeps missing survey facts as inputs and only changes final output conditions on override',()=>{
  const text=generate({text:'설문 결과를 분석하고 보고서를 작성해줘.',overrides:{}}).steps[0].text
  assert.match(text,/연구 질문.*입력/)
  assert.doesNotMatch(text,/대학생|120명|엑셀|학년별|공부 시간/)
  const changed=generate({...surveyRequest,overrides:{length:'2쪽'}})
  assert.ok(changed.steps.every(s=>!s.text.split('원문의 조사 배경')[1].includes('A4 4장')))
  assert.match(changed.steps[2].text,/2쪽/)
})
it('orders equally eligible model choices neutrally and independently of source array order',()=>{
  const candidates=compareCandidates(surveyRequest).recommendations
  const names=(cs:typeof candidates)=>primaryAccessCandidates(cs).map(c=>c.model?.name??`${c.service.name} ${c.plan.name}`)
  assert.deepEqual(names(candidates),names([...candidates].reverse()))
  assert.deepEqual(names(candidates),[...names(candidates)].sort((a,b)=>a!.localeCompare(b!,'en',{numeric:true})))
})
it('preserves unfamiliar questions beside a recognized group question without swallowing conjunctions',()=>{
  for(const question of ['아르바이트 여부가 성적에 미치는 영향을 보고 싶어','공부시간과 성적의 관계를 보고 싶어']){
    const b=generate({text:`설문을 분석해서 보고서를 써줘. 학년별 만족도 차이와 ${question}. 쉽게 설명해줘.`,overrides:{}})
    for(const s of b.steps){
      assert.match(s.text,/학년별 만족도 차이/)
      assert.ok(s.text.includes(question.startsWith('아르바이트')?'아르바이트 여부가 성적에 미치는 영향':'공부시간과 성적의 관계'))
      assert.doesNotMatch(s.text.split('원문의 조사 배경')[1],/차이와 공부시간과 성적/)
    }
  }
})
it('preserves neighboring questions across alternative conjunctions and treats nonisolated relations conservatively',()=>{
  for(const connector of [' 및 ',' 그리고 ',' 또한 ',' / ']){
    const b=generate({text:`설문 보고서를 써줘. 학년별 만족도 차이${connector}공부 시간·성적의 관계를 보고 싶어.`,overrides:{}})
    for(const s of b.steps){
      assert.match(s.text,/학년별 만족도 차이/)
      assert.match(s.text,/공부 시간(?:과 |·)성적의 관계/)
    }
  }
})
