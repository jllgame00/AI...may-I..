export type ConditionField = 'purpose' | 'audience' | 'format' | 'length' | 'tone' | 'constraints'
export type TaskKind = 'writing' | 'summary' | 'research' | 'coding' | 'image' | 'general'
import type { Budget, FeatureId, Priority, Recommendation, ExcludedCandidate, ScoringTask, UsageRoute } from './recommendationTypes'
export type InputMode = 'summary' | 'file' | 'unknown'
export interface PromptRequest {
  text: string; overrides: Partial<Record<ConditionField,string>>
  budget?: Budget; priority?: Priority; inputMode?: InputMode; requiredFeatures?: FeatureId[]; tasks?: ScoringTask[]
  usageRoute?: UsageRoute
}
export type Conditions = Record<ConditionField,string>
export type ResolvedConditions = Record<ConditionField,{ value: string; source: 'input' | 'user' | 'unknown' }>
export interface PromptTemplate { id: string; title: string; text: string }
export interface GuideStage extends PromptTemplate { purpose: string; inputs: string[]; output: string; checks: string[]; handoff: string[] }
export interface TaskAnalysis { tasks: ScoringTask[]; requiredFeatures: FeatureId[]; inputMode: InputMode; needsInputMode: boolean; survey: boolean; notes: string[] }
export interface Comparison { recommendations: Recommendation[]; excluded: ExcludedCandidate[]; analysis: TaskAnalysis; context:string }
export interface StageSelection { default: string | null; byStage: Record<string,string> }
export interface PromptBundle {
  context: string; kind: TaskKind; conditions: ResolvedConditions
  main: PromptTemplate; steps: PromptTemplate[]; followups: PromptTemplate[]
  improvements: string[]; checklist: string[]
  guideStages?: GuideStage[]
}
export interface PromptDraft { text: string; context: string; previous: { text: string; context: string } | null }
export interface Session {
  request: PromptRequest; bundle: PromptBundle | null
  drafts: Record<string,PromptDraft>; checks: Record<string,boolean>
  comparison?: Comparison | null; selection?: StageSelection; activeStageId?: string; reviewed?: Record<string,boolean>; needsReview?: string[]
}
export type Screen = 'start' | 'questions' | 'compare' | 'result'
