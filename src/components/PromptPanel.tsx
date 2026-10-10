import { ArrowLeft, ArrowRight, Check, Clipboard, FileInput, Info, MessageSquareText, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { services } from '../data/services'
import { buildPrompt } from '../lib/prompts'
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

export default function PromptPanel({ analysis, workflow, selected, onSelect, onWorkflow, onEdit }: {
  analysis: Analysis; workflow: WorkflowStep[]; selected: ServiceId; onSelect: (id: ServiceId) => void; onWorkflow: () => void; onEdit: () => void
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<number | undefined>(undefined)
  const prompt = buildPrompt(analysis, selected, workflow)
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
    <div className="prompt-tabs" role="tablist" aria-label="프롬프트 대상 AI">{services.map((service, index) => <button key={service.id} id={`tab-${service.id}`} role="tab" aria-selected={selected === service.id} aria-controls={`prompt-panel-${service.id}`} tabIndex={selected === service.id ? 0 : -1} className={selected === service.id ? 'selected' : ''} onClick={() => onSelect(service.id)} onKeyDown={event => handleTabKey(event, index)}><ServiceMark id={service.id} small />{service.name}{selected === service.id && <span className="tab-status">선택됨</span>}</button>)}</div>
    <section className="prompt-card panel" id={`prompt-panel-${selected}`} role="tabpanel" aria-labelledby={`tab-${selected}`} tabIndex={0}><div className="prompt-card-header"><div><span className="prompt-kicker">READY TO COPY</span><h2>{selectedService.name} 맞춤 프롬프트</h2><p>역할 · 입력 자료 · 결과 형식 · 주의사항을 담았어요.</p></div><button className={`primary-button copy-button ${copyState === 'copied' ? 'copied' : ''}`} onClick={copy}>{copyState === 'copied' ? <Check size={17} /> : <Clipboard size={17} />}{copyState === 'copied' ? '복사 완료!' : '프롬프트 복사'}</button></div><div className="prompt-meta"><span><span className="status-dot" /> 나의 요청과 작업 설계 반영</span><DemoBadge /></div><pre className="prompt-content" tabIndex={0} aria-label="복사 가능한 완성형 프롬프트">{prompt}</pre><div className="prompt-footer"><Info size={14} /><span>[여기에 자료를 붙여 넣으세요] 부분을 실제 자료로 바꿔 주세요.</span><span>{prompt.length.toLocaleString()}자</span></div></section>
    <div className={`copy-status ${copyState === 'error' ? 'error-message' : ''}`} role="status" aria-live="polite">{copyState === 'error' ? '자동 복사에 실패했어요. 위 프롬프트를 직접 선택해 복사해 주세요.' : copyState === 'copied' ? '클립보드에 복사했어요. 선택한 AI 서비스에 붙여 넣어 보세요.' : ''}</div>
    <section className="usage-section"><h2>이렇게 사용하세요 <span>3분이면 시작할 수 있어요</span></h2><div className="usage-grid">{[{ icon: FileInput, title: '자료 준비하기', text: '선택한 서비스에서 자료를 붙여 넣거나, 지원하는 경우 파일을 업로드하세요.' }, { icon: MessageSquareText, title: '프롬프트 입력하기', text: '복사한 프롬프트의 자료 부분을 채우고, 원하는 길이나 말투를 더해주세요.' }, { icon: RefreshCw, title: '검토하고 다듬기', text: '출처와 사실을 직접 확인하세요. 부족한 부분은 구체적으로 추가 요청하세요.' }].map(({ icon: Icon, title, text }, index) => <div className="usage-card" key={title}><div><span className="usage-number">0{index + 1}</span><Icon size={19} /></div><h3>{title}</h3><p>{text}</p></div>)}</div></section><div className="page-actions"><button className="secondary-button" onClick={onWorkflow}><ArrowLeft size={16} /> 작업 설계 수정</button><button className="text-button" onClick={onEdit}>다른 요청으로 다시 찾기 <ArrowRight size={16} /></button></div><p className="global-demo-note">프롬프트는 로컬 템플릿으로 생성됩니다. 외부 서비스에 전송하거나 AI를 대신 실행하지 않습니다.</p></div>
}
