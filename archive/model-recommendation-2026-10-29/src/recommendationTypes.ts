export type ServiceId = 'chatgpt' | 'gemini' | 'claude' | 'catalog'
export type CatalogServiceId = ServiceId | 'kimi' | 'grok' | 'deepseek' | 'qwen' | 'perplexity' | 'mistral' | 'copilot' | 'notebooklm' | 'firefly' | 'runway'
export type TaskKind = 'research' | 'summary' | 'writing' | 'coding' | 'image' | 'unknown'
export type ScoringTask = 'analysis' | 'writing' | 'coding'
export type CodingIntent = 'algorithm' | 'application' | 'repository' | 'unspecified'
export type FeatureId = 'pdf' | 'web' | 'upload' | 'imageInput' | 'spreadsheet' | 'code' | 'imageGeneration'
export type StepKind = ScoringTask | 'outline' | 'image' | 'image-generation' | 'unknown'
export type View = 'input' | 'conditions' | 'catalog' | 'results' | 'workflow' | 'prompts'
export type ConditionField = 'tasks' | 'requiredFeatures' | 'pdfType' | 'volume' | 'duration' | 'output'
export interface RequestInput {
  text: string
  tasks?: ScoringTask[]
  requiredFeatures?: FeatureId[]
  pdfType?: 'text' | 'scan' | 'unknown'
  volume?: string
  duration?: string
  output?: string
  experience?: 'detailed' | 'brief' | 'unknown'
  featureScope?: 'stage' | 'all'
  conditionSources?: Partial<Record<ConditionField,'user' | 'inferred' | 'unknown'>>
}
export interface Source { url: string; checkedAt: string; scope?: string; access?: string }
export interface ModelAccessRoute {
  id:string; kind:'web'|'api'|'self-hosted'; label:string; url:string
  exactVersion:'confirmed'|'unconfirmed'|'retired'; hostedModelId:string|null; note:string; sources:Source[]
}
export interface Model {
  id: string; version: string; provider: string; reasoning: string; evaluationMode: string
  name?: string; modes?: string[]; capabilities?: string[]; limits?: string[]; sources?: Source[]
  availability?: string; speed?: string; setup?: string
  nativeFeatures?: Partial<Record<FeatureId,FeatureSupport>>
  route?: { kind:'api'|'self-hosted'|'unknown'; url:string; status:'confirmed'|'unknown'; note:string }
  apiPrice?: { input: number; output: number; cachedInput: number; currency: 'USD'; perTokens: 1000000; source: Source }
  webReview?: { checkedAt:string; status:'confirmed'|'unknown'; note:string; sources:Source[] }
  taskEvidence?: ModelTaskEvidence[]
}
export interface ModelEvaluation {
  id: string; modelId: string; modelVersion: string; benchmark: string; benchmarkVersion: string
  subset: string | null; domain: 'coding' | 'factuality' | 'workflow' | 'browsing' | 'vision' | 'science' | 'reasoning' | 'math' | 'knowledge' | 'writing' | 'general' | 'statistics' | 'analysis'
  index?: { name:string; version:string; components:string[]; scope:string }
  aa?: { field:string; apiModelId:string; creatorId:string; benchmark:string; benchmarkVersion:string; effort:string; capturedAt:string; versionSource:string; scope:string; components:string[] }
  evaluationType?: 'model'|'agent'; agentName?: string|null; agentVersion?: string|null
  comparisonGroup?: string
  rawScore: number | null; unit: string; higherIsBetter: boolean; effort: string | null
  tools: string | null; harness: string | null; environment: string | null; trials: number | null
  fallbacks: string | null; evaluator: string; publisher: string; kind: 'provider' | 'independent' | 'independent-reported'
  publishedAt: string | null; evaluatedAt: string | null; source: Source; limitations: string; terms: string
  taskScope?: TaskScoreScope
  scoreRange?: { min:number; max:number }
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
export interface FeatureSupport {
  status: 'supported' | 'limited' | 'unsupported' | 'unknown'; note: string; sources: Source[]
  // Optional explicit bounds from the same reviewed source. Absence is unknown,
  // never an invented quota. Existing snapshots remain unchanged.
  constraints?: { maxFileSizeMB?:number; maxFiles?:number; maxRows?:number; formats?:string[]; unresolved?:string[] }
}
export interface ServicePlan {
  id: string; serviceId: ServiceId; name: string; tier: 'free' | 'paid' | 'unknown'
  // A non-commercial access descriptor, never a stored or invented subscription.
  unassigned?: boolean
  price: { amount: number | null; currency: string | null; period: 'month' | 'year' | null; region: string }
  features: Record<'pdf' | 'web', FeatureSupport> & Partial<Record<FeatureId, FeatureSupport>>; limits: string[]; freeScope: string; upgrade: string; sources: Source[]
  route?: string
  billingKind?: 'subscription' | 'usage'
  billing?: { annualTotal: number | null; monthlyEquivalent: number | null; currencySymbol: string | null; tax: string; note: string }
  webAccess?: { status:'confirmed'|'unknown'; url:string; routeKind:'chat'|'work'; sources:Source[] }
  accountChecks?: string[]
}
export interface PlanModelMapping {
  id: string; planId: string; modelId: string | null; status: 'confirmed' | 'unknown'
  selectable: boolean; mode: string | null; note: string; sources: Source[]
  modelVersion?: string; routeKind?: 'chat' | 'work' | 'api' | 'self-hosted' | 'unconfirmed'; routeLabel?: string; url?: string
  modelReference?: boolean
  selection?: 'manual' | 'automatic' | 'unknown'; toolsNote?: string
  hostedModelId?:string|null; accessRouteId?:string
  features?: Partial<Record<FeatureId,FeatureSupport>>
  accountChecks?: string[]
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
export interface Scores { benchmark: number | null; features: number | null }
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
  configuration?: ModelEvaluation
  accessAlternative?:boolean
  accessStatus: '연결 근거 확인' | '연결 미확인'
  assessment?: CandidateAssessment
  inputStatus?:'confirmed'|'unknown'
}
export interface CandidateAssessment {
  input:{ status:'confirmed'|'unknown' }
  features:{ status:'confirmed'|'needs-check'|'unsupported'; supported:FeatureId[]; pending:FeatureId[] }
  model:{ status:'confirmed'|'unknown'; mode:'confirmed'|'unknown' }
  route:{ status:'confirmed'|'unknown'; scope:'model'|'service' }
  performance:{ status:'comparable'|'unconfirmed'; rank:number|null }
  account:{ status:'unchecked'; checks:string[] }
  start:'ready'|'model-check'|'needs-check'
}
export interface ExcludedCandidate { plan: ServicePlan; reasons: string[] }
export interface TaskRecommendationEntry {
  candidate: Recommendation
  rank: number | null
  tied: boolean
  evaluation: ModelEvaluation | null
  relevance: 'direct' | 'indirect' | 'features'
  reason: string
  relation: string
  limitation: string
  equal?: boolean
}
export interface EvidenceComparisonSet {
  id:string; benchmark:string; version:string; period:string|null; publisher:string
  modelCount:number; kind:'source-table'|'same-conditions'; entries:TaskRecommendationEntry[]
  fit:number; selectionReason:string; limitation:string; evaluatedAt:string|null
}
export interface ModelCoverage {
  modelId:string; modelName:string; category:'representative'|'alternative'|'insufficient'
  reason:string; evaluations:ModelEvaluation[]
}
export interface TaskRecommendationDecision {
  estimation?: import('./lib/scorePublication.ts').ScorePublication
  mode: 'ranked' | 'review'
  basis: string
  scope: string
  entries: TaskRecommendationEntry[]
  gaps: string[]
  examinedCount: number
  relevantCount: number
  researchSources: Source[]
  representative: EvidenceComparisonSet | null
  groups: EvidenceComparisonSet[]
  alternatives: TaskRecommendationEntry[]
  coverage: ModelCoverage[]
  codingIntent: CodingIntent | null
  weighted?: WeightedTaskDecision
}
export type TaskScoreProfile = 'survey'|'analysis'|'coding-algorithm'|'coding-application'|'coding-repository'|'coding-unspecified'|'writing'
export interface TaskScoreScope { profile:TaskScoreProfile; language?:string; genre?:string }
export interface ModelTaskEvidence {
  modelId:string; modelVersion:string
  scope:TaskScoreScope
  capabilities:{ id:string; support:FeatureSupport }[]
  purpose:FeatureSupport
}
export interface TaskScoreComponent {
  id:string; label:string; weight:number
  status?:FeatureSupport['status']
  declaredStatus?:FeatureSupport['status']
  checks?: { condition:string; requested:string|null; result:'met'|'unmet'|'unknown' }[]
  value:number|null; contribution:number|null; reason:string; sources:Source[]
}
export interface WeightedTaskRow {
  candidate:Recommendation
  judgment:'recommended'|'conditional'|'needs-check'|'unsupported'
  basis:'benchmark'|'functional'|'none'
  reason:string
  score:number|null; rank:number|null; tied:boolean; coverage:number
  components:TaskScoreComponent[]; gaps:string[]
  evaluation:ModelEvaluation|null
  evidence:{ evaluation:ModelEvaluation; relevance:'direct'|'indirect'; reason:string }[]
}
export interface WeightedTaskDecision {
  policyVersion:string; scope:TaskScoreScope
  mode:'benchmark'|'functional'
  criteria:{id:string;label:string;weight:number;rule:string}[]
  cohort:EvidenceComparisonSet|null
  rows:WeightedTaskRow[]
  explanation:string
}
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
