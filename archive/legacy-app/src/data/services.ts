import type { Budget, Priority, Service, ServiceId, TaskKind } from '../types'
export const DATA_LABEL = '2026-10-21 확인 스냅샷'
export const DEFAULT_REQUEST = '연구 자료를 분석하고 발표 대본을 작성해 줘. 과제라 비용은 가능한 쓰고 싶지 않아.'
export const budgetLabels: Record<Budget, string> = { free: '무료만 사용', 'prefer-free': '무료 선호', paid: '유료도 가능', unknown: '잘 모르겠어요 · 미정' }
export const priorityLabels: Record<Priority, string> = { quality: '결과 품질', cost: '비용 절약', ease: '쉬운 사용법', speed: '빠른 완성' }
export const taskLabels: Record<TaskKind, string> = { research: '자료 분석·발표', summary: '자료 요약', writing: '글쓰기', coding: '코딩', image: '이미지 기획', unknown: '작업 확인 필요' }
export const examples: { kind: Exclude<TaskKind, 'unknown'>; text: string }[] = [
  { kind: 'research', text: DEFAULT_REQUEST },
  { kind: 'summary', text: '긴 회의록을 요약하고 중요한 결정 사항과 담당자별 할 일을 표로 정리해 줘.' },
  { kind: 'writing', text: '처음 방문한 고객에게 보낼 친근한 서비스 소개 이메일을 작성해 줘. 전문 용어는 쉽게 풀어 줘.' },
  { kind: 'coding', text: 'React와 TypeScript로 할 일 관리 앱을 만들고 싶어. 구현 방법을 설명하고 코드의 오류도 검토해 줘.' },
  { kind: 'image', text: '교내 환경 캠페인 포스터를 만들고 싶어. 이미지 콘셉트와 이미지 생성용 프롬프트를 작성해 줘.' },
]
export const services: Service[] = [
  { id: 'chatgpt', name: 'ChatGPT', subtitle: '공식 플랜과 필요한 기능 확인', letter: 'C' },
  { id: 'gemini', name: 'Gemini', subtitle: '공식 플랜과 필요한 기능 확인', letter: 'G' },
  { id: 'claude', name: 'Claude', subtitle: '공식 플랜과 필요한 기능 확인', letter: 'A' },
]
export const serviceById = Object.fromEntries(services.map(s => [s.id, s])) as Record<ServiceId, Service>
