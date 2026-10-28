import { useState } from 'react'
import { budgetLabels, priorityLabels } from '../data/services'
import { executionRoutes } from '../lib/aiGuide'
import { mappingLabel } from '../lib/currentEvidence'
import ModelEvaluationReference from './ModelEvaluationReference'
import CurrentModelCatalog, { CandidateEvidence } from './CurrentModelEvidence'
import type { Comparison, PromptRequest } from '../types'
import type { Recommendation } from '../recommendationTypes'

export function planPrice(c:Recommendation): string {
  if(c.plan.billingKind==='usage') {
    const p=c.model?.apiPrice
    return p?`API 사용량 과금 · 입력 USD ${p.input} / 캐시 입력 USD ${p.cachedInput} / 출력 USD ${p.output} (각 100만 토큰당) · 월 구독료 아님`:'API 사용량 과금 · 가격 미확인'
  }
  if(c.plan.tier==='free') return '무료 · AI 구독료 없음 (이용 한도 별도)'
  const p=c.plan.price
  return `${c.plan.billing?.currencySymbol ?? p.currency ?? '통화 미확인'} ${p.amount ?? '금액 미확인'} / ${p.period==='month'?'월':p.period==='year'?'년':'주기 미확인'} · ${p.region}`
}
export default function CandidateComparison({ comparison,request,selected,onSelect,onEdit }: { comparison:Comparison;request:PromptRequest;selected:string|null;onSelect:(id:string)=>void;onEdit:()=>void }) {
  const [showAll,setShowAll]=useState(false)
  const comparable=comparison.recommendations.filter(c=>c.suitability==='조건 비교 가능')
  const pending=comparison.recommendations.filter(c=>c.suitability!=='조건 비교 가능')
  const card=(c:Recommendation)=><article className={`candidate-card ${selected===c.id?'selected-candidate':''}`} key={c.id}>
    <p className="candidate-status">{c.suitability}{selected===c.id?' · 선택됨':''}</p>
    <h2>{c.service.name}</h2>
    <p className="model-name"><strong>{c.model?`${c.model.name ?? c.model.id} · v${c.model.version} · ${c.mapping.mode ?? '모드 미확인'}`:c.mapping.selection==='automatic'?'자동 라우팅 · 정확한 모델·버전 선택 가능 여부 미확인':'정확한 모델·버전·모드 연결 미확인'}</strong></p>
    {c.model&&<p className="minor-note">모델 ID: {c.model.id}</p>}
    <p className="plan-name">{c.plan.name} · {mappingLabel(c.mapping)}</p>
    <h3>현재 작업에 맞는 이유</h3><p>{c.reason}</p>
    <CandidateEvidence candidate={c} peers={comparison.recommendations}/>
    <h3>비용·무료 범위·중요 제한</h3><p>{planPrice(c)}</p><p>{c.plan.freeScope}</p>
    <p>{c.plan.limits.join(' ')}</p><p>{c.model?.limits?.join(' ')}</p><p>{c.mapping.note}</p>
    {(c.mapping.routeKind==='work'||c.mapping.routeKind==='api')&&<p className="evidence-limit">{c.mapping.toolsNote} {comparison.analysis.requiredFeatures.length?'필수 도구의 이 경로 지원은 별도 확인이 필요해요.':''}</p>}
    <p>{c.plan.upgrade}</p>
    <details><summary>속도·설정 부담·기술 조건 펼치기</summary><p>속도: {c.model?.speed ?? '동일 조건의 실제 속도 미확인'}</p><p>설정 부담: {c.model?.setup ?? '실제 서비스에서 제공 모델·모드를 확인하세요.'}</p><ul>{c.holds.map(h=><li key={h}>{h}</li>)}</ul>{c.plan.billing&&<p>{c.plan.billing.note} · 세금: {c.plan.billing.tax}</p>}<p>이름순으로 표시하며 순위를 매기지 않아요. 성능 자료가 없는 조건 기반 후보와 필수 기능·비용이 미확인인 후보를 구분해요.</p></details>
    <div className="candidate-sources"><h3>출처·확인일</h3>{[...new Map([...c.mapping.sources,...c.plan.sources].map(s=>[s.url,s])).values()].slice(0,2).map((s,i)=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">공식 근거 {i+1} (새 창)</a> · {s.checkedAt}</p>)}<details><summary>전체 근거와 확인 범위</summary>{[...c.mapping.sources,...c.plan.sources].map((s,i)=><div className="source-item" key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noreferrer">공식 출처 {i+1} (새 창)</a><p>{s.checkedAt} · {s.scope ?? '기존 공식 조사 기록'} · {s.access ?? '기존 열람 기록'}</p></div>)}</details></div>
    <button id={c.model?`choose-${c.id}`:`choose-${c.plan.id}`} className="button primary" onClick={()=>onSelect(c.id)}>{c.suitability==='조건 비교 가능'?'이 AI로 단계별 준비':'미확인 내용을 확인하고 선택'}</button>
    <a href={executionRoutes(c)[0].url} target="_blank" rel="noreferrer" className="text-button">공식 이용 경로 보기 (새 창)</a>
  </article>
  return <div className="comparison-page"><div className="result-top"><div><p className="eyebrow">COMPARE & CHOOSE</p><h1 tabIndex={-1}>서비스·모델·플랜을 비교하고 선택하세요.</h1><p>예산·필수 기능·경로로 후보를 정리하고, 관련 평가의 원점수와 조건을 함께 보여드려요.</p></div><button id="edit-analysis" className="text-button" onClick={onEdit}>조건 수정</button></div>
    <div className="comparison-summary"><p>{request.text}</p><strong>{budgetLabels[request.budget ?? 'free']} · {priorityLabels[request.priority ?? 'quality']}</strong><p>경로: {request.usageRoute==='api'?'개발자 API · 직접 실행':request.usageRoute==='work'?'ChatGPT Work (웹)':request.usageRoute==='chat'?'일반 웹 채팅':'소비자 웹서비스 · Chat / Work'}</p><p>{comparison.analysis.notes[1]}</p><p>종합 100점 없이 원점수·근거·한계를 안내해요. 조건이 동등하거나 비교 근거가 부족하면 확정적인 우열을 정하지 않아요.</p></div>
    <h2>조건 비교 가능 · {comparable.length}개</h2>{!comparable.length&&<div className="draft-notice" role="status"><p>현재 필수 조건을 충족한다고 확인된 후보가 없어요. 미확인은 미지원과 다르며, 예산·필수 조건을 자동 완화하지 않아요.</p><button className="button secondary" onClick={onEdit}>입력·필수 조건 수정</button><button className="text-button" onClick={()=>{const d=document.getElementById('pending-options') as HTMLDetailsElement;d.open=true;d.querySelector('summary')?.focus()}}>확인 필요 후보 보기</button></div>}
    <div className="candidate-grid">{(showAll?comparable:comparable.slice(0,3)).map(card)}</div>{comparable.length>3&&<button className="text-button" onClick={()=>setShowAll(!showAll)}>{showAll?'기본 후보만':'동등한 후보 더 보기'}</button>}
    <details id="pending-options" className="extras"><summary>확인 후 선택 · {pending.length}개</summary><p>필수 기능·비용 또는 정확한 모델과 플랜 연결을 확인해야 해요. 성능 자료 부족만으로 이 그룹에 넣지 않아요.</p><div className="candidate-grid">{pending.map(card)}</div></details>
    <details className="extras"><summary>확인된 조건 불일치 · {comparison.excluded.length}개</summary>{comparison.excluded.map(c=><div key={c.plan.id}><h3>{c.plan.serviceId} · {c.plan.name}</h3><p>{c.reasons.join(' · ')}</p>{c.plan.sources.map((s,i)=><p key={i}><a href={s.url} target="_blank" rel="noreferrer">공식 근거 (새 창)</a> · {s.checkedAt}</p>)}</div>)}</details>
    <CurrentModelCatalog/>
    <details className="extras"><summary>과거 모델 평가 참고 · 현재 추천에는 반영하지 않음</summary><ModelEvaluationReference candidates={comparison.recommendations}/></details>
  </div>
}
