export type ServiceId = 'chatgpt' | 'gemini' | 'claude'
export type Budget = 'free' | 'prefer-free' | 'paid'
export type Priority = 'quality' | 'cost' | 'ease' | 'speed'
export type TaskKind = 'research' | 'summary' | 'writing' | 'coding' | 'image' | 'unknown'
export type ScoringTask = 'analysis' | 'writing' | 'coding'
export type FeatureId = 'pdf' | 'web'
export type View = 'input' | 'analyzing' | 'results' | 'workflow' | 'prompts'
export interface RequestInput {
  text: string; budget: Budget; priority: Priority
  tasks?: ScoringTask[]
  requiredFeatures?: FeatureId[]
}
export interface Source { url: string; checkedAt: string }
export interface Model {
  id: string; version: string; provider: string; reasoning: string; evaluationMode: string
}
export interface EvaluationConditions {
  evaluationId: string; version: string; environment: string | null; agentVersion: string | null
  evaluationMode: string; unit: string; higherIsBetter: boolean; evaluatedAt: string | null
}
export interface BenchmarkObservation extends EvaluationConditions {
  id: string; modelId: string; rawScore: number | null
  confidenceInterval: { low: number; high: number; level: number | null } | null
  sampleSize: number | null; source: Source; composite: boolean
  redistribution: { status: 'allowed' | 'unknown'; licenseUrl: string | null }
}
export interface BenchmarkCohort extends EvaluationConditions { id: string; modelIds: string[] }
export interface FeatureSupport { status: 'supported' | 'unsupported' | 'unknown'; note: string; sources: Source[] }
export interface ServicePlan {
  id: string; serviceId: ServiceId; name: string; tier: 'free' | 'paid'
  price: { amount: number | null; currency: string | null; period: 'month' | 'year' | null; region: string }
  features: Record<FeatureId, FeatureSupport>; limits: string[]; freeScope: string; upgrade: string; sources: Source[]
}
export interface PlanModelMapping {
  id: string; planId: string; modelId: string | null; status: 'confirmed' | 'unknown'
  selectable: boolean; mode: string | null; note: string; sources: Source[]
}
export interface ResearchSource extends Source { name: string; status: string; note: string }
export interface RecommendationSnapshot {
  version: string; checkedAt: string; models: Model[]; observations: BenchmarkObservation[]
  plans: ServicePlan[]; mappings: PlanModelMapping[]; cohorts: BenchmarkCohort[]; sources: ResearchSource[]
}
export interface Service { id: ServiceId; name: string; subtitle: string; letter: string }
export interface Scores { benchmark: number | null; features: number | null; cost: number | null }
export interface BenchmarkDetail {
  evaluationId: string; label: string; weight: number; normalized: number | null
  observation: BenchmarkObservation | null; cohort: BenchmarkCohort | null; reason: string
}
export interface Recommendation {
  id: string; service: Service; plan: ServicePlan; mapping: PlanModelMapping; model: Model | null
  score: number | null; scores: Scores; reason: string; holds: string[]; benchmarks: BenchmarkDetail[]
  eligibility: 'confirmed' | 'conditional'; status: 'scored' | 'conditional'; nearTie: boolean
}
export interface ExcludedCandidate { plan: ServicePlan; reasons: string[] }
export interface WorkflowStep {
  id: string; title: string; description: string; output: string; kind: ScoringTask | 'image'
  serviceId: ServiceId | null; candidateId: string | null
  recommendations: Recommendation[]; excluded: ExcludedCandidate[]
}
export interface Analysis {
  request: RequestInput; kind: TaskKind; label: string; features: string[]; requiredFeatures: FeatureId[]
  conclusion: string; detail: string; recommendations: Recommendation[]; workflow: WorkflowStep[]
  dataVersion: string; policyVersion: string; checkedAt: string; sources: ResearchSource[]; interpretationNotes: string[]
}
