export type ServiceId = 'chatgpt' | 'gemini' | 'claude'
export type CatalogServiceId = ServiceId | 'kimi' | 'grok' | 'deepseek' | 'qwen' | 'perplexity' | 'mistral' | 'copilot' | 'notebooklm' | 'firefly' | 'runway'
export type Budget = 'free' | 'prefer-free' | 'paid' | 'unknown'
export type Priority = 'quality' | 'cost' | 'ease' | 'speed'
export type TaskKind = 'research' | 'summary' | 'writing' | 'coding' | 'image' | 'unknown'
export type ScoringTask = 'analysis' | 'writing' | 'coding'
export type FeatureId = 'pdf' | 'web' | 'upload' | 'imageInput' | 'spreadsheet' | 'code' | 'imageGeneration'
export type UsageRoute = 'consumer' | 'chat' | 'work' | 'api'
export type StepKind = ScoringTask | 'outline' | 'image' | 'image-generation' | 'unknown'
export type View = 'input' | 'conditions' | 'catalog' | 'results' | 'workflow' | 'prompts'
export type ConditionField = 'budget' | 'tasks' | 'requiredFeatures' | 'pdfType' | 'volume' | 'duration' | 'output'
export interface RequestInput {
  text: string; budget: Budget; priority: Priority
  tasks?: ScoringTask[]
  requiredFeatures?: FeatureId[]
  budgetSource?: 'inferred' | 'user'
  maxKrw?: number | null
  pdfType?: 'text' | 'scan' | 'unknown'
  volume?: string
  duration?: string
  output?: string
  experience?: 'detailed' | 'brief' | 'unknown'
  featureScope?: 'stage' | 'all'
  usageRoute?: UsageRoute
  conditionSources?: Partial<Record<ConditionField,'user' | 'inferred' | 'unknown'>>
}
export interface Source { url: string; checkedAt: string; scope?: string; access?: string }
export interface Model {
  id: string; version: string; provider: string; reasoning: string; evaluationMode: string
  name?: string; modes?: string[]; capabilities?: string[]; limits?: string[]; sources?: Source[]
  availability?: string; speed?: string; setup?: string
  nativeFeatures?: Partial<Record<FeatureId,FeatureSupport>>
  apiPrice?: { input: number; output: number; cachedInput: number; currency: 'USD'; perTokens: 1000000; source: Source }
}
export interface ModelEvaluation {
  id: string; modelId: string; modelVersion: string; benchmark: string; benchmarkVersion: string
  subset: string | null; domain: 'coding' | 'factuality' | 'workflow' | 'vision' | 'science'
  rawScore: number | null; unit: string; higherIsBetter: boolean; effort: string | null
  tools: string | null; harness: string | null; environment: string | null; trials: number | null
  fallbacks: string | null; evaluator: string; publisher: string; kind: 'provider' | 'independent' | 'independent-reported'
  publishedAt: string | null; evaluatedAt: string | null; source: Source; limitations: string; terms: string
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
export interface FeatureSupport { status: 'supported' | 'limited' | 'unsupported' | 'unknown'; note: string; sources: Source[] }
export interface ServicePlan {
  id: string; serviceId: ServiceId; name: string; tier: 'free' | 'paid'
  price: { amount: number | null; currency: string | null; period: 'month' | 'year' | null; region: string }
  features: Record<'pdf' | 'web', FeatureSupport> & Partial<Record<FeatureId, FeatureSupport>>; limits: string[]; freeScope: string; upgrade: string; sources: Source[]
  route?: string
  billingKind?: 'subscription' | 'usage'
  billing?: { annualTotal: number | null; monthlyEquivalent: number | null; currencySymbol: string | null; tax: string; note: string }
}
export interface PlanModelMapping {
  id: string; planId: string; modelId: string | null; status: 'confirmed' | 'unknown'
  selectable: boolean; mode: string | null; note: string; sources: Source[]
  modelVersion?: string; routeKind?: 'chat' | 'work' | 'api'; routeLabel?: string; url?: string
  selection?: 'manual' | 'automatic' | 'unknown'; toolsNote?: string
}
export interface ResearchSource extends Source { name: string; status: string; note: string }
export interface RecommendationSnapshot {
  version: string; checkedAt: string; models: Model[]; observations: BenchmarkObservation[]
  plans: ServicePlan[]; mappings: PlanModelMapping[]; cohorts: BenchmarkCohort[]; sources: ResearchSource[]
  evaluations?: ModelEvaluation[]
}
export interface Service { id: ServiceId; name: string; subtitle: string; letter: string }
export type ResearchStatus = '후보 등록' | '일부 정보 확인' | '주요 정보 확인' | '접근 확인 필요' | '제공 종료 확인'
export interface CatalogService {
  id: CatalogServiceId; name: string; subtitle: string; letter: string
  provider: string; aliases: string[]; url: string; routes: string; researchStatus: ResearchStatus; unknowns: string; tags: string[]
}
export interface Scores { benchmark: number | null; features: number | null; cost: number | null }
export interface BenchmarkDetail {
  evaluationId: string; label: string; weight: number; normalized: number | null
  observation: BenchmarkObservation | null; cohort: BenchmarkCohort | null; reason: string
}
export interface Recommendation {
  id: string; service: Service; plan: ServicePlan; mapping: PlanModelMapping; model: Model | null
  score: number | null; scores: Scores; reason: string; holds: string[]; benchmarks: BenchmarkDetail[]
  eligibility: 'confirmed' | 'conditional'; status: 'scored' | 'conditional'; nearTie: boolean
  suitability: '조건 비교 가능' | '확인 후 선택' | '필수 정보 부족' | '확인된 조건 불일치'
  evidence?: ModelEvaluation[]; evidenceNote?: string
}
export interface ExcludedCandidate { plan: ServicePlan; reasons: string[] }
export interface WorkflowStep {
  id: string; title: string; description: string; output: string; kind: ScoringTask | 'image'
  serviceId: ServiceId | null; candidateId: string | null
  recommendations: Recommendation[]; excluded: ExcludedCandidate[]; needsReview?: boolean
}
export interface Analysis {
  request: RequestInput; kind: TaskKind; label: string; features: string[]; requiredFeatures: FeatureId[]
  conclusion: string; detail: string; recommendations: Recommendation[]; workflow: WorkflowStep[]
  dataVersion: string; policyVersion: string; checkedAt: string; sources: ResearchSource[]; interpretationNotes: string[]
}
