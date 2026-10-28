import { useEffect, useRef, useState } from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { copyText, editDraft, placeholders, regenerateDraft, restoreDraft } from '../lib/promptSession'
import type { PromptDraft, PromptTemplate } from '../types'

export default function PromptEditor({ template, draft, context, onChange, primary = false }: { template: PromptTemplate; draft: PromptDraft; context: string; onChange: (draft: PromptDraft) => void; primary?: boolean }) {
  const [copyState,setCopyState] = useState<'idle'|'success'|'error'>('idle')
  const [allowBlanks,setAllowBlanks] = useState(false)
  const editor = useRef<HTMLTextAreaElement>(null)
  const revision = useRef('')
  revision.current = JSON.stringify([draft.text,context])
  const missing = placeholders(draft.text)
  const stale = draft.context !== context
  useEffect(() => { setCopyState('idle'); setAllowBlanks(false) },[draft.text,context])
  const copy = async () => {
    const copiedRevision = revision.current
    const success = await copyText(draft.text, async text => { if (!navigator.clipboard) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(text) })
    if (revision.current !== copiedRevision) return
    setCopyState(success ? 'success' : 'error')
    if (!success) { editor.current?.focus(); editor.current?.select() }
  }
  return <section className={`editor ${primary ? 'primary-editor' : ''}`} aria-label={template.title}>
    <div className="editor-heading"><div><label htmlFor={`prompt-${template.id}`}>{template.title}</label><span>{draft.text.length.toLocaleString()}자</span></div><button id={`copy-${template.id}`} className={primary ? 'button primary' : 'button secondary'} disabled={!draft.text.trim() || (!!missing.length && !allowBlanks)} onClick={copy}>{copyState === 'success' ? <Check size={18} /> : <Copy size={18} />}{copyState === 'success' ? '복사했어요' : copyState === 'error' ? '직접 복사해 주세요' : '프롬프트 복사'}</button></div>
    {stale && <div className="draft-notice" role="status"><p>기존 초안을 유지하고 있어요. 변경한 조건은 아직 반영되지 않았어요.</p><div className="inline-actions"><button className="small-button" onClick={() => editor.current?.focus()}>기존 초안 계속 편집</button><button className="small-button" onClick={() => onChange(regenerateDraft(draft,template.text,context))}>새 조건으로 초안 만들기</button></div></div>}
    <textarea id={`prompt-${template.id}`} ref={editor} className="prompt-text" value={draft.text} spellCheck={false} onChange={e => onChange(editDraft(draft,e.target.value))} aria-describedby={`editor-help-${template.id}`} />
    <p id={`editor-help-${template.id}`} className="editor-help">바로 고쳐 쓸 수 있어요. 복사한 내용은 사용할 곳에 직접 붙여넣어 주세요.</p>
    {!!missing.length && <div className="missing-fields"><p>직접 채울 부분 {missing.length}개: {missing.join(' · ')}</p><label><input type="checkbox" checked={allowBlanks} onChange={e => setAllowBlanks(e.target.checked)} /> 빈칸을 확인했어요. 사용할 때 직접 채울게요.</label></div>}
    <div className="editor-actions">{draft.previous && <button className="text-button" onClick={() => onChange(restoreDraft(draft))}><RotateCcw size={15} />이전 초안 복구</button>}<button className="text-button" onClick={() => onChange(regenerateDraft(draft,template.text,context))}>초안 다시 만들기</button></div>
    <p className={`copy-feedback ${copyState === 'error' ? 'error' : ''}`} role="status" aria-live="polite">{copyState === 'success' ? '클립보드에 복사했어요. 직접 붙여넣어 사용해 주세요.' : copyState === 'error' ? '자동 복사가 되지 않았어요. 편집창의 선택된 내용을 Ctrl+C 또는 기기의 복사 메뉴로 복사해 주세요.' : ''}</p>
  </section>
}
