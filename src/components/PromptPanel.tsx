import { ArrowLeft, ArrowRight, Check, Clipboard, FileInput, Info, MessageSquareText, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { services } from '../data/services'
import { buildPrompt } from '../lib/prompts'
import { candidateLabel, selectedCandidate } from '../lib/recommend'
import type { Analysis, ServiceId, WorkflowStep } from '../types'
import { DemoBadge, ServiceMark } from './ui'

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return }
  } catch { /* Try the user-initiated fallback when clipboard permission is unavailable. */ }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.setAttribute('aria-hidden', 'true')
  const previousFocus = document.activeElement as HTMLElement | null
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  previousFocus?.focus()
  if (!copied) throw new Error('복사 권한을 확인하거나 아래 프롬프트를 직접 선택해 복사해 주세요.')
}

export default function PromptPanel({ analysis, workflow, selected, onSelect, activeStepId, onStep, onCandidate, onWorkflow, onEdit }: {
  analysis: Analysis; workflow: WorkflowStep[]; selected: ServiceId; onSelect: (id: ServiceId) => void; onWorkflow: () => void; onEdit: () => void
  activeStepId: string; onStep: (id: string) => void; onCandidate: (stepId: string, candidateId: string) => void
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<number | undefined>(undefined)
  const step = workflow.find(s => s.id === activeStepId) ?? workflow[0]
  const assigned = selectedCandidate(step)
  const candidate = assigned?.service.id === selected ? assigned : null
  const prompt = buildPrompt(analysis, selected, workflow, activeStepId)
  useEffect(() => { setCopyState('idle'); return () => window.clearTimeout(timer.current) }, [prompt])
  const selectedService = services.find(service => service.id === selected)!
  const copy = async () => {
    try { await copyText(prompt); setCopyState('copied'); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setCopyState('idle'), 2500) }
    catch { setCopyState('error') }
  }
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % services.length : event.key === 'ArrowLeft' ? (index + services.length - 1) % services.length : event.key === 'Home' ? 0 : event.key === 'End' ? services.length - 1 : -1
    if (nextIndex >= 0) { event.preventDefault(); onSelect(services[nextIndex].id); document.getElementById(`tab-${services[nextIndex].id}`)?.focus() }
  }
  return <div className="page-enter"><div className="page-intro compact"><p className="eyebrow">FROM CHOOSING TO CREATING</p><h1 tabIndex={-1}>이제, <span className="gradient-text">잘 물어볼 차례예요.</span></h1><p>당신의 요청에 맞게 준비했어요. 프롬프트를 복사하고, 선택한 AI에서 시작하세요.</p></div>
    {step && <label className="stage-control">프롬프트 작업 단계<select value={step.id} onChange={e => onStep(e.target.value)}>{workflow.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.title}</option>)}</select></label>}
    {candidate && step ? <div className="selection-context"><label className="stage-control">선택한 플랜·모드<select value={candidate.id} onChange={e => onCandidate(step.id, e.target.value)}>{step.recommendations.filter(r => r.service.id === selected).map(r => <option key={r.id} value={r.id}>{candidateLabel(r)}</option>)}</select></label><p>{candidate.plan.limits.join(' ')}</p><p>사용 전 확인: {candidate.holds.join(' · ') || '이용 화면의 모델·모드 일치 여부'}</p></div> : <div className="empty-state" role="status">이 서비스에서 선택 가능한 후보가 없습니다. 작업 또는 조건을 수정한 뒤 재분석하세요.</div>}
    <div className="prompt-tabs" role="tablist" aria-label="프롬프트 대상 AI">{services.map((service, index) => <button key={service.id} id={`tab-${service.id}`} role="tab" aria-selected={selected === service.id} aria-controls={`prompt-panel-${service.id}`} tabIndex={selected === service.id ? 0 : -1} className={selected === service.id ? 'selected' : ''} onClick={() => onSelect(service.id)} onKeyDown={event => handleTabKey(event, index)}><ServiceMark id={service.id} small />{service.name}{selected === service.id && <span className="tab-status">선택됨</span>}</button>)}</div>
    <section className="prompt-card panel" id={`prompt-panel-${selected}`} role="tabpanel" aria-labelledby={`tab-${selected}`} tabIndex={0}><div className="prompt-card-header"><div><span className="prompt-kicker">READY TO COPY</span><h2>{selectedService.name} 맞춤 프롬프트</h2><p>역할 · 입력 자료 · 결과 형식 · 주의사항을 담았어요.</p></div><button className={`primary-button copy-button ${copyState === 'copied' ? 'copied' : ''}`} disabled={!candidate} onClick={copy}>{copyState === 'copied' ? <Check size={17} /> : <Clipboard size={17} />}{copyState === 'copied' ? '복사 완료!' : '프롬프트 복사'}</button></div><div className="prompt-meta"><span><span className="status-dot" /> 나의 요청과 작업 설계 반영</span><DemoBadge /></div><pre className="prompt-content" tabIndex={0} aria-label="복사 가능한 완성형 프롬프트">{prompt}</pre><div className="prompt-footer"><Info size={14} /><span>[여기에 자료를 붙여 넣으세요] 부분을 실제 자료로 바꿔 주세요.</span><span>{prompt.length.toLocaleString()}자</span></div></section>
    <div className={`copy-status ${copyState === 'error' ? 'error-message' : ''}`} role="status" aria-live="polite">{copyState === 'error' ? '자동 복사에 실패했어요. 위 프롬프트를 직접 선택해 복사해 주세요.' : copyState === 'copied' ? '클립보드에 복사했어요. 선택한 AI 서비스에 붙여 넣어 보세요.' : ''}</div>
    <section className="usage-section"><h2>이렇게 사용하세요</h2><div className="usage-grid">{[{ icon: FileInput, title: '플랜과 자료 준비하기', text: candidate ? `${candidateLabel(candidate)}에서 ${candidate.plan.features.pdf.status === 'supported' ? 'PDF 첨부 또는 텍스트 붙여 넣기' : '텍스트 붙여 넣기부터 시작하고 PDF 권한은 먼저 확인'}. ${candidate.plan.limits.join(' ')}` : '조건에 맞는 후보를 먼저 선택하세요.' }, { icon: MessageSquareText, title: '현재 단계 진행하기', text: `${step?.title ?? '작업 미확인'}: 이전 단계 결과를 자료 부분에 넣고 프롬프트를 입력하세요.` }, { icon: RefreshCw, title: '검토하고 다듬기', text: '출처와 사실을 직접 확인하세요. 다음 단계로 전달하기 전에 결과를 검토하세요.' }].map(({ icon: Icon, title, text }, index) => <div className="usage-card" key={title}><div><span className="usage-number">0{index + 1}</span><Icon size={19} /></div><h3>{title}</h3><p>{text}</p></div>)}</div></section><div className="page-actions"><button className="secondary-button" onClick={onWorkflow}><ArrowLeft size={16} /> 작업 설계 수정</button><button className="text-button" onClick={onEdit}>다른 요청으로 다시 찾기 <ArrowRight size={16} /></button></div><p className="global-demo-note">프롬프트는 로컬 템플릿으로 생성됩니다. 외부 서비스에 전송하거나 AI를 대신 실행하지 않습니다.</p></div>
}
