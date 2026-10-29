import { it } from 'node:test'
import assert from 'node:assert/strict'
import { extractConditions, resolveConditions, questionsFor, skipQuestions, buildPromptBundle } from './promptEngine.ts'

it('extracts supplied readers, purpose, format, length and tone without repeating questions', () => {
  const request = { text: '대학생 대상 수업 발표용으로 PDF 논문을 요약해서 5분 발표 대본을 쉽게 작성해줘.', overrides: {} }
  const c = extractConditions(request.text)
  assert.equal(c.audience,'대학생'); assert.equal(c.length,'5분'); assert.equal(c.format,'발표 대본'); assert.equal(c.tone,'쉽게')
  assert.deepEqual(questionsFor(request),[])
})
it('asks at most three missing prompt conditions without asking about products or costs', () => {
  const q = questionsFor({ text: '도와줘', overrides: {} })
  assert.ok(q.length > 0 && q.length <= 3)
  assert.ok(q.every(field => ['purpose','audience','format','length','tone','constraints'].includes(field)))
})
it('keeps explicit edits and skipped unknown values ahead of inference', () => {
  const request = { text: '대학생에게 5분 발표 대본', overrides: { audience: '초보 직장인', length: '' } }
  assert.equal(resolveConditions(request).audience.value,'초보 직장인')
  assert.equal(resolveConditions(request).length.value,'')
  const skipped = skipQuestions({ text: '도와줘', overrides: {} },['purpose','format','length'])
  assert.deepEqual(questionsFor(skipped),[])
  assert.match(buildPromptBundle(skipped).main.text,/\[사용 목적을 입력하세요\]/)
})
it('builds a compact usable email prompt with no model selection or invented details', () => {
  const b = buildPromptBundle({ text: '고객에게 정중한 환영 이메일을 3문장으로 써줘.', overrides: {} })
  assert.match(b.main.text,/고객/); assert.match(b.main.text,/3문장/); assert.match(b.main.text,/정중/)
  assert.equal(b.steps.length,0)
  assert.ok(b.main.text.length < 700)
  assert.doesNotMatch(b.main.text,/ChatGPT|Claude|Gemini|구독|플랜|최고 모델|특정 모델/)
  assert.doesNotMatch(b.main.text,/20대|대표이사|5문장/)
})
it('does not pretend to have read missing source material', () => {
  const b = buildPromptBundle({ text: '첨부한 논문을 요약해줘', overrides: {} })
  assert.match(b.main.text,/\[.*자료.*\]/)
  assert.match(b.main.text,/자료가 없으면/)
  assert.doesNotMatch(b.main.text,/자료를 분석했습니다|논문을 읽었습니다/)
})
it('offers optional staged prompts only when distinct outputs need handoff', () => {
  const b = buildPromptBundle({ text: '논문을 분석해서 발표 이미지와 대본을 만들어줘', overrides: {} })
  assert.deepEqual(b.steps.map(s => s.id),['analysis','outline','image','script'])
  assert.match(b.steps[2].text,/실제 이미지/)
  assert.match(b.steps[2].text,/\[앞 단계.*\]/)
  assert.match(b.steps[3].text,/출처/)
  assert.equal(buildPromptBundle({ text: '회의록을 요약해줘', overrides: {} }).steps.length,0)
})
it('preserves source text as text and rejects empty or excessive requests', () => {
  assert.throws(() => buildPromptBundle({ text: ' ', overrides: {} }))
  assert.throws(() => buildPromptBundle({ text: '가'.repeat(4001), overrides: {} }))
  const text = '<script>alert(1)</script> 문장을 다듬어줘'
  assert.ok(buildPromptBundle({ text, overrides: {} }).main.text.includes(text))
})
it('reflects every supplied condition and preserves prohibitions', () => {
  const b = buildPromptBundle({ text: '보고서 초안을 작성해줘', overrides: { purpose: '동아리 활동 공유', audience: '신입 부원', format: '표', length: '500자', tone: '차분하게', constraints: '개인 이름은 포함하지 마세요' } })
  for (const value of ['동아리 활동 공유','신입 부원','표','500자','차분하게','개인 이름은 포함하지 마세요']) assert.ok(b.main.text.includes(value))
})
it('makes edited conditions explicitly override conflicting original wording', () => {
  const b = buildPromptBundle({ text: '대학생에게 5분 발표 대본', overrides: { audience: '초등학생', length: '3분' } })
  assert.match(b.main.text,/원래 요청보다 우선/)
  assert.match(b.main.text,/초등학생/); assert.match(b.main.text,/3분/)
})
it('prefers explicitly requested output over incidental or negated source formats', () => {
  assert.equal(extractConditions('이메일 내용을 표로 요약해줘').format,'표')
  assert.equal(extractConditions('이메일이 아닌 표로 정리해줘').format,'표')
})
it('keeps stage outputs distinct from the final deliverable format', () => {
  const b = buildPromptBundle({ text: '논문을 분석해서 5분 발표 대본을 만들어줘', overrides: {} })
  assert.match(b.steps[0].text,/결과 형식:.*표/)
  assert.doesNotMatch(b.steps[0].text,/- 결과 형식: 발표 대본/)
  assert.match(b.steps[1].text,/결과 형식:.*슬라이드/)
})
it('recognizes an announcement as writing and asks about its missing reader', () => {
  assert.deepEqual(questionsFor({ text: '안내문을 작성해줘', overrides: { length: '1문장' } }),['audience','format'])
})
it('does not invent a report reader from the surveyed population',()=>{
  assert.equal(extractConditions('대학생 만족도 설문을 분석해서 보고서를 써줘').audience,'')
  assert.equal(extractConditions('교수에게 대학생 만족도 설문 보고서를 정중하게 작성해줘').audience,'교수')
})
