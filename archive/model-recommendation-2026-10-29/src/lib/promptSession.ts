import type { PromptDraft, Screen, Session } from '../types'

// Preserved from the previous app: drafts are owned by the session, not the view.
export function editDraft(draft: PromptDraft, text: string): PromptDraft { return { ...draft, text } }
export function updateSessionDraft(session:Session,id:string,draft:PromptDraft):Session {
  const stages=session.bundle?.guideStages??[],index=stages.findIndex(s=>s.id===id)
  const affected=index<0?[id]:stages.slice(index).map(s=>s.id)
  return {...session,drafts:{...session.drafts,[id]:draft},reviewed:{...session.reviewed,...Object.fromEntries(affected.map(key=>[key,false]))},needsReview:[...new Set([...(session.needsReview??[]),...affected.filter(key=>key!==id)])]}
}
export function regenerateDraft(draft: PromptDraft, text: string, context: string): PromptDraft {
  return { text, context, previous: { text: draft.text, context: draft.context } }
}
export function restoreDraft(draft: PromptDraft): PromptDraft {
  return draft.previous ? { ...draft.previous, previous: { text: draft.text, context: draft.context } } : draft
}
export function syncDrafts(drafts: Record<string,PromptDraft>, templates: { id: string; text: string }[], context: string): Record<string,PromptDraft> {
  const next = { ...drafts }
  for (const template of templates) if (!next[template.id]) next[template.id] = { text: template.text, context, previous: null }
  return next
}
export async function copyText(text: string, writer: (text: string) => Promise<void>): Promise<boolean> {
  try { await writer(text); return true } catch { return false }
}
export function placeholders(text: string): string[] { return [...new Set(text.match(/\[[^\]\n]+\]/g) ?? [])] }
export function availableScreen(screen: Screen, hasBundle: boolean, hasRequest: boolean, questionCount: number): Screen {
  if ((screen === 'result' || screen === 'compare') && !hasBundle) return 'start'
  if (screen === 'questions' && (!hasRequest || !questionCount)) return 'start'
  return screen
}
