import { services, taskLabels } from '../data/services.ts'
import type { Analysis, Priority, RequestInput, Scores, TaskKind, WorkflowStep } from '../types'

export const scoreWeights: Record<Priority, Scores> = {
  quality: { fit: .55, cost: .10, features: .25, ease: .10 },
  cost: { fit: .20, cost: .60, features: .10, ease: .10 },
  ease: { fit: .25, cost: .10, features: .10, ease: .55 },
  speed: { fit: .30, cost: .10, features: .15, ease: .45 },
}

export function classifyTask(text: string): TaskKind {
  if (/코딩|코드|개발|디버|버그|파이썬|python|react|typescript|javascript|프로그래밍/i.test(text)) return 'coding'
  if (/이미지|포스터|그림|일러스트|로고|사진|썸네일/.test(text)) return 'image'
  if (/발표|연구|논문|과제|리서치/.test(text)) return 'research'
  if (/요약|회의록|정리/.test(text)) return 'summary'
  return 'writing'
}

const reasons: Record<TaskKind, Record<string, string>> = {
  research: {
    chatgpt: '자료 요약부터 발표 구성과 대본 작성까지, 하나의 대화로 이어가기 좋은 선택입니다.',
    gemini: '자료에서 핵심을 빠르게 뽑고 여러 관점으로 비교하는 단계에 어울립니다.',
    claude: '자료의 긴 맥락을 살피고 발표 대본의 논리와 표현을 다듬는 데 어울립니다.',
  },
  summary: {
    chatgpt: '요약과 할 일 정리를 표 형태로 요청하고, 후속 질문으로 보완하기 좋습니다.',
    gemini: '여러 내용을 항목별로 나누어 핵심과 실행 과제를 정리하기 좋습니다.',
    claude: '긴 문서의 맥락을 유지하면서 핵심 주장과 근거를 정리하기 좋습니다.',
  },
  writing: {
    chatgpt: '글의 구조를 잡고 여러 말투의 초안을 비교하며 완성하기 좋습니다.',
    gemini: '다양한 아이디어를 펼치고 전달할 내용을 간결하게 정리하기 좋습니다.',
    claude: '독자와 목적에 맞춰 문장의 흐름과 표현을 섬세하게 다듬기 좋습니다.',
  },
  coding: {
    chatgpt: '구현 방법을 단계별로 이해하고 코드 초안과 오류 원인을 함께 살피기 좋습니다.',
    gemini: '구현 아이디어를 비교하고 코드의 동작을 설명받는 데 어울립니다.',
    claude: '코드 구조와 요구사항을 함께 검토하고 수정안을 작성하기 좋습니다.',
  },
  image: {
    chatgpt: '이미지 콘셉트와 구성 요소를 구체적인 생성용 프롬프트로 정리하기 좋습니다.',
    gemini: '여러 시각적 아이디어를 비교하고 이미지 생성용 지시문을 구체화하기 좋습니다.',
    claude: '이미지 콘셉트·문구·프롬프트 설계용입니다. 이 데모에서는 이미지 생성 도구로 추천하지 않습니다.',
  },
}

const features: Record<TaskKind, string[]> = {
  research: ['자료 분석', '논점 추출', '발표 구성', '대본 작성'],
  summary: ['내용 요약', '핵심 추출', '표로 정리'],
  writing: ['아이디어 정리', '초안 작성', '문장 다듬기'],
  coding: ['코드 작성', '오류 검토', '구현 설명'],
  image: ['콘셉트 기획', '이미지 프롬프트', '문구 작성'],
}

function createWorkflow(kind: TaskKind): WorkflowStep[] {
  const plans: Record<TaskKind, WorkflowStep[]> = {
    research: [
      { id: 'extract', title: '자료 핵심 요약 및 논점 추출', description: '자료의 핵심 주장과 근거를 나누고, 발표에 쓸 논점을 추립니다.', output: '핵심 요약 · 논점 3~5개 · 출처 목록', serviceId: 'gemini' },
      { id: 'structure', title: '발표 구조 설계', description: '청중이 이해하기 쉬운 도입, 본론, 결론의 흐름을 만듭니다.', output: '슬라이드별 제목 · 핵심 메시지', serviceId: 'chatgpt' },
      { id: 'script', title: '발표 대본 작성', description: '구조를 바탕으로 자연스러운 말투의 대본과 예상 질문을 만듭니다.', output: '발표 대본 · 예상 질문과 답변', serviceId: 'claude' },
    ],
    summary: [
      { id: 'extract', title: '핵심 내용과 사실 추출', description: '주제별 주요 내용과 수치, 결정 사항을 분리합니다.', output: '주제별 핵심 항목', serviceId: 'gemini' },
      { id: 'organize', title: '요약과 실행 과제 정리', description: '요약문과 담당자별 할 일을 작성하고 원문과 대조합니다.', output: '요약문 · 실행 과제 표', serviceId: 'chatgpt' },
    ],
    writing: [
      { id: 'outline', title: '독자와 글의 구조 정리', description: '대상 독자, 전달할 메시지와 적절한 말투를 정합니다.', output: '글의 개요 · 핵심 메시지', serviceId: 'chatgpt' },
      { id: 'draft', title: '초안 작성과 표현 다듬기', description: '구조에 맞게 글을 쓰고 어색한 문장과 과장된 표현을 검토합니다.', output: '완성 초안 · 대안 표현', serviceId: 'claude' },
    ],
    coding: [
      { id: 'spec', title: '요구사항과 구현 구조 정리', description: '필요 기능과 입력·출력, 예외 상황을 먼저 정리합니다.', output: '기능 명세 · 파일 구조', serviceId: 'chatgpt' },
      { id: 'code', title: '코드 작성 및 오류 검토', description: '실행 가능한 코드와 검증 방법을 만들고 동작을 직접 확인합니다.', output: '코드 · 실행 방법 · 검증 항목', serviceId: 'claude' },
    ],
    image: [
      { id: 'concept', title: '이미지 콘셉트와 문구 기획', description: '목적, 분위기, 구도와 전달할 문구를 정합니다.', output: '콘셉트 3안 · 포스터 문구', serviceId: 'claude' },
      { id: 'image-prompt', title: '이미지 생성용 프롬프트 설계', description: '선택한 콘셉트를 생성용 지시문으로 정리합니다. 생성은 직접 지원 도구에서 진행하세요.', output: '생성 프롬프트 · 결과 검토 기준', serviceId: 'chatgpt' },
    ],
  }
  return plans[kind].map(step => ({ ...step }))
}

// Pure local demo engine. Replace at an API boundary without changing presentation components.
export function analyzeRequest(input: RequestInput): Analysis {
  const text = input.text.trim()
  if (!text) throw new Error('어떤 작업을 하고 싶은지 입력해 주세요.')
  const request = { ...input, text }
  const kind = classifyTask(text)
  const weights = scoreWeights[input.priority]
  const recommendations = services.map(service => {
    const scores = {
      ...service.scores,
      fit: service.strengths[kind],
      cost: input.budget === 'paid' ? 90 : Math.max(0, service.scores.cost - (input.budget === 'free' && service.id === 'claude' ? 8 : 0)),
    }
    // A free-only constraint increases the weight of cost without pretending to verify live plans.
    const budgetWeight = input.budget === 'free' ? .35 : input.budget === 'prefer-free' ? .12 : 0
    const weighted = scores.fit * weights.fit + scores.cost * weights.cost + scores.features * weights.features + scores.ease * weights.ease
    const score = Math.round((weighted + scores.cost * budgetWeight) / (1 + budgetWeight))
    return { service, score, scores, reason: reasons[kind][service.id] }
  }).sort((a, b) => b.score - a.score)

  return {
    request, kind, label: taskLabels[kind], features: features[kind], recommendations,
    conclusion: input.budget === 'paid'
      ? `${recommendations[0].service.name}부터 시작하고, 필요한 기능에 맞춰 확장하세요`
      : '무료 플랜 중심으로도 충분히 시작할 수 있습니다',
    detail: input.budget === 'free'
      ? '무료 범위 안에서 자료를 나누어 진행하세요. 한도에 도달하면 작업을 저장하고 다음에 이어가세요.'
      : input.budget === 'paid'
        ? '유료 결제 전, 무료 범위에서 결과를 확인하고 필요한 기능과 사용량을 점검하세요.'
        : '유료 결제는 긴 자료 처리량·고급 기능이 필요할 때만 고려하세요',
    workflow: createWorkflow(kind),
  }
}
