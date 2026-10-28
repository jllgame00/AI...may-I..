import { primaryAccessCandidates } from '../lib/modelAccess'
import { EvaluationFact } from './CurrentModelEvidence'
import { candidateSummary, sourceLabel } from '../lib/candidatePresentation'
import { assessCandidate, candidateGroup, exactWebModel, taskCandidateOrder } from '../lib/taskReadiness'
import type { Comparison, PromptRequest } from '../types'
import type { Recommendation, TaskRecommendationEntry } from '../recommendationTypes'

export default function CandidateComparison({comparison,request,selected,onSelect,onEdit}:{comparison:Comparison;request:PromptRequest;selected:string|null;onSelect:(id:string)=>void;onEdit:()=>void}){
  const d=comparison.decision
  const models=primaryAccessCandidates(comparison.recommendations,comparison.analysis.requiredFeatures,selected)
  const entryFor=(c:Recommendation)=>c.model?[...(d?.entries??[]),...(d?.alternatives??[])].find(e=>e.candidate.model?.id===c.model?.id):undefined
  const ordered=[...models].sort((a,b)=>(d?.mode==='ranked'?(entryFor(a)?.rank??Infinity)-(entryFor(b)?.rank??Infinity):0)||taskCandidateOrder(a,b,comparison.analysis.requiredFeatures))
  const card=(c:Recommendation)=>{
    const e=entryFor(c), summary=candidateSummary(c,comparison.analysis.requiredFeatures)
    const assessment=c.assessment??assessCandidate(c,comparison.analysis.requiredFeatures)
    const exact=exactWebModel(c)
    return <article className="candidate-card" data-candidate-kind={assessment.start} key={c.id}>
      <p className="candidate-status">{assessment.start==='ready'?'기능·경로 확인':!c.model?'모델 미지정 · 서비스 후보':'추가 확인 필요'}{selected===c.id?' · 선택됨':''}</p>
      <h2>{c.model?.name??`${c.service.name} ${c.plan.name}`}</h2>
      <p className="minor-note">{c.service.name} · {c.plan.unassigned?'웹 제공 확인 필요':c.plan.name} · {c.mapping.routeKind==='work'?'Work 웹':'웹 채팅'}</p>
      <p>{summary.reason}</p>
      {e?.rank&&<p>작업 관련 평가 집합 {e.tied?'공동 ':''}{e.rank}위 · {e.evaluation?.benchmark} {e.evaluation?.benchmarkVersion} · 원점수 {e.evaluation?.rawScore}{e.evaluation?.unit}</p>}
      <p className="candidate-limit"><strong>확인할 점</strong> {summary.limit}</p>
      <button id={`choose-${encodeURIComponent(c.id)}`} className="button primary" onClick={()=>onSelect(c.id)}>{assessment.start==='ready'?'이 모델로 시작':!c.model?'이 서비스로 시작 · 모델 확인':exact?'기능 확인 후 선택':'확인 후 사용할 후보로 선택'}</button>
      <details><summary>근거·상세 보기</summary><ul>{summary.requirements.map(f=><li key={f}>{f}</li>)}</ul><p>성능 비교: {assessment.performance.status==='comparable'?'해당 평가 집합에서 비교 가능':'미확인'}</p><p>개인 계정: 미확인</p><ul>{assessment.account.checks.map(check=><li key={check}>{check}</li>)}</ul><p>{e?.relation}</p><p>{e?.limitation}</p><p>서비스: {c.service.name} · 플랜: {c.plan.name}<br/>모델 ID: {c.model?.id??'미확인'} · 버전: {c.model?.version??'미확인'} · 모드: {c.mapping.mode??'미확인'}</p><p>{c.mapping.note}</p>{c.model?.webReview&&<p>{c.model.webReview.note} · 검토 {c.model.webReview.checkedAt}</p>}{comparison.analysis.requiredFeatures.map(f=><p key={f}>{c.plan.features[f]?.note??'이 경로의 지원 근거 미확인'}</p>)}{e?.evaluation&&<EvaluationFact result={e.evaluation} selectedMode={c.mapping.mode}/>}<p>{c.holds.join(' · ')}</p>{[...new Map([...(c.model?.sources??[]),...(c.model?.webReview?.sources??[]),...c.mapping.sources,...(c.plan.webAccess?.sources??[]),...comparison.analysis.requiredFeatures.flatMap(f=>c.plan.features[f]?.sources??[])].map(s=>[s.url,s])).values()].map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{sourceLabel(s)}</a> · 확인 {s.checkedAt}</p>)}</details>
    </article>
  }
  const evidenceTable=(entries:TaskRecommendationEntry[])=><div className="table-scroll"><table><thead><tr><th>집합 내 순위</th><th>모델</th><th>원점수</th></tr></thead><tbody>{entries.map(e=><tr key={e.evaluation?.id??e.candidate.id}><td>{e.rank?`${e.tied?'공동 ':''}${e.rank}위`:'순위 없음'}</td><td>{e.candidate.model?.name}</td><td>{e.evaluation?.rawScore??'미확인'} {e.evaluation?.unit}</td></tr>)}</tbody></table></div>
  return <section className="comparison-page"><button id="back-to-conditions" className="text-button" onClick={onEdit}>← 작업·해석 수정</button><div className="page-heading"><h1 tabIndex={-1}>이 작업에 쓸 AI를 선택하세요</h1><p className="task-summary">{request.text}</p></div>
    <div className="comparison-basis"><h2>실행 조건을 비교하고 시작할 후보를 고르세요</h2><p>공식 기능 지원, 모델·웹 경로, 성능 비교, 개인 계정 상태를 나누어 표시합니다. 동등 후보는 이름순 중립 정렬이며 성능 순위를 뜻하지 않습니다.</p>{comparison.analysis.survey?<p>직접 비교 근거가 부족해 설문 분석 성능 순위는 제공하지 않습니다. AIME·HLE·코딩 점수는 설문 분석 순위에 사용하지 않습니다.</p>:<p>{d?.basis}</p>}<p className="minor-note">공식 지원 확인은 개인 계정의 활성화·남은 사용량 확인과 별개입니다.</p></div>
    {!!ordered.length&&<div id="recommended-options">{([
      ['ready','작업을 시작할 후보','필수 기능과 정확한 모델·웹 경로의 공식 근거가 확인됐습니다.'],
      ['model-check','모델 확인이 필요한 서비스 후보','서비스 수준의 지원입니다. 모델이 확인되기 전에는 특정 모델의 평가값을 연결하지 않습니다.'],
      ['needs-check','추가 확인이 필요한 후보','각 후보의 모델 제공 또는 필요한 기능을 확인한 뒤 선택하세요.'],
    ] as const).map(([group,title,note])=>{const candidates=ordered.filter(c=>candidateGroup(c,comparison.analysis.requiredFeatures)===group);return candidates.length?<section className="candidate-section" data-group={group} key={group}><h2>{title} ({candidates.length})</h2><p>{note}</p><div className="candidate-grid">{candidates.map(card)}</div></section>:null})}</div>}
    {!ordered.length&&<p>필수 조건을 충족하는 웹 후보가 없습니다. 확인된 미지원과 미확인을 구분해 조건을 검토해 주세요.</p>}
    {!!comparison.excluded.length&&<section className="evidence-section"><h2>필수 조건 미지원으로 제외</h2>{comparison.excluded.map(c=><p key={c.plan.id}>{c.plan.name}: {c.reasons.join(' · ')}</p>)}</section>}
    {d?.representative&&<section className="evidence-section"><h2>대표 평가: {d.representative.benchmark} {d.representative.version}</h2><p>{d.representative.publisher} · {d.representative.period??'평가 기간 미공개'} · {d.representative.modelCount}개 모델 비교</p><p>{d.representative.selectionReason}</p>{evidenceTable(d.representative.entries)}<p className="minor-note">{d.representative.limitation} API·설치·에이전트 전용 결과는 읽기 전용 근거이며 웹에서 바로 실행할 수 있다는 뜻이 아닙니다.</p></section>}
    <details className="evidence-section"><summary>전체 비교 범위·다른 평가·출처</summary><p>{d?.examinedCount}건 관측값 중 관련 {d?.relevantCount}건, 등록 모델 {d?.coverage.length}개를 검토했습니다. 누락은 0점이 아닙니다. 서로 다른 평가 집합을 합산하지 않습니다.</p>{d?.groups.filter(g=>g.id!==d.representative?.id).map(g=><details key={g.id}><summary>{g.benchmark} {g.version} · {g.publisher} · {g.modelCount}개 모델</summary><p>{g.selectionReason} · {g.limitation}</p>{evidenceTable(g.entries)}{g.entries.map(e=>e.evaluation&&<EvaluationFact key={e.evaluation.id} result={e.evaluation}/>)}</details>)}
      {d?.coverage.map(m=><details key={m.modelId}><summary>{m.modelName} · {m.category==='representative'?'대표 집합':m.category==='alternative'?'다른 근거':'근거 부족'}</summary><p>{m.reason}</p>{m.evaluations.map(e=><EvaluationFact key={e.id} result={e}/>)}</details>)}
    </details>
  </section>
}
