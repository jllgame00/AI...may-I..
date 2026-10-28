import { useState } from 'react'
import { budgetLabels } from '../data/services'
import { catalogById, catalogServices } from '../data/catalog'
import { candidateLabel } from '../lib/recommend'
import type { Analysis, Recommendation, WorkflowStep } from '../types'
import { ServiceMark } from './ui'
import RecommendationEvidence, { priceLabel } from './RecommendationEvidence'
import ModelEvaluationReference from './ModelEvaluationReference'
import ConditionOrigins from './ConditionOrigins'

export default function RecommendationDashboard({ analysis, steps, activeStepId, onStep, onEdit, onPrompt, onWorkflow, onExplore }: {
  analysis: Analysis; steps: WorkflowStep[]; activeStepId: string; onStep: (id: string) => void
  onEdit: () => void; onPrompt: (stepId: string, candidateId: string) => void; onWorkflow: () => void
  onExplore?: () => void
}) {
  const [showAll,setShowAll] = useState(false)
  const step = steps.find(s => s.id === activeStepId) ?? steps[0]
  const comparable = step?.recommendations.filter(r => r.suitability === '조건 비교 가능') ?? []
  const pending = step?.recommendations.filter(r => r.suitability !== '조건 비교 가능') ?? []
  const card = (item: Recommendation) => <article className={`recommendation-card ${step?.candidateId === item.id ? 'top-pick' : ''}`} key={item.id}>
    <div className="card-rank"><span>{step?.candidateId === item.id ? '현재 선택 · 변경 가능' : item.suitability}</span><span>조사: {catalogById[item.service.id].researchStatus}</span></div>
    <div className="service-heading"><ServiceMark id={item.service.id} /><div><h3>{item.service.name} · {item.plan.name}</h3><p>{item.plan.route ?? '개인 웹 채팅'} · {priceLabel(item)}</p></div></div>
    <p className="recommendation-reason">조건에 맞는 이유: {item.reason}</p>
    <p>무료 범위: {item.plan.freeScope}</p><p>유료 고려 조건: {item.plan.upgrade}</p>
    <p className="scope-notice">중요 제한: {item.plan.limits.join(' ')}</p>
    <p>작업 적합성: <strong>{item.suitability}</strong></p>
    {!!item.holds.length && <details><summary>미확인·평가 요건 보기</summary><ul className="hold-reasons">{item.holds.map(reason => <li key={reason}>{reason}</li>)}</ul></details>}
    <ul className="source-list">{item.plan.sources.map((s,i) => <li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noreferrer">공식 근거 {i+1} (새 창)</a> · {s.checkedAt}<p>{s.scope ?? '기존 조사 기록'} · {s.access ?? '기존 열람 기록'}</p></li>)}</ul>
    <p className="model-mode">{candidateLabel(item)}</p>
    <p>{item.score === null ? '현재 조건에 연결할 수 있는 성능 평가 근거 부족 · 점수 보류' : `별도 평가 요건 충족 점수: ${item.score} / 100 · 성공률 아님`}</p>
    <RecommendationEvidence item={item} /><button className="secondary-button card-button" onClick={() => step && onPrompt(step.id,item.id)}>{item.suitability === '조건 비교 가능' ? '이 플랜으로 준비하기' : '미확인 내용을 확인하고 초안 준비'}</button>
  </article>
  return <div className="page-enter"><div className="page-intro compact"><h1 tabIndex={-1}>작업 조건에 맞춰 후보를 비교하세요</h1><p>규칙 기반 조건 비교입니다. 동등한 후보는 같은 수준이며, 표시 순서는 품질 순위가 아닙니다.</p><button className="secondary-button" onClick={onEdit}>입력·세부 조건 수정</button></div>
    <div className="result-request"><p>{analysis.request.text}</p><p>{analysis.label} · {budgetLabels[analysis.request.budget]}{analysis.request.maxKrw !== undefined && analysis.request.maxKrw !== null ? ` · 월 ${analysis.request.maxKrw.toLocaleString()}원 이내` : ''}</p><p>필수 기능: {analysis.features.join(' · ') || '지정 없음'} · 결과: {analysis.request.duration ?? '분량 미정'} {analysis.request.output ?? ''}</p><p>파일: {analysis.request.pdfType === 'text' ? '텍스트형' : analysis.request.pdfType === 'scan' ? '스캔형' : '형태 미정'} · {analysis.request.volume === 'unknown' ? '분량 미정' : analysis.request.volume ?? '분량 미정'}</p></div>
    <ConditionOrigins request={analysis.request} />
    <p className="scope-notice">{analysis.conclusion} · 예산이나 필수 조건을 자동 완화하지 않습니다.</p>
    {step && <label className="stage-control">비교할 준비 단계<select value={step.id} onChange={e => onStep(e.target.value)}>{steps.map((s,i) => <option key={s.id} value={s.id}>{i+1}. {s.title}{s.needsReview ? ' · 다시 확인 필요' : ''}</option>)}</select></label>}
    <h2>조건 비교 가능 ({comparable.length})</h2>
    {!comparable.length && <div className="empty-state" role="status"><h3>{step ? '이 단계에 조건 비교 가능한 후보가 없습니다' : '작업 확인이 필요합니다'}</h3><p>조건을 유지한 채 확인 필요 후보를 검토하거나, 작업을 단계별로 나눠 볼 수 있어요.</p><div className="page-actions"><button className="secondary-button" onClick={onEdit}>조건 수정하기</button><button className="secondary-button" onClick={() => { const d = document.getElementById('pending-candidates') as HTMLDetailsElement | null; if (d) { d.open = true; d.querySelector('summary')?.focus() } }}>확인 필요 후보 보기</button><button className="secondary-button" onClick={onWorkflow}>단계별 검토</button></div></div>}
    <div className="recommendation-grid">{(showAll ? comparable : comparable.slice(0,3)).map(card)}</div>
    {comparable.length > 3 && <button className="secondary-button" onClick={() => setShowAll(!showAll)}>{showAll ? '기본 후보만 보기' : '동등한 조건 비교 후보 더 보기'}</button>}
    <details id="pending-candidates" className="excluded-panel"><summary>확인 후 선택 ({pending.length})</summary><p>필수 정보가 미확인인 후보는 우선 추천이 아닙니다. 아래에서 제약을 읽고 직접 선택할 수 있어요.</p><div className="recommendation-grid">{pending.map(card)}</div></details>
    <details className="excluded-panel"><summary>필수 정보 부족 · 플랜 미확인 등록 후보</summary>{catalogServices.filter(s => !['chatgpt','claude','gemini'].includes(s.id)).map(s => <p key={s.id}>{s.name}: {s.unknowns}</p>)}<button className="secondary-button" onClick={onExplore}>전체 서비스 탐색·상세 열기</button></details>
    {step && <details className="excluded-panel"><summary>확인된 조건 불일치 ({step.excluded.length})</summary>{step.excluded.map(e => <div key={e.plan.id}><h3>{catalogById[e.plan.serviceId].name} · {e.plan.name}</h3><ul>{e.reasons.map(r => <li key={r}>{r}</li>)}</ul>{e.plan.sources.map((s,i) => <p key={i}><a href={s.url} target="_blank" rel="noreferrer">공식 근거 (새 창)</a> · {s.checkedAt}</p>)}</div>)}</details>}
    <ModelEvaluationReference candidates={step?.recommendations ?? []} />
    <details className="source-overview"><summary>별도 성능 평가의 적용 요건</summary><p>공식 모델·버전·추론 설정·플랜 연결과 동일한 실행 조건, 개별 평가·이용 근거가 있을 때만 기존 평가 기능을 적용합니다. 성능 평가가 없어도 필수 기능·비용 근거로 조건 비교가 가능합니다. 과거 2025년 공개 투표는 현재 후보 선정·정렬·동점 처리에 사용하지 않습니다.</p><p>정책 {analysis.policyVersion} · 데이터 {analysis.dataVersion}. 기존 평가 정책 비중은 유효한 평가가 있을 때에만 적용하며 미확인을 0점으로 바꾸지 않습니다.</p></details>
    <div className="page-actions"><button className="primary-button" onClick={onWorkflow}>준비 단계별 선택 보기</button><button className="secondary-button" onClick={onExplore}>서비스 탐색·플랜 비교</button></div>
  </div>
}
