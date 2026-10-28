import { primaryAccessCandidates, accessCategory } from '../lib/modelAccess'
import { EvaluationFact } from './CurrentModelEvidence'
import { candidateSummary, sourceLabel } from '../lib/candidatePresentation'
import type { Comparison, PromptRequest } from '../types'
import type { Recommendation, TaskRecommendationEntry } from '../recommendationTypes'

export default function CandidateComparison({comparison,request,selected,onSelect,onEdit}:{comparison:Comparison;request:PromptRequest;selected:string|null;onSelect:(id:string)=>void;onEdit:()=>void}){
  const d=comparison.decision
  const models=primaryAccessCandidates(comparison.recommendations)
  const entryFor=(c:Recommendation)=>[...(d?.entries??[]),...(d?.alternatives??[])].find(e=>e.candidate.model?.id===c.model?.id)
  const supported=models.filter(c=>entryFor(c))
  const ordered=[...supported].sort((a,b)=>(entryFor(a)?.rank??Infinity)-(entryFor(b)?.rank??Infinity)||(a.model?.name??'').localeCompare(b.model?.name??'','en'))
  const featured=ordered.slice(0,3)
  const rest=models.filter(c=>!featured.includes(c))
  const card=(c:Recommendation)=>{
    const e=entryFor(c), summary=candidateSummary(c,comparison.analysis.requiredFeatures)
    const exact=accessCategory(c)==='web'
    const limit=comparison.analysis.requiredFeatures.length?summary.limit:!exact?'정확한 평가 버전의 웹 제공·선택 가능 여부가 미확인입니다.':'평가와 웹 채팅의 도구·추론 설정이 같다는 보장은 없습니다.'
    return <article className="candidate-card" key={c.id}>
      <p className="candidate-status">{e?.rank?`평가 집합 ${e.tied?'공동 ':''}${e.rank}위`:'동등한 우선 검토 후보'}{selected===c.id?' · 선택됨':''}</p>
      <h2>{c.model?.name??c.service.name}</h2>
      <ul className="candidate-facts"><li>{e?.reason??'현재 작업의 직접 성능 근거가 부족한 웹 서비스 후보입니다.'}{e?.rank&&e.evaluation?` 원점수 ${e.evaluation.rawScore}${e.evaluation.unit}.`:''}</li>{summary.facts.filter(f=>f.includes('지원 근거 확인')).slice(0,1).map(f=><li key={f}>{f}</li>)}</ul>
      {e?.evaluation&&<p className="minor-note">{e.evaluation.kind==='provider'?'제공사 발표':e.evaluation.kind==='independent'?'운영기관 직접 평가':'운영기관 평가·제공사 재인용'} · {e.evaluation.publisher}</p>}
      <p className="candidate-limit"><strong>확인할 점</strong> {limit}</p>
      <button id={`choose-${encodeURIComponent(c.id)}`} className="button primary" onClick={()=>onSelect(c.id)}>{exact?'이 모델 선택':'웹 제공 확인 후 사용할 후보로 선택'}</button>
      <details><summary>근거·상세 보기</summary><p>{e?.relation}</p><p>{e?.limitation}</p><p>서비스: {c.service.name} · 플랜: {c.plan.name}<br/>모델 ID: {c.model?.id??'미확인'} · 버전: {c.model?.version??'미확인'} · 모드: {c.mapping.mode??'미확인'}</p><p>{c.mapping.note}</p><p>{summary.limit}</p>{e?.evaluation&&<EvaluationFact result={e.evaluation} selectedMode={c.mapping.mode}/>}<p>{c.holds.join(' · ')}</p>{[...new Map([...(c.model?.sources??[]),...c.mapping.sources].map(s=>[s.url,s])).values()].map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{sourceLabel(s)}</a> · 확인 {s.checkedAt}</p>)}</details>
    </article>
  }
  const evidenceTable=(entries:TaskRecommendationEntry[])=><div className="table-scroll"><table><thead><tr><th>집합 내 순위</th><th>모델</th><th>원점수</th></tr></thead><tbody>{entries.map(e=><tr key={e.evaluation?.id??e.candidate.id}><td>{e.rank?`${e.tied?'공동 ':''}${e.rank}위`:'순위 없음'}</td><td>{e.candidate.model?.name}</td><td>{e.evaluation?.rawScore??'미확인'} {e.evaluation?.unit}</td></tr>)}</tbody></table></div>
  return <section className="comparison-page"><button id="back-to-conditions" className="text-button" onClick={onEdit}>← 작업·해석 수정</button><div className="page-heading"><h1 tabIndex={-1}>이 작업에 쓸 AI를 선택하세요</h1><p className="task-summary">{request.text}</p></div>
    <div className="comparison-basis"><h2>{d?.mode==='ranked'?'작업 관련 평가와 웹 이용을 함께 확인하세요':'동등한 우선 검토 후보예요'}</h2><p>{d?.basis}</p>{d?.gaps.map(g=><p key={g}>{g}</p>)}<p className="minor-note">{d?.scope} {d?.mode==='review'?'아래는 이름순이며 우열을 뜻하지 않습니다.':''} 평가 점수는 일반 웹 채팅의 직접 측정값이 아닙니다.</p></div>
    {!!featured.length&&<div id="recommended-options" className="candidate-grid">{featured.map(card)}</div>}
    {!featured.length&&<p>이 작업에 연결된 웹 모델 근거가 부족해요. 아래 후보의 제공 여부와 기능을 확인해 주세요.</p>}
    {!!rest.length&&<details className="other-candidates"><summary>다른 웹 후보 보기 ({rest.length})</summary><p>직접 비교가 없거나 정확한 버전·필수 기능 확인이 필요한 후보를 포함합니다.</p><div className="candidate-grid">{rest.map(card)}</div></details>}
    {d?.representative&&<section className="evidence-section"><h2>대표 평가: {d.representative.benchmark} {d.representative.version}</h2><p>{d.representative.publisher} · {d.representative.period??'평가 기간 미공개'} · {d.representative.modelCount}개 모델 비교</p><p>{d.representative.selectionReason}</p>{evidenceTable(d.representative.entries)}<p className="minor-note">{d.representative.limitation} API·설치·에이전트 전용 결과는 읽기 전용 근거이며 웹에서 바로 실행할 수 있다는 뜻이 아닙니다.</p></section>}
    <details className="evidence-section"><summary>전체 비교 범위·다른 평가·출처</summary><p>{d?.examinedCount}건 관측값 중 관련 {d?.relevantCount}건, 등록 모델 {d?.coverage.length}개를 검토했습니다. 누락은 0점이 아닙니다. 서로 다른 평가 집합을 합산하지 않습니다.</p>{d?.groups.filter(g=>g.id!==d.representative?.id).map(g=><details key={g.id}><summary>{g.benchmark} {g.version} · {g.publisher} · {g.modelCount}개 모델</summary><p>{g.selectionReason} · {g.limitation}</p>{evidenceTable(g.entries)}{g.entries.map(e=>e.evaluation&&<EvaluationFact key={e.evaluation.id} result={e.evaluation}/>)}</details>)}
      {d?.coverage.map(m=><details key={m.modelId}><summary>{m.modelName} · {m.category==='representative'?'대표 집합':m.category==='alternative'?'다른 근거':'근거 부족'}</summary><p>{m.reason}</p>{m.evaluations.map(e=><EvaluationFact key={e.id} result={e}/>)}</details>)}
    </details>
  </section>
}
