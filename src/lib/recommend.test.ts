import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_REQUEST, services } from '../data/services.ts'
import { analyzeRequest, classifyTask, selectCandidate } from './recommend.ts'
import { buildPrompt } from './prompts.ts'
import type { Priority, TaskKind } from '../recommendationTypes'
// Original MVP contracts retained; fictional rankings are superseded by evidence.test.ts.
describe('existing MVP regression', () => {
  it('keeps the default request and three-stage workflow', () => {
    const result = analyzeRequest({ text: DEFAULT_REQUEST, priority: 'quality' })
    assert.equal(result.request.text, DEFAULT_REQUEST)
    assert.deepEqual(result.workflow.map(step => step.kind), ['analysis', 'writing', 'writing'])
  })
  const cases: [string, TaskKind][] = [
    ['React 코드의 오류를 찾아줘', 'coding'], ['환경 캠페인 포스터 만들기', 'image'],
    ['논문을 분석하고 발표 대본을 작성해줘', 'research'], ['회의록을 요약해줘', 'summary'], ['환영 이메일을 써줘', 'writing'],
  ]
  for (const [text, kind] of cases) it(`classifies ${text}`, () => assert.equal(classifyTask(text), kind))
  it('includes all task-compatible plans without price or tier filtering', () => {
    const result=analyzeRequest({text:'소개 이메일',priority:'speed'})
    assert.ok(result.recommendations.some(c=>c.plan.tier==='paid'))
    assert.ok(result.recommendations.every(c=>c.score===null))
  })
  it('supports quality, ease and speed preferences without fabricated rankings', () => {
    for(const priority of ['quality','ease','speed'] as Priority[]) {
      const result=analyzeRequest({text:DEFAULT_REQUEST,priority})
      assert.equal(new Set(result.recommendations.filter(c=>c.service.id!=='catalog').map(c=>c.service.id)).size,3)
      assert.ok(result.recommendations.every(c=>c.score===null))
    }
  })
  it('reflects each service, request, plan and manual assignment in copied prompts', () => {
    const result = analyzeRequest({ text: 'Python 코드 작성', priority: 'ease' })
    const prompts = services.map(service => {
      const candidate = result.workflow[0].recommendations.find(r => r.service.id === service.id&&!r.accessAlternative)!
      const workflow = selectCandidate(result.workflow, result.workflow[0].id, candidate.id)
      const prompt = buildPrompt(result, service.id, workflow)
      for (const value of [result.request.text, '쉬운 사용법', `${service.name} · ${candidate.plan.name}`, '[입력 자료]', '[원하는 결과 형식]', '[주의사항]']) assert.ok(prompt.includes(value))
      return prompt
    })
    assert.equal(new Set(prompts).size, 3)
  })
  it('preserves image planning without claiming generation', () => {
    const result = analyzeRequest({ text: '이미지 제작', priority: 'quality' })
    assert.ok(result.recommendations.every(r => r.score === null))
    assert.match(buildPrompt(result, 'claude', result.workflow), /이미지가 생성되었다고 말하지 마세요/)
  })
  it('rejects blank requests and preserves user input as text', () => {
    assert.throws(() => analyzeRequest({ text: ' ', priority: 'quality' }))
    const text = '<script>alert(1)</script>' + '가'.repeat(2900)
    assert.equal(analyzeRequest({ text, priority: 'quality' }).request.text, text)
  })
})
