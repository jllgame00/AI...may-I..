import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_REQUEST } from '../data/services.ts'
import * as engine from './recommend.ts'
import { buildPrompt } from './prompts.ts'
import { fixture } from './fixtures/recommendation.ts'
import type { RequestInput, RecommendationSnapshot } from '../types.ts'
const input: RequestInput = { text: '자료 분석', budget: 'paid', priority: 'quality', tasks: ['analysis'], requiredFeatures: ['pdf'] }
const run = (data = fixture(), overrides: Partial<RequestInput> = {}) => engine.analyzeRequest({ ...input, ...overrides }, data)
describe('evidence recommendation engine', () => {
  it('filters paid plans before scoring for free-only', () => {
    const result = run(fixture(), { budget: 'free' })
    assert.ok(result.recommendations.every(r => r.plan?.tier === 'free'))
    assert.ok(result.workflow[0].excluded.some(r => r.plan.id === 'plan-2'))
  })
  it('excludes explicitly unsupported required features', () => {
    const data = fixture(); data.plans[0].features.pdf.status = 'unsupported'
    const result = run(data)
    assert.ok(!result.recommendations.some(r => r.plan?.id === 'plan-0'))
    assert.match(result.workflow[0].excluded[0].reasons.join(' '), /PDF/)
  })
  it('does not treat unknown features as supported or award a total', () => {
    const data = fixture(); data.plans[0].features.pdf.status = 'unknown'
    const item = run(data).recommendations.find(r => r.plan?.id === 'plan-0')
    assert.equal(item?.eligibility, 'conditional'); assert.equal(item?.score, null); assert.equal(item?.scores.features, null)
  })
  it('keeps missing benchmark values null without redistributing weight', () => {
    const data = fixture(); data.observations[0].rawScore = null
    const item = run(data).recommendations.find(r => r.plan?.id === 'plan-0')
    assert.equal(item?.scores.benchmark, null); assert.equal(item?.score, null)
    assert.equal(item?.scores.features, 100); assert.equal(item?.scores.cost, 100)
  })
  for (const field of ['version', 'environment', 'agentVersion', 'evaluationMode', 'unit', 'evaluatedAt'] as const) {
    it(`refuses comparison across different ${field}`, () => {
      const data = fixture(); data.observations[1][field] = 'different'
      assert.equal(run(data).recommendations.find(r => r.plan?.id === 'plan-0')?.scores.benchmark, null)
    })
  }
  it('uses task-specific evaluations and hand-calculated 60/25/15 totals', () => {
    const analysis = run(); const writing = run(fixture(), { tasks: ['writing'] })
    assert.equal(analysis.recommendations[0].plan.id, 'plan-0')
    assert.equal(writing.recommendations[0].plan.id, 'plan-1')
    assert.equal(analysis.recommendations[0].score, 100)
    assert.equal(analysis.recommendations.find(r => r.plan.id === 'plan-1')?.score, 40)
    assert.equal(analysis.recommendations.find(r => r.plan.id === 'plan-2')?.score, 70)
    assert.equal(run(fixture(), { budget: 'prefer-free' }).recommendations.find(r => r.plan.id === 'plan-2')?.score, 62.5)
  })
  it('does not rank separately normalized cohorts together', () => {
    const data = fixture()
    for (const c of [...data.cohorts]) {
      c.modelIds = ['test-a', 'test-b']
      data.cohorts.push({ ...c, id: `${c.id}-other`, environment: 'other-env', modelIds: ['test-b', 'test-c'] })
    }
    for (const o of [...data.observations]) if (o.modelId !== 'test-a') data.observations.push({ ...o, id: `${o.id}-other`, environment: 'other-env' })
    assert.ok(run(data).recommendations.every(r => r.score === null))
  })
  it('requires an explicit agent version for SWE-bench comparisons', () => {
    const data = fixture()
    data.cohorts.find(c => c.evaluationId === 'swe-verified')!.agentVersion = null
    for (const o of data.observations) if (o.evaluationId === 'swe-verified') o.agentVersion = null
    assert.ok(run(data, { tasks: ['coding'] }).recommendations.every(r => r.score === null))
  })
  it('does not recognize or inside error as an ambiguous alternative', () => {
    assert.equal(engine.classifyTask('React error를 수정해줘'), 'coding')
  })
  it('does not confirm feature support without a dated source', () => {
    const data = fixture(); data.plans[0].features.pdf.sources = [{ url: '', checkedAt: '' }]
    assert.equal(run(data).recommendations.find(r => r.plan.id === 'plan-0')?.scores.features, null)
  })
  it('does not use composite indices or unlicensed observations as substitutes', () => {
    for (const change of [(d: RecommendationSnapshot) => { d.observations[0].composite = true }, (d: RecommendationSnapshot) => { d.observations[0].redistribution.status = 'unknown' }]) {
      const data = fixture(); change(data)
      assert.equal(run(data).recommendations.find(r => r.plan.id === 'plan-0')?.score, null)
    }
  })
  it('normalizes lower-is-better metrics and equal cohorts without NaN', () => {
    const data = fixture()
    for (const c of data.cohorts) c.higherIsBetter = false
    for (const o of data.observations) o.higherIsBetter = false
    assert.equal(run(data).recommendations[0].plan.id, 'plan-1')
    for (const o of data.observations) o.rawScore = 0
    assert.equal(run(data).recommendations[0].score, 70)
  })
  it('holds totals for unknown or automatically routed model mappings', () => {
    for (const automatic of [false, true]) {
      const data = fixture()
      if (automatic) data.mappings[0].selectable = false
      else data.mappings[0].status = 'unknown'
      const item = run(data).recommendations.find(r => r.plan.id === 'plan-0')
      assert.equal(item?.score, null); assert.equal(item?.status, 'conditional')
    }
  })
  it('holds unknown subscription prices', () => {
    const data = fixture(); data.plans[2].price.amount = null
    assert.equal(run(data).recommendations.find(r => r.plan.id === 'plan-2')?.scores.cost, null)
  })
  it('creates separate analysis and writing stages for a composite request', () => {
    const result = engine.analyzeRequest({ text: DEFAULT_REQUEST, budget: 'free', priority: 'quality' }, fixture())
    assert.deepEqual(result.workflow.map(s => s.kind), ['analysis', 'writing', 'writing'])
    assert.deepEqual(result.workflow.map(s => s.candidateId), ['choice-0', 'choice-1', 'choice-1'])
  })
  it('does not silently classify ambiguous input as writing', () => {
    const result = engine.analyzeRequest({ text: '뭘 하면 좋을까', budget: 'free', priority: 'quality' }, fixture())
    assert.equal(result.kind, 'unknown'); assert.equal(result.workflow.length, 0)
    assert.equal(engine.analyzeRequest({ ...input, text: '코딩 또는 글쓰기', tasks: undefined }, fixture()).workflow.length, 0)
  })
  it('allows explicit task and feature overrides', () => {
    const result = run(fixture(), { text: '뭘 하면 좋을까', tasks: ['writing', 'coding'], requiredFeatures: [] })
    assert.deepEqual([...new Set(result.workflow.map(s => s.kind))], ['writing', 'coding'])
    assert.deepEqual(result.requiredFeatures, [])
  })
  it('handles no eligible candidates without a forced assignment', () => {
    const data = fixture(); for (const p of data.plans) p.features.pdf.status = 'unsupported'
    const result = run(data)
    assert.equal(result.recommendations.length, 0)
    assert.ok(result.workflow.every(s => s.candidateId === null && s.serviceId === null))
    assert.match(buildPrompt(result, 'chatgpt', result.workflow), /후보 없음|선택.*없|미배정/)
  })
  it('has no fabricated production benchmark total', () => {
    const result = engine.analyzeRequest(input)
    assert.ok(result.recommendations.length > 0)
    assert.ok(result.recommendations.every(r => r.score === null))
  })
  it('retains valid evaluation parts when another required evaluation is absent', () => {
    const data = fixture()
    data.observations = data.observations.filter(o => o.evaluationId !== 'aa-lcr')
    const item = run(data).recommendations.find(r => r.plan.id === 'plan-0')!
    assert.deepEqual(item.benchmarks.map(b => b.normalized), [100, null, 100])
    assert.equal(item.scores.benchmark, null)
    assert.equal(item.score, null)
    assert.deepEqual(item.scores, { benchmark: null, features: 100, cost: 100 })
  })
  it('does not hold coding scores because unrelated analysis and writing data are absent', () => {
    const data = fixture()
    data.observations = data.observations.filter(o => ['swe-verified', 'scicode'].includes(o.evaluationId))
    data.cohorts = data.cohorts.filter(c => ['swe-verified', 'scicode'].includes(c.evaluationId))
    assert.equal(run(data, { tasks: ['coding'] }).recommendations[0].score, 100)
  })
  it('does not suppress mapped candidates because another plan has no model mapping', () => {
    const data = fixture()
    data.mappings[0].status = 'unknown'
    const result = run(data)
    assert.equal(result.recommendations.find(r => r.plan.id === 'plan-0')?.score, null)
    assert.equal(result.recommendations.find(r => r.plan.id === 'plan-2')?.score, 70)
    assert.equal(result.recommendations.find(r => r.plan.id === 'plan-0')?.scores.features, 100)
  })
  it('audits all six real plans across all tasks with feature and cost holds kept separate', () => {
    for (const task of ['analysis', 'writing', 'coding'] as const) {
      const result = engine.analyzeRequest({ ...input, tasks: [task], requiredFeatures: ['pdf', 'web'] })
      assert.equal(result.recommendations.length, 6)
      for (const item of result.recommendations) {
        assert.equal(item.model, null)
        assert.equal(item.mapping.status, 'unknown')
        assert.equal(item.scores.benchmark, null)
        assert.equal(item.score, null)
        assert.equal(item.scores.features, item.service.id === 'chatgpt' ? 100 : null)
        assert.equal(item.scores.cost, item.plan.id === 'chatgpt-plus' ? null : 100)
      }
      const webOnly = engine.analyzeRequest({ ...input, tasks: [task], requiredFeatures: ['web'] })
      assert.ok(webOnly.recommendations.every(item => item.scores.features === 100))
    }
  })
  it('keeps manual selection, plan, stage and prompt consistent; reanalysis resets', () => {
    const result = run(); const original = JSON.stringify(result)
    assert.equal(typeof engine.selectCandidate, 'function')
    const changed = engine.selectCandidate(result.workflow, result.workflow[0].id, 'choice-1')
    const prompt = buildPrompt(result, 'gemini', changed, changed[0].id)
    assert.match(prompt, /Gemini · Test Free/); assert.match(prompt, /standard/)
    assert.match(prompt, /자료 분석/); assert.match(prompt, /fixture limit/)
    assert.equal(JSON.stringify(result), original)
    assert.equal(run().workflow[0].candidateId, 'choice-0')
    assert.throws(() => engine.selectCandidate(changed, changed[0].id, 'invalid'))
  })
  it('reflects manual model changes within the same plan without changing other stages', () => {
    const data = fixture()
    data.mappings.push({ ...data.mappings[1], id: 'alternate-model', planId: 'plan-0' })
    const result = run(data, { tasks: ['analysis', 'writing'] })
    const changed = engine.selectCandidate(result.workflow, result.workflow[0].id, 'alternate-model')
    assert.equal(changed[0].serviceId, 'chatgpt')
    assert.equal(changed[1].candidateId, result.workflow[1].candidateId)
    const prompt = buildPrompt(result, 'chatgpt', changed, changed[0].id)
    assert.match(prompt, /ChatGPT · Test Free · test-b \(standard\)/)
    assert.equal(engine.selectedCandidate(changed[0])?.model?.id, 'test-b')
  })
  it('keeps normalization reference membership independent of budget filters', () => {
    const data = fixture()
    assert.equal(run(data, { budget: 'free' }).recommendations.find(r => r.plan.id === 'plan-1')?.score, 40)
    assert.equal(run(data, { budget: 'paid' }).recommendations.find(r => r.plan.id === 'plan-1')?.score, 40)
  })
  it('preserves image text-planning without promising image generation', () => {
    const result = engine.analyzeRequest({ ...input, text: '이미지 콘셉트와 포스터', tasks: undefined })
    assert.equal(result.kind, 'image')
    assert.match(buildPrompt(result, 'claude', result.workflow), /이미지가 생성되었다고 말하지 마세요/)
  })
  it('rejects blank requests, preserves text and is deterministic without mutation', () => {
    assert.throws(() => run(fixture(), { text: ' ' }))
    const data = fixture(); const before = JSON.stringify(data)
    assert.deepEqual(run(data), run(data)); assert.equal(JSON.stringify(data), before)
    const text = '<script>alert(1)</script>' + '가'.repeat(2900)
    assert.equal(run(data, { text }).request.text, text)
  })
})
