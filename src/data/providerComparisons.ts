import { researchedEvaluations } from './researchCatalog.ts'
import type { ModelEvaluation } from '../recommendationTypes'

const table={
  'western-grok47-cursor':{group:'grok47-cursor4',score:40.4},
  'western-grok47-deepswe':{group:'grok47-deepswe1.1',score:65.2},
  'western-grok47-terminal':{group:'grok47-terminal4',score:20.3},
}
// Separate observations from the 4.7 release's 4.6 comparison column.
// The older 4.6 release used other benchmark versions/conditions; never replace it.
export function markProviderComparison(e:ModelEvaluation):ModelEvaluation {
  const entry=table[e.id as keyof typeof table]
  return entry?{...e,comparisonGroup:entry.group}:e
}
export const providerComparisonEvaluations:ModelEvaluation[]=Object.entries(table).map(([id,entry])=>{
  const template=researchedEvaluations.find(e=>e.id===id)!
  return {...template,id:`${id}-grok46-comparison-column`,modelId:'Grok 4.6',modelVersion:'4.6',rawScore:entry.score,effort:'high',comparisonGroup:entry.group,
    limitations:'Grok 4.7 발표 원문의 Grok 4.6 High 비교 열. 모델·effort·도구를 포함한 제공사 발표 실행 구성 비교이며 독립 재현 결과가 아님. 에이전트 이름·버전·환경·시도 횟수 미공개. 이전 4.6 발표 점수를 덮어쓰거나 동일 조건으로 합치지 않음.'}
})
