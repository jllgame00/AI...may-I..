// Synthetic test data. Never import from application code.
import type { RecommendationSnapshot } from '../../recommendationTypes.ts'
export function fixture(): RecommendationSnapshot {
  const source = { url: 'https://example.test/fixture', checkedAt: '2026-01-01' }
  const modelIds = ['test-a', 'test-b', 'test-c']
  const evaluations = ['gdp-pdf', 'aa-lcr', 'aa-omniscience', 'arena-writing', 'ifbench', 'swe-verified', 'scicode']
  return {
    version: 'test-only', checkedAt: '2026-01-01', sources: [],
    models: modelIds.map(id => ({ id, version: 'fixture-v1', provider: 'fixture', reasoning: 'standard', evaluationMode: 'standard' })),
    plans: modelIds.map((_, i) => ({
      id: `plan-${i}`, serviceId: (['chatgpt', 'gemini', 'claude'] as const)[i], name: i === 2 ? 'Test Paid' : 'Test Free',
      tier: i === 2 ? 'paid' : 'free', price: { amount: i === 2 ? 20 : 0, currency: 'USD', period: 'month', region: 'fixture' },
      features: { pdf: { status: 'supported', note: 'fixture', sources: [source] }, web: { status: 'supported', note: 'fixture', sources: [source] } },
      limits: ['fixture limit'], freeScope: 'fixture scope', upgrade: 'fixture upgrade', sources: [source],
    })),
    mappings: modelIds.map((modelId, i) => ({ id: `choice-${i}`, planId: `plan-${i}`, modelId, modelVersion:'fixture-v1', routeKind:'chat', status: 'confirmed', selectable: true, mode: 'standard', note: 'fixture', sources: [source] })),
    cohorts: evaluations.map(evaluationId => ({ id: evaluationId, evaluationId, version: 'v1', environment: 'test-env', agentVersion: 'test-agent-v1', evaluationMode: 'standard', unit: 'points', higherIsBetter: true, evaluatedAt: '2026-01-01', modelIds })),
    observations: evaluations.flatMap(evaluationId => modelIds.map((modelId, i) => ({
      id: `${evaluationId}-${modelId}`, modelId, evaluationId, version: 'v1', environment: 'test-env', agentVersion: 'test-agent-v1', evaluationMode: 'standard', unit: 'points', higherIsBetter: true, evaluatedAt: '2026-01-01',
      rawScore: evaluationId === 'arena-writing' || evaluationId === 'ifbench' ? [10, 90, 50][i] : [90, 10, 50][i],
      confidenceInterval: null, sampleSize: null, source, redistribution: { status: 'allowed', licenseUrl: source.url }, composite: false,
    }))),
  }
}
