import type { Budget, CapabilityId, ProviderComparison, WorkCategory } from './providerTypes'
export type ConditionField='purpose'|'audience'|'format'|'length'|'tone'|'constraints'
export type TaskKind='writing'|'summary'|'research'|'coding'|'image'|'general'
export type InputMode='summary'|'file'|'unknown'
export type DeliverableKind='survey_final'|'survey_plan'|'report_final'|'report_outline'|'presentation_script'|'presentation_outline'|'presentation_content'|'email_final'|'promotion_final'|'code_fix'|'image_generation_prompt'|'general_writing'|'general_plan'|'analysis'|'image'|'slides'|'video'
export interface DeliverableIntent {kind:DeliverableKind;label:string;category:WorkCategory;origin:'explicit'|'inferred'}
export interface DeliverableContract extends DeliverableIntent {
  goal:string;requirements:string[];inputs:string[];extras:string[];unresolved:string[];instruction:string
  artifact?:{format:'pptx'|'text';delivery:'downloadable-file'|'capability-check'|'inline-text';label:string}
}
export interface PromptRequest {
  readonly text:string;overrides:Partial<Record<ConditionField,string>>
  deliverableKind?:DeliverableKind
  inputMode?:InputMode;tasks?:WorkCategory[];requiredFeatures?:CapabilityId[];preferredFeatures?:CapabilityId[];budget?:Partial<Budget>
  codingIntent?:'algorithm'|'application'|'repository'|'unspecified'
  details?:Partial<Record<'task'|'material'|'researchQuestions'|'explanation',string>>
}
export type Conditions=Record<ConditionField,string>
export type ResolvedConditions=Record<ConditionField,{value:string;source:'input'|'user'|'unknown'}>
export interface PromptTemplate {id:string;title:string;text:string;deliverable?:DeliverableContract}
export interface GuideStage extends PromptTemplate {purpose:string;inputs:string[];output:string;checks:string[];handoff:string[];workId?:string}
export interface TaskAnalysis {tasks:WorkCategory[];requiredFeatures:CapabilityId[];inputMode:InputMode;needsInputMode:boolean;survey:boolean;notes:string[];codingIntent:PromptRequest['codingIntent']|null}
export type Comparison=ProviderComparison
export interface StageSelection {default:string|null;byStage:Record<string,string>}
export interface PromptBundle {context:string;kind:TaskKind;conditions:ResolvedConditions;main:PromptTemplate;steps:PromptTemplate[];followups:PromptTemplate[];improvements:string[];checklist:string[];guideStages?:GuideStage[]}
export interface PromptDraft {text:string;context:string;previous:{text:string;context:string}|null}
export interface Session {request:PromptRequest;bundle:PromptBundle|null;drafts:Record<string,PromptDraft>;checks:Record<string,boolean>;comparison?:Comparison|null;selection?:StageSelection;activeStageId?:string;reviewed?:Record<string,boolean>;needsReview?:string[]}
export type Screen='start'|'questions'|'compare'|'result'
