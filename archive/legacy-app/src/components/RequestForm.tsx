import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { budgetLabels, examples, priorityLabels, taskLabels } from '../data/services'
import RequestInterpretation from './RequestInterpretation'
import ConditionOrigins from './ConditionOrigins'
import { resolveConditions } from '../lib/taskSession'
import type { Budget, Priority, RequestInput } from '../types'

export default function RequestForm({ draft, onChange, onSubmit, onExplore }: { draft: RequestInput; onChange: (value: RequestInput) => void; onSubmit: () => void; onExplore?: () => void }) {
  const [error, setError] = useState('')
  const shown = resolveConditions(draft)
  return <div className="page-enter"><div className="page-intro input-intro"><p className="eyebrow">AI...may I..?</p><h1 tabIndex={-1}>어떤 일을 <span className="gradient-text">함께 해결해 볼까요?</span></h1><p className="brand-slogan">어떤 AI를 쓸지부터, 어떻게 쓸지까지.</p></div>
    <form className="request-card panel centered-input" onSubmit={e => { e.preventDefault(); if (!draft.text.trim()) { setError('어떤 작업을 하고 싶은지 입력해 주세요.'); document.getElementById('request')?.focus(); return }; setError(''); onSubmit() }}>
      <label htmlFor="request">어떤 도움이 필요한가요?</label><div className="textarea-wrap"><textarea id="request" maxLength={3000} value={draft.text} aria-invalid={!!error} aria-describedby={error ? 'request-error' : 'request-hint'} onChange={e => { onChange({ ...draft, text: e.target.value }); setError('') }} placeholder="예: 무료로 PDF 논문을 읽고 5분 발표 대본을 준비하고 싶어요." /><div className="textarea-footer"><span id="request-hint">예시를 누르면 입력만 채워요. 직접 수정해 보세요.</span><span>{draft.text.length}/3,000</span></div></div>
      {error && <p className="error-message" id="request-error" role="alert">{error}</p>}
      <div className="example-chips" aria-label="빠른 예시 선택">{examples.map(ex => <button type="button" className="example-chip" key={ex.kind} onClick={() => { onChange({ ...draft, text: ex.text }); setError('') }}>{taskLabels[ex.kind]}</button>)}</div>
      <p className="scope-notice">입력한 조건을 로컬 규칙으로 비교하고 프롬프트 템플릿을 준비합니다. 외부 AI 호출·파일 분석·작업 자동 실행은 하지 않아요.</p>
      <details className="optional-conditions"><summary>세부 조건 선택적으로 수정하기</summary>
        <ConditionOrigins request={shown} />
        <fieldset><legend>예산</legend><div className="editable-options">{(Object.entries(budgetLabels) as [Budget,string][]).map(([value,label]) => <label key={value}><input type="radio" name="budget" checked={shown.budget === value} onChange={() => onChange({ ...draft, budget: value, budgetSource: 'user' })} />{label}</label>)}</div></fieldset>
        <fieldset><legend>우선순위 (품질·속도 측정 점수로 사용하지 않음)</legend><div className="editable-options">{(Object.entries(priorityLabels) as [Priority,string][]).map(([value,label]) => <label key={value}><input type="radio" name="priority" checked={draft.priority === value} onChange={() => onChange({ ...draft, priority: value })} />{label}</label>)}</div></fieldset>
        <RequestInterpretation draft={shown} rawDraft={draft} onChange={onChange} />
        <label className="stage-control">월 예산 상한 (원 · 선택)<input type="number" min="0" value={shown.maxKrw ?? ''} onChange={e => onChange({ ...draft, maxKrw: e.target.value === '' ? null : Math.max(0,Number(e.target.value)) })} /></label>
        <label className="stage-control">PDF 형태<select value={shown.pdfType ?? 'unknown'} onChange={e => onChange({ ...draft, pdfType: e.target.value as RequestInput['pdfType'] })}><option value="unknown">잘 모르겠어요 · 미정</option><option value="text">텍스트형</option><option value="scan">스캔형</option></select></label>
        <label className="stage-control">파일 개수·페이지 수<input value={shown.volume === 'unknown' ? '' : shown.volume ?? ''} onChange={e => onChange({ ...draft, volume: e.target.value || 'unknown' })} /></label>
        <label className="stage-control">결과 분량<input value={shown.duration ?? ''} onChange={e => onChange({ ...draft, duration: e.target.value || '미정' })} /></label>
        <label className="stage-control">결과 형태<input value={shown.output ?? ''} onChange={e => onChange({ ...draft, output: e.target.value || '미정' })} /></label>
        <label className="stage-control">사용 경험과 안내량<select value={draft.experience ?? 'unknown'} onChange={e => onChange({ ...draft, experience: e.target.value as RequestInput['experience'] })}><option value="unknown">잘 모르겠어요 · 자세한 안내부터</option><option value="detailed">처음이에요 · 자세한 안내</option><option value="brief">익숙해요 · 간단한 안내</option></select></label>
      </details>
      <button className="primary-button analyze-button" type="submit"><Sparkles size={18} /> 맞는 AI 찾아보기 <ArrowRight size={18} /></button>
      {onExplore && <button type="button" className="secondary-button explore-entry" onClick={onExplore}>서비스부터 둘러볼게요</button>}
      <p className="form-footnote">입력은 현재 탭의 메모리에만 유지합니다. 새로고침하면 초기화됩니다. 개인정보·비공개 원문 대신 작업 조건을 적어 주세요.</p>
    </form><p className="global-demo-note">후보 등록과 추천 가능 여부는 다릅니다. 가격·기능의 근거와 실제 확인일을 함께 보여드립니다.</p>
  </div>
}
