import type { Capability, Evidence, ProviderCatalog, ProviderPlan } from '../src/providerTypes.ts'
// Independently authored service/plan facts. Never import model snapshots or scores.
const registrations=[
  ['openai','OpenAI','https://openai.com/','chatgpt','ChatGPT','https://chatgpt.com/','텍스트·파일·코드 작업'],
  ['anthropic','Anthropic','https://www.anthropic.com/','claude','Claude','https://claude.ai/','텍스트·파일·코드 작업'],
  ['google','Google','https://about.google/','gemini','Gemini','https://gemini.google.com/','텍스트·자료 분석'],
  ['google','Google','https://about.google/','notebooklm','NotebookLM','https://notebooklm.google.com/','자료 기반 연구 · 현재 Gemini Notebook 안내와 명칭 전환 확인 필요'],
  ['xai','xAI','https://x.ai/','grok','Grok','https://grok.com/','대화형 작업'],
  ['deepseek','DeepSeek','https://www.deepseek.com/','deepseek','DeepSeek','https://chat.deepseek.com/','대화형 작업'],
  ['alibaba','Alibaba','https://www.alibabagroup.com/','qwen','Qwen','https://chat.qwen.ai/','대화형 작업'],
  ['moonshot','Moonshot AI','https://www.moonshot.ai/','kimi','Kimi','https://www.kimi.com/','문서·대화 작업'],
  ['perplexity','Perplexity','https://www.perplexity.ai/','perplexity','Perplexity','https://www.perplexity.ai/','정보 탐색'],
  ['microsoft','Microsoft','https://www.microsoft.com/','copilot','Microsoft Copilot','https://copilot.microsoft.com/','대화·업무 작업'],
  ['adobe','Adobe','https://www.adobe.com/','firefly','Adobe Firefly','https://firefly.adobe.com/','이미지·영상 생성'],
  ['runway','Runway','https://runway.com/','runway','Runway','https://app.runwayml.com/','이미지·영상 생성'],
  ['mistral','Mistral AI','https://mistral.ai/','mistral','Mistral 서비스','https://mistral.ai/','Le Chat/Vibe 명칭·웹 경로 및 플랜 재확인 필요'],
] as const
const evidence:Evidence[]=[]
function source(id:string,url:string,scope:string,serviceId:string,planIds:string[],checkedAt='2026-10-29') {
  evidence.push({id,url,scope,serviceId,planIds,checkedAt,verification:'reviewed'});return id
}
source('chatgpt-pricing','https://chatgpt.com/pricing/','Free/Plus 텍스트 채팅, Free 첨부·이미지 생성·분석 제한 및 Plus 확대. 이번 응답에서 숫자 월 가격 미추출.','chatgpt',['chatgpt-free','chatgpt-plus'])
source('chatgpt-data','https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt','XLSX/CSV/PDF 업로드·코드 기반 데이터 분석. 형식은 플랜/계정별로 달라질 수 있어 가격표와 조합하며 PDF 플랜별 범위는 미확인으로 유지.','chatgpt',['chatgpt-free','chatgpt-plus'])
source('chatgpt-overview','https://chatgpt.com/overview/','텍스트 작성·코드 작성/디버깅 사용 사례. 웹 텍스트 채팅 권한과 조합한 용도, 작업 품질 평가는 아님.','chatgpt',['chatgpt-free','chatgpt-plus'])
source('claude-pricing','https://claude.com/pricing','Free 웹 대화·웹 검색·파일 생성·코드 실행 및 Pro 포함. 월 $20/연 $200; 지역·ISO 통화·세금 총액 별도.','claude',['claude-free','claude-pro'])
source('claude-files','https://support.claude.com/en/articles/8241126-upload-files-to-claude','웹 PDF/CSV/XLSX 첨부. XLSX는 코드 실행·파일 생성 활성화 필요.','claude',['claude-free','claude-pro'])
source('claude-execution','https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude','코드 실행·파일 생성과 업로드 자료 분석, Excel·PowerPoint 생성. Free/Pro 제공과 계정 활성화·사용량 별도.','claude',['claude-free','claude-pro'])
source('gemini-pricing','https://one.google.com/intl/ko_kr/about/google-ai-plans/','Google AI Pro와 Gemini 앱의 글·보고서 활용 및 이미지 생성 확대. 이번 읽기에서 정확한 한국 가격 숫자 미확보.','gemini',['gemini-free','gemini-pro'])
source('gemini-subscriptions','https://gemini.google/subscriptions/','Free Google 계정 $0/월, 일상 작업·Canvas·이미지 생성. Pro는 Free 포함. 미국 페이지이며 국가별 제공 조건 별도.','gemini',['gemini-free','gemini-pro'])
source('gemini-files','https://support.google.com/gemini/answer/14903178?hl=en','Gemini 개인 웹의 파일·문서·시트 분석. 무료 사용량 제한, 정확한 확장자·계산 런타임은 별도 확인.','gemini',['gemini-free','gemini-pro'])
source('gemini-limits','https://support.google.com/gemini/answer/16275805?hl=ko','저장된 공식 개인 미가입/Pro 기능·파일 한도 검토. 일반 업로드와 임의 코드 실행은 구분.','gemini',['gemini-free','gemini-pro'],'2026-10-28')
source('firefly-pricing','https://www.adobe.com/products/firefly/plans.html','무료 일일 생성 제한. Standard 표준 이미지 생성/벡터 기능과 premium 크레딧 구분. 응답 가격은 일본 JPY 1580/월·세금 포함, 한국 가격 아님.','firefly',['firefly-free','firefly-standard'])
source('runway-pricing','https://runway.com/pricing','Free 125 일회성 크레딧. Standard 이미지/영상 생성, 월 $15와 연간 월 환산 $12 구분. 국가/세금 미확인.','runway',['runway-free','runway-standard'])
source('claude-artifacts','https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them','Free/Pro 웹 대화의 Artifacts에서 코드·단일 페이지 웹·도구를 생성/편집. 코드 실행과 별개의 코드 작성 용도.','claude',['claude-free','claude-pro'])
source('gemini-canvas','https://gemini.google/overview/canvas/','모든 Gemini 사용자의 Canvas에서 코드 생성·문서 작성. 실행 런타임/저장소 자동 접근을 보장하지 않음.','gemini',['gemini-free','gemini-pro'])
const cap=(status:Capability['status'],note:string,evidenceIds:string[],extra:Partial<Capability>={}):Capability=>({status,note,evidenceIds,...extra})
const yes=(note:string,...ids:string[])=>cap('supported',note,ids)
const plans:ProviderPlan[]=[]
for(const serviceId of ['chatgpt','claude','gemini'] as const)for(const tier of ['free','paid'] as const){
  const paid=tier==='paid',id=`${serviceId}-${paid?serviceId==='chatgpt'?'plus':'pro':'free'}`,priceId=`${serviceId}-pricing`
  const text=serviceId==='gemini'?'gemini-subscriptions':serviceId==='chatgpt'?'chatgpt-overview':priceId
  const capabilities:ProviderPlan['capabilities']={textGeneration:yes('웹 대화에서 텍스트 초안을 작성하는 기능. 한국어/장르 품질 미평가.',text,priceId),surveyDraft:yes('텍스트 작성으로 설문 문항 초안을 준비하는 용도. 실제 폼 생성·배포와 다름.',text,priceId)}
  if(serviceId==='chatgpt'){
    capabilities.codeGeneration=yes('코드 작성·설명·디버깅 용도. 저장소 접근·자동 패치 적용은 보장하지 않음.',text,priceId)
    for(const f of ['fileUpload','spreadsheetAnalysis','codeExecution','imageGeneration'] as const)capabilities[f]=cap(paid?'supported':'limited',paid?'Plus 웹의 기능 확대 확인. 계정 한도 및 실제 처리 결과 별도 검토.':'Free는 사용량이 제한되며 요청이 한도 안인지 미확인.',[priceId,...(f==='imageGeneration'?[]:['chatgpt-data'])],f==='spreadsheetAnalysis'?{formats:['xlsx','xls','csv']}:f==='fileUpload'?{formats:['xls','xlsx','csv','pdf','json','xml','yaml','txt','md']}:{} )
    capabilities.pdfUpload=cap('unknown','서비스 전체 PDF 지원은 확인했으나 현재 플랜의 상세 PDF 범위는 별도 확인.',['chatgpt-data'])
    capabilities.pdfAnalysis=cap('unknown','PDF 업로드와 페이지·도표·스캔 내용 분석 범위를 구분해 확인.',['chatgpt-data'])
  }
  if(serviceId==='claude'){
    capabilities.codeGeneration=yes('웹 Artifacts의 코드 작성·편집. 실제 저장소/환경의 검증은 별도.','claude-artifacts')
    capabilities.fileUpload=cap('supported','문서 업로드, 파일당 30MB 제한. 계정별 사용량 확인.',['claude-files','claude-execution',priceId],{formats:['pdf','docx','csv','txt','html','odt','rtf','epub','json','xlsx'],limits:{maxFileSizeMB:30}})
    capabilities.pdfUpload=yes('PDF 첨부 지원.','claude-files',priceId)
    capabilities.pdfAnalysis=cap('limited','PDF 내용 처리는 페이지·스캔/시각 분석 범위를 확인해야 합니다.',['claude-files'])
    capabilities.spreadsheetAnalysis=cap('supported','XLSX 첨부 자료 분석. 코드 실행·파일 생성 활성화와 계정 한도 확인.',['claude-files','claude-execution'],{formats:['xlsx','csv']})
    capabilities.spreadsheetCreation=yes('Excel 파일 생성. 기존 시트 분석의 근거로 역추론하지 않음.','claude-execution')
    capabilities.pdfCreation=yes('PDF 파일 생성. PDF 입력·내용 분석의 근거와 별개.','claude-execution')
    capabilities.slidesCreation=yes('PowerPoint 파일 생성 기능. 슬라이드 내용·레이아웃 직접 검토.','claude-execution')
    capabilities.codeExecution=yes('웹 코드 실행. 환경·언어·네트워크 및 계정 설정은 확인 필요.',priceId,'claude-execution')
    capabilities.webSearch=yes('웹 검색. 검색 결과의 사실 검증 성공률과 다름.',priceId)
    // Code execution is not used as proof of code generation or arbitrary repository access.
  }
  if(serviceId==='gemini'){
    capabilities.codeGeneration=yes('모든 사용자의 Canvas에서 코드 작성·편집. 실제 코드 실행 환경은 별도.','gemini-canvas','gemini-subscriptions')
    capabilities.fileUpload=cap(paid?'supported':'limited','개인 웹 파일 업로드. 무료 사용량·컨텍스트 조건 확인.',['gemini-files','gemini-limits'])
    capabilities.pdfUpload=cap(paid?'supported':'limited','PDF 문서 입력 지원. 무료 할당량 별도.',['gemini-files','gemini-limits'])
    capabilities.pdfAnalysis=cap('limited','PDF 내용 분석은 가능하나 스캔·표·페이지·컨텍스트 제한의 요청 충족 여부 확인 필요.',['gemini-files','gemini-limits'])
    capabilities.spreadsheetAnalysis=cap('limited','시트 분석·차트 지원. 정확한 XLSX 입력 범위·수식 처리는 추가 확인 필요.',['gemini-files'])
    capabilities.imageGeneration=cap(paid?'supported':'limited','Gemini 이미지 생성과 사용량 확대 안내. 계정·지역/사용량 제한 확인.',[priceId,'gemini-limits'])
  }
  plans.push({id,serviceId,name:paid?serviceId==='chatgpt'?'Plus':serviceId==='gemini'?'Google AI Pro':'Pro':'Free',tier,url:registrations.find(r=>r[3]===serviceId)![5],price:{amount:paid?serviceId==='claude'?20:null:0,currency:null,period:'month',country:null,taxIncluded:paid?null:true,evidenceIds:serviceId==='gemini'?['gemini-subscriptions',priceId]:[priceId]},capabilities,limits:['개인 계정의 활성화·잔여 사용량·지역 제공 여부는 확인하지 않았습니다.'],evidenceIds:[priceId]})
}
for(const [serviceId,tier] of [['firefly','free'],['firefly','paid'],['runway','free'],['runway','paid']] as const){
  const paid=tier==='paid',id=`${serviceId}-${paid?'standard':'free'}`,sourceId=`${serviceId}-pricing`
  plans.push({id,serviceId,name:paid?'Standard':'Free',tier,url:registrations.find(r=>r[3]===serviceId)![5],price:{amount:paid?serviceId==='firefly'?1580:15:0,currency:paid&&serviceId==='firefly'?'JPY':null,period:'month',country:paid&&serviceId==='firefly'?'JP':null,taxIncluded:serviceId==='firefly'||!paid?true:null,evidenceIds:[sourceId]},capabilities:{imageGeneration:cap(paid?'supported':'limited',serviceId==='firefly'?'표준 이미지 생성 기능. 무료는 일일 제한, partner 모델은 별도 크레딧.':'이미지 생성 기능. Free 일회성 크레딧과 Standard 월간 크레딧 확인 필요.',[sourceId]),...(serviceId==='runway'?{videoGeneration:cap('limited','영상 생성은 모델별 초당 크레딧·길이·남은 크레딧 확인 필요.',[sourceId])}:{})},limits:[serviceId==='firefly'?'일본 페이지 가격. 한국 결제 금액/제공 여부는 별도 확인.':'월 결제와 연간 선결제 환산을 구분. 국가·ISO 통화·세금 별도 확인.'],evidenceIds:[sourceId]})
}
for(const row of registrations)if(!plans.some(p=>p.serviceId===row[3]))plans.push({id:`${row[3]}-unreviewed`,serviceId:row[3],name:'웹 플랜 확인 필요',tier:'unknown',url:row[5],price:{amount:null,currency:null,period:null,country:null,taxIncluded:null,evidenceIds:[]},capabilities:{},limits:['등록은 기능·플랜 지원 확인을 의미하지 않습니다.'],evidenceIds:[]})
export const providerCatalog:ProviderCatalog={version:'provider-catalog-2026-10-29-v1',providers:[...new Map(registrations.map(row=>[row[0],{id:row[0],name:row[1],url:row[2],serviceIds:registrations.filter(r=>r[0]===row[0]).map(r=>r[3])}])).values()],services:registrations.map(row=>({id:row[3],providerId:row[0],name:row[4],url:row[5],purpose:row[6],access:'web',notes:row[3]==='notebooklm'||row[3]==='mistral'?['명칭·경로 전환과 현재 플랜을 재확인하세요.']:[]})),plans,evidence,models:[]}
