import { taskSourceGroups } from '../data/taskEvidence.ts'
import { sourceComparisonGroups } from './evaluationGroups.ts'
import { compareEvaluationResults } from './currentEvidence.ts'
import { codingMetricFit } from './codingIntent.ts'
import type { CodingIntent, EvidenceComparisonSet, ModelEvaluation, Recommendation, TaskRecommendationEntry } from '../recommendationTypes'

export function validObservations(evaluations:ModelEvaluation[]):ModelEvaluation[] {
  const counts=new Map<string,number>()
  for(const e of evaluations)counts.set(e.id,(counts.get(e.id)??0)+1)
  return evaluations.filter(e=>counts.get(e.id)===1&&e.rawScore!==null&&Number.isFinite(e.rawScore)&&e.source.url&&e.source.checkedAt)
}
function matches(e:ModelEvaluation,g:typeof taskSourceGroups[number]):boolean {
  const expected=g.expected.find(row=>row.id===e.id)
  return !!expected&&e.source.url===g.source&&Object.entries(expected).every(([key,value])=>JSON.stringify(e[key as keyof ModelEvaluation])===JSON.stringify(value))
}
export function rankedEntries(rows:{candidate:Recommendation;evaluation:ModelEvaluation}[],limitation:string):TaskRecommendationEntry[] {
  const ordered=[...rows].sort((a,b)=>(a.evaluation.rawScore!-b.evaluation.rawScore!)*(a.evaluation.higherIsBetter?-1:1)||a.candidate.id.localeCompare(b.candidate.id,'en'))
  return ordered.map(({candidate,evaluation:e})=>{
    const rank=ordered.findIndex(r=>r.evaluation.rawScore===e.rawScore)+1
    const tied=ordered.filter(r=>r.evaluation.rawScore===e.rawScore).length>1
    return {candidate,evaluation:e,rank,tied,relevance:'indirect',reason:`${e.benchmark} ${e.benchmarkVersion} 비교 집합 내부 ${tied?'공동 ':''}${rank}위입니다.`,relation:e.evaluationType==='agent'?'에이전트·도구 실행 구성 평가 → 현재 개발 작업에 적용하는 것은 추론입니다. 일반 웹 채팅의 직접 측정값이 아닙니다.':'문제 풀이 코드 생성 평가 → 알고리즘 정답 검증과 관련된 근거입니다. 실제 작업 성공률을 보장하지 않습니다.',limitation}
  })
}
export function collectComparisonSets(evaluations:ModelEvaluation[],references:Recommendation[],models:Map<string,Recommendation>,intent:CodingIntent|null):EvidenceComparisonSet[] {
  const groups:EvidenceComparisonSet[]=[]
  const add=(id:string,rows:ModelEvaluation[],kind:EvidenceComparisonSet['kind'],limitation:string,period:string|null=null,publisher?:string)=>{
    const available=rows.filter(e=>models.get(e.modelId)?.model?.version===e.modelVersion)
    if(new Set(available.map(e=>e.modelId)).size<2)return
    const first=available[0]
    const fit=intent?codingMetricFit(first.benchmark,intent):{value:0,reason:'한국어·요청 장르의 직접 비교가 확인되지 않은 참고 평가'}
    const dates=available.map(e=>e.evaluatedAt)
    groups.push({id,benchmark:first.benchmark,version:first.benchmarkVersion,period,publisher:publisher??first.publisher,kind,
      modelCount:new Set(available.map(e=>e.modelId)).size,fit:fit.value,selectionReason:fit.reason,limitation,
      evaluatedAt:dates.every(d=>d&&/^\d{4}-\d{2}-\d{2}$/.test(d))?[...dates].sort()[0]!:null,
      entries:rankedEntries(available.map(e=>({candidate:models.get(e.modelId)!,evaluation:e})),limitation)})
  }
  // Enumerate ALL source-declared sets before selecting; no first-match return.
  for(const g of taskSourceGroups){
    const rows=evaluations.filter(e=>matches(e,g))
    add(g.id,rows,'source-table','Qwen 게시 모델 카드의 비교 열입니다. 독립 재현·완전한 동일 실행 조건 검증은 아니며 미공개 조건을 같다고 가정하지 않습니다.',g.task==='coding'?'2025.02~2025.05':null,'Qwen')
  }
  const validIds=new Set(evaluations.map(e=>e.id))
  // Retain existing reviewed configuration groups, including API-only models.
  const checkedRefs=references.filter(c=>!c.configuration||validIds.has(c.configuration.id))
  for(const g of sourceComparisonGroups(checkedRefs))add(g.id,g.rows.map(r=>r.result),'source-table',g.scope)
  // Strict, fully disclosed comparisons: same source/scope/index and execution
  // conditions. Unknowns and duplicate model configurations never form a cohort.
  const strict=new Map<string,ModelEvaluation[]>()
  const known=evaluations.filter(e=>e.benchmarkVersion&&!['미공개','미확인'].includes(e.benchmarkVersion))
  for(const e of known){
    const rows=known.filter(other=>e.id===other.id||(e.source.url===other.source.url&&e.source.scope===other.source.scope&&e.publisher===other.publisher&&e.kind===other.kind&&e.comparisonGroup===other.comparisonGroup&&compareEvaluationResults(e,other).comparable))
    const unique=rows.filter(e=>rows.filter(other=>other.modelId===e.modelId).length===1).sort((a,b)=>a.id.localeCompare(b.id,'en'))
    if(unique.length>1)strict.set(unique.map(e=>e.id).join('|'),unique)
  }
  for(const [id,rows] of strict)add(`strict:${id}`,rows,'same-conditions','공개된 평가·지수·실행 조건이 일치하는 집합입니다. 이 집합 밖의 모델과 우열을 뜻하지 않습니다.')
  return groups.sort((a,b)=>b.fit-a.fit||Number(b.kind==='same-conditions')-Number(a.kind==='same-conditions')||b.modelCount-a.modelCount||
    (a.evaluatedAt&&b.evaluatedAt?b.evaluatedAt.localeCompare(a.evaluatedAt):0)||a.id.localeCompare(b.id,'en'))
}
