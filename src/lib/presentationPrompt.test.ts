import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildGuideBundle,stageCandidate} from './aiGuide.ts'
import {compareProviders} from './providerRecommendation.ts'
import {resolveDeliverables} from './deliverables.ts'
import {buildPromptBundle} from './promptEngine.ts'
import {syncDrafts,editDraft,regenerateDraft,restoreDraft} from './promptSession.ts'
import type {PromptRequest,StageSelection} from '../types.ts'
const request=(text:string):PromptRequest=>({text,overrides:{}})
const file=request('인공지능 윤리를 주제로 발표할 PPT 자료를 만들어줘.')
const selected=(r:PromptRequest,plan:string|null)=>{
  const initial=buildGuideBundle(r,{default:null,byStage:{}})
  const byStage=Object.fromEntries(initial.steps.filter(s=>s.workId==='slides').map(s=>[s.id,plan!]))
  const selection:StageSelection={default:plan,byStage:plan?byStage:{}}
  return {selection,bundle:buildGuideBundle(r,selection)}
}
test('confirmed PowerPoint creation requests a downloadable PPTX artifact without an imaginary prior stage',()=>{
  const {selection,bundle}=selected(file,'claude-free'),stage=bundle.steps[0]
  assert.equal(bundle.steps.length,1);assert.equal(stage.deliverable?.kind,'slides')
  const candidate=stageCandidate(selection,stage,compareProviders(file))!
  assert.equal(candidate.checks.find(c=>c.id==='slidesCreation')?.status,'supported')
  assert.equal(stage.deliverable?.artifact?.format,'pptx')
  assert.equal(stage.deliverable?.artifact?.delivery,'downloadable-file')
  assert.match(stage.deliverable!.instruction,/PPTX.*\.pptx/i)
  assert.match(stage.deliverable!.instruction,/파일.*(?:첨부|다운로드)|(?:첨부|다운로드).*파일/)
  assert.match(stage.deliverable!.instruction,/생성하지.*(?:링크|파일)|가짜.*링크/)
  assert.doesNotMatch(stage.text,/앞 단계/);assert.ok(!stage.inputs.some(i=>/앞 단계/.test(i)))
  assert.ok(stage.text.includes(stage.deliverable!.instruction))
})
test('unselected, unknown and excluded presentation paths cannot promise a downloadable file',()=>{
  for(const plan of [null,'gemini-free','grok-unreviewed','invalid-plan']){
    const stage=selected(file,plan).bundle.steps[0]
    assert.equal(stage.deliverable?.artifact?.format,'pptx')
    assert.equal(stage.deliverable?.artifact?.delivery,'capability-check',String(plan))
    assert.match(stage.deliverable!.instruction,/지원 여부.*먼저.*확인/)
    assert.match(stage.deliverable!.instruction,/확인 전.*(?:생성|다운로드)/)
    assert.doesNotMatch(stage.text,/앞 단계/)
  }
  const free=request('무료로 PPTX 파일을 만들어줘')
  assert.equal(selected(free,'claude-pro').bundle.steps[0].deliverable?.artifact?.delivery,'capability-check')
  assert.equal(buildPromptBundle(file).main.deliverable?.artifact?.delivery,'capability-check')
})
test('only a real prior work stage supplies handoff material to the PPTX instruction',()=>{
  const r=request('PDF 논문을 분석하고 PPTX 파일을 만들어줘'),stage=selected(r,'claude-free').bundle.steps.find(s=>s.workId==='slides')!
  assert.equal(stage.deliverable?.artifact?.delivery,'downloadable-file')
  assert.ok(stage.inputs.some(i=>/앞 단계.*자료 분석/.test(i)))
  assert.match(stage.deliverable!.instruction,/직접 검토한/)
  assert.match(stage.text,/전달하지 않은.*결과.*가정하지/)
})
test('presentation plans and slide text are inline artifacts without a forced file request',()=>{
  for(const [text,kind] of [['PPT 개요를 만들어줘','presentation_outline'],['발표자료를 기획해줘','presentation_outline'],['슬라이드별 내용만 작성해줘','presentation_content'],['PPT 내용을 텍스트로 작성해줘','presentation_content'],['프레젠테이션 내용을 텍스트로 작성해줘','presentation_content'],['파워포인트 본문만 작성해줘','presentation_content']] as const){
    const r=request(text),result=compareProviders(r),bundle=selected(r,'claude-free').bundle
    assert.deepEqual(resolveDeliverables(r).map(d=>d.kind),[kind],text)
    assert.deepEqual(result.requirements.required,['textGeneration'],text)
    const stage=bundle.steps[0]
    assert.equal(stage.deliverable?.artifact?.format,'text',text)
    assert.equal(stage.deliverable?.artifact?.delivery,'inline-text',text)
    assert.doesNotMatch(stage.text,/앞 단계/)
    assert.doesNotMatch(stage.deliverable!.instruction,/다운로드 가능한.*파일.*제공|PPTX.*생성해/)
  }
})
test('explicit output format wins and a requested final file is not erased by its slide content',()=>{
  const r={...request('PPT 내용을 텍스트로 작성해줘'),overrides:{format:'PPTX 파일'}}
  assert.deepEqual(resolveDeliverables(r).map(d=>d.kind),['slides'])
  assert.equal(selected(r,'claude-free').bundle.steps[0].deliverable?.artifact?.delivery,'downloadable-file')
  const mixed=request('슬라이드 내용을 작성하고 실제 PPTX 파일도 만들어줘')
  assert.ok(resolveDeliverables(mixed).some(d=>d.kind==='slides'))
  assert.ok(compareProviders(mixed).requirements.required.includes('slidesCreation'))
  const stages=selected(mixed,'claude-free').bundle.steps
  assert.deepEqual(stages.map(s=>s.deliverable?.kind),['presentation_content','slides'])
  assert.ok(stages[1].inputs.some(i=>/앞 단계.*슬라이드별 내용/.test(i)))
  assert.ok(!stages[0].inputs.some(i=>/앞 단계/.test(i)))
  for(const text of ['슬라이드 내용을 작성한 뒤 PPTX 파일로 만들어줘','PPT 내용을 채워서 발표자료를 만들어줘']){
    const final=request(text)
    assert.deepEqual(resolveDeliverables(final).map(d=>d.kind),['slides'],text)
    assert.ok(compareProviders(final).requirements.required.includes('slidesCreation'))
    assert.equal(selected(final,'claude-free').bundle.steps[0].deliverable?.artifact?.delivery,'downloadable-file')
  }
})
test('a provider switch preserves the edited draft and explicit regeneration adopts the new file capability gate',()=>{
  const supported=selected(file,'claude-free').bundle.steps[0],pending=selected(file,'gemini-free').bundle.steps[0]
  const drafts=syncDrafts({},[supported],'supported')
  drafts[supported.id]=editDraft(drafts[supported.id],'사용자가 직접 편집한 발표 요청')
  const switched=syncDrafts(drafts,[pending],'pending')[pending.id]
  assert.equal(switched.text,'사용자가 직접 편집한 발표 요청')
  const regenerated=regenerateDraft(switched,pending.text,'pending')
  assert.equal(regenerated.text,pending.text)
  assert.equal(pending.deliverable?.artifact?.delivery,'capability-check')
  assert.equal(restoreDraft(regenerated).text,'사용자가 직접 편집한 발표 요청')
})
test('the survey report workflow keeps requested slide text before the final PPTX handoff',()=>{
  const r=request('설문 결과를 분석하고 보고서를 작성하고 슬라이드 내용을 작성하고 PPTX 파일을 만들어줘')
  const stages=selected(r,'claude-free').bundle.steps
  assert.ok(stages.some(s=>s.id==='statistics'));assert.ok(stages.some(s=>s.id==='report'));assert.ok(stages.some(s=>s.id==='review'))
  const content=stages.findIndex(s=>s.deliverable?.kind==='presentation_content'),file=stages.findIndex(s=>s.deliverable?.kind==='slides')
  assert.ok(content>=0);assert.ok(file>content)
  assert.ok(stages[file].inputs.some(i=>/슬라이드별 내용/.test(i)))
  assert.equal(stages.filter(s=>s.deliverable?.kind==='report_final').length,1)
})
