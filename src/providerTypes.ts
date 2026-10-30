export type SupportStatus='supported'|'limited'|'unsupported'|'unknown'
export type CapabilityId='textGeneration'|'surveyDraft'|'formCreation'|'fileUpload'|'pdfUpload'|'pdfAnalysis'|'pdfCreation'|'spreadsheetAnalysis'|'spreadsheetCreation'|'imageInput'|'imageGeneration'|'codeGeneration'|'codeExecution'|'webSearch'|'sourceVerification'|'slidesCreation'|'videoGeneration'
export type WorkCategory='analysis'|'writing'|'coding'|'image'|'slides'|'video'
export interface Evidence {id:string;url:string;checkedAt:string;scope:string;verification:'reviewed'|'unverified';serviceId:string;planIds:string[]}
export interface Capability {
  status:SupportStatus;note:string;evidenceIds:string[]
  formats?:string[];limits?:{maxFileSizeMB?:number;maxFiles?:number;maxRows?:number;maxItems?:number}
  conditions?:string[]
}
export interface Provider {id:string;name:string;url:string;serviceIds:string[]}
export interface ProviderService {id:string;providerId:string;name:string;url:string;purpose:string;access:'web';notes:string[]}
export interface ProviderPlan {
  id:string;serviceId:string;name:string;tier:'free'|'paid'|'unknown';url:string
  price:{amount:number|null;currency:string|null;period:'month'|'year'|null;country:string|null;taxIncluded:boolean|null;evidenceIds:string[]}
  capabilities:Partial<Record<CapabilityId,Capability>>;limits:string[];evidenceIds:string[]
}
export interface ProviderModel {id:string;version:string;providerId:string;serviceId:string;planIds:string[];note:string;evidenceIds:string[]}
export interface ProviderCatalog {version:string;providers:Provider[];services:ProviderService[];plans:ProviderPlan[];evidence:Evidence[];models:ProviderModel[]}
export type BudgetPreference='free'|'prefer-free'|'paid-ok'|'unknown'
export interface Budget {freeOnly:boolean|null;preferFree?:boolean;maxMonthly:number|null;currency:string|null;country:string|null}
export interface WorkRequirement {id:string;category:WorkCategory;label:string;required:CapabilityId[];preferred:CapabilityId[]}
export interface ProviderRequirements {
  goal:string;works:WorkRequirement[];required:CapabilityId[];preferred:CapabilityId[];budget:Budget
  inputFormats:string[];outputFormat:string|null;volume:string|null
  bounds:{fileSizeMB:number|null;fileCount:number|null;rowCount:number|null;itemCount:number|null}
  composite:boolean;questions:{id:string;label:string}[];notes:string[]
}
export interface CapabilityCheck {id:CapabilityId;status:SupportStatus;declaredStatus:SupportStatus;note:string;evidence:Evidence[]}
export interface PlanAssessment {id:string;provider:Provider;service:ProviderService;plan:ProviderPlan;status:'eligible'|'conditional'|'excluded';checks:CapabilityCheck[];preferredChecks:CapabilityCheck[];budgetStatus:'met'|'unknown'|'unmet';gaps:string[];strengths:string[];evidence:Evidence[]}
export interface ProviderRecommendation extends PlanAssessment {reason:string;alternatives:PlanAssessment[]}
export interface ProviderComparison {context:string;policyVersion:string;dataVersion:string;requirements:ProviderRequirements;recommendations:ProviderRecommendation[];remaining:ProviderRecommendation[];conditional:ProviderRecommendation[];excluded:ProviderRecommendation[];byWork:Record<string,ProviderRecommendation[]>;allOptions:PlanAssessment[]}
