import { resolveConditions } from './promptEngine.ts'
import { categoryLabels } from '../data/providerPolicy.ts'
import type { Budget, CapabilityId, ProviderRequirements, WorkCategory, WorkRequirement } from '../providerTypes'
import type { PromptRequest } from '../types'
const unique=<T,>(values:T[])=>[...new Set(values)]
export function analyzeRequirements(request:PromptRequest):ProviderRequirements {
  const text=request.text,notes:string[]=[],preferred:CapabilityId[]=[]
  const active=text.replace(/(?:웹\s*)?검색\s*(?:기능)?\s*(?:은|는|이|을)?\s*(?:필요\s*없(?:고|음|어)?|없이|제외|하지\s*마)/g,'').replace(/이미지\s*생성\s*(?:은|는)?\s*(?:없이|제외|필요\s*없)/g,'')
  const optional=active.match(/(?:가능하면|선호|있으면\s*좋)\s*(?:웹\s*)?검색(?:도|을|해서)?/g)??[]
  if(optional.some(s=>/검색/.test(s)))preferred.push('webSearch')
  const main=optional.reduce((s,o)=>s.replace(o,''),active)
  const outputFormats:string[]=[],inputFormats:string[]=[]
  for(const match of main.matchAll(/\b(pdf|xlsx|xls|csv|docx|pptx|png|jpg|jpeg)\b|엑셀/gi)){
    const format=match[0]==='엑셀'?'xlsx':match[0].toLowerCase(),after=main.slice(match.index!+match[0].length),before=main.slice(Math.max(0,match.index!-12),match.index!)
    const output=/^\s*(?:(?:파일|보고서|문서|논문)\s*)*(?:을|를|로|으로)?\s*(?:생성|만들|작성|출력|저장|제공)/.test(after)||/(?:새|새로운|결과를|결과는|출력은)\s*$/.test(before)
    if(output)outputFormats.push(format);else inputFormats.push(format)
  }
  const categories:WorkCategory[]=[]
  const surveyDraft=/설문.*(?:문항|질문)|(?:문항|질문).*설문/.test(main)&&!/설문\s*(?:결과|데이터).*분석/.test(main)
  const code=/코드|코딩|오류|버그|저장소|알고리즘|python|react|typescript|javascript/i.test(main)
  const creatingSheet=outputFormats.some(f=>f==='xlsx'||f==='xls')||/(?:새|새로운)\s*(?:스프레드시트|시트|표).*(?:작성|생성|만들)/.test(main)
  const data=(inputFormats.some(f=>['pdf','xlsx','xls','csv','docx'].includes(f))||/논문.*(?:분석|요약)|데이터.*분석|자료.*(?:분석|요약)|설문\s*(?:결과|자료)|통계|상관|만족도.*차이/.test(main))&&!surveyDraft
  if(data)categories.push('analysis')
  if(code)categories.push('coding')
  if(/발표자료|프레젠테이션|슬라이드|pptx|파워포인트/i.test(main))categories.push('slides')
  if(/(?:이미지|포스터|그림|일러스트|로고|사진).*(?:생성|만들|그려)|이미지\s*생성|포스터|일러스트/.test(main)&&!/이미지\s*(?:생성용\s*)?프롬프트|이미지\s*기획/.test(main))categories.push('image')
  if(/영상|동영상|비디오/.test(main)&&/생성|만들|제작/.test(main))categories.push('video')
  if(surveyDraft||outputFormats.some(f=>['pdf','xlsx','xls'].includes(f))||creatingSheet||/대본|글|홍보|보고서|이메일|메일|문장|초안|시를|설문\s*폼/.test(main)||(!categories.length&&/작성|써\s*줘|요약|정리/.test(main)))categories.push('writing')
  const chosen=unique(request.tasks??categories)
  const file=request.inputMode==='summary'?false:request.inputMode==='file'||data&&/파일|첨부|업로드|엑셀|xlsx|csv|pdf|docx/i.test(main)
  const works:WorkRequirement[]=chosen.map(category=>{
    const required:CapabilityId[]=[]
    if(category==='analysis'){
      if(file){required.push('fileUpload');if(inputFormats.includes('pdf'))required.push('pdfUpload','pdfAnalysis');if(inputFormats.some(f=>['xlsx','xls','csv'].includes(f)))required.push('spreadsheetAnalysis')}
      else required.push('textGeneration')
      if(/통계|설문\s*(?:결과|자료)|상관|유의|회귀|계산/.test(main)&&file)required.push('codeExecution')
    }
    if(category==='writing'){required.push('textGeneration');if(surveyDraft)required.push('surveyDraft');if(outputFormats.includes('pdf'))required.push('pdfCreation');if(creatingSheet)required.push('spreadsheetCreation');if(/(?:실제\s*)?설문\s*폼.*(?:생성|만들)|구글\s*폼|응답\s*수집/.test(main))required.push('formCreation')}
    if(category==='coding'){required.push('codeGeneration');if(/(?:코드|파이썬|python).{0,5}실행/i.test(main))required.push('codeExecution')}
    if(category==='image')required.push('imageGeneration')
    if(category==='slides')required.push('slidesCreation')
    if(category==='video')required.push('videoGeneration')
    return {id:category,category,label:categoryLabels[category],required,preferred:[]}
  })
  const extra:CapabilityId[]=[]
  if(file&&!works.some(w=>w.required.includes('fileUpload')))extra.push('fileUpload')
  if(/(?:웹|인터넷)?\s*검색|최신\s*(?:자료|정보)/.test(main))extra.push('webSearch')
  if(/출처.*(?:검증|확인)|사실\s*검증/.test(main))extra.push('sourceVerification')
  if(/이미지\s*(?:입력|분석)|사진.*분석/.test(main))extra.push('imageInput')
  if(works[0])works[0].required=unique([...works[0].required,...extra])
  if(request.requiredFeatures!==undefined){
    const explicit=request.requiredFeatures
    for(const work of works)work.required=work.required.filter(c=>explicit.includes(c))
    if(works[0])works[0].required=unique([...works[0].required,...explicit.filter(c=>!works.some(w=>w.required.includes(c)))])
  }
  const required=unique(request.requiredFeatures??works.flatMap(w=>w.required))
  const money=main.match(/(?:월\s*(?:예산|최대)?\s*|예산\s*)(\d[\d,]*(?:\.\d+)?)\s*(만|천)?\s*(원|KRW|USD|달러|JPY|엔)/i)
  const parsed:Budget={freeOnly:/무료|공짜/.test(main)&&!/가능하면\s*무료|무료.*선호|무료(?:가|는|만)?\s*(?:아니어도|아닌)|유료도|유료\s*가능/.test(main)?true:/유료\s*(?:가능|괜찮)|유료도/.test(main)?false:null,maxMonthly:money?Number(money[1].replaceAll(',',''))*(money[2]==='만'?10000:money[2]==='천'?1000:1):null,currency:money?/원|KRW/i.test(money[3])?'KRW':/엔|JPY/i.test(money[3])?'JPY':'USD':null,country:/한국|대한민국/.test(main)?'KR':/일본/.test(main)?'JP':/미국/.test(main)?'US':null}
  const budget=request.budget??parsed,conditions=resolveConditions(request)
  if(budget.maxMonthly!==null&&(!Number.isFinite(budget.maxMonthly)||budget.maxMonthly<0))throw new Error('월 예산은 0 이상의 유한한 숫자로 입력해 주세요.')
  const quantity=(pattern:RegExp)=>{const match=main.match(pattern);return match?Number((match[1]??match[2]).replaceAll(',','')):null}
  const size=main.match(/(\d+(?:\.\d+)?)\s*(MiB|GiB|MB|GB)/i)
  const bounds={fileSizeMB:size?Number(size[1])*({mb:1,gb:1000,mib:1.048576,gib:1073.741824}[size[2].toLowerCase()]!):null,fileCount:quantity(/(\d+)\s*개(?:의)?\s*파일|파일\s*(\d+)\s*개/),rowCount:quantity(/(\d[\d,]*)\s*행/),itemCount:quantity(/(\d+)\s*(?:장의\s*)?(?:이미지|개\s*이미지)/)}
  const questions:ProviderRequirements['questions']=[]
  if(!works.length)questions.push({id:'goal',label:'어떤 결과물을 만들고 싶은가요? 작업 종류를 선택해 주세요.'})
  if(budget.freeOnly===null&&budget.maxMonthly===null)questions.push({id:'budget',label:'무료만 필요한가요? 월 예산이 있다면 함께 입력하세요.'})
  if(data&&!file&&request.inputMode===undefined)questions.push({id:'input',label:'원본 파일을 올릴 예정인가요, 내용을 직접 붙여넣을 예정인가요?'})
  if(file&&bounds.fileSizeMB===null)questions.push({id:'volume',label:'파일 크기·개수·PDF 페이지 수 등 필요한 처리 범위는 얼마인가요?'})
  notes.push('입력하지 않은 예산·국가·분량은 미정입니다. 기능은 수정할 수 있으며 성능 품질 평가와 구분합니다.')
  return {goal:text,works,required,preferred:unique(request.preferredFeatures??preferred),budget,inputFormats:unique(inputFormats),outputFormat:conditions.format.value||outputFormats.join(', ')||null,volume:conditions.length.value||null,bounds,composite:works.length>1,questions:questions.slice(0,3),notes}
}
