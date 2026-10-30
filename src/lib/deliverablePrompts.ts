import type { DeliverableContract, DeliverableIntent, PromptRequest, ResolvedConditions } from '../types'
import { requestClauses, resolveDeliverables } from './deliverables.ts'

const fieldNames={purpose:'사용 목적',audience:'대상 독자',format:'결과 형식',length:'분량',tone:'말투',constraints:'필수 조건'}
const instructions:Record<DeliverableIntent['kind'],string>={
  survey_final:'설문 기획안 대신 실제로 배포할 완성된 설문 문항과 선택지를 작성해 주세요.',
  survey_plan:'요청한 설문 설계안만 작성해 주세요. 조사 목표·측정할 개념·문항 유형·분기·검토 기준을 설계하고, 완성 설문 문항 전체를 대신 생성하지 마세요.',
  report_final:'개요나 체크리스트로 대신하지 말고 실제 보고서 본문을 작성해 주세요. 제공한 근거만 사용하고 없는 수치·방법·출처는 확인 필요로 표시하세요.',
  report_outline:'요청한 보고서 목차와 항목별 포함 범위만 작성해 주세요. 보고서 본문 전체를 생성하지 마세요.',
  presentation_script:'개요나 기획안 대신 실제 발표자가 읽고 말할 수 있는 발표 대본을 작성해 주세요. 요청한 시간·독자·말투를 반영하고 제공된 근거와 확인한 내용만 사용하세요.',
  presentation_outline:'요청한 발표 개요와 내용의 순서만 작성해 주세요. 완성 대본이나 발표자료 파일을 대신 만들지 마세요.',
  presentation_content:'슬라이드별 제목·실제 본문·필요한 시각 자료 설명을 바로 사용할 수 있는 텍스트로 작성해 주세요. 개요만 나열하지 말고 각 슬라이드에 넣을 내용을 완성하세요. 요청하지 않은 PPTX 파일이나 발표 대본을 대신 생성하지 마세요.',
  email_final:'바로 보낼 수 있는 이메일 제목과 본문을 작성해 주세요. 확인되지 않은 수신인·일정·약속은 지어내지 말고 필요한 곳에만 빈칸을 표시하세요.',
  promotion_final:'실제로 배포할 홍보 글 또는 홍보 문구를 작성해 주세요. 제공된 참여 대상·목적·참여 방법만 사용하고 없는 일정·혜택·링크·조사 주체를 만들지 마세요.',
  code_fix:'기존 기능을 보존하는 수정 코드 또는 패치와 원인 근거·재현 및 회귀 검증 방법을 제공해 주세요. 코드·오류·기대 동작이 없으면 필요한 자료만 요청하고 실행하지 않은 검증을 통과했다고 말하지 마세요.',
  image_generation_prompt:'이미지 생성 도구에 바로 입력할 프롬프트를 작성해 주세요. 요청한 피사체·구도·문구·비율을 반영하고 이미지를 실제로 생성했다고 말하지 마세요.',
  general_writing:'개요로 대신하지 말고 사용자가 요청한 글 자체를 작성해 주세요. 사용자가 개요·기획만 요청했다면 그 범위만 작성하세요.',
  general_plan:'사용자가 요청한 기획안·설계안·개요만 작성해 주세요. 목표·구성·필요한 입력과 미정인 사항을 정리하고 요청하지 않은 완성본을 대신 생성하지 마세요.',
  analysis:'제공된 자료를 분석하고 질문에 답하는 결과·근거 위치·한계를 정리해 주세요. 자료가 없으면 먼저 요청하고 읽지 않은 자료나 계산하지 않은 수치를 만들지 마세요.',
  image:'선택한 서비스의 지원되는 이미지 생성 기능에서 실제 이미지를 생성해 주세요. 생성이 불가능하면 한계를 밝히고 설명문을 이미지 파일이라고 말하지 마세요.',
  slides:'요청한 주제에 맞는 발표자료 파일을 준비해 주세요. 파일 생성 지원이 확인되기 전에는 생성·다운로드 가능으로 안내하지 마세요.',
  video:'선택한 서비스의 지원되는 기능에서 요청한 영상 결과물을 생성해 주세요. 길이·비율 등 제공한 조건을 지키고 생성하지 않았다면 완료했다고 말하지 마세요.',
}

function surveyInstruction(request:PromptRequest):{instruction:string;unresolved:string[]} {
  const text=[request.overrides.constraints,request.overrides.length,request.text].filter(Boolean).join('\n')
  const number=(pattern:RegExp)=>{const m=text.match(pattern);return m?Number(m[1]):null}
  const total=number(/총\s*(\d+)\s*문항/)??number(/(\d+)\s*문항(?:짜리|의|으로|을|를)?\s*(?:설문|작성|구성)/)
  const choice=number(/객관식\s*(\d+)\s*(?:개|문항)/)
  const scale=number(/\d+\s*점\s*척도\s*(\d+)\s*(?:개|문항)/)
  const points=number(/(\d+)\s*점\s*척도/)
  const open=number(/주관식\s*(\d+)\s*(?:개|문항)/)
  const unresolved:string[]=[]
  if(total!==null&&choice!==null&&scale!==null&&open!==null&&choice+scale+open!==total)unresolved.push('총 문항 수와 문항 유형별 합계가 다릅니다. 어느 수를 적용할지 확인하세요.')
  if(unresolved.length)return {instruction:`필수 문항 수 조건이 충돌하므로 임의로 수를 바꾸지 마세요. 이 충돌만 먼저 확인하고 다른 추가 질문은 하지 마세요.\n${unresolved.join('\n')}`,unresolved}
  const counts=[total!==null?`Q1부터 Q${total}까지 총 ${total}문항의 실제 질문 본문을 생성하세요.`:'사용자가 지정한 문항 수를 지키고, 수가 미정이면 제안한 문항 수임을 밝히세요.',choice!==null?`객관식 ${choice}문항에는 각 질문에 실제 선택지를 모두 포함하세요.`:'객관식 질문에는 실제 선택지를 포함하세요.',scale!==null?`${points??5}점 척도 ${scale}문항에는 각 문항의 모든 척도 값과 의미를 표시하세요.`:'척도 문항이 있으면 각 척도 값과 의미를 표시하세요.',open!==null?`주관식 ${open}문항에는 실제 질문 문장을 작성하세요.`:'주관식 문항이 요청되면 실제 질문 문장을 작성하세요.']
  return {instruction:[instructions.survey_final,...counts,
    '출력은 설문 제목 → 설문 안내문 → 실제 설문 문항(번호·질문 유형·질문 본문·해당 선택지/척도) → 필요한 설문 도구 설정 안내 순서로 정리하세요.',
    '사용 경험이 없는 응답자도 답할 수 있도록 사용 경험·빈도 문항과 필요한 분기를 고려하세요. 사용하지 않는 응답자에게 만족도 응답을 강제하지 마세요.',
    '안내문에서 응답하지 않을 권리와 문항 건너뛰기를 알리되, 모든 문항에 불필요하게 무응답 선택지를 추가하지 마세요. 해당 없음은 필요한 문항에만 쓰고, 만족도·경험 문항의 비사용자 분기와 5점 척도의 점수를 구분하세요.',
    '질문은 중립적이고 명확하게 작성하고 유도·이중 질문과 불필요한 개인정보 수집을 피하세요.',
    '조사 주체·조사 기간·법률·개인정보 처리 조건·익명성 보장·보관/파기 약속을 근거 없이 만들지 마세요.',
    '기획·설계 원칙 설명·핵심 메시지·문단별 개요는 기본 출력에서 제외하세요. 요청하지 않은 부가 산출물도 생성하지 마세요.',
    '이미 제공한 조건을 다시 묻거나 필수적이지 않은 추가 질문으로 작업을 중단하지 마세요. 미지정 기관·기간 등은 생략하거나 필요한 빈칸으로 남기세요.',
    ...unresolved,
  ].join('\n'),unresolved}
}

export function renderDeliverable(request:PromptRequest,intent:DeliverableIntent,conditions:ResolvedConditions,options:{previous?:DeliverableContract;instruction?:string;scope?:'stage'|'request';includeReference?:boolean;fileCreationConfirmed?:boolean}={}):{text:string;contract:DeliverableContract} {
  const survey=intent.kind==='survey_final'?surveyInstruction(request):null
  const inputs:string[]=intent.category==='analysis'?['분석할 원자료 또는 직접 확인한 요약·출처']:intent.category==='coding'?['관련 코드·오류 메시지·실행 환경·기대 동작']:[]
  if(options.previous)inputs.push(`앞 단계에서 직접 검토한 ${options.previous.label}의 필요한 내용·근거·미확인 사항`)
  const requirements=request.text.split('\n').map(line=>line.trim()).filter(line=>/^\d+[.)]\s/.test(line))
  const edited=Object.entries(request.overrides).map(([field,value])=>`${fieldNames[field as keyof typeof fieldNames]}: ${value?.trim()||'미정 (원문의 값으로 확정하지 마세요)'}`)
  const formatKinds=resolveDeliverables({text:conditions.format.value,overrides:{}}).map(output=>output.kind)
  const lengthOwners=requestClauses(request.text).filter(clause=>conditions.length.value&&clause.includes(conditions.length.value)).flatMap(clause=>resolveDeliverables({text:clause,overrides:{}}).map(output=>output.kind)).filter(kind=>kind!=='general_writing')
  const presentation=Object.entries(conditions).filter(([field,value])=>{
    if(!value.value||field==='purpose'||field==='constraints')return false
    if(field==='format'&&value.source==='input'&&!formatKinds.includes(intent.kind)&&!formatKinds.includes('general_writing'))return false
    if(field==='length'&&intent.category==='analysis'&&value.source==='input')return false
    if(field==='length'&&value.source==='input'&&lengthOwners.length&&!lengthOwners.some(owner=>owner===intent.kind))return false
    return true
  }).map(([field,value])=>`${fieldNames[field as keyof typeof fieldNames]}: ${value.value}`)
  const artifact:DeliverableContract['artifact']=intent.kind==='slides'
    ?{format:'pptx',delivery:options.fileCreationConfirmed?'downloadable-file':'capability-check',label:options.fileCreationConfirmed?'다운로드 가능한 PPTX(.pptx) 파일':'PPTX 파일 생성 지원 확인'}
    :intent.kind==='presentation_outline'||intent.kind==='presentation_content'?{format:'text',delivery:'inline-text',label:intent.label}:undefined
  const slideInstruction=intent.kind==='slides'
    ?options.fileCreationConfirmed
      ?[options.previous?'앞 단계에서 직접 검토한 뒤 실제로 전달한 내용·근거와 사용자의 조건으로 발표자료를 제작하세요.':'사용자가 제공한 주제·자료·조건으로 발표자료를 제작하세요.',
        '최종 산출물은 다운로드 가능한 편집용 PowerPoint PPTX(.pptx) 파일입니다. 실제 파일을 생성한 뒤 첨부하거나 실제 생성 파일의 다운로드 링크를 제공하세요.',
        '슬라이드 제목·본문·레이아웃을 파일에 반영하고, 개요·대본·텍스트·생성 코드만 제공한 결과를 PPTX 파일이라고 말하지 마세요.',
        '생성하지 않은 파일이나 가짜 다운로드 링크를 제시하지 마세요. 현재 계정에서 파일 생성이 불가능하면 그 한계를 밝히고 완료를 주장하지 마세요.'].join('\n')
      :'요청된 형식은 PPTX(.pptx) 파일입니다. 선택한 서비스·이용 경로의 발표자료 파일 생성 지원 여부를 먼저 확인하세요. 확인 전에는 파일 생성·다운로드가 가능하다고 안내하거나 완료를 주장하지 마세요. 지원이 확인되지 않으면 그 한계를 밝히고 파일 생성이 확인된 경로를 선택하도록 안내하세요. 텍스트·대본·코드만 만든 결과를 PPTX 파일이라고 말하지 마세요.'
    :undefined
  const instruction=slideInstruction??options.instruction??survey?.instruction??instructions[intent.kind]
  const extras=requestClauses(request.text).filter(clause=>{
    if(!/(?:설명|이유|방법).*(?:알려|포함|설명해)/.test(clause))return false
    if(/분석|해석/.test(clause))return intent.category==='analysis'
    if(/수정|코드|검증/.test(clause))return intent.category==='coding'
    return !/(?:대본|설문지|보고서|홍보\s*글).*(?:작성|생성|만들)/.test(clause)
  })
  const contract:DeliverableContract={...intent,goal:conditions.purpose.value||request.text.split('\n')[0],requirements:[...requirements,...edited],inputs,extras,unresolved:survey?.unresolved??[],instruction,...(artifact?{artifact}:{})}
  const text=[
    options.includeReference!==false?`작업 원문 (참고용; 아래 산출물 계약과 별도 수정 조건을 적용하세요)\n<원문>\n${request.text}\n</원문>`:'',
    `${options.scope==='request'?'요청한 산출물':'현재 단계 실행 지시'}\n최종 산출물: ${artifact?.label??intent.label}\n${instruction}${options.scope==='request'?'': '\n이 단계는 위 산출물만 작성하고, 다른 단계의 작업을 함께 수행하지 마세요.'}`,
    conditions.purpose.value?`최종 목표: ${conditions.purpose.value}`:'',
    presentation.length?`반드시 반영할 조건\n${presentation.join('\n')}`:'',
    conditions.constraints.value?`필수 조건: ${conditions.constraints.value}`:'',
    requirements.length?`원문의 번호별 조건을 모두 적용하세요. 다른 단계 산출물을 요구한 문장은 해당 단계에서만 적용하세요.\n${requirements.join('\n')}`:'',
    edited.length?`직접 수정한 조건 (원문보다 우선)\n원래 요청보다 우선 적용하세요.\n${edited.join('\n')}`:'',
    inputs.length?`필요한 입력 자료\n[${inputs.join('\n')}]\n전달하지 않은 앞 단계 결과를 알고 있다고 가정하지 마세요. 자료가 없으면 필요한 자료만 요청하고 사실·수치·출처를 만들지 마세요.`:'',
    extras.length?`사용자가 요청한 부가 설명\n${extras.join('\n')}`:'',
  ].filter(Boolean).join('\n\n')
  return {text,contract}
}
