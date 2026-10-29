import type { Budget, ConditionField, FeatureId, RequestInput, TaskKind } from '../types'
import { interpretRequest } from './recommend.ts'

export interface Conditions {
  budget?: Budget; requiredFeatures: FeatureId[]; duration?: string; output?: string
  pdfType?: RequestInput['pdfType']; volume?: string; tasks: RequestInput['tasks']; maxKrw?: number | null
  kind?: TaskKind
  conditionSources?: RequestInput['conditionSources']
}
export type Question = 'budget' | 'task' | 'pdfType' | 'volume'
export function extractConditions(text: string): Conditions {
  const interpreted = interpretRequest(text)
  const strictFree = /무료\s*만|무료로만|유료\s*(불가|안|제외)|결제\s*(불가|안)/.test(text)
  const prefer = /무료.{0,8}(선호|우선|가능하면|좋)|(?:가능하면|가급적|되도록|가능한 한)\s*무료|가능.{0,8}무료|가능한.{0,8}(쓰고 싶지|무료)/.test(text)
  const budget = strictFree ? 'free' : prefer ? 'prefer-free' : /무료|비용\s*(없이|안)|돈\s*안/.test(text) ? 'free' : /유료|결제.{0,5}가능/.test(text) ? 'paid' : undefined
  const max = text.match(/(\d[\d,]*)\s*(만)?\s*원\s*(이하|이내|까지|예산)/)
  return { ...interpreted, budget: budget ?? (max ? 'paid' : undefined), maxKrw: max ? Number(max[1].replaceAll(',','')) * (max[2] ? 10000 : 1) : undefined,
    duration: text.match(/\d+\s*분/)?.[0], output: /발표.*대본|대본/.test(text) ? '발표 대본' : /표/.test(text) ? '표' : /이메일|메일/.test(text) ? '이메일' : undefined,
    pdfType: /스캔/.test(text) ? 'scan' : /텍스트\s*(형|PDF)|텍스트형/i.test(text) ? 'text' : undefined,
    volume: text.match(/\d+\s*(개|쪽|페이지|장)(\s*\d+\s*(쪽|페이지|장))?/)?.[0] }
}
export function resolveConditions(request: RequestInput): RequestInput & Conditions {
  const found = extractConditions(request.text)
  const conditionSources: RequestInput['conditionSources'] = {}
  const fields: ConditionField[] = ['budget','tasks','requiredFeatures','pdfType','volume','duration','output']
  for (const field of fields) {
    const manual = field === 'budget' ? request.budgetSource !== 'inferred' : request[field] !== undefined
    const inferred = found[field]
    conditionSources[field] = manual ? 'user' : inferred !== undefined && inferred !== 'unknown' && (!Array.isArray(inferred) || inferred.length > 0) ? 'inferred' : 'unknown'
  }
  return { ...found, ...request, budget: request.budgetSource === 'inferred' ? found.budget ?? 'unknown' : request.budget,
    maxKrw: request.maxKrw === undefined ? found.maxKrw : request.maxKrw,
    tasks: request.tasks ?? (found.kind === 'image' ? undefined : found.tasks), requiredFeatures: request.requiredFeatures ?? found.requiredFeatures,
    pdfType: request.pdfType ?? found.pdfType, volume: request.volume ?? found.volume,
    duration: request.duration ?? found.duration, output: request.output ?? found.output, conditionSources }
}
export function confirmUnknowns(request: RequestInput, questions: Question[]): RequestInput {
  const result = { ...request }
  if (questions.includes('budget') && result.budgetSource !== 'user') { result.budget = 'unknown'; result.budgetSource = 'user' }
  if (questions.includes('task') && result.tasks === undefined) result.tasks = []
  if (questions.includes('pdfType') && result.pdfType === undefined) result.pdfType = 'unknown'
  if (questions.includes('volume') && result.volume === undefined) result.volume = 'unknown'
  return result
}
export function missingQuestions(c: Conditions): Question[] {
  const q: Question[] = []
  if (c.budget === undefined) q.push('budget')
  if (!c.tasks?.length && c.conditionSources?.tasks !== 'user' && c.kind !== 'image') q.push('task')
  if (c.requiredFeatures.includes('pdf')) { if (c.pdfType === undefined) q.push('pdfType'); if (c.volume === undefined) q.push('volume') }
  return q.slice(0,3)
}
export function toggleComparison(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(v => v !== id) : ids.length < 3 ? [...ids,id] : ids
}
export interface PromptDraft { text: string; context: string; previous: { text: string; context: string } | null }
export function updateDraft(draft: PromptDraft, text: string): PromptDraft { return { ...draft, text } }
export function regenerateDraft(draft: PromptDraft, text: string, context: string): PromptDraft {
  return { text, context, previous: { text: draft.text, context: draft.context } }
}
export function restoreDraft(draft: PromptDraft): PromptDraft {
  return draft.previous ? { ...draft.previous, previous: { text: draft.text, context: draft.context } } : draft
}
export async function copyPrompt(text: string, writer: (text: string) => Promise<void>): Promise<boolean> {
  try { await writer(text); return true } catch { return false }
}
export function findPlaceholders(text: string): string[] {
  const headings = new Set(['역할','나의 요청','현재 선택','작업 조건','입력 자료','원하는 결과 형식','주의사항','선택 상태','내가 선택한 작업 설계안','일반 초안 진행 방식 · 서비스별 최적화 검증 아님'])
  return [...new Set((text.match(/\[[^\]\n]+\]/g) ?? []).filter(value => !headings.has(value.slice(1,-1))))]
}
