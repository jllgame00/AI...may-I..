import { primaryAccessCandidates } from '../lib/modelAccess'
import { sourceLabel } from '../lib/candidatePresentation'
import { candidateFeatureSupport, exactWebModel, hasSupportSource, neutralCandidateOrder } from '../lib/taskReadiness'
import { featureSupportForTask } from '../lib/featureConstraints'
import { EvaluationFact } from './CurrentModelEvidence'
import type { Comparison, PromptRequest } from '../types'
import type { FeatureId, Recommendation, Source, WeightedTaskDecision, WeightedTaskRow } from '../recommendationTypes'

interface Props {
  comparison:Comparison; request:PromptRequest; weighted:WeightedTaskDecision
  selected:string|null; onSelect:(id:string)=>void; onEdit:()=>void
  needsCheckOpen?:boolean; onNeedsCheckToggle?:(open:boolean)=>void
}
const featureNames:Record<FeatureId,string>={pdf:'PDF 분석',web:'웹 검색',upload:'파일 첨부',imageInput:'이미지 입력',spreadsheet:'엑셀 입력·분석',code:'계산 실행',imageGeneration:'이미지 생성'}
const supportNames={supported:'지원 확인',limited:'제한적 지원 확인 · 한도 확인 필요',unknown:'미확인',unsupported:'미지원 확인'}
const judgmentNames={recommended:'추천',conditional:'조건부 추천','needs-check':'추가 확인 필요',unsupported:'요구 조건 미지원 확인'}
const number=(value:number)=>Number(value.toFixed(1)).toString()
const isWeb=(c:Recommendation)=>c.mapping.routeKind==='chat'||c.mapping.routeKind==='work'

export default function WeightedComparison({comparison,request,weighted,selected,onSelect,onEdit,needsCheckOpen=false,onNeedsCheckToggle}:Props) {
  const required=comparison.analysis.requiredFeatures
  const supportFor=(c:Recommendation,f:FeatureId)=>featureSupportForTask(candidateFeatureSupport(c,f),f,request.text)
  const unsupported=(c:Recommendation)=>isWeb(c)&&required.some(f=>{
    const support=supportFor(c,f)
    return support?.status==='unsupported'&&hasSupportSource(support)
  })
  const selectable=(c:Recommendation)=>isWeb(c)&&comparison.recommendations.some(option=>option.id===c.id)&&!unsupported(c)
  const chosenCandidate=(c:Recommendation)=>comparison.recommendations.find(option=>option.id===selected&&option.model?.id===c.model?.id&&option.model?.version===c.model?.version&&selectable(option))??c
  const rows=weighted.rows.map(row=>({...row,candidate:chosenCandidate(row.candidate)})).sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)||neutralCandidateOrder(a.candidate,b.candidate))
  const recommendations=rows.filter(row=>row.judgment==='recommended')
  const featured=recommendations.slice(0,3),rest=recommendations.slice(3)
  const jointRecommendation=recommendations.length>1&&recommendations[0].rank!==null&&recommendations.every(row=>row.tied&&row.rank===recommendations[0].rank)
  const additional=rows.filter(row=>row.judgment!=='recommended')
  const functionalSummary=(row:WeightedTaskRow)=>{
    if(required.length){
      const count=row.components.filter(c=>required.includes(c.id as FeatureId)&&c.status==='supported').length
      return count===required.length?`필수 기능 ${count}개 확인`:`필수 기능 ${count}/${required.length}개 확인`
    }
    const label=row.components.some(c=>c.id==='code-purpose')?'공식 코드 작업 용도':'공식 텍스트 생성·출력 용도'
    return row.components.length&&row.components.every(c=>c.status==='supported')?`${label} 확인`:`${label} 추가 확인 필요`
  }
  const services=primaryAccessCandidates(comparison.recommendations.filter(c=>!c.model),required,selected)
  const sources=(items:Source[])=>[...new Map(items.map(s=>[s.url,s])).values()].map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{sourceLabel(s)}</a> · 확인 {s.checkedAt}</p>)
  const execution=(c:Recommendation)=><div className="execution-status" aria-label="실행 조건">
    <p>웹 모델 제공: {!c.model?'모델 미지정 · 서비스에서 확인':exactWebModel(c)?'정확한 모델·버전 지원 확인':c.mapping.routeKind==='api'?'정확한 모델·버전 미확인 · API 경로 참고':c.mapping.routeKind==='self-hosted'?'정확한 모델·버전 미확인 · 직접 설치 경로 참고':'정확한 모델·버전 미확인'}</p>
    <p>필수 웹 도구: {required.length?required.map(f=>{
      const support=isWeb(c)?supportFor(c,f):undefined
      const label=support?.declaredStatus==='limited'?support.status==='supported'?'이 작업 범위 충족':support.status==='unsupported'?'이 작업 범위 불충족':'작업 조건 확인 필요':support?supportNames[support.status]:'미확인'
      return `${featureNames[f]}: ${hasSupportSource(support)?label:'미확인'}`
    }).join(' · '):'별도 요구 없음'}</p>
    <p>개인 계정: 모델·도구 활성화와 남은 사용량 미확인</p>
  </div>
  const action=(c:Recommendation)=>selectable(c)?<button id={`choose-${encodeURIComponent(c.id)}`} className="button primary" onClick={()=>onSelect(c.id)}>{!c.model?'이 서비스로 시작 · 모델 확인':exactWebModel(c)?'실행 조건 확인 후 선택':'웹 모델·도구 확인 후 선택'}</button>:<p className="minor-note">{unsupported(c)?'필수 웹 도구의 미지원이 확인된 경로입니다.':isWeb(c)?'선택 가능한 웹 경로 미확인':c.mapping.routeKind==='api'?'API 설정 필요 · 참고 전용':c.mapping.routeKind==='self-hosted'?'설치·실행 환경 설정 필요 · 참고 전용':'정확한 이용 경로 미확인 · 참고 전용'} {c.mapping.url&&<a href={c.mapping.url} target="_blank" rel="noreferrer">공식 이용 경로 (새 창)</a>}</p>
  const modelCard=(row:WeightedTaskRow)=>{
    const c=row.candidate
    return <article className="candidate-card" data-model-id={c.model?.id} data-candidate-kind="weighted" data-judgment={row.judgment} key={c.model?.id??c.id}>
      <h2>{c.model?.name??c.model?.id}</h2>
      <p className="candidate-judgment">{judgmentNames[row.judgment]}</p>
      {row.basis==='benchmark'&&row.rank!==null&&weighted.cohort&&<>
        <p className="recommendation-rank">비교 집합 내 {row.tied?'공동 ':''}{row.rank}위 · {weighted.cohort.benchmark} {weighted.cohort.version} · {weighted.cohort.publisher}</p>
        <p>벤치마크 원점수: {row.evaluation?.rawScore??'미확인'} {row.evaluation?.unit} · {row.evaluation?.evaluationType==='agent'?'모델·도구·에이전트 실행 구성 평가':'모델 평가'}</p>
      </>}
      {row.basis==='functional'&&row.score!==null&&<>
        {row.tied&&<p className="recommendation-rank">공동 추천 · 같은 기능·용도 근거</p>}
      </>}
      {row.basis==='functional'&&<p>{functionalSummary(row)}</p>}
      <p>{row.reason}</p>
      <p className="candidate-status">{c.service.name} · {c.mapping.routeKind==='work'?'Work 웹':c.mapping.routeKind==='chat'?'웹 채팅':c.mapping.routeKind==='api'?'API 참고':c.mapping.routeKind==='self-hosted'?'직접 설치 경로 참고':'정확한 이용 경로 미확인'}{selected===c.id?' · 선택됨':''}</p>
      {execution(c)}{action(c)}
      <details><summary>근거·상세 보기</summary>
        {weighted.mode==='functional'&&<p>근거 충족률: {number(row.coverage)}% · 확인된 기준 비중입니다. 신뢰도나 성능 확률이 아닙니다.</p>}
        {weighted.mode==='functional'&&<p>비중은 내부 기능·용도 충족 판단에만 사용하며 모델 품질이나 성능 점수가 아닙니다.</p>}
        {row.components.map(component=><div key={component.id}><p><strong>{weighted.criteria.find(criterion=>criterion.id===component.id)?.label??component.label}</strong> · 이 작업 판정: {supportNames[component.status??'unknown']} · 내부 비중 {number(component.weight*100)}%{component.declaredStatus==='limited'?' · 공식 표시는 제한적 지원':''}</p><p>{component.reason}</p>{!!component.checks?.length&&<ul>{component.checks.map((check,i)=><li key={i}>{check.condition} · 요청: {check.requested??'미확인'} · {check.result==='met'?'충족':check.result==='unmet'?'불충족':'확인 필요'}</li>)}</ul>}{sources(component.sources)}</div>)}
        {!!row.gaps.length&&<ul>{row.gaps.map((gap,i)=><li key={i}>{gap}</li>)}</ul>}
        <p>서비스: {c.service.name} · 플랜: {c.plan.name}<br/>모델 ID: {c.model?.id} · 버전: {c.model?.version} · 모드: {c.mapping.mode??'미확인'}</p>
        <p>{c.mapping.note}</p>{c.model?.webReview&&<p>{c.model.webReview.note} · 검토 {c.model.webReview.checkedAt}</p>}
        {isWeb(c)&&required.map(f=><p key={f}>{featureNames[f]}: {supportFor(c,f).note}</p>)}
        {row.evidence.map(({evaluation,relevance,reason})=><div key={evaluation.id}><p>{relevance==='direct'?'직접 작업 관련':'간접 관련'} · {reason}</p><EvaluationFact result={evaluation} selectedMode={c.mapping.mode}/></div>)}
        {row.evaluation&&!row.evidence.some(item=>item.evaluation.id===row.evaluation?.id)&&<EvaluationFact result={row.evaluation} selectedMode={c.mapping.mode}/>}
        {sources([...(c.model?.sources??[]),...(c.model?.webReview?.sources??[]),...c.mapping.sources,...(c.plan.webAccess?.sources??[]),...(isWeb(c)?required.flatMap(f=>candidateFeatureSupport(c,f)?.sources??[]):[])])}
      </details>
    </article>
  }
  const groups=[...new Map([...(weighted.cohort?[weighted.cohort]:[]),...(comparison.decision?.groups??[])].map(group=>[group.id,group])).values()]
  return <section className="comparison-page"><button id="back-to-conditions" className="text-button" onClick={onEdit}>← 작업·해석 수정</button>
    <div className="page-heading"><h1 tabIndex={-1}>이 작업에 사용할 모델</h1><p className="task-summary">{request.text}</p></div>
    <div className="comparison-basis">
      {weighted.mode==='functional'?<><p>공식 기능·용도를 사용자 작업과 대조해 추천합니다. 제한 안이면 충족, 벗어나면 불충족, 필요한 조건이 미확인이면 조건부로 표시합니다.</p><p>기능·용도 확인은 한국어·장르 품질이나 측정된 성능 순위가 아닙니다.</p></>:<><p>{weighted.explanation}</p><p>순위와 원점수는 {weighted.cohort?.benchmark} {weighted.cohort?.version} · {weighted.cohort?.publisher}의 비교 집합 안에서만 유효합니다. 서비스 점수로 환산하거나 다른 평가와 합산하지 않습니다.</p><p>{weighted.cohort?.limitation}</p></>}
      <p>작업 추천과 웹 모델 제공·필수 웹 도구·개인 계정 조건을 따로 확인합니다. API·설치·에이전트 전용 평가 결과는 웹에서 실행할 수 있다는 근거가 아닙니다. 개인 계정의 도구 활성화·파일 한도·남은 사용량은 시작 전에 확인하세요.</p>
      <p className="minor-note">근거 부족은 낮은 품질을 뜻하지 않습니다. 동점 모델은 이름순으로 중립 정렬합니다.</p>
      {!!weighted.criteria.length&&<details><summary>작업 판단 기준의 적용 규칙</summary><p>{weighted.explanation}</p>{weighted.criteria.map(criterion=><p key={criterion.id}>{criterion.label} · 내부 비중 {number(criterion.weight*100)}%: {criterion.rule}</p>)}</details>}
    </div>
    <div id="recommended-options">
      {!!featured.length&&<section className="candidate-section" data-group="recommended"><h2>{jointRecommendation&&rest.length?`공동 추천 모델 (전체 ${recommendations.length}개)`:`이 작업의 추천 모델 (${featured.length})`}</h2>{jointRecommendation&&!!rest.length&&<p>동일한 근거의 공동 추천 {recommendations.length}개 중 {featured.length}개를 모델명순으로 표시합니다. 표시 순서는 성능 순위를 뜻하지 않습니다. 나머지 공동 후보도 아래에서 펼쳐볼 수 있습니다.</p>}<div className="candidate-grid">{featured.map(modelCard)}</div></section>}
      {!featured.length&&<p>현재 근거로 확정한 추천 모델이 없습니다. 아래 후보의 조건과 근거를 확인하세요.</p>}
      {!!rest.length&&<details className="remaining-models"><summary>{jointRecommendation?'나머지 공동 추천':'나머지 추천 후보'} ({rest.length})</summary><p>{jointRecommendation?'같은 추천 근거의 모델을 최대 3개씩 먼저 표시합니다. 표시 순서는 우열을 뜻하지 않습니다.':'상위 추천 모델을 최대 3개 먼저 표시합니다. 나머지 후보의 순위와 근거도 같은 비교 집합 안에서 확인하세요.'}</p><div className="candidate-grid">{rest.map(modelCard)}</div></details>}
      {!!additional.length&&<details className="other-services" id="needs-check-candidates" open={needsCheckOpen} onToggle={e=>onNeedsCheckToggle?.(e.currentTarget.open)}><summary id="needs-check-summary" aria-expanded={needsCheckOpen} aria-controls="needs-check-options">추가 확인이 필요한 후보 보기 ({additional.length})</summary><section className="candidate-section" data-group="needs-check" id="needs-check-options"><h2>조건부 추천·확인이 필요한 모델 ({additional.length})</h2><div className="candidate-grid">{additional.map(modelCard)}</div></section></details>}
      {!!services.length&&<details className="other-services" open={services.some(c=>c.id===selected)||undefined}><summary id="other-services">다른 서비스에서 시작하기 ({services.length})</summary><section className="candidate-section" data-group="model-check"><h2>모델 확인이 필요한 서비스 후보</h2><div className="candidate-grid">{services.map(c=><article className="candidate-card" data-candidate-kind="model-check" key={c.id}><h2>{c.service.name} {c.plan.name}</h2><p className="candidate-status">모델 미지정{selected===c.id?' · 선택됨':''}</p>{execution(c)}{action(c)}<details><summary>근거·상세 보기</summary><p>{c.mapping.note}</p>{sources([...c.mapping.sources,...c.plan.sources])}</details></article>)}</div></section></details>}
    </div>
    <details className="evidence-section"><summary>벤치마크 원점수 집합·전체 비교 범위·출처</summary><p>아래는 서비스의 추천 점수가 아닌 원점수 자료입니다. 순위는 각 원점수 집합 안에서만 유효합니다. 서로 다른 집합의 원점수는 합산하지 않습니다.</p>
      {groups.map(group=><details key={group.id}><summary>원점수 집합: {group.benchmark} {group.version} · {group.publisher} · {group.modelCount}개 모델</summary><p>{group.selectionReason} · {group.limitation}</p><div className="table-scroll"><table><thead><tr><th>원점수 집합 내 순위</th><th>모델</th><th>벤치마크 원점수</th></tr></thead><tbody>{group.entries.map(entry=><tr key={entry.evaluation?.id??entry.candidate.id}><td>{entry.rank===null?'순위 없음':`집합 내 ${entry.tied?'공동 ':''}${entry.rank}위`}</td><td>{entry.candidate.model?.name??entry.candidate.model?.id}</td><td>{entry.evaluation?.rawScore??'미확인'} {entry.evaluation?.unit}</td></tr>)}</tbody></table></div>{group.entries.map(entry=>entry.evaluation&&<EvaluationFact key={entry.evaluation.id} result={entry.evaluation}/>)}</details>)}
      {comparison.decision?.coverage.map(model=><details key={model.modelId}><summary>{model.modelName} · 전체 원점수 기록</summary><p>{model.reason}</p>{model.evaluations.map(evaluation=><EvaluationFact key={evaluation.id} result={evaluation}/>)}</details>)}
    </details>
  </section>
}
