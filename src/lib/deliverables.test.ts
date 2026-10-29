import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPromptBundle } from './promptEngine.ts'
import { buildGuideBundle, compareCandidates, guideContext, stageOptions } from './aiGuide.ts'
import { editDraft, regenerateDraft, restoreDraft, syncDrafts } from './promptSession.ts'
import { analyzeRequirements } from './providerRequirements.ts'
import { surveyRequest, suppliedServicePrompt } from '../../tests/fixtures/survey-request.ts'
import type { PromptRequest } from '../types.ts'

const emptySelection = { default: null, byStage: {} }
const request = (text: string): PromptRequest => ({ text, overrides: {} })

for (const [text, kind, instruction] of [
  ['설문지를 만들어줘', 'survey_final', /실제.*설문.*문항/],
  ['설문지를 기획해줘', 'survey_plan', /설문.*설계안/],
  ['발표 대본을 작성해줘', 'presentation_script', /실제.*발표.*대본/],
  ['발표 개요를 만들어줘', 'presentation_outline', /발표.*개요/],
  ['보고서를 작성해줘', 'report_final', /실제.*보고서.*본문/],
  ['보고서 목차를 만들어줘', 'report_outline', /보고서.*목차/],
  ['이메일을 작성해줘', 'email_final', /이메일.*본문/],
  ['코드 오류를 수정해줘', 'code_fix', /수정.*코드|코드.*패치/],
  ['설문 홍보 문구를 만들어줘', 'promotion_final', /홍보.*문구|홍보.*글/],
  ['이미지 생성용 프롬프트를 작성해줘', 'image_generation_prompt', /이미지 생성 도구.*프롬프트/],
] as const) {
  test(`resolves an output contract, not a generic writing plan: ${text}`, () => {
    const bundle = buildPromptBundle(request(text))
    assert.equal(bundle.main.deliverable?.kind, kind)
    assert.match(bundle.main.deliverable!.instruction, instruction)
    assert.ok(bundle.main.text.includes(bundle.main.deliverable!.instruction))
    assert.ok(buildGuideBundle(request(text), emptySelection).steps.some(stage=>stage.deliverable?.kind===kind))
  })
}

for (const text of [surveyRequest, suppliedServicePrompt]) {
  test(`starts the multiline survey with a final questionnaire contract: ${text.includes('말 것') ? 'service prompt' : 'spec fixture'}`, () => {
    const r = request(text), bundle = buildGuideBundle(r, emptySelection), first = bundle.steps[0]
    assert.equal(first.deliverable?.kind, 'survey_final')
    assert.deepEqual(bundle.steps.map(stage => stage.deliverable?.kind), ['survey_final'])
    assert.equal(first.workId, 'writing')
    assert.match(first.deliverable!.instruction, /Q1부터 Q10/)
    assert.match(first.deliverable!.instruction, /객관식 7문항/)
    assert.match(first.deliverable!.instruction, /5점 척도 2문항/)
    assert.match(first.deliverable!.instruction, /주관식 1문항/)
    assert.match(first.deliverable!.instruction, /선택지/)
    assert.match(first.deliverable!.instruction, /각.*척도.*의미/)
    assert.match(first.deliverable!.instruction, /경험이 없/)
    assert.match(first.deliverable!.instruction, /만족도.*강제하지/)
    assert.match(first.deliverable!.instruction, /모든 문항에.*선택지.*추가하지/)
    assert.match(first.deliverable!.instruction, /안내문/)
    assert.match(first.deliverable!.instruction, /응답하지 않을 권리/)
    assert.match(first.deliverable!.instruction, /조사 주체.*조사 기간.*만들지/)
    assert.doesNotMatch(first.deliverable!.instruction, /핵심 메시지.*작성|문단별 개요.*작성|홍보.*작성해|대본.*작성해/)
    assert.equal(first.deliverable!.unresolved.length, 0)
    for (const condition of text.split('\n').filter(line => /^\d\./.test(line))) assert.ok(first.text.includes(condition), condition)
    assert.ok(analyzeRequirements(r).required.includes('surveyDraft'))
  })
}

test('recognizes a short survey without adding promotional or script stages', () => {
  const r = request('설문 문항을 작성해줘')
  assert.deepEqual(buildGuideBundle(r, emptySelection).steps.map(stage => stage.deliverable?.kind), ['survey_final'])
  assert.ok(analyzeRequirements(request('설문지를 만들어줘')).works.some(work => work.category === 'writing'))
})

test('keeps a planning-only request free of a final-questionnaire instruction', () => {
  const bundle = buildGuideBundle(request('대학생 AI 활용 설문지 기획안만 작성해줘'), emptySelection)
  assert.equal(bundle.steps.length, 1)
  assert.equal(bundle.steps[0].deliverable?.kind, 'survey_plan')
  assert.doesNotMatch(bundle.steps[0].deliverable!.instruction, /Q1부터|완성된 설문지를 작성/)
})

test('explicit output format outranks inferred survey completion without adding unrelated outputs', () => {
  const r = { ...request(surveyRequest), overrides: { format: '설문 설계안' } }
  const bundle = buildGuideBundle(r, emptySelection)
  assert.equal(bundle.main.deliverable?.kind, 'survey_plan')
  assert.deepEqual(bundle.steps.map(stage => stage.deliverable?.kind), ['survey_plan'])
  assert.match(bundle.steps[0].text, /원문보다 우선/)
  assert.doesNotMatch(bundle.steps[0].deliverable!.instruction, /Q1부터/)
})

test('an explicit typed output outranks automatic classification', () => {
  const r: PromptRequest = { ...request('홍보 글을 만들어줘'), deliverableKind: 'email_final' }
  assert.equal(buildPromptBundle(r).main.deliverable?.kind, 'email_final')
  assert.equal(buildGuideBundle(r, emptySelection).steps[0].deliverable?.kind, 'email_final')
})

test('separates questionnaire and promotion contracts and carries only reviewed survey facts forward', () => {
  const stages = buildGuideBundle(request('AI 활용 실태 설문지를 만들고 참여 홍보 글도 작성해줘.'), emptySelection).steps
  assert.deepEqual(stages.map(stage => stage.deliverable?.kind), ['survey_final', 'promotion_final'])
  assert.equal(new Set(stages.map(stage => stage.id)).size, 2)
  assert.doesNotMatch(stages[0].deliverable!.instruction, /홍보.*작성해|대본.*작성해/)
  assert.doesNotMatch(stages[1].deliverable!.instruction, /설문.*문항.*작성해|설문지를.*작성해/)
  assert.ok(stages[1].inputs.some(input => /설문/.test(input)))
  assert.ok(stages[0].handoff.some(item => /확인.*설문|검토.*설문/.test(item)))
})

test('two planning outputs have distinct stage IDs so their editable drafts cannot overwrite each other', () => {
  const stages=buildGuideBundle(request('보고서 목차와 발표 개요를 만들어줘'),emptySelection).steps
  assert.deepEqual(stages.map(stage=>stage.deliverable?.kind),['report_outline','presentation_outline'])
  assert.equal(new Set(stages.map(stage=>stage.id)).size,2)
  const drafts=syncDrafts({},stages,'context')
  drafts[stages[0].id]=editDraft(drafts[stages[0].id],'직접 편집한 목차')
  assert.notEqual(drafts[stages[1].id].text,'직접 편집한 목차')
})

test('separates paper analysis and the actual presentation script', () => {
  const stages = buildGuideBundle(request('PDF 논문을 분석하고 5분 발표 대본을 작성해줘'), emptySelection).steps
  const analysis = stages.find(stage => stage.workId === 'analysis')!
  const script = stages.find(stage => stage.deliverable?.kind === 'presentation_script')!
  assert.ok(analysis && script)
  assert.doesNotMatch(analysis.deliverable!.instruction, /대본.*작성해/)
  assert.match(script.deliverable!.instruction, /실제.*대본/)
  assert.doesNotMatch(script.deliverable!.instruction, /논문을.*분석해/)
  assert.ok(script.inputs.some(input => /앞 단계/.test(input)))
})

test('survey promotion and survey-result analysis are not questionnaire requests', () => {
  for (const text of ['설문 홍보 문구를 만들어줘', '기존 XLSX 설문 결과를 분석해줘']) {
    const stages = buildGuideBundle(request(text), emptySelection).steps
    assert.ok(!stages.some(stage => stage.deliverable?.kind === 'survey_final'))
  }
})

test('negated additional outputs do not create unsolicited stages', () => {
  const stages = buildGuideBundle(request('설문지를 작성해줘. 홍보 글과 발표 대본은 만들지 마세요.'), emptySelection).steps
  assert.deepEqual(stages.map(stage => stage.deliverable?.kind), ['survey_final'])
})

test('same-sentence negation retains the requested questionnaire and excludes promotion', () => {
  const stages=buildGuideBundle(request('설문지를 작성하고 홍보 글은 만들지 마세요.'),emptySelection).steps
  assert.deepEqual(stages.map(stage=>stage.deliverable?.kind),['survey_final'])
})

test('a per-type count is not mistaken for the total number of questions', () => {
  const stage=buildGuideBundle(request('객관식 7문항과 주관식 1문항으로 AI 활용 설문지를 작성해줘'),emptySelection).steps[0]
  assert.doesNotMatch(stage.deliverable!.instruction,/Q1부터 Q7/)
  assert.match(stage.deliverable!.instruction,/객관식 7문항/)
  assert.match(stage.deliverable!.instruction,/주관식 1문항/)
})

test('conflicting counts request essential clarification rather than ordering an impossible questionnaire', () => {
  const stage=buildGuideBundle(request('AI 활용 설문지를 총 10문항, 객관식 8개, 5점 척도 2개, 주관식 1개로 작성해줘'),emptySelection).steps[0]
  assert.equal(stage.deliverable!.unresolved.length,1)
  assert.doesNotMatch(stage.deliverable!.instruction,/Q1부터 Q10/)
  assert.match(stage.deliverable!.instruction,/합계.*확인/)
})

test('analysis has no script format or final speech length as an active output condition', () => {
  const stage=buildGuideBundle(request('PDF 논문을 분석하고 5분 발표 대본을 작성해줘'),emptySelection).steps.find(stage=>stage.workId==='analysis')!
  const active=stage.text.split('</원문>')[1]
  assert.doesNotMatch(active,/결과 형식: 발표 대본|분량: 5분|대본을 작성해/)
})

test('manually selected work categories remain usable without an inferred matching noun', () => {
  const coding=buildGuideBundle({...request('이 작업을 도와줘'),tasks:['coding']},emptySelection)
  assert.ok(coding.steps.some(stage=>stage.deliverable?.kind==='code_fix'))
  const writing=buildGuideBundle({...request('이미지를 생성해줘'),tasks:['writing']},emptySelection)
  assert.ok(writing.steps.length>0)
})

test('a promotion planning-only request does not force a finished advertisement', () => {
  const stage=buildGuideBundle(request('설문 참여 홍보 글 기획안만 작성해줘'),emptySelection).steps[0]
  assert.equal(stage.deliverable?.kind,'general_plan')
  assert.doesNotMatch(stage.deliverable!.instruction,/실제로 배포할 홍보.*작성/)
})

test('using a supplied survey plan as input still requests the finished questionnaire', () => {
  const stage=buildGuideBundle(request('설문지 기획안을 바탕으로 실제 설문지를 작성해줘'),emptySelection).steps[0]
  assert.equal(stage.deliverable?.kind,'survey_final')
})

test('optional paper-presentation templates also carry one scoped output contract', () => {
  const bundle=buildPromptBundle(request('논문을 분석해서 발표 이미지와 대본을 만들어줘'))
  for(const stage of bundle.steps)assert.ok(stage.deliverable,stage.id)
  const analysis=bundle.steps.find(stage=>stage.id==='analysis')!
  const active=analysis.text.split('</원문>')[1]
  assert.ok(active)
  assert.doesNotMatch(active,/대본을 작성해|실제 이미지를.*제작해/)
})

test('a bare explicit outline or plan format overrides inferred questionnaire completion', () => {
  for(const format of ['개요','기획안']){
    const stage=buildGuideBundle({...request('설문지를 작성해줘'),overrides:{format}},emptySelection).steps[0]
    assert.equal(stage.deliverable?.kind,'survey_plan')
    assert.doesNotMatch(stage.deliverable!.instruction,/완성된 설문 문항/)
  }
})

test('a promotion-specific length is not imposed on a questionnaire in the same writing category', () => {
  const stages=buildGuideBundle(request('설문지를 만들고 200자 홍보 글을 작성해줘'),emptySelection).steps
  assert.doesNotMatch(stages[0].text.split('</원문>')[1],/분량: 200자/)
  assert.match(stages[1].text.split('</원문>')[1],/분량: 200자/)
})

test('analysing existing survey questions does not request a new questionnaire', () => {
  const stages=buildGuideBundle(request('설문지 문항을 분석하고 개선점을 알려줘.'),emptySelection).steps
  assert.ok(stages.some(stage=>stage.deliverable?.kind==='analysis'))
  assert.ok(!stages.some(stage=>stage.deliverable?.kind==='survey_final'))
  assert.ok(!stages.some(stage=>stage.id==='statistics'))
})

test('ordinary negative forms exclude promotional and report outputs without discarding the positive request', () => {
  assert.deepEqual(buildGuideBundle(request('설문지를 작성해줘. 홍보 글은 필요하지 않아.'),emptySelection).steps.map(stage=>stage.deliverable?.kind),['survey_final'])
  assert.deepEqual(buildGuideBundle(request('보고서는 작성하지 말고 이메일만 작성해줘.'),emptySelection).steps.map(stage=>stage.deliverable?.kind),['email_final'])
  assert.ok(buildGuideBundle(request('기존 설문지를 3문장으로 요약해줘.'),emptySelection).steps.every(stage=>stage.deliverable?.kind==='analysis'))
})

test('explicit final format preserves PDF analysis prerequisites and handoff', () => {
  const base=request('첨부 PDF 논문을 분석하고 5분 발표 대본을 작성해줘')
  const r={...base,overrides:{format:'발표 대본'}}
  assert.deepEqual(analyzeRequirements(r).required,analyzeRequirements(base).required)
  const stages=buildGuideBundle(r,emptySelection).steps
  assert.ok(stages.some(stage=>stage.workId==='analysis'))
  assert.ok(stages.find(stage=>stage.deliverable?.kind==='presentation_script')!.inputs.some(input=>/앞 단계/.test(input)))
})

test('an explicit report outline also overrides the special survey-statistics report template', () => {
  const r={...request('XLSX 설문 결과를 분석해서 보고서를 작성해줘'),overrides:{format:'보고서 목차'}}
  const stages=buildGuideBundle(r,emptySelection).steps
  assert.ok(stages.some(stage=>stage.id==='statistics'))
  assert.ok(stages.some(stage=>stage.deliverable?.kind==='report_outline'))
  assert.ok(!stages.some(stage=>stage.deliverable?.kind==='report_final'))
})

test('an explicit explanation clause cannot reactivate other outputs outside the source block', () => {
  const stages=buildGuideBundle(request('PDF 논문을 분석하고 5분 발표 대본을 작성해줘. 분석 방법도 설명해줘.'),emptySelection).steps
  const analysis=stages.find(stage=>stage.workId==='analysis')!
  const active=analysis.text.split('</원문>')[1]
  assert.doesNotMatch(active,/대본을 작성해/)
  assert.match(active,/분석 방법도 설명해/)
  assert.ok(!stages.find(stage=>stage.deliverable?.kind==='presentation_script')!.deliverable!.extras.some(extra=>/분석 방법/.test(extra)))
})

test('does not invent a question count, institution, period or privacy promise for an underspecified survey', () => {
  const stage = buildGuideBundle(request('대학생의 AI 활용 설문지를 작성해줘'), emptySelection).steps[0]
  assert.doesNotMatch(stage.deliverable!.instruction, /Q1부터 Q10|객관식 7문항|경희대학교|2026년|익명성이 보장|즉시 파기/)
  assert.match(stage.deliverable!.instruction, /필수적이지 않은.*질문.*중단하지/)
})

test('preserves the exact output contract across real Provider choices and does not replace edited drafts', () => {
  const r = request(surveyRequest), comparison = compareCandidates(r)
  const first = buildGuideBundle(r, emptySelection).steps[0]
  const options = stageOptions(comparison, first)
  let previousText = ''
  let drafts = syncDrafts({}, [first], guideContext(first))
  drafts[first.id] = editDraft(drafts[first.id], '사용자 편집\n  공백 유지')
  for (const provider of ['openai', 'anthropic', 'google', 'xai']) {
    const chosen = options.find(option => option.provider.id === provider)!
    assert.ok(chosen, provider)
    const bundle = buildGuideBundle(r, { default: chosen.id, byStage: {} }), stage = bundle.steps[0]
    assert.equal(stage.deliverable?.kind, 'survey_final')
    if (previousText) assert.equal(stage.text, previousText)
    previousText = stage.text
    drafts = syncDrafts(drafts, bundle.steps, bundle.context)
    assert.equal(drafts[first.id].text, '사용자 편집\n  공백 유지')
  }
  const regenerated = regenerateDraft(drafts[first.id], first.text, 'new-context')
  assert.equal(restoreDraft(regenerated).text, '사용자 편집\n  공백 유지')
})
