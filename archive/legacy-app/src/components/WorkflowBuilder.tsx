import { ArrowLeft, ArrowRight, Check, GitBranch, Info } from 'lucide-react'
import { candidateLabel, selectedCandidate } from '../lib/recommend'
import type { Analysis, WorkflowStep } from '../types'
import { DemoBadge, ServiceMark } from './ui'
import RecommendationEvidence from './RecommendationEvidence'
export default function WorkflowBuilder({ analysis, steps, onChange, onBack, onPrompts, onReview }: {
  analysis: Analysis; steps: WorkflowStep[]; onChange: (id: string, candidateId: string) => void; onBack: () => void; onPrompts: () => void
  onReview?: (id: string) => void
}) {
  return <div className="page-enter"><div className="page-intro compact"><p className="eyebrow">MAKE IT MANAGEABLE</p><h1 tabIndex={-1}>큰 작업도, <span className="gradient-text">작은 준비 단계부터.</span></h1><p>자동 실행 진행률이 아닌 준비 단계입니다. 서비스·플랜을 직접 선택하세요.</p></div>
    <div className="workflow-notice"><GitBranch size={22} /><div><strong>사용자 선택을 돕는 작업 설계안입니다</strong><p>단계별 결과를 직접 검토하고 다음 서비스에 전달하세요. 외부 AI를 자동 실행하지 않습니다.</p></div><DemoBadge /></div>
    <div className="workflow-summary"><span className="small-tag">{analysis.label}</span><p>{analysis.request.text}</p><span>{steps.length} STEPS</span></div>
    {!steps.length && <div className="empty-state">작업 확인이 필요합니다. 요청 수정에서 작업을 선택한 후 재분석하세요.</div>}
    <div className="workflow-list">{steps.map((step, index) => {
      const item = selectedCandidate(step)
      return <article className="workflow-step" key={step.id}><div className="workflow-number">{String(index + 1).padStart(2, '0')}</div><div className="workflow-body"><span className="step-kicker">준비 단계 {index + 1} · {step.needsReview ? '다시 확인 필요' : item ? '후보 선택됨 · 직접 실행 전' : '준비 전'}</span><h2>{step.title}</h2><p>{step.description}</p><p>입력: {index ? '[앞 단계에서 직접 확인한 요약을 여기에 붙여넣으세요]' : '직접 준비한 작업 조건과 허용된 자료'}</p><div className="step-output"><Check size={14} /><span>기대 결과</span>{step.output}</div>{index > 0 && <p>서비스가 바뀌면 앞 단계의 확인된 요약을 새 서비스에 직접 붙여넣어야 해요.</p>}{step.needsReview && <button className="secondary-button" onClick={() => onReview?.(step.id)}>입력·선택을 다시 확인했어요</button>}{item && <><p>{item.reason}</p><RecommendationEvidence item={item} /></>}</div><div className="workflow-select"><label htmlFor={`service-${step.id}`}>이 단계를 함께할 AI·플랜·모드</label><div className="service-select-wrap">{step.serviceId && <ServiceMark id={step.serviceId} small />}<select id={`service-${step.id}`} value={step.candidateId ?? ''} disabled={!step.recommendations.length} onChange={e => onChange(step.id, e.target.value)}><option value="" disabled>{step.recommendations.length ? '직접 후보를 선택하세요' : '조건에 맞는 후보 없음'}</option>{step.recommendations.map(r => <option key={r.id} value={r.id}>{candidateLabel(r)} · {r.suitability}</option>)}</select></div><span>{item?.suitability ?? '후보 선택 또는 조건 검토 필요'}</span></div></article>
    })}</div>
    <div className="workflow-tip"><Info size={17} /><p>같은 구독을 여러 단계에서 쓸 수 있습니다. 단계별 가격을 중복 합산하지 않습니다. 선택한 고유 플랜 {new Set(steps.map(s => selectedCandidate(s)?.plan.id).filter(Boolean)).size}개 · 통화·결제 주기·지역·세금이 달라 총액은 확정하지 않습니다. 각 단계의 결과는 직접 검토하고 전달하세요.</p></div><div className="page-actions"><button className="secondary-button" onClick={onBack}><ArrowLeft size={16} /> 추천 비교로 돌아가기</button><button className="primary-button" onClick={onPrompts}>프롬프트 준비 <ArrowRight size={17} /></button></div></div>
}
