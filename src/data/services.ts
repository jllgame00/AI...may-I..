import type { Budget, Priority, Service, ServiceId, TaskKind } from '../types'

// Fictional demo fixtures. These are not current product specifications or plan limits.
export const DATA_LABEL = 'MVP 예시 데이터'
export const DEFAULT_REQUEST = '연구 자료를 분석하고 발표 대본을 작성해 줘. 과제라 비용은 가능한 쓰고 싶지 않아.'
export const budgetLabels: Record<Budget, string> = {
  free: '무료만 사용', 'prefer-free': '무료 우선', paid: '유료도 가능',
}
export const priorityLabels: Record<Priority, string> = {
  quality: '결과 품질', cost: '비용 절약', ease: '쉬운 사용법', speed: '빠른 완성',
}
export const taskLabels: Record<TaskKind, string> = {
  research: '과제·발표', summary: '자료 요약', writing: '글쓰기', coding: '코딩', image: '이미지 제작',
}
export const examples: { kind: TaskKind; text: string }[] = [
  { kind: 'research', text: DEFAULT_REQUEST },
  { kind: 'summary', text: '긴 회의록을 요약하고 중요한 결정 사항과 담당자별 할 일을 표로 정리해 줘.' },
  { kind: 'writing', text: '처음 방문한 고객에게 보낼 친근한 서비스 소개 이메일을 작성해 줘. 전문 용어는 쉽게 풀어 줘.' },
  { kind: 'coding', text: 'React와 TypeScript로 할 일 관리 앱을 만들고 싶어. 구현 방법을 설명하고 코드의 오류도 검토해 줘.' },
  { kind: 'image', text: '교내 환경 캠페인 포스터를 만들고 싶어. 이미지 콘셉트와 이미지 생성용 프롬프트를 작성해 줘.' },
]
export const services: Service[] = [
  {
    id: 'chatgpt', name: 'ChatGPT', subtitle: '아이디어부터 완성까지, 균형 있게', letter: 'C',
    free: '짧은 자료의 요약, 글의 구조 설계와 초안 작성을 시작하는 시나리오를 가정했습니다.',
    paid: '긴 자료를 자주 다루거나 사용 한도·추가 기능이 필요할 때 공식 플랜을 확인하세요.',
    strengths: { research: 96, summary: 87, writing: 92, coding: 91, image: 93 },
    scores: { cost: 94, features: 94, ease: 97 },
  },
  {
    id: 'gemini', name: 'Gemini', subtitle: '자료를 연결하고, 넓게 살펴보기', letter: 'G',
    free: '자료 핵심 추출과 여러 관점의 비교를 시도하는 시나리오를 가정했습니다.',
    paid: '더 많은 자료 처리나 추가 연동이 필요할 때 공식 플랜의 지원 범위를 확인하세요.',
    strengths: { research: 90, summary: 95, writing: 84, coding: 85, image: 90 },
    scores: { cost: 98, features: 89, ease: 88 },
  },
  {
    id: 'claude', name: 'Claude', subtitle: '긴 글의 맥락과 섬세한 표현', letter: 'A',
    free: '문서의 논리 검토, 텍스트 초안과 코드 설명을 시도하는 시나리오를 가정했습니다.',
    paid: '문서 분석을 반복하거나 사용량이 늘어날 때 공식 플랜의 한도를 확인하세요.',
    strengths: { research: 94, summary: 96, writing: 99, coding: 98, image: 60 },
    scores: { cost: 80, features: 88, ease: 86 },
  },
]
export const serviceById = Object.fromEntries(services.map(service => [service.id, service])) as Record<ServiceId, Service>
export const analysisStages = ['작업 목적 파악', '필요한 기능 정리', '비용 조건 확인', 'AI 서비스 비교', '맞춤 활용법 생성']
