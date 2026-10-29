import type { EvidenceFeature, EvidenceRegister, EvidenceSource, FeatureClaim, SourceType } from '../evaluationTypes'
import type { SupportStatus } from '../providerTypes'

// New reads only. Historical catalog checkedAt values are never rewritten here.
// This date is an observation, not a refresh-time timestamp.
const observed='2026-10-29'
const sourceServices:Record<string,string>={'openai-data':'chatgpt','openai-plans':'chatgpt','claude-files':'claude','claude-plans':'claude','gemini-files':'gemini','notebook-sources':'notebooklm','grok-old-url':'grok','grok-faq':'grok','deepseek-home':'deepseek','qwen-home':'qwen','kimi-home':'kimi','perplexity-files':'perplexity','copilot-plans':'copilot','firefly-plans':'firefly','runway-plans':'runway','mistral-vibe':'mistral'}
const source=(id:string,url:string,sourceType:SourceType,observation:string,access:EvidenceSource['access']='read'):EvidenceSource=>({id,url,sourceType,observation,access,serviceId:sourceServices[id],attemptedAt:observed,checkedAt:access==='read'?observed:null})
const sources:EvidenceSource[]=[
  source('openai-data','https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt','official-help','Uploaded XLSX/PDF analysis, Python calculations and charts; file types depend on account, plan and settings.'),
  source('openai-plans','https://chatgpt.com/pricing/','official-pricing','Free text chat; limited uploads and image creation. Exact local entitlements and prices not established.'),
  source('claude-files','https://support.claude.com/en/articles/8241126-upload-files-to-claude','official-help','PDF and XLSX listed. XLSX requires enabling code execution and file creation. Chat/project limits differ.'),
  source('claude-plans','https://claude.com/pricing','official-pricing','Free web chat, web search, file creation and code execution; usage restrictions apply.'),
  source('gemini-files','https://support.google.com/gemini/answer/14903178?hl=en','official-help','Signed-in web users can upload documents and spreadsheets for summaries and insights. Higher paid limits; organization settings differ. XLSX extension not separately established by this read.'),
  source('notebook-sources','https://support.google.com/gemininotebook/answer/16215270?hl=en','official-help','NotebookLM help redirects to Gemini Notebook. Lists PDF, image and Google Sheets sources and Free limits. Google Sheets support does not prove native XLSX upload.'),
  source('grok-old-url','https://docs.x.ai/docs/grok-apps','official-help','Initial URL inaccessible; replaced by consumer FAQ.','failed'),
  source('grok-faq','https://docs.x.ai/grok/faq','official-help','Consumer web/apps FAQ lists PDF/XLSX uploads, content analysis and visual PDF reasoning; limits vary by platform/subscription.'),
  source('deepseek-home','https://www.deepseek.com/','official-product','Official page links web chat and API separately. API search announcements do not establish web-plan entitlements.'),
  source('qwen-home','https://qwen.ai/','official-product','Page opened but no readable content was returned; no capability confirmed.','no-content'),
  source('kimi-home','https://www.kimi.com/','official-product','Readable chat shell; no plan-specific feature documentation obtained.'),
  source('perplexity-files','https://www.perplexity.ai/help-center/en/articles/10354807-file-uploads','official-help','Attach/drag files for contextual follow-up; PDF and images described. Native XLSX and free entitlement not established.'),
  source('copilot-plans','https://www.microsoft.com/en-us/copilot/solutions/individuals','official-product','Page describes Microsoft 365 Word/Excel workflows. Those app entitlements are not assigned to the registered consumer web route.'),
  source('firefly-plans','https://www.adobe.com/products/firefly/plans.html','official-pricing','Image/video product features and plan restrictions. This read is not confirmation of Korean prices or free video access.'),
  source('runway-plans','https://runway.com/pricing','official-pricing','Free one-time credits; Standard image/video access with monthly credits. Annual/monthly billing differ; local entitlement untested.'),
  source('mistral-vibe','https://mistral.ai/products/vibe/','official-product','Le Chat URL redirects to Vibe. Product describes web research and document creation. Pro agents differ from free; existing IDs preserved.'),
]
const claims:FeatureClaim[]=[]
function add(providerId:string,serviceId:string,featureIds:EvidenceFeature[],sourceIds:string[],limitations:string[],status:SupportStatus='limited',planId:string|null=null){
  for(const featureId of featureIds)claims.push({id:`${serviceId}:${planId??'service'}:${featureId}`,providerId,serviceId,planId,scope:planId?'route':'service',channel:'web',featureId,status,sourceIds,region:'unspecified',limitations,verification:'reviewed',unknownReason:null})
}
add('openai','chatgpt',['pdfInput','pdfAnalysis','xlsxInput','xlsxAnalysis','chartCreation','codeExecution'],['openai-data'],['Plan, workspace settings and account capabilities vary; no exact free entitlement.'])
add('openai','chatgpt',['textEditing'],['openai-plans'],['Usage/abuse conditions and local account access require preflight.'],'limited','chatgpt-free')
add('anthropic','claude',['pdfInput','pdfAnalysis','xlsxInput','xlsxAnalysis','scannedPdfReading'],['claude-files'],['XLSX requires code execution enabled; multimodal PDF and account limits require preflight.'])
add('anthropic','claude',['textEditing','webResearch','codeExecution','fileDownload'],['claude-plans'],['Usage and account settings apply.'],'limited','claude-free')
add('google','gemini',['pdfInput','pdfAnalysis','documentSummary'],['gemini-files'],['Sign-in, supported file types, usage and organization settings apply.'])
add('google','notebooklm',['pdfInput','pdfAnalysis','scannedPdfReading'],['notebook-sources'],['Source limits and image reliability apply; registered service name needs manual migration review.'])
add('xai','grok',['pdfInput','pdfAnalysis','xlsxInput','xlsxAnalysis','scannedPdfReading'],['grok-faq'],['Consumer web route described; exact subscription, region and whole-document coverage unconfirmed.'])
add('perplexity','perplexity',['pdfInput','pdfAnalysis'],['perplexity-files'],['Plan-level entitlement, completeness and output accuracy untested.'])
add('adobe','firefly',['imageGeneration','videoGeneration'],['firefly-plans'],['Credit, feature and regional restrictions; no automatic free entitlement.'])
add('runway','runway',['imageGeneration','videoGeneration'],['runway-plans'],['Standard credits and local availability require preflight.'],'limited','runway-standard')
add('mistral','mistral',['webResearch','fileDownload'],['mistral-vibe'],['Vibe product scope; free versus Pro and registered route need review.'])

export const evidenceRegister:EvidenceRegister={version:'provider-evidence-audit-2026-10-29-v1',sources,claims}
