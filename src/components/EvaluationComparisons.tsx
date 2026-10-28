import { sourceComparisonGroups } from '../lib/evaluationGroups'
import { candidateLabel } from '../lib/recommend'
import type { Recommendation } from '../recommendationTypes'

export default function EvaluationComparisons({candidates,onSelect}:{candidates:Recommendation[];onSelect:(id:string)=>void}) {
  const groups=sourceComparisonGroups(candidates)
  const configurations=candidates.filter(c=>c.configuration)
  return <>{groups.map(group=><section className="evaluation-comparison" key={group.id} aria-label={group.label}>
    <h2>{group.label}</h2><p>{group.scope}</p><p>원점수 내림차순 · 종합 점수나 다른 평가와 합산하지 않아요. 아래 순서는 이 평가의 공개 실행 구성 범위에 한정됩니다.</p>
    <ol>{group.rows.map(({result:e,candidate:c})=><li key={e.id}><strong>{c.model?.name} · {e.effort} · {e.rawScore}{e.unit}</strong><p>평가 대상: {e.modelId} · v{e.modelVersion} · 에이전트 실행 구성</p><p>시점: 발표 {e.publishedAt??'미공개'} / 평가 {e.evaluatedAt??'미공개'} / 확인 {e.source.checkedAt}</p><p>{e.agentName} · {e.fallbacks??'fallback 정보 미공개'} · {c.accessStatus}</p><button className="button secondary" onClick={()=>onSelect(c.id)}>{c.model?.name} {e.effort} 실행 구성 선택</button></li>)}</ol>
    <p><a href={group.source} target="_blank" rel="noreferrer">운영기관 원문 (새 창)</a> · 확인 2026-10-28</p>
  </section>)}{configurations.length>0&&<details className="extras"><summary>작업 관련 에이전트 실행 구성 직접 선택 · {configurations.length}개</summary><p>버전·도구·설정이 다른 결과를 한 순위로 섞지 않아요. 모델 카드 선택과 별도로 특정 평가 실행 구성을 선택할 수 있어요. 설정·환경 미공개는 프롬프트에도 표시해요.</p><ul>{configurations.map(c=><li key={c.id}><p>{candidateLabel(c)} · {c.configuration!.rawScore}{c.configuration!.unit}</p><p>{c.configuration!.limitations}</p><button className="button secondary" onClick={()=>onSelect(c.id)}>{c.model?.name} · {c.configuration!.benchmark} · {c.configuration!.effort??'설정 미공개'} 구성 선택</button></li>)}</ul></details>}</>
}
