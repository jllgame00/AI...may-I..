import { ArrowRight, Info, PenLine, Sparkles } from 'lucide-react'
import { budgetLabels, priorityLabels } from '../data/services'
import { candidateLabel } from '../lib/recommend'
import type { Analysis, WorkflowStep } from '../types'
import { DemoBadge, SectionHeading, ServiceMark } from './ui'
import RecommendationEvidence, { priceLabel } from './RecommendationEvidence'
export default function RecommendationDashboard({ analysis, steps, activeStepId, onStep, onEdit, onPrompt, onWorkflow }: {
  analysis: Analysis; steps: WorkflowStep[]; activeStepId: string; onStep: (id: string) => void
  onEdit: () => void; onPrompt: (stepId: string, candidateId: string) => void; onWorkflow: () => void
}) {
  const step = steps.find(s => s.id === activeStepId) ?? steps[0]
  return <div className="page-enter">
    <div className="page-intro compact"><p className="eyebrow">YOUR PERSONAL AI GUIDE</p><div className="title-with-action"><h1 tabIndex={-1}>좋은 시작을 위한, <span className="gradient-text">당신의 AI 메이트.</span></h1><button className="secondary-button" onClick={onEdit}><PenLine size={15} /> 요청 수정·재분석</button></div><p>확인한 근거와 남은 불확실성을 함께 비교하세요.</p></div>
    <div className="result-request"><span className="request-quote">“{analysis.request.text}”</span><div><span className="small-tag">{analysis.label}</span><span className="small-tag">{budgetLabels[analysis.request.budget]}</span><span className="small-tag">{priorityLabels[analysis.request.priority]}</span></div><p className="detected-features">필수 기능 <span>{analysis.features.join(' · ') || '지정 없음'}</span></p>{analysis.interpretationNotes.map(note => <p key={note}>{note}</p>)}</div>
    <div className="conclusion-banner"><div className="conclusion-icon"><Sparkles size={24} /></div><div><div className="conclusion-label">AI...may I..?의 추천 <DemoBadge /></div><h2>{analysis.conclusion}</h2><p>{analysis.detail}</p></div></div>
    <div className="results-section-top"><SectionHeading number="01" title="단계별 서비스·플랜 비교" description="총점이 없는 후보의 표시 순서는 성능 순위가 아닙니다." /></div>
    {step && <label className="stage-control">비교할 작업 단계<select value={step.id} onChange={e => onStep(e.target.value)}>{steps.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.title}</option>)}</select></label>}
    <details className="scoring-panel policy-details"><summary>추천 적합도는 어떻게 정해지나요?</summary><p>작업 평가 60% · 필요한 기능 25% · 비용 적합성 15%. 필수 조건을 먼저 적용합니다. 누락된 값은 null로 유지하고 총점을 보류합니다. 동일 평가·버전·실행 조건의 고정 집합에서만 min–max 정규화합니다.</p><p>우선순위는 프롬프트에 반영하며 이 정책 비중을 변경하지 않습니다. 정책 {analysis.policyVersion} · 데이터 {analysis.dataVersion}.</p></details>
    {(!step || !step.recommendations.length) && <div className="empty-state" role="status"><h3>{!step ? '작업 확인이 필요합니다' : '이 단계에 조건을 만족하는 후보가 없습니다'}</h3><p>요청과 필수 기능을 확인하세요. PDF 대신 텍스트를 붙여 넣거나, 검색 대신 직접 제공한 출처로 진행할 수 있다면 조건을 수정하세요.</p><button className="secondary-button" onClick={onEdit}>조건 수정하기</button></div>}
    <div className="recommendation-grid">{step?.recommendations.map(item => <article className={`recommendation-card ${step.candidateId === item.id ? 'top-pick' : ''}`} key={item.id}>
      <div className="card-rank"><span>{step.candidateId === item.id ? '현재 선택 · 변경 가능' : '비교 후보'}</span><span className="demo-badge">{item.status === 'scored' ? '점수 근거 있음' : '조건부 · 점수 보류'}</span></div>
      <div className="service-heading"><ServiceMark id={item.service.id} /><div><h3>{item.service.name}</h3><span>{item.plan.name} · {priceLabel(item)}</span></div><div className="score-value"><strong>{item.score ?? '—'}</strong><span>{item.score === null ? '점수 보류' : '적합도 / 100'}</span></div></div>
      <p className="model-mode">{candidateLabel(item)}</p><p className="recommendation-reason">{item.reason}</p>
      <p className="evidence-status">{item.eligibility === 'confirmed' ? analysis.requiredFeatures.length ? '요청한 필수 기능 지원 확인' : '필수 기능 지정 없음' : '필수 기능 확인 필요'}</p>
      {item.nearTie && <p>다른 후보와 3점 이내의 근소한 차이입니다.</p>}
      {!!item.holds.length && <ul className="hold-reasons">{item.holds.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      <div className="plan-description"><div><div><h4>무료로 가능한 범위</h4><p>{item.plan.freeScope}</p></div></div><div><div><h4>한도와 유료 전환 검토 조건</h4><p>{item.plan.limits.join(' ')}</p><p>{item.plan.upgrade}</p></div></div></div>
      <RecommendationEvidence item={item} /><button className="secondary-button card-button" onClick={() => onPrompt(step.id, item.id)}>이 플랜으로 프롬프트 보기 <ArrowRight size={15} /></button>
    </article>)}</div>
    {step && <details className="excluded-panel"><summary>추천되지 않은 후보의 제외 이유 ({step.excluded.length})</summary>{step.excluded.length ? step.excluded.map(e => <div key={e.plan.id}><strong>{e.plan.serviceId} · {e.plan.name}</strong><ul>{e.reasons.map(r => <li key={r}>{r}</li>)}</ul>{e.plan.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">공식 근거 · {s.checkedAt} </a>)}</div>) : <p>제외된 후보가 없습니다. 미확인 후보는 조건부로 구분했습니다.</p>}</details>}
    <details className="source-overview"><summary>평가 자료의 확보 상태와 출처</summary>{analysis.sources.map(s => <div key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a><p>{s.status} · 확인 {s.checkedAt}</p><p>{s.note}</p></div>)}</details>
    <div className="next-step-panel"><div><span className="eyebrow">SMALL STEPS, BETTER RESULTS</span><h2>일을 나누면, 시작이 더 쉬워져요.</h2><p>{steps.length}단계의 서비스·플랜을 직접 선택하세요.</p></div><button className="primary-button" onClick={onWorkflow}>내 작업 설계하기 <ArrowRight size={17} /></button></div>
    <p className="global-demo-note"><Info size={14} /> {analysis.checkedAt} 확인 스냅샷 · 실시간 정보가 아닙니다. 가격·기능·한도는 이용 전 공식 화면에서 확인하세요.</p>
  </div>
}
