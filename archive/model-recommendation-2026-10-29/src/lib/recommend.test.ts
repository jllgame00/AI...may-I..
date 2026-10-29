import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_REQUEST, services } from '../data/services.ts'
import { analyzeRequest, classifyTask, selectCandidate } from './recommend.ts'
import { buildPrompt } from './prompts.ts'
import type { TaskKind } from '../recommendationTypes'
// Original MVP contracts retained; fictional rankings are superseded by evidence.test.ts.
describe('existing MVP regression', () => {
  it('keeps the default request and three-stage workflow', () => {
    const result = analyzeRequest({ text: DEFAULT_REQUEST })
    assert.equal(result.request.text, DEFAULT_REQUEST)
    assert.deepEqual(result.workflow.map(step => step.kind), ['analysis', 'writing', 'writing'])
  })
  const cases: [string, TaskKind][] = [
    ['React 코드의 오류를 찾아줘', 'coding'], ['환경 캠페인 포스터 만들기', 'image'],
    ['논문을 분석하고 발표 대본을 작성해줘', 'research'], ['회의록을 요약해줘', 'summary'], ['환영 이메일을 써줘', 'writing'],
  ]
  for (const [text, kind] of cases) it(`classifies ${text}`, () => assert.equal(classifyTask(text), kind))
  it('includes all task-compatible plans without price or tier filtering', () => {
    const result=analyzeRequest({text:'소개 이메일'})
    assert.ok(result.recommendations.some(c=>c.plan.tier==='paid'))
    assert.ok(result.recommendations.every(c=>c.score===null))
  })
  it('keeps manual assignments outside task-only copied prompts',()=>{
    const result=analyzeRequest({text:'Python 코드 작성'})
    const prompts=services.map(service=>{
      const candidate=result.workflow[0].recommendations.find(c=>c.service.id===service.id)!
      const workflow=selectCandidate(result.workflow,result.workflow[0].id,candidate.id)
      const prompt=buildPrompt(result,service.id,workflow)
      assert.match(prompt,/Python 코드 작성/);assert.doesNotMatch(prompt,/플랜|쉬운 사용법|모델 ID/)
      return prompt
    })
    assert.equal(new Set(prompts).size,1)
  })
  it('preserves image planning without claiming generation', () => {
    const result = analyzeRequest({ text: '이미지 제작' })
    assert.ok(result.recommendations.every(r => r.score === null))
    assert.match(buildPrompt(result, 'claude', result.workflow), /이미지가 생성되었다고 말하지 마세요/)
  })
  it('rejects blank requests and preserves user input as text', () => {
    assert.throws(() => analyzeRequest({ text: ' ' }))
    const text = '<script>alert(1)</script>' + '가'.repeat(2900)
    assert.equal(analyzeRequest({ text }).request.text, text)
  })
})
