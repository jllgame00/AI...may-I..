import { ArrowLeft, ArrowRight, Check, ChevronDown, GitBranch, Info } from 'lucide-react'
import { services } from '../data/services'
import type { Analysis, ServiceId, WorkflowStep } from '../types'
import { DemoBadge, ServiceMark } from './ui'

export default function WorkflowBuilder({ analysis, steps, onChange, onBack, onPrompts }: {
  analysis: Analysis; steps: WorkflowStep[]; onChange: (id: string, serviceId: ServiceId) => void; onBack: () => void; onPrompts: () => void
}) {
  return <div className="page-enter"><div className="page-intro compact"><p className="eyebrow">MAKE IT MANAGEABLE</p><h1 tabIndex={-1}>큰 작업도, <span className="gradient-text">작은 단계부터.</span></h1><p>한 번에 완벽할 필요 없어요. 일을 나누고, 각 단계에 어울리는 AI를 골라보세요.</p></div>
    <div className="workflow-notice"><GitBranch size={22} /><div><strong>사용자 선택을 돕는 작업 설계안입니다</strong><p>AI가 자동으로 모델을 골라 실행하지 않습니다. 단계별 결과를 직접 검토하고 다음 서비스에 전달하세요.</p></div><DemoBadge /></div>
    <div className="workflow-summary"><span className="small-tag">{analysis.label}</span><p>{analysis.request.text}</p><span>{steps.length} STEPS</span></div>
    <div className="workflow-list">{steps.map((step, index) => <article className="workflow-step" key={step.id}><div className="workflow-number">{String(index + 1).padStart(2, '0')}</div><div className="workflow-body"><span className="step-kicker">STEP {index + 1}</span><h2>{step.title}</h2><p>{step.description}</p><div className="step-output"><Check size={14} /><span>기대 결과</span>{step.output}</div></div><div className="workflow-select"><label htmlFor={`service-${step.id}`}>이 단계를 함께할 AI</label><div className="service-select-wrap"><ServiceMark id={step.serviceId} small /><select id={`service-${step.id}`} value={step.serviceId} onChange={event => onChange(step.id, event.target.value as ServiceId)}>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select><ChevronDown size={15} /></div><span>{step.serviceId === analysis.workflow[index].serviceId ? 'AI...may I..?의 추천 · 직접 변경 가능' : '내가 직접 선택한 AI'}</span></div></article>)}</div>
    <div className="workflow-tip"><Info size={17} /><p>이전 단계의 결과를 다음 단계의 입력 자료로 붙여 넣으면 맥락을 이어갈 수 있어요. 아래 맞춤 프롬프트에는 지금 선택한 작업 설계가 반영됩니다.</p></div><div className="page-actions"><button className="secondary-button" onClick={onBack}><ArrowLeft size={16} /> 추천 비교로 돌아가기</button><button className="primary-button" onClick={onPrompts}>맞춤 프롬프트 확인 <ArrowRight size={17} /></button></div></div>
}
