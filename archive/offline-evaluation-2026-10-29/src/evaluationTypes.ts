import type { SupportStatus } from './providerTypes'

export const EVIDENCE_FEATURES=['textEditing','documentSummary','webResearch','sourceCitations','codeEditing','pdfInput','pdfAnalysis','scannedPdfReading','xlsxInput','xlsxAnalysis','chartCreation','fileDownload','imageGeneration','videoGeneration','surveyDraft','formCreation','codeExecution','longDocumentProcessing','multiStepWork'] as const
export type EvidenceFeature=typeof EVIDENCE_FEATURES[number]
export type SourceType='official-product'|'official-pricing'|'official-help'|'experiment'|'external-evaluation'
export interface EvidenceSource {
  id:string;url:string;attemptedAt:string;checkedAt:string|null;sourceType:SourceType
  access:'read'|'no-content'|'failed';observation:string;serviceId:string
}
export interface FeatureClaim {
  id:string;providerId:string;serviceId:string;planId:string|null;channel:'web'
  scope:'service'|'route';featureId:EvidenceFeature;status:SupportStatus;sourceIds:string[]
  region:string;limitations:string[];verification:'reviewed'|'unverified';unknownReason:string|null
}
export interface EvidenceRegister {version:string;sources:EvidenceSource[];claims:FeatureClaim[]}
export interface EvidenceCell extends FeatureClaim {sources:EvidenceSource[]}
export type CostCondition='free-available'|'free-with-limits'|'paid-required'|'unknown'|'budget-mismatch'
export type TaskCategory='survey'|'xlsx-analysis'|'pdf-script'
export interface RubricMetric {metricId:string;maximumScore:number;gradingMethod:'automatic'|'manual';description:string}
export interface EvaluationCase {
  caseId:string;taskCategory:TaskCategory;description:string;inputFixture:string[]
  requiredCapabilities:EvidenceFeature[];promptVersion:string;prompt:string;expectedResult:Record<string,unknown>
  rubricVersion:string;metrics:RubricMetric[]
}
export interface EvaluationRun {
  runId:string;caseId:string;providerId:string;serviceId:string;planId:string;channel:'web'|'api'
  testedAt:string|null;executionStatus:'planned'|'completed'|'failed'|'blocked'
  provenance:'real'|'synthetic'|'demo';outputReference:string|null;outputSha256:string|null
  actualResult:Record<string,unknown>|null;evaluationMethod:'structured-and-human';evaluatorId:string;notes:string
  promptVersion:string;rubricVersion:string;fixtureHash:string;environmentKey:string;region:string;repetition:number
  executionEvidence:string|null;settings:Record<string,string>;internalModel?:string
  sessionId:string|null
}
export interface CaptureAttachment {path:string;sha256:string}
export interface RunCapture {rawOutput:string;actualResult:Record<string,unknown>;attachments:CaptureAttachment[]}
export interface EvaluationScore {
  runId:string;metricId:string;score:number;maximumScore:number;evidence:string
  gradingMethod:'automatic'|'manual';verifiedAt:string;evaluatorId:string
  blindPacketId?:string;independent?:boolean
}
export interface EvaluationDataset {version:string;runs:EvaluationRun[];scores:EvaluationScore[]}
export interface ComparisonScope {
  caseId:string;providerId:string;serviceId:string;planId:string;channel:'web'|'api';region:string
  environmentKey:string;fixtureHash:string;promptVersion:string;rubricVersion:string;asOf:string;accessiblePlanIds:string[]
}
