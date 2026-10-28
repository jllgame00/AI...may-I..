import type { Recommendation } from '../recommendationTypes'

export type EvidenceStatus = 'scored' | 'insufficient-samples' | 'unidentifiable' | 'numerical-failure'
export interface EvaluatedModel {
  id: string; settings: null; samples: number; opponents: number
  rating: number | null; ci95: [number, number] | null; status: EvidenceStatus
}
export interface EvaluationComponent {
  id: string; modelIds: string[]; votes: number; connected: boolean; stronglyConnected: boolean
  status: EvidenceStatus; models: EvaluatedModel[]
}
interface Period { start: string; end: string }
export interface ModelEvidenceSnapshot {
  schemaVersion: 1
  source: { datasetId: string; revision: string; url: string; license: string; licenseUrl: string; attribution: string; files: { path: string; sha256: string }[] }
  method: { version: string; name: string; reference: string; minVotes: number; ciLevel: number; changes: string; settings: Record<string, unknown>; packages: Record<string, string>; scriptSha256: string; computeSha256: string }
  counts: { inputRows: number; invalidRows: number; duplicateRows: number; repeatedSessionRows: number; uniqueSessions: number; retainedRows: number; ties: number; bothBad: number; fittingRows: number; filteredRows: number; scoredRows: number }
  period: Period | null; usedPeriod: Period | null; modelCount: number
  components: EvaluationComponent[]; excludedModels: EvaluatedModel[]
}
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const hash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const sourceRoot = 'https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k'
const expectedSettings = {
  tie: .5, bothBad: .5, sessions: 'first-valid-order-timestamp-id',
  scale: 400, base: 10, center: 1000, optimizer: 'L-BFGS-B',
  maxiter: 2000, ftol: 1e-12, gtol: 1e-8, hessianRegularization: 0,
  inferenceSettings: null, category: 'overall',
}
function validPeriod(p: Period | null): boolean {
  return p === null || !!p && text(p.start) && text(p.end) && Number.isFinite(Date.parse(p.start)) && Date.parse(p.start) <= Date.parse(p.end)
}
function validModel(m: EvaluatedModel, minVotes: number): boolean {
  if (!m || !text(m.id) || m.settings !== null || !integer(m.samples) || !integer(m.opponents)) return false
  if (m.status === 'scored') return m.samples >= minVotes && m.opponents >= 1 && finite(m.rating) && Array.isArray(m.ci95) && m.ci95.length === 2 && m.ci95.every(finite) && m.ci95[0] <= m.rating && m.ci95[1] >= m.rating
  return ['insufficient-samples', 'unidentifiable', 'numerical-failure'].includes(m.status) && m.rating === null && m.ci95 === null
}

/** Fail closed for missing/invalid assets. This module never enters recommendation scoring. */
export function parseModelEvidence(value: unknown): ModelEvidenceSnapshot | null {
  try {
    const d = value as ModelEvidenceSnapshot
    if (!d || d.schemaVersion !== 1 || d.source.datasetId !== 'lmarena-ai/arena-human-preference-140k' || !/^6322995[a-f0-9]{33}$/.test(d.source.revision)) return null
    if (d.source.license !== 'CC-BY-4.0' || d.source.licenseUrl !== 'https://creativecommons.org/licenses/by/4.0/' || d.source.url !== `${sourceRoot}/tree/${d.source.revision}` || !text(d.source.attribution)) return null
    if (!Array.isArray(d.source.files) || d.source.files.length !== 7 || !d.source.files.every((f, i) => f.path === `data/train-${String(i).padStart(5, '0')}-of-00007.parquet` && hash(f.sha256))) return null
    if (d.method.version !== 'public-votes-bt-v1' || !text(d.method.name) || !text(d.method.changes) || d.method.reference !== 'https://arena.ai/blog/arena-rank' || d.method.ciLevel !== .95 || d.method.minVotes !== 100) return null
    if (!d.method.settings || !Object.entries(expectedSettings).every(([key, value]) => d.method.settings[key] === value)) return null
    if (!hash(d.method.scriptSha256) || !hash(d.method.computeSha256) || !d.method.packages || !Object.values(d.method.packages).every(text)) return null
    const c = d.counts
    if (!c || !['inputRows', 'invalidRows', 'duplicateRows', 'repeatedSessionRows', 'uniqueSessions', 'retainedRows', 'ties', 'bothBad', 'fittingRows', 'filteredRows', 'scoredRows'].every(k => integer(c[k as keyof typeof c]))) return null
    if (c.inputRows < 1 || c.inputRows !== c.invalidRows+c.duplicateRows+c.repeatedSessionRows+c.retainedRows || c.retainedRows !== c.uniqueSessions || c.fittingRows+c.filteredRows !== c.retainedRows || c.ties+c.bothBad > c.retainedRows) return null
    if (!validPeriod(d.period) || !d.period || !validPeriod(d.usedPeriod) || (c.fittingRows > 0 && !d.usedPeriod) || !integer(d.modelCount)) return null
    if (!d.period.start.startsWith('2025-') || !d.period.end.startsWith('2025-')) return null
    if (d.usedPeriod && (Date.parse(d.usedPeriod.start) < Date.parse(d.period.start) || Date.parse(d.usedPeriod.end) > Date.parse(d.period.end))) return null
    if (!Array.isArray(d.components) || !Array.isArray(d.excludedModels)) return null
    const ids: string[] = []
    for (const component of d.components) {
      if (!text(component.id) || !component.connected || typeof component.stronglyConnected !== 'boolean' || !integer(component.votes) || !Array.isArray(component.models) || component.models.length < 2 || !Array.isArray(component.modelIds)) return null
      if (!['scored', 'unidentifiable', 'numerical-failure'].includes(component.status) || (component.status === 'scored' && !component.stronglyConnected)) return null
      if (component.modelIds.length !== component.models.length || !component.models.every(m => validModel(m, d.method.minVotes) && m.status === component.status && component.modelIds.includes(m.id) && m.samples >= d.method.minVotes)) return null
      if (component.models.reduce((sum, m) => sum+m.samples, 0) !== component.votes*2) return null
      ids.push(...component.models.map(m => m.id))
    }
    if (!d.excludedModels.every(m => validModel(m, d.method.minVotes) && m.status === 'insufficient-samples')) return null
    ids.push(...d.excludedModels.map(m => m.id))
    if (new Set(ids).size !== ids.length || ids.length !== d.modelCount || new Set(d.components.map(c => c.id)).size !== d.components.length) return null
    if (c.fittingRows !== d.components.reduce((sum, group) => sum+group.votes, 0) || c.scoredRows !== d.components.filter(g => g.status === 'scored').reduce((sum, group) => sum+group.votes, 0)) return null
    return d
  } catch { return null }
}
export async function loadModelEvidence(url: string, fetcher: typeof fetch = fetch): Promise<ModelEvidenceSnapshot | null> {
  try {
    const response = await fetcher(url)
    if (!response.ok) return null
    const body = await response.text()
    if (body.length > 2_000_000) return null
    return parseModelEvidence(JSON.parse(body))
  } catch { return null }
}
export function evidenceForCandidate(item: Recommendation, snapshot: ModelEvidenceSnapshot) {
  const id = item.mapping.modelId
  const models = [...snapshot.components.flatMap(c => c.models), ...snapshot.excludedModels]
  const model = id === null ? null : models.find(m => m.id === id) ?? null
  const planConfirmed = !!model && item.mapping.status === 'confirmed' && item.mapping.selectable && !!item.mapping.mode && item.mapping.sources.some(s => s.url && s.checkedAt)
  return { status: id === null ? 'unknown-model' : model ? 'matched' : 'absent', model, planConfirmed } as const
}
