import { budgetLabels, priorityLabels, serviceById } from '../data/services.ts'
import type { Analysis, ServiceId, WorkflowStep } from '../types'

const approaches: Record<ServiceId, string> = {
  chatgpt: '먼저 요구사항을 짧게 정리하고, 단계별로 결과를 작성하세요. 정보가 부족하면 핵심 확인 질문을 최대 3개 제시하세요.',
  gemini: '자료별 핵심을 먼저 표로 비교한 다음, 공통점과 차이점을 종합하세요. 제공된 자료와 추가 확인이 필요한 정보를 구분하세요.',
  claude: '자료의 맥락과 주장 사이의 논리적 연결을 꼼꼼히 살피세요. 초안을 완성한 뒤 표현의 명확성과 근거의 일치 여부를 검토하세요.',
}
const formats = {
  research: '1. 자료별 핵심 요약과 출처\n2. 주요 논점 3~5개와 근거\n3. 발표 구조: 도입 → 본론 → 결론 (슬라이드별 제목·핵심 메시지)\n4. 5분 분량의 자연스러운 발표 대본 (구간별 예상 시간)\n5. 예상 질문 3개와 근거에 기반한 답변',
  summary: '1. 전체 요약 (5문장 이내)\n2. 핵심 내용과 원문 근거 표\n3. 결정 사항 및 미결 사항\n4. 실행 과제 표 (담당자 | 할 일 | 기한, 원문에 없으면 미정으로 표시)',
  writing: '1. 대상 독자와 핵심 메시지\n2. 글의 개요\n3. 사용 목적에 맞는 완성 초안\n4. 제목 또는 첫 문장 대안 3개\n5. 검토가 필요한 사실과 수정 제안',
  coding: '1. 요구사항과 가정\n2. 구현 구조와 선택 이유\n3. 파일별 실행 가능한 코드 (언어가 표시된 코드 블록)\n4. 설치·실행 방법\n5. 정상·예외 상황의 검증 방법 및 알려진 제약',
  image: '1. 이미지 콘셉트 3안 (목적 | 분위기 | 구도 | 색상)\n2. 추천 콘셉트와 이유\n3. 이미지 생성 도구에 붙여 넣을 한국어·영어 프롬프트\n4. 피할 요소와 텍스트 배치 가이드\n5. 생성 결과 검토 기준\n※ 지금은 콘셉트와 프롬프트만 작성하세요. 이미지가 생성되었다고 말하지 마세요.',
}

export function buildPrompt(analysis: Analysis, serviceId: ServiceId, workflow: WorkflowStep[]): string {
  const service = serviceById[serviceId]
  const assignments = workflow.map((step, index) => `${index + 1}. ${step.title} — ${serviceById[step.serviceId].name}`).join('\n')
  return `[역할]\n당신은 초보자도 쉽게 이해하도록 돕는 ${analysis.kind === 'coding' ? '소프트웨어 개발 멘토' : analysis.kind === 'image' ? '비주얼 기획 파트너' : '자료 분석 및 콘텐츠 작성 파트너'}입니다.\n\n[나의 요청]\n${analysis.request.text}\n\n[작업 조건]\n- 예산: ${budgetLabels[analysis.request.budget]}\n- 가장 중요한 기준: ${priorityLabels[analysis.request.priority]}\n- 유료 도구가 필요한 방법을 제안한다면 무료 대안도 함께 설명하세요.\n\n[입력 자료]\n아래 구분선 사이에 참고 자료, 코드 또는 구체적인 요구사항을 붙여 넣겠습니다. 파일을 첨부했다면 파일명과 페이지 또는 위치를 근거에 표시하세요.\n--- 자료 시작 ---\n[여기에 자료를 붙여 넣으세요]\n--- 자료 끝 ---\n\n[${service.name}에서의 진행 방식]\n${approaches[serviceId]}\n\n[내가 선택한 작업 설계안]\n${assignments}\n위 배정은 사용자의 작업 계획입니다. 다른 AI를 호출하거나 자동 실행하지 말고, 현재 대화에서 제공할 수 있는 결과를 작성하세요.\n\n[원하는 결과 형식]\n${formats[analysis.kind]}\n\n[주의사항]\n- 자료에 없는 사실, 인용, 수치, 출처를 만들어 내지 마세요.\n- 확인할 수 없는 내용은 “확인 필요”라고 표시하세요.\n- 자료가 비어 있으면 내용을 추측하지 말고 필요한 자료를 요청하세요.\n- 전문 용어는 쉬운 한국어로 풀어 쓰고, 가정은 명시하세요.\n- 개인정보·민감정보는 요청하거나 그대로 재현하지 마세요.\n- 최종 결과에서 내가 직접 검토해야 할 항목을 짧게 정리하세요.`
}
