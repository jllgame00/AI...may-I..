import type { DeliverableIntent, DeliverableKind, PromptRequest } from '../types'

const labels: Record<DeliverableKind,string> = {
  survey_final:'실제 설문지', survey_plan:'설문 설계안', report_final:'보고서 본문', report_outline:'보고서 목차',
  presentation_script:'발표 대본', presentation_outline:'발표 개요', presentation_content:'슬라이드별 내용', email_final:'이메일 본문', promotion_final:'홍보 문구',
  code_fix:'수정 코드와 검증 방법', image_generation_prompt:'이미지 생성용 프롬프트', general_writing:'요청한 글',general_plan:'요청한 기획안',
  analysis:'자료 분석 결과', image:'실제 이미지', slides:'발표자료', video:'영상',
}
export function deliverableIntent(kind:DeliverableKind, origin:DeliverableIntent['origin']='inferred'):DeliverableIntent {
  const category=kind==='code_fix'?'coding':['analysis','image','slides','video'].includes(kind)?kind as 'analysis'|'image'|'slides'|'video':'writing'
  return {kind,label:labels[kind],category,origin}
}

// Only positive requests identify outputs. Source text remains intact elsewhere.
// In particular a survey's promotion and analysis are not survey creation.
export function requestClauses(text:string):string[] {
  return text.split(/[.!?。](?:\s+|$)|\n|[,;]|하지만|다만|(?<=고)\s+/).map(clause=>clause.trim()).filter(Boolean)
}
function affirmativeText(text:string):string {
  return requestClauses(text).filter(clause=>!/(?:만들|작성|생성|제작|포함|추가|필요)(?:하)?지\s*(?:마|말|않)|필요\s*없|제외해|원하지/.test(clause))
    .map(clause=>clause.replace(/(?:보고서|이메일|발표\s*대본|설문지|기획안|설계안|개요|목차)(?:이|가|은|는)?\s*(?:아닌|말고)/g,'')).join('\n')
}

function infer(text:string):DeliverableKind[] {
  const t=affirmativeText(text), kinds:DeliverableKind[]=[]
  const surveyPlan=/설문(?:지|\s*문항)?(?:의)?\s*(?:기획안|설계안|구성안)|설문(?:지|\s*문항)?(?:을|를)?\s*(?:기획|설계)/.test(t)&&!/(?:기획안|설계안|구성안)(?:을|를)?\s*(?:바탕|토대|참고)/.test(t)
  const survey=/설문지|설문\s*(?:문항|질문)|설문[^\n.!?]*문항/.test(t)
  const surveyPromotion=/설문(?:지)?\s*(?:참여\s*)?홍보/.test(t)&&!/설문지(?:를|을)?\s*(?:만들|작성|생성)/.test(t)
  const surveyAnalysis=/설문\s*(?:결과|데이터|자료)[^\n.!?]*(?:분석|해석|요약)/.test(t)
  const surveyReview=/설문(?:지|\s*문항|\s*질문)[^\n.!?]*(?:분석|요약|검토|개선)/.test(t)
  const surveyCreate=/설문(?:지|\s*문항|\s*질문)[^\n.!?]*(?:작성|생성|만들)/.test(t)
  if(surveyPlan)kinds.push('survey_plan')
  else if(survey&&!surveyPromotion&&!surveyAnalysis&&(!surveyReview||surveyCreate))kinds.push('survey_final')
  if(surveyReview||/논문[^\n.!?]*(?:분석|요약)|(?:자료|데이터|파일|PDF|XLSX|엑셀)[^\n.!?]*(?:분석|요약)|설문\s*(?:결과|자료)|통계|상관/i.test(t)&&!survey&&!surveyPlan)kinds.push('analysis')
  if(/코드|코딩|버그|오류|저장소|알고리즘|python|react|typescript|javascript/i.test(t))kinds.push('code_fix')
  if(/보고서(?:의)?\s*(?:목차|개요)|보고서(?:를|을)?\s*(?:기획|설계)/.test(t))kinds.push('report_outline')
  else if(/보고서/.test(t)&&!/보고서(?:를|의|을)?\s*(?:요약|분석|내용)/.test(t))kinds.push('report_final')
  const slideClauses=requestClauses(t)
  const isSlideReference=(clause:string)=>/(?:개요|목차|구성안|기획안)(?:을|를)?\s*(?:바탕|토대|기반|참고)/.test(clause)
  const slidePlans=slideClauses.filter(clause=>/(?:발표(?:자료)?|PPTX?(?:\s*자료)?|슬라이드|프레젠테이션|파워포인트)(?:의|를|을)?\s*(?:(?:내용|구성)(?:을|를)?\s*)?(?:개요|목차|구성안|기획안|기획|설계|구성(?=\s|해|하|을|만|$))/i.test(clause)&&!isSlideReference(clause))
  const createsSlideFile=(clause:string)=>/(?:PPTX?|발표자료|프레젠테이션|슬라이드|파워포인트)(?:\s*(?:자료|파일))?(?:을|를|도|로|으로)?\s*(?:만들|생성|제작|작성|제공|변환|저장|내보내)/i.test(clause)
  const slideContents=slideClauses.filter(clause=>/(?:슬라이드(?:별)?|PPTX?(?:\s*자료)?|발표자료|프레젠테이션|파워포인트)\s*(?:(?:의|에\s*넣을)\s*)?(?:내용|본문|문구|텍스트)/i.test(clause)&&!slidePlans.includes(clause)&&!isSlideReference(clause)&&!createsSlideFile(clause))
  if(slidePlans.length)kinds.push('presentation_outline')
  if(slideContents.length)kinds.push('presentation_content')
  if(/대본/.test(t))kinds.push('presentation_script')
  if(/이메일|메일|편지/.test(t)&&!/(?:이메일|메일)(?:의)?\s*내용.*(?:요약|정리)/.test(t))kinds.push('email_final')
  if(/홍보|모집\s*(?:글|문구)|광고\s*(?:글|문구)/.test(t))kinds.push('promotion_final')
  if(/이미지\s*(?:생성용\s*)?프롬프트/.test(t))kinds.push('image_generation_prompt')
  else if(/이미지|포스터|그림|일러스트|로고|사진/.test(t)&&/생성|만들|그려/.test(t))kinds.push('image')
  if(slideClauses.some(clause=>/발표자료|프레젠테이션|슬라이드|pptx|\bppt\b|파워포인트/i.test(clause)&&(createsSlideFile(clause)||!slidePlans.includes(clause)&&!slideContents.includes(clause)&&!isSlideReference(clause))))kinds.push('slides')
  if(/영상|동영상|비디오/.test(t)&&/생성|만들|제작/.test(t))kinds.push('video')
  const genericPlan=/(?:기획안|설계안|구성안|개요|목차)(?:만|을|를)?\s*(?:작성|만들|짜|제안)|(?:이메일|홍보\s*글)(?:을|를)?\s*기획/.test(t)
  if(genericPlan&&!kinds.some(kind=>['survey_plan','report_outline','presentation_outline'].includes(kind)))return [...kinds.filter(kind=>deliverableIntent(kind).category!=='writing'),'general_plan']
  return [...new Set(kinds)]
}

export function resolveDeliverables(request:PromptRequest):DeliverableIntent[] {
  if(request.deliverableKind)return [deliverableIntent(request.deliverableKind,'explicit')]
  const explicit=request.overrides.format?.trim()
  if(explicit){
    if(/^(?:개요|기획안|설계안|구성안|목차)$/.test(explicit)){
      const original=infer(request.text)
      const kind=original.some(kind=>kind.startsWith('survey_'))?'survey_plan':original.some(kind=>kind.startsWith('report_'))?'report_outline':original.some(kind=>kind.startsWith('presentation_'))?'presentation_outline':'general_plan'
      return [deliverableIntent(kind,'explicit')]
    }
    const kinds=infer(explicit)
    if(kinds.length)return kinds.map(kind=>deliverableIntent(kind,'explicit'))
  }
  const kinds=infer(request.text)
  return (kinds.length?kinds:['general_writing' as const]).map(kind=>deliverableIntent(kind))
}
