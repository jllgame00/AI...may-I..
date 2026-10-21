import type { ScoringTask } from '../types'
export const POLICY_VERSION = 'recommendation-v1.0.0'
export const scoreWeights = { benchmark: .60, features: .25, cost: .15 } as const
export const featureLabels = { pdf: 'PDF 업로드', web: '웹 검색' } as const
export const scoringTaskLabels = { analysis: '자료 분석', writing: '발표 대본·글쓰기', coding: '코딩·버그 수정' } as const
export const taskEvaluations: Record<ScoringTask, { id: string; label: string; weight: number; reason: string }[]> = {
  analysis: [
    { id: 'gdp-pdf', label: 'GDP.pdf', weight: .40, reason: '문서 근거 이해' },
    { id: 'aa-lcr', label: 'AA-LCR', weight: .35, reason: '장문 추론' },
    { id: 'aa-omniscience', label: 'AA-Omniscience accuracy', weight: .25, reason: '사실 지식 정확성' },
  ],
  writing: [
    { id: 'arena-writing', label: 'Arena Creative Writing', weight: .60, reason: '글에 대한 사용자 선호' },
    { id: 'ifbench', label: 'IFBench', weight: .40, reason: '지시사항 준수' },
  ],
  coding: [
    { id: 'swe-verified', label: 'SWE-bench Verified', weight: .60, reason: '실제 저장소 문제 해결' },
    { id: 'scicode', label: 'SciCode', weight: .40, reason: '코드 작성과 실행 검증' },
  ],
}
