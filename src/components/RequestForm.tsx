import { ArrowRight, Braces, Check, CheckCircle2, FileText, Image, Layers, LockKeyhole, MessageSquareText, PenLine, ShieldCheck, SlidersHorizontal, Sparkles, WandSparkles, Wallet } from 'lucide-react'
import { useState } from 'react'
import { budgetLabels, examples, priorityLabels, taskLabels } from '../data/services'
import { classifyTask } from '../lib/recommend'
import type { Budget, Priority, RequestInput } from '../types'
import { BrandMark, DemoBadge, ServiceMark } from './ui'

const categoryIcons = { research: Layers, summary: FileText, writing: PenLine, coding: Braces, image: Image }

export default function RequestForm({ draft, onChange, onSubmit }: { draft: RequestInput; onChange: (value: RequestInput) => void; onSubmit: () => void }) {
  const [error, setError] = useState('')
  const kind = classifyTask(draft.text)
  return <div className="page-enter">
    <div className="page-intro input-intro"><div className="eyebrow"><span className="tiny-star">✦</span> THE RIGHT AI, JUST FOR YOU</div><h1 tabIndex={-1}>어떤 일을 <span className="gradient-text">함께 해결해 볼까요?</span></h1><p className="brand-slogan">어떤 AI를 쓸지부터, 어떻게 쓸지까지.</p><p>AI를 잘 몰라도 괜찮아요.<br className="mobile-break" /> 하고 싶은 일만 알려주면, 꼭 맞는 AI와 활용법을 찾아드릴게요.</p></div>
    <div className="journey-strip" aria-label="사용 과정"><span className="current"><span>01</span> 하고 싶은 일 입력</span><ArrowRight size={14} /><span><span>02</span> 맞춤 AI 비교</span><ArrowRight size={14} /><span><span>03</span> 프롬프트로 시작</span></div>
    <div className="input-grid">
      <form className="request-card panel" onSubmit={event => { event.preventDefault(); if (!draft.text.trim()) { setError('어떤 작업을 하고 싶은지 입력해 주세요.'); document.getElementById('request')?.focus(); return }; setError(''); onSubmit() }}>
        <div className="form-section-title"><MessageSquareText size={19} /><label htmlFor="request">어떤 도움이 필요한가요?</label><span>편하게 적어주세요</span></div>
        <div className={`textarea-wrap ${error ? 'has-error' : ''}`}><textarea id="request" maxLength={3000} value={draft.text} aria-invalid={!!error} aria-describedby={error ? 'request-error' : 'request-hint'} onChange={event => { onChange({ ...draft, text: event.target.value }); setError('') }} placeholder="하고 싶은 작업과 상황을 자유롭게 알려주세요." /><div className="textarea-footer"><span id="request-hint"><Sparkles size={13} /> 구체적으로 적을수록 더 잘 맞는 추천을 드려요</span><span>{draft.text.length.toLocaleString()} / 3,000</span></div></div>
        {error && <p className="error-message" id="request-error" role="alert">{error}</p>}
        <div className="example-chips" aria-label="빠른 예시 선택">{examples.map(example => { const Icon = categoryIcons[example.kind]; return <button type="button" className={`example-chip ${draft.text === example.text ? 'selected' : ''}`} aria-pressed={draft.text === example.text} key={example.kind} onClick={() => { onChange({ ...draft, text: example.text }); setError('') }}><Icon size={14} />{taskLabels[example.kind]}</button> })}</div>
        <div className="form-divider" />
        <fieldset><legend><Wallet size={18} /> 예산은 어느 정도인가요?</legend><div className="segmented-control">{(Object.entries(budgetLabels) as [Budget, string][]).map(([value, label]) => <label className={draft.budget === value ? 'selected' : ''} key={value}><input type="radio" name="budget" value={value} checked={draft.budget === value} onChange={() => onChange({ ...draft, budget: value })} /><span>{draft.budget === value && <Check size={14} />}{label}</span></label>)}</div></fieldset>
        <fieldset className="priority-field"><legend><SlidersHorizontal size={18} /> 무엇이 가장 중요한가요?</legend><div className="priority-options">{(Object.entries(priorityLabels) as [Priority, string][]).map(([value, label]) => <label className={draft.priority === value ? 'selected' : ''} key={value}><input type="radio" name="priority" value={value} checked={draft.priority === value} onChange={() => onChange({ ...draft, priority: value })} /><span><span className="radio-dot" />{label}</span></label>)}</div></fieldset>
        <button className="primary-button analyze-button" type="submit"><Sparkles size={18} /> 내게 맞는 AI 찾기 <ArrowRight size={18} /></button><p className="form-footnote"><LockKeyhole size={12} /> 로그인도 결제도 필요 없어요. 지금 바로 시작하세요.</p>
      </form>
      <aside className="guide-panel"><div className="guide-topline"><BrandMark small /><span>YOUR NEXT STEP</span></div><h2>막막한 시작을,<br />명확한 다음 단계로.</h2><p className="guide-description">수많은 AI 사이에서 고민하는 대신,<br />나에게 필요한 것부터 알아보세요.</p>
        <div className="guide-checks"><div><CheckCircle2 size={17} /><div><strong>내 작업에 맞는 AI 비교</strong><p>이유와 기준을 함께 살펴봐요</p></div></div><div><CheckCircle2 size={17} /><div><strong>예산에 맞춘 현실적인 선택</strong><p>무료로 가능한 범위부터 시작해요</p></div></div><div><CheckCircle2 size={17} /><div><strong>바로 쓸 수 있는 맞춤 프롬프트</strong><p>복사하고, 붙여 넣고, 시작해요</p></div></div></div>
        <div className="guide-preview"><div className="preview-label"><span className="status-dot" /> 이런 추천을 만나게 돼요 <DemoBadge /></div><div className="preview-service"><ServiceMark id="chatgpt" small /><div><strong>ChatGPT <span>추천 예시</span></strong><p>{taskLabels[kind]}에 맞춘 활용법</p></div><ArrowRight size={15} /></div><div className="preview-tags"><span>{budgetLabels[draft.budget]}</span><span>{priorityLabels[draft.priority]}</span></div></div>
        <p className="guide-disclaimer">추천은 선택을 돕는 가이드예요.<br />AI 서비스는 직접 선택하고 사용합니다.</p>
      </aside>
    </div>
    <div className="trust-row"><div><ShieldCheck size={18} /><strong>투명한 추천 기준</strong><span>추천 이유를 숨기지 않아요</span></div><div><Wallet size={18} /><strong>불필요한 비용 없이</strong><span>무료로 시작하는 방법부터</span></div><div><WandSparkles size={18} /><strong>선택에서 활용까지</strong><span>나만의 프롬프트와 함께</span></div></div>
    <p className="global-demo-note">본 서비스는 공모전 시연용 MVP입니다. 점수·가격·기능 정보는 예시이며, 최신 정보는 각 서비스에서 확인하세요.</p>
  </div>
}
