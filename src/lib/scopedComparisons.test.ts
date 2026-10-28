import { it } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, interpretTask, buildGuideBundle } from './aiGuide.ts'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import { editDraft, syncDrafts } from './promptSession.ts'

it('interprets algorithm, application and repository work without another required input step',()=>{
  for(const [text,intent] of [['알고리즘 문제 풀이','algorithm'],['React 장바구니 기능 구현','application'],['React 기능 구현·오류 수정','repository']]){
    const analysis=interpretTask({text,overrides:{}})
    assert.deepEqual(analysis.tasks,['coding'])
    assert.equal(analysis.codingIntent,intent)
  }
  const changed=compareCandidates({text:'React 기능 구현·오류 수정',codingIntent:'algorithm',overrides:{}})
  assert.equal(changed.decision?.representative?.benchmark,'LiveCodeBench')
})
it('scopes algorithm rankings to the Qwen-published three-model table and audits all registered models',()=>{
  const d=compareCandidates({text:'알고리즘 문제 풀이',overrides:{}}).decision!
  assert.equal(d.representative?.benchmark,'LiveCodeBench')
  assert.equal(d.representative?.period,'2025.02~2025.05')
  assert.equal(d.representative?.publisher,'Qwen')
  assert.equal(d.representative?.modelCount,3)
  assert.equal(d.coverage.length,snapshot.models.length)
  assert.deepEqual(d.entries.map(e=>e.evaluation?.rawScore),[51.8,48.9,45.2])
  for(const id of ['gpt-6-astra','gpt-6.1-sol','gpt-6.1-terra','claude-sonnet-5-5','claude-opus-5-5'])assert.ok(d.coverage.find(c=>c.modelId===id)?.reason)
})
it('chooses repository evidence for React fixes and retains other providers as unranked alternatives',()=>{
  const d=compareCandidates({text:'React 기능 구현·오류 수정',overrides:{}}).decision!
  assert.equal(d.representative?.benchmark,'DeepSWE')
  assert.equal(d.representative?.modelCount,2)
  for(const id of ['gpt-6.1-terra','claude-sonnet-5-5','claude-opus-5-5']){
    const alternative=d.alternatives.find(e=>e.candidate.model?.id===id)
    assert.ok(alternative,id);assert.equal(alternative.rank,null)
  }
  assert.ok(d.groups.some(g=>g.benchmark==='LiveCodeBench'))
  assert.ok(d.groups.some(g=>g.benchmark==='CursorBench'))
  assert.ok(!d.entries.some(e=>e.evaluation?.benchmark==='LiveCodeBench'))
})
it('uses app evidence for app work and enumerates groups before choosing independently of input order',()=>{
  const request={text:'React 장바구니 기능 구현',overrides:{}}
  const before=compareCandidates(request).decision!
  assert.equal(before.representative?.benchmark,'CursorBench')
  const data=structuredClone(snapshot);data.models.reverse();data.evaluations!.reverse();data.mappings.reverse()
  const after=compareCandidates(request,data).decision!
  assert.equal(after.representative?.id,before.representative?.id)
  assert.deepEqual(after.entries.map(e=>e.evaluation?.id),before.entries.map(e=>e.evaluation?.id))
})
it('keeps survey and Korean writing candidates equal even without indirect evidence',()=>{
  for(const text of ['설문 엑셀 분석과 보고서','한국어 홍보 글쓰기','한국어 창작 단편 소설을 써줘']){
    const d=compareCandidates({text,overrides:{}}).decision!
    assert.equal(d.representative,null)
    assert.ok(d.entries.length>3)
    assert.ok(d.entries.every(e=>e.rank===null&&e.equal))
    assert.ok(d.entries.some(e=>!e.evaluation&&e.relevance==='features'))
    assert.ok(d.entries.every(e=>e.evaluation?/→/.test(e.relation):/평가가 미확인/.test(e.relation)))
    assert.ok(d.entries.every(e=>e.evaluation?.domain!=='coding'))
  }
})
it('keeps selected web candidate IDs and edited prompts through scoped evaluation changes',()=>{
  const request={text:'React 기능 구현·오류 수정',overrides:{}}
  const c=compareCandidates(request).recommendations.find(c=>c.model?.id==='gpt-6.1-terra')!
  const selection={default:c.id,byStage:{}}
  const old=buildGuideBundle(request,selection)
  let drafts=syncDrafts({},old.steps,old.context)
  drafts[old.steps[0].id]=editDraft(drafts[old.steps[0].id],'보존할 편집 초안')
  const next=buildGuideBundle({...request,codingIntent:'application'},selection)
  drafts=syncDrafts(drafts,next.steps,next.context)
  assert.equal(drafts[old.steps[0].id].text,'보존할 편집 초안')
  assert.ok(compareCandidates({...request,codingIntent:'application'}).recommendations.some(x=>x.id===c.id))
})
