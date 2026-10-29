import { budgetLabels, priorityLabels, serviceById } from '../data/services.ts'
import { featureLabels } from '../data/recommendationPolicy.ts'
import { candidateLabel, selectedCandidate } from './recommend.ts'
import type { Analysis, ServiceId, WorkflowStep } from '../types'
const approaches: Record<ServiceId, string> = {
  chatgpt: '요구사항을 정리한 뒤 단계별 결과를 작성하세요. 정보가 부족하면 확인 질문을 제시하세요.',
  gemini: '자료별 핵심을 표로 비교한 다음 공통점과 차이점을 정리하세요. 제공된 근거와 추가 확인 사항을 구분하세요.',
  claude: '자료와 주장 사이의 논리를 살피고, 초안의 명확성과 근거 일치를 검토하세요.',
}
const formats = {
  analysis: '1. 자료별 핵심 요약\n2. 주장·수치·근거 위치 표\n3. 공통점과 차이점\n4. 확인이 필요한 사실',
  writing: '1. 독자와 핵심 메시지\n2. 현재 단계의 개요 또는 초안\n3. 표현 대안\n4. 사실 검토 항목',
  coding: '1. 요구사항과 재현 조건\n2. 오류 원인과 가정\n3. 파일별 코드·수정안\n4. 실행 및 테스트 방법\n5. 알려진 제약',
  image: '1. 이미지 콘셉트 3안\n2. 문구와 구도\n3. 이미지 생성용 프롬프트\n4. 검토 기준\n이미지가 생성되었다고 말하지 마세요.',
}
export function buildPrompt(analysis: Analysis, serviceId: ServiceId, workflow: WorkflowStep[], stepId?: string): string {
  const step = workflow.find(s => s.id === stepId) ?? workflow.find(s => s.serviceId === serviceId) ?? workflow[0]
  const assigned = selectedCandidate(step)
  const candidate = assigned?.service.id === serviceId ? assigned : step?.recommendations.find(r => r.service.id === serviceId) ?? null
  const assignments = workflow.map((s, i) => `${i + 1}. ${s.title} — ${selectedCandidate(s) ? candidateLabel(selectedCandidate(s)!) : '미배정: 조건에 맞는 후보 없음'}`).join('\n')
  if (!candidate || !step) return `[나의 요청]\n${analysis.request.text}\n\n[선택 상태]\n${serviceById[serviceId].name}: 현재 단계에서 선택 가능한 후보 없음. 작업·필수 조건을 확인하고 재분석하세요.\n${assignments}\n${analysis.kind === 'image' ? '이미지가 생성되었다고 말하지 마세요.' : ''}`
  return `[역할]\n당신은 한국어로 설명하는 ${step.kind === 'coding' ? '소프트웨어 개발 멘토' : '자료 분석 및 콘텐츠 작성 파트너'}입니다.\n\n[나의 요청]\n${analysis.request.text}\n\n[현재 선택]\n${candidateLabel(candidate)}\n현재 작업 단계: ${step.title}\n기대 결과: ${step.output}\n\n[작업 조건]\n- 예산: ${budgetLabels[analysis.request.budget]}\n- 우선순위: ${priorityLabels[analysis.request.priority]}\n- 첫 자료 단계의 필수 기능: ${analysis.requiredFeatures.map(f => featureLabels[f]).join(', ') || '별도 지정 없음'}\n- 분량·결과 형태: ${analysis.request.duration ?? '미정'} · ${analysis.request.output ?? '미정'}\n- 파일 분량: ${analysis.request.volume ?? '미정'}\n- 확인된 제한: ${candidate.plan.limits.join(' ')}\n- 확인 필요: ${candidate.holds.join('; ') || '현재 데이터의 확인 범위 안에서 추천'}\n- 모델·플랜·기능이 사용 화면과 다르면 먼저 확인하세요. 유료 결제를 전제로 작업하지 마세요.\n\n[입력 자료]\n이전 단계의 결과와 참고 자료를 아래에 붙여 넣겠습니다. 첨부를 사용한다면 지원 여부를 먼저 확인하세요.\n--- 자료 시작 ---\n[앞 단계에서 직접 확인한 요약 또는 자료를 여기에 붙여넣으세요]\n--- 자료 끝 ---\n\n[일반 초안 진행 방식 · 서비스별 최적화 검증 아님]\n${approaches[serviceId]}\n\n[내가 선택한 작업 설계안]\n${assignments}\n현재 단계만 수행하세요. 다른 AI를 호출하거나 자동 실행하지 마세요.\n\n[원하는 결과 형식]\n${formats[step.kind]}\n\n[주의사항]\n- 자료에 없는 사실·인용·수치·출처를 만들어 내지 마세요.\n- 미확인 내용은 확인 필요로 표시하고, 자료가 비었으면 질문하세요.\n- 개인정보·민감정보는 요청하거나 그대로 재현하지 마세요.\n- 마지막에 사용자가 직접 검토할 항목을 적어 주세요.`
}
