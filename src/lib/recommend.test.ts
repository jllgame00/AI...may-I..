import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_REQUEST, services } from '../data/services.ts'
import { analyzeRequest, classifyTask } from './recommend.ts'
import { buildPrompt } from './prompts.ts'
import type { Budget, Priority, TaskKind } from '../types'

describe('local recommendation demo', () => {
  it('produces the requested default conclusion and three-step workflow', () => {
    const result = analyzeRequest({ text: DEFAULT_REQUEST, budget: 'prefer-free', priority: 'quality' })
    assert.equal(result.conclusion, '무료 플랜 중심으로도 충분히 시작할 수 있습니다')
    assert.ok(result.detail.includes('긴 자료 처리량·고급 기능'))
    assert.equal(result.recommendations[0].service.id, 'chatgpt')
    assert.deepEqual(result.workflow.map(step => step.title), ['자료 핵심 요약 및 논점 추출', '발표 구조 설계', '발표 대본 작성'])
  })
  const cases: [string, TaskKind][] = [
    ['React 코드의 오류를 찾아줘', 'coding'], ['환경 캠페인 포스터 만들기', 'image'],
    ['논문을 분석하고 발표 대본을 작성해줘', 'research'], ['회의록을 요약해줘', 'summary'], ['환영 이메일을 써줘', 'writing'],
  ]
  for (const [text, kind] of cases) it(`classifies ${text}`, () => assert.equal(classifyTask(text), kind))
  it('changes the ranking with budget and priority', () => {
    const quality = analyzeRequest({ text: '소개 이메일을 작성해줘', budget: 'paid', priority: 'quality' })
    const cost = analyzeRequest({ text: '소개 이메일을 작성해줘', budget: 'free', priority: 'cost' })
    assert.equal(quality.recommendations[0].service.id, 'claude')
    assert.equal(cost.recommendations[0].service.id, 'gemini')
    assert.notEqual(quality.conclusion, cost.conclusion)
  })
  it('returns bounded, sorted and complete scores for every budget and priority', () => {
    for (const budget of ['free', 'prefer-free', 'paid'] as Budget[]) for (const priority of ['quality', 'cost', 'ease', 'speed'] as Priority[]) {
      const result = analyzeRequest({ text: DEFAULT_REQUEST, budget, priority })
      assert.equal(new Set(result.recommendations.map(item => item.service.id)).size, 3)
      const scores = result.recommendations.map(item => item.score)
      assert.deepEqual(scores, [...scores].sort((a, b) => b - a))
      for (const item of result.recommendations) for (const score of [item.score, ...Object.values(item.scores)]) {
        assert.ok(score >= 0 && score <= 100)
      }
    }
  })
  it('reflects the request, conditions, service and changed assignments in the copied prompt', () => {
    const result = analyzeRequest({ text: '테스트 케이스를 포함한 Python 코드를 작성해줘', budget: 'free', priority: 'ease' })
    const workflow = result.workflow.map(step => ({ ...step, serviceId: 'gemini' as const }))
    const prompts = services.map(service => buildPrompt(result, service.id, workflow))
    assert.equal(new Set(prompts).size, 3)
    for (const prompt of prompts) {
      assert.ok(prompt.includes(result.request.text))
      assert.ok(prompt.includes('무료만 사용'))
      assert.ok(prompt.includes('쉬운 사용법'))
      assert.ok(prompt.includes('코드 작성 및 오류 검토 — Gemini'))
      assert.ok(prompt.includes('[입력 자료]'))
      assert.ok(prompt.includes('[원하는 결과 형식]'))
      assert.ok(prompt.includes('[주의사항]'))
    }
    assert.equal(result.workflow[0].serviceId, 'chatgpt')
  })
  it('does not present Claude as an image generator', () => {
    const result = analyzeRequest({ text: '이미지 제작', budget: 'free', priority: 'cost' })
    assert.ok(result.recommendations.find(item => item.service.id === 'claude')?.reason.includes('이미지 생성 도구로 추천하지 않습니다'))
    assert.ok(buildPrompt(result, 'claude', result.workflow).includes('이미지가 생성되었다고 말하지 마세요'))
  })
  it('rejects blank requests and preserves long user input as text', () => {
    assert.throws(() => analyzeRequest({ text: '   ', budget: 'free', priority: 'cost' }))
    const text = '<script>alert("demo")</script>' + '가'.repeat(2900)
    assert.equal(analyzeRequest({ text, budget: 'free', priority: 'cost' }).request.text, text)
  })
})
