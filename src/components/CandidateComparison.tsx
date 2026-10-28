import { useState } from 'react'
import { budgetLabels, priorityLabels } from '../data/services'
import { executionRoutes } from '../lib/aiGuide'
import ModelEvaluationReference from './ModelEvaluationReference'
import type { Comparison, PromptRequest } from '../types'
import type { Recommendation } from '../recommendationTypes'

export function planPrice(c:Recommendation): string {
  if (c.plan.tier==='free') return '무료 · AI 구독료 없음 (이용 한도 별도)'
  const p = c.plan.price
  return `${c.plan.billing?.currencySymbol ?? p.currency ?? '통화 미확인'} ${p.amount ?? '금액 미확인'} / ${p.period==='month'?'월':p.period==='year'?'년':'주기 미확인'} · ${p.region}`
}
export default function CandidateComparison({ comparison,request,selected,onSelect,onEdit }: { comparison:Comparison;request:PromptRequest;selected:string|null;onSelect:(id:string)=>void;onEdit:()=>void }) {
  const [showAll,setShowAll] = useState(false)
  const comparable = comparison.recommendations.filter(c => c.suitability==='조건 비교 가능')
  const pending = comparison.recommendations.filter(c => c.suitability!=='조건 비교 가능')
  const card = (c:Recommendation) => <article className={`candidate-card ${selected===c.id?'selected-candidate':''}`} key={c.id}><p className="candidate-status">{c.suitability}{selected===c.id?' · 선택됨':''}</p><h2>{c.service.name}</h2><p className="plan-name">{c.plan.name} · {c.plan.route ?? '개인 웹 서비스'}</p><p>{planPrice(c)}</p><h3>조건에 맞는 이유</h3><p>{c.reason}</p><h3>무료 이용 범위</h3><p>{c.plan.freeScope}</p><h3>제한·유료 고려 조건</h3><p>{c.plan.limits.join(' ')}</p><p>{c.plan.upgrade}</p>{c.plan.billing && <p>{c.plan.billing.note} · 세금: {c.plan.billing.tax}</p>}<p className="minor-note">정확한 실행 모델·버전·모드: {c.mapping.status==='confirmed'?`${c.model?.id ?? '미확인'} · ${c.model?.version ?? '버전 미확인'} · ${c.mapping.mode ?? '모드 미확인'}`:'연결 미확인'}. 이 정보의 부재를 기능 미지원으로 취급하지 않아요.</p>
    <details><summary>중요 미확인·출처 보기</summary><ul>{c.holds.map(h => <li key={h}>{h}</li>)}</ul><p>정확한 현재 성능 순위는 제공하지 않아요. 표시 순서는 이름순이며 동등한 조건 후보는 같은 수준이에요.</p>{c.plan.sources.map((s,i) => <div className="source-item" key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noreferrer">공식 출처 {i+1} (새 창)</a><p>{s.checkedAt} · {s.scope ?? '기존 공식 조사 기록'} · {s.access ?? '기존 열람 기록'}</p></div>)}<p>자료를 새로 실시간 조사한 결과가 아니에요. 사용 전에 실제 계정의 조건을 확인하세요.</p></details>
    <button id={`choose-${c.plan.id}`} className="button primary" onClick={() => onSelect(c.id)}>{c.suitability==='조건 비교 가능'?'이 AI로 단계별 준비':'미확인 내용을 확인하고 선택'}</button><a href={executionRoutes(c)[0].url} target="_blank" rel="noreferrer" className="text-button">공식 이용 경로 보기 (새 창)</a>
  </article>
  return <div className="comparison-page"><div className="result-top"><div><p className="eyebrow">COMPARE & CHOOSE</p><h1 tabIndex={-1}>조건을 비교하고 직접 선택하세요.</h1><p>성능 순위가 아닌, 확인된 예산·필수 기능 조건의 비교예요.</p></div><button id="edit-analysis" className="text-button" onClick={onEdit}>조건 수정</button></div><div className="comparison-summary"><p>{request.text}</p><strong>{budgetLabels[request.budget ?? 'free']} · {priorityLabels[request.priority ?? 'quality']}</strong><p>{comparison.analysis.notes[1]}</p></div>
    <h2>조건 비교 가능 · {comparable.length}개</h2>{!comparable.length && <div className="draft-notice" role="status"><p>현재 필수 조건을 충족한다고 확인된 후보가 없어요. 미확인은 미지원과 다르며, 예산·필수 조건을 자동 완화하지 않아요.</p><button className="button secondary" onClick={onEdit}>입력·필수 조건 수정</button><button className="text-button" onClick={() => { const d=document.getElementById('pending-options') as HTMLDetailsElement; d.open=true; d.querySelector('summary')?.focus() }}>확인 필요 후보 보기</button></div>}
    <div className="candidate-grid">{(showAll?comparable:comparable.slice(0,3)).map(card)}</div>{comparable.length>3 && <button className="text-button" onClick={() => setShowAll(!showAll)}>{showAll?'기본 후보만':'동등한 후보 더 보기'}</button>}
    <details id="pending-options" className="extras"><summary>확인 후 선택 · {pending.length}개</summary><p>필수 정보가 미확인인 후보는 우선 추천이 아니에요.</p><div className="candidate-grid">{pending.map(card)}</div></details><details className="extras"><summary>확인된 조건 불일치 · {comparison.excluded.length}개</summary>{comparison.excluded.map(c => <div key={c.plan.id}><h3>{c.plan.serviceId} · {c.plan.name}</h3><p>{c.reasons.join(' · ')}</p>{c.plan.sources.map((s,i) => <p key={i}><a href={s.url} target="_blank" rel="noreferrer">공식 근거 (새 창)</a> · {s.checkedAt}</p>)}</div>)}</details>
    <details className="extras"><summary>과거 모델 평가 참고 · 현재 추천에는 반영하지 않음</summary><ModelEvaluationReference candidates={comparison.recommendations} /></details>
  </div>
}
