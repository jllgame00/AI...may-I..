// Synthetic test-only data. Never imported by application code.
import type { ModelEvidenceSnapshot } from '../modelEvidence.ts'
export function modelEvidenceFixture(): ModelEvidenceSnapshot {
  const revision = '6322995'+'a'.repeat(33)
  return {
    schemaVersion: 1,
    source: { datasetId: 'lmarena-ai/arena-human-preference-140k', revision, url: `https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k/tree/${revision}`, license: 'CC-BY-4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Synthetic test fixture', files: Array.from({ length: 7 }, (_, i) => ({ path: `data/train-${String(i).padStart(5, '0')}-of-00007.parquet`, sha256: 'b'.repeat(64) })) },
    method: { version: 'public-votes-bt-v1', name: 'Synthetic BT test', reference: 'https://arena.ai/blog/arena-rank', minVotes: 100, ciLevel: .95, changes: 'Synthetic test fixture', settings: { tie: .5, bothBad: .5, sessions: 'first-valid-order-timestamp-id', scale: 400, base: 10, center: 1000, optimizer: 'L-BFGS-B', maxiter: 2000, ftol: 1e-12, gtol: 1e-8, hessianRegularization: 0, category: 'overall', inferenceSettings: null }, packages: { python: 'test' }, scriptSha256: 'c'.repeat(64), computeSha256: 'd'.repeat(64) },
    counts: { inputRows: 100, invalidRows: 0, duplicateRows: 0, repeatedSessionRows: 0, uniqueSessions: 100, retainedRows: 100, ties: 0, bothBad: 0, fittingRows: 100, filteredRows: 0, scoredRows: 100 },
    period: { start: '2025-05-01T00:00:00Z', end: '2025-05-02T00:00:00Z' }, usedPeriod: { start: '2025-05-01T00:00:00Z', end: '2025-05-02T00:00:00Z' }, modelCount: 2,
    components: [{ id: 'component-1', modelIds: ['test-a', 'historical-b-2025'], votes: 100, connected: true, stronglyConnected: true, status: 'scored', models: [
      { id: 'test-a', settings: null, samples: 100, opponents: 1, rating: 1100, ci95: [1080, 1120], status: 'scored' },
      { id: 'historical-b-2025', settings: null, samples: 100, opponents: 1, rating: 900, ci95: [880, 920], status: 'scored' },
    ] }], excludedModels: [],
  }
}
