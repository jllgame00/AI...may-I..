import { budgetLabels } from '../data/services'
import RequestInterpretation from './RequestInterpretation'
import ConditionOrigins from './ConditionOrigins'
import type { Budget, RequestInput } from '../types'
import type { Question } from '../lib/taskSession'

export default function ConditionPanel({ draft, rawDraft, questions, onChange, onContinue, onBack }: {
  draft: RequestInput; rawDraft: RequestInput; questions: Question[]; onChange: (draft: RequestInput) => void; onContinue: () => void; onBack: () => void
}) {
  return <section className="panel condition-panel"><h1 tabIndex={-1}>부족한 조건만 확인할게요</h1><p>규칙 기반 비교에 필요한 질문 {questions.length}개입니다. 미정으로 두어도 확인 필요 후보를 볼 수 있어요.</p>
    <p>입력에서 확인: {draft.duration ?? '분량 미정'} · {draft.output ?? '결과 형태 미정'} · {draft.requiredFeatures?.includes('pdf') ? 'PDF 필요' : 'PDF 필수 아님'}</p>
    <ConditionOrigins request={draft} />
    {questions.includes('budget') && <fieldset><legend>예산</legend><div className="editable-options">{(Object.entries(budgetLabels) as [Budget,string][]).map(([value,label]) => <label key={value}><input type="radio" name="missing-budget" checked={draft.budget === value} onChange={() => onChange({ ...rawDraft, budget: value, budgetSource: 'user' })} />{label}</label>)}</div></fieldset>}
    {questions.includes('task') && <RequestInterpretation draft={draft} rawDraft={rawDraft} onChange={onChange} />}
    {questions.includes('pdfType') && <label className="stage-control">PDF의 형태<select value={draft.pdfType ?? 'unknown'} onChange={e => onChange({ ...rawDraft, pdfType: e.target.value as RequestInput['pdfType'] })}><option value="unknown">잘 모르겠어요 · 미정</option><option value="text">텍스트형</option><option value="scan">스캔형</option></select></label>}
    {questions.includes('volume') && <label className="stage-control">파일 개수·페이지 수 (모르면 비워두세요)<input value={draft.volume === 'unknown' ? '' : draft.volume ?? ''} onChange={e => onChange({ ...rawDraft, volume: e.target.value || 'unknown' })} placeholder="예: 1개, 10페이지" /></label>}
    <div className="page-actions"><button className="secondary-button" onClick={onBack}>입력으로 돌아가기</button><button className="primary-button" onClick={onContinue}>이 조건으로 후보 보기</button></div>
  </section>
}
