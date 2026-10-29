import { it } from 'node:test'
import assert from 'node:assert/strict'
import { parseModelEvidence, loadModelEvidence, evidenceForCandidate } from './modelEvidence.ts'
import { modelEvidenceFixture } from './fixtures/modelEvidence.ts'
import { fixture } from './fixtures/recommendation.ts'
import { analyzeRequest } from './recommend.ts'
const request = { text: '자료 분석', tasks: ['analysis'] as const, requiredFeatures: [] }
function candidate() {
  const data = fixture(); data.mappings[0].status = 'unknown'
  return analyzeRequest({ ...request, tasks: ['analysis'] }, data).recommendations.find(r => r.plan.id === 'plan-0')!
}
it('retains model evidence with unknown plan mapping without changing recommendation scores', () => {
  const item = candidate(), before = structuredClone(item)
  const match = evidenceForCandidate(item, modelEvidenceFixture())
  assert.equal(match.model?.rating, 1100)
  assert.equal(match.planConfirmed, false)
  assert.equal(item.score, null)
  assert.deepEqual(item, before)
})
it('does not change current choices, ordering or ties after historical rating changes (T11)', () => {
  const input = { text: '자료 분석 발표 대본' }
  const result = analyzeRequest(input)
  const before = structuredClone(result)
  const historical = modelEvidenceFixture()
  historical.components[0].models.forEach((model,i) => { model.rating = i % 2 ? 10000 : -10000 })
  result.workflow.flatMap(step => step.recommendations).forEach(item => evidenceForCandidate(item,historical))
  assert.deepEqual(result,before)
  assert.deepEqual(analyzeRequest(input),before)
})
it('requires exact model ID and never inherits historical ratings by similar name', () => {
  const item = candidate()
  item.mapping.modelId = 'test-a-new'
  assert.equal(evidenceForCandidate(item, modelEvidenceFixture()).status, 'absent')
  item.mapping.modelId = null
  assert.equal(evidenceForCandidate(item, modelEvidenceFixture()).status, 'unknown-model')
})
it('rejects invalid scores, missing provenance and unsupported category snapshots', () => {
  assert.ok(parseModelEvidence(modelEvidenceFixture()))
  for (const mutate of [
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.components[0].models[0].rating = NaN },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.components[0].models[0].samples = 1 },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.source.revision = '' },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.source.revision = 'f'.repeat(40) },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.source.url += '/unexpected' },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.source.files[1] = d.source.files[0] },
    (d: ReturnType<typeof modelEvidenceFixture>) => { delete d.method.settings.sessions },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.method.settings.tie = 1 },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.method.settings.center = 5000 },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.period!.start = '2024-05-01T00:00:00Z' },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.method.settings.category = 'writing' },
    (d: ReturnType<typeof modelEvidenceFixture>) => { d.components[0].stronglyConnected = false },
  ]) { const data = modelEvidenceFixture(); mutate(data); assert.equal(parseModelEvidence(data), null) }
})
it('keeps insufficient and unidentifiable models null, and components separate', () => {
  const data = modelEvidenceFixture()
  const other = structuredClone(data.components[0])
  other.id = 'component-2'; other.modelIds = ['C', 'D']
  other.models.forEach((m, i) => { m.id = other.modelIds[i]; m.rating = null; m.ci95 = null; m.status = 'unidentifiable' })
  other.status = 'unidentifiable'; other.stronglyConnected = false
  data.components.push(other); data.modelCount = 5
  data.excludedModels.push({ id: 'small', samples: 1, opponents: 0, settings: null, rating: null, ci95: null, status: 'insufficient-samples' })
  Object.assign(data.counts, { inputRows: 201, retainedRows: 201, uniqueSessions: 201, fittingRows: 200, filteredRows: 1 })
  const parsed = parseModelEvidence(data)!
  assert.equal(parsed.components.length, 2)
  assert.equal(parsed.components[1].models[0].rating, null)
  assert.equal(parsed.excludedModels[0].ci95, null)
})
it('handles absent, malformed and failed snapshot requests without throwing', async () => {
  assert.equal(await loadModelEvidence('/missing', async () => new Response('', { status: 404 })), null)
  assert.equal(await loadModelEvidence('/html', async () => new Response('<html>404</html>')), null)
  assert.equal(await loadModelEvidence('/offline', async () => { throw new Error('offline') }), null)
  assert.equal(await loadModelEvidence('/bad', async () => Response.json({})), null)
  assert.equal((await loadModelEvidence('/ok', async () => Response.json(modelEvidenceFixture())))?.modelCount, 2)
})
