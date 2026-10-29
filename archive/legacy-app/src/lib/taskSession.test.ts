import { it } from 'node:test'
import assert from 'node:assert/strict'
import { extractConditions, missingQuestions, resolveConditions, confirmUnknowns, toggleComparison, updateDraft, regenerateDraft, restoreDraft, copyPrompt, findPlaceholders } from './taskSession.ts'
import { analyzeRequest, selectCandidate } from './recommend.ts'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { catalogServices as services, searchCatalog } from '../data/catalog.ts'

it('extracts free-only, PDF, duration and output without asking again (T01)', () => {
  const c = extractConditions('무료로 PDF 논문을 읽고 5분 발표 대본')
  assert.equal(c.budget, 'free'); assert.equal(c.duration, '5분'); assert.equal(c.output, '발표 대본')
  assert.deepEqual(c.requiredFeatures, ['pdf'])
  assert.deepEqual(missingQuestions(c), ['pdfType', 'volume'])
  assert.equal(extractConditions('무료 선호, 회의록 표 요약').budget, 'prefer-free')
  assert.equal(missingQuestions(extractConditions('무료만, 텍스트 PDF 1개 10페이지, 5분 발표 대본')).length, 0)
})
it('keeps explicit unknown and manual task and budget ahead of inference (T02)', () => {
  const r = resolveConditions({ text: '무료 PDF 논문', budget: 'unknown', priority: 'ease', tasks: [], pdfType: 'unknown' })
  assert.equal(r.budget, 'unknown'); assert.deepEqual(r.tasks, []); assert.equal(r.pdfType, 'unknown')
  assert.ok(missingQuestions(extractConditions('도와줘')).length <= 3)
})
it('registers 13 unique services without synthetic plans, searches aliases separately (T06/T16)', () => {
  assert.equal(new Set(services.map(s => s.id)).size, 13)
  assert.equal(recommendationSnapshot.plans.some(p => p.serviceId === 'kimi'), false)
  assert.ok(services.find(s => s.id === 'mistral')?.aliases.includes('Le Chat'))
})
it('keeps unknown PDF out of condition-comparable choices, not out of catalog (T03)', () => {
  const a = analyzeRequest({ text: '무료 PDF 논문 요약', budget: 'free', priority: 'quality' })
  const chat = a.recommendations.find(r => r.service.id === 'chatgpt')!
  assert.notEqual(chat.suitability, '조건 비교 가능')
  assert.equal(chat.plan.features.pdf.status, 'unknown')
  assert.ok(services.some(s => s.id === 'chatgpt'))
})
it('distinguishes optional missing features, unknown budget, limited PDF and KRW ceiling (T04/T09)', () => {
  const simple = analyzeRequest({ text: '이메일 초안', budget: 'free', priority: 'quality' })
  assert.ok(simple.recommendations.some(r => r.suitability === '조건 비교 가능'))
  const unknown = analyzeRequest({ ...simple.request, budget: 'unknown' })
  assert.ok(unknown.recommendations.every(r => r.suitability !== '조건 비교 가능'))
  const limited = analyzeRequest({ text: 'PDF 요약', budget: 'free', priority: 'quality' })
  assert.notEqual(limited.recommendations.find(r => r.service.id === 'gemini')?.suitability, '조건 비교 가능')
  const cap = analyzeRequest({ text: '글쓰기', budget: 'paid', maxKrw: 10000, priority: 'cost' })
  assert.ok(cap.workflow[0].excluded.some(e => e.plan.id === 'gemini-pro'))
  assert.notEqual(cap.recommendations.find(r => r.plan.id === 'claude-pro')?.suitability, '조건 비교 가능')
})
it('compares distinct service-plan combinations with a three item maximum (T06)', () => {
  let ids: string[] = []
  for (const id of ['chatgpt-free','chatgpt-plus','claude-pro','gemini-pro']) ids = toggleComparison(ids,id)
  assert.deepEqual(ids, ['chatgpt-free','chatgpt-plus','claude-pro'])
  assert.deepEqual(toggleComparison(ids,'chatgpt-free'), ['chatgpt-plus','claude-pro'])
})
it('preserves edited drafts across context changes and restores the previous draft (T07)', () => {
  const draft = { text: '직접 편집한 초안', context: 'old', previous: null }
  assert.equal(updateDraft(draft, '더 편집').context, 'old')
  const generated = regenerateDraft(draft, '새 조건 초안', 'new')
  assert.equal(generated.previous?.text, '직접 편집한 초안')
  assert.equal(restoreDraft(generated).text, '직접 편집한 초안')
  assert.equal(restoreDraft(generated).context, 'old')
})
it('marks later steps for review while changing only the chosen assignment (T10)', () => {
  const a = analyzeRequest({ text: '논문 분석 발표 대본', budget: 'free', priority: 'quality' })
  const next = selectCandidate(a.workflow,a.workflow[0].id,a.workflow[0].recommendations[1].id)
  assert.equal(next[1].candidateId,a.workflow[1].candidateId)
  assert.equal(next[1].needsReview,true)
})
it('reports actual clipboard rejection and success (T08)', async () => {
  assert.equal(await copyPrompt('draft', async () => { throw new Error('denied') }), false)
  let copied = ''; assert.equal(await copyPrompt('draft', async text => { copied = text }), true)
  assert.equal(copied,'draft')
})
it('warns on custom unfilled brackets while allowing template section headings (T08)', () => {
  assert.deepEqual(findPlaceholders('[역할]\n도우미\n[나의 요청]\n[대상 독자]에게 [원하는 분량]으로 작성'), ['[대상 독자]','[원하는 분량]'])
})
it('recognizes free preference without turning it into a hard budget constraint (T01/T02)', () => {
  assert.equal(extractConditions('가급적 무료로 글쓰기').budget,'prefer-free')
  assert.equal(extractConditions('무료면 좋겠어요').budget,'prefer-free')
  assert.equal(extractConditions('무료만 사용, 1만원 이하').budget,'free')
})
it('allows provider and historical alias search, keeps unresearched entries accessible (T06)', () => {
  assert.deepEqual(searchCatalog('Le Chat').map(s => s.id),['mistral'])
  assert.deepEqual(searchCatalog('google').map(s => s.id),['gemini','notebooklm'])
  assert.equal(searchCatalog('없는 서비스').length,0)
  assert.equal(searchCatalog('').length,13)
})
it('does not propagate first-stage PDF requirements to summary-based later writing (T09/T10)', () => {
  const request = { text: '무료 PDF 논문 분석 발표 대본', budget: 'free' as const, priority: 'quality' as const }
  const a = analyzeRequest(request)
  assert.equal(a.workflow[0].recommendations.some(r => r.suitability === '조건 비교 가능'),false)
  assert.ok(a.workflow[1].recommendations.some(r => r.suitability === '조건 비교 가능'))
  const explicit = analyzeRequest({ ...request, featureScope: 'all' })
  assert.equal(explicit.workflow[1].recommendations.some(r => r.suitability === '조건 비교 가능'),false)
})
it('keeps image planning after condition resolution (T02)', () => {
  const a = analyzeRequest(resolveConditions({ text: '무료 포스터 이미지 콘셉트', budget: 'unknown', budgetSource: 'inferred', priority: 'ease' }))
  assert.equal(a.kind,'image'); assert.equal(a.workflow[0].kind,'image')
})
it('retains explicit undecided answers without repeating the same questions (T02)', () => {
  const raw = { text: '도와줘', budget: 'unknown' as const, budgetSource: 'inferred' as const, priority: 'quality' as const }
  const confirmed = confirmUnknowns(raw,['budget','task'])
  assert.equal(confirmed.budgetSource,'user'); assert.deepEqual(confirmed.tasks,[])
  assert.deepEqual(missingQuestions(resolveConditions(confirmed)),[])
})
it('tracks manual and inferred conditions independently after task text changes (T01/T02)', () => {
  const raw = { text: '무료 PDF 논문 요약', budget: 'unknown' as const, budgetSource: 'inferred' as const, priority: 'quality' as const, pdfType: 'text' as const }
  const c = resolveConditions(raw)
  assert.equal(c.conditionSources?.pdfType,'user'); assert.equal(c.conditionSources?.tasks,'inferred')
  const changed = resolveConditions({ ...raw, text: '무료 python 코드 디버깅' })
  assert.deepEqual(changed.tasks,['coding']); assert.deepEqual(changed.requiredFeatures,[])
})
