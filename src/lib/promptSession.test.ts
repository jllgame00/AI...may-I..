import { it } from 'node:test'
import assert from 'node:assert/strict'
import { editDraft, regenerateDraft, restoreDraft, copyText, placeholders, syncDrafts, availableScreen } from './promptSession.ts'

it('preserves edited drafts when conditions change and supports restoring the previous version', () => {
  let drafts = syncDrafts({},[{ id: 'main', text: '처음 초안' }],'context-1')
  drafts.main = editDraft(drafts.main,'사용자가 편집한 내용')
  drafts = syncDrafts(drafts,[{ id: 'main', text: '새 조건 초안' }],'context-2')
  assert.equal(drafts.main.text,'사용자가 편집한 내용')
  assert.equal(drafts.main.context,'context-1')
  const next = regenerateDraft(drafts.main,'새 조건 초안','context-2')
  assert.equal(restoreDraft(next).text,'사용자가 편집한 내용')
})
it('keeps separate staged edits and adds new stages without overwriting existing ones', () => {
  const drafts = syncDrafts({},[{ id: 'main', text: '기본' },{ id: 'analysis', text: '분석' }],'a')
  drafts.analysis = editDraft(drafts.analysis,'분석 직접 수정')
  const next = syncDrafts(drafts,[{ id: 'main', text: '변경' },{ id: 'analysis', text: '변경 분석' },{ id: 'image', text: '이미지' }],'b')
  assert.equal(next.main.text,'기본'); assert.equal(next.analysis.text,'분석 직접 수정'); assert.equal(next.image.text,'이미지')
})
it('reports actual copy failure and success and handles arbitrary missing placeholders', async () => {
  assert.equal(await copyText('문장', async () => { throw new Error('denied') }),false)
  let copied = ''; assert.equal(await copyText('문장',async text => { copied = text }),true)
  assert.equal(copied,'문장')
  assert.deepEqual(placeholders('[대상 독자]와 [자료]를 확인. [자료]'),['[대상 독자]','[자료]'])
})
it('keeps cold result and question links at input even after the user starts typing', () => {
  assert.equal(availableScreen('result',false,true,0),'start')
  assert.equal(availableScreen('questions',false,true,0),'start')
  assert.equal(availableScreen('result',true,true,0),'result')
})
