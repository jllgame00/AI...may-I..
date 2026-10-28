import { taskReady } from './taskReadiness.ts'
import type { Recommendation, TaskRecommendationEntry } from '../recommendationTypes'
import type { Comparison } from '../types'

export interface DisplayRecommendation {
  candidate:Recommendation
  rank:number
  tied:boolean
  basis:'features'|'evaluation'
  reason:string
}

// A recommendation to start this task, independent of benchmark-only ranks.
// Missing features/access are never offset by a high benchmark score.
export function recommendationDisplay(comparison:Comparison,candidates:Recommendation[]):DisplayRecommendation[] {
  const ready=candidates.filter(c=>c.model&&taskReady(c,comparison.analysis.requiredFeatures))
  const group=comparison.decision?.representative
  const rows=ready.map(c=>group?.entries.find(e=>e.candidate.model?.id===c.model?.id&&e.evaluation?.modelVersion===c.model?.version))
  const first=rows[0]?.evaluation
  // The existing decision already validates comparison cohorts and task fit.
  // Use a cohort only when it covers EVERY ready model; no missing-as-zero.
  const useEvaluation=ready.length>1&&comparison.analysis.tasks[0]==='coding'&&!comparison.analysis.survey&&
    !!group&&group.fit>=2&&!!first&&rows.every(e=>{
      const v=e?.evaluation
      return v&&v.evaluationType!=='agent'&&v.domain==='coding'&&v.rawScore!==null&&Number.isFinite(v.rawScore)&&
        v.benchmark===first.benchmark&&v.benchmarkVersion===first.benchmarkVersion&&v.unit===first.unit&&v.higherIsBetter===first.higherIsBetter
    })
  const score=(e:TaskRecommendationEntry|undefined)=>e!.evaluation!.rawScore!*(first!.higherIsBetter?-1:1)
  return ready.map((candidate,i)=>{
    const rank=useEvaluation?1+rows.filter(e=>score(e)<score(rows[i])).length:1
    const tied=useEvaluation?rows.filter(e=>score(e)===score(rows[i])).length>1:ready.length>1
    return {candidate,rank,tied,basis:useEvaluation?'evaluation' as const:'features' as const,
      reason:useEvaluation?`필수 기능·웹 경로 확인. ${first!.benchmark} ${first!.benchmarkVersion} 원점수 ${rows[i]!.evaluation!.rawScore}${first!.unit} (${first!.higherIsBetter?'높을수록':'낮을수록'} 우수)를 참고한 추천 판단입니다.`:
        `필수 기능·정확한 웹 경로가 확인돼 ${tied?'동등하게 ':''}추천합니다. 직접 성능 비교에 따른 순위는 아닙니다.`}
  }).sort((a,b)=>a.rank-b.rank)
}
