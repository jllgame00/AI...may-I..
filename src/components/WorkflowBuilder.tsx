import { ArrowLeft, ArrowRight, Check, GitBranch, Info } from 'lucide-react'
import { candidateLabel, selectedCandidate } from '../lib/recommend'
import type { Analysis, WorkflowStep } from '../types'
import { DemoBadge, ServiceMark } from './ui'
import RecommendationEvidence from './RecommendationEvidence'
export default function WorkflowBuilder({ analysis, steps, onChange, onBack, onPrompts }: {
  analysis: Analysis; steps: WorkflowStep[]; onChange: (id: string, candidateId: string) => void; onBack: () => void; onPrompts: () => void
}) {
  return <div className="page-enter"><div className="page-intro compact"><p className="eyebrow">MAKE IT MANAGEABLE</p><h1 tabIndex={-1}>큰 작업도, <span className="gradient-text">작은 단계부터.</span></h1><p>단계마다 평가 기준을 적용하고, 서비스·플랜·모드를 직접 선택하세요.</p></div>
    <div className="workflow-notice"><GitBranch size={22} /><div><strong>사용자 선택을 돕는 작업 설계안입니다</strong><p>단계별 결과를 직접 검토하고 다음 서비스에 전달하세요. 외부 AI를 자동 실행하지 않습니다.</p></div><DemoBadge /></div>
    <div className="workflow-summary"><span className="small-tag">{analysis.label}</span><p>{analysis.request.text}</p><span>{steps.length} STEPS</span></div>
    {!steps.length && <div className="empty-state">작업 확인이 필요합니다. 요청 수정에서 작업을 선택한 후 재분석하세요.</div>}
    <div className="workflow-list">{steps.map((step, index) => {
      const item = selectedCandidate(step)
      return <article className="workflow-step" key={step.id}><div className="workflow-number">{String(index + 1).padStart(2, '0')}</div><div className="workflow-body"><span className="step-kicker">STEP {index + 1}</span><h2>{step.title}</h2><p>{step.description}</p><div className="step-output"><Check size={14} /><span>기대 결과</span>{step.output}</div>{item && <><p>{item.reason}</p><RecommendationEvidence item={item} /></>}</div><div className="workflow-select"><label htmlFor={`service-${step.id}`}>이 단계를 함께할 AI·플랜·모드</label><div className="service-select-wrap">{step.serviceId && <ServiceMark id={step.serviceId} small />}<select id={`service-${step.id}`} value={step.candidateId ?? ''} disabled={!step.recommendations.length} onChange={e => onChange(step.id, e.target.value)}>{!step.recommendations.length && <option value="">조건에 맞는 후보 없음</option>}{step.recommendations.map(r => <option key={r.id} value={r.id}>{candidateLabel(r)}</option>)}</select></div><span>{item ? item.status === 'scored' ? `적합도 ${item.score}` : '조건부 선택 · 총점 보류' : '필수 조건 수정 후 재분석 필요'}</span></div></article>
    })}</div>
    <div className="workflow-tip"><Info size={17} /><p>선택한 플랜·모드와 단계가 카드, 프롬프트, 사용법에 함께 반영됩니다. 모델·모드가 미확인이면 서비스 이용 화면에서 먼저 확인하세요.</p></div><div className="page-actions"><button className="secondary-button" onClick={onBack}><ArrowLeft size={16} /> 추천 비교로 돌아가기</button><button className="primary-button" onClick={onPrompts}>맞춤 프롬프트 확인 <ArrowRight size={17} /></button></div></div>
}
