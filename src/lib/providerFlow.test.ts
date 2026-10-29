import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareCandidates, buildGuideBundle, stageOptions, stageCandidate, selectForStages, selectForWork, updateGuideRequest, guideContext } from './aiGuide.ts'
import { editDraft, syncDrafts } from './promptSession.ts'
import type { Session } from '../types.ts'
test('composite stages use work-specific services and preserve selection and drafts when a company changes',()=>{
  const request={text:'기존 XLSX 설문 결과를 분석하고 발표자료를 만들고 발표 대본을 작성해줘',overrides:{}}
  const comparison=compareCandidates(request),selection={default:null,byStage:{}}
  const bundle=buildGuideBundle(request,selection)
  assert.ok(bundle.steps.some(s=>s.workId==='slides'))
  const slide=bundle.steps.find(s=>s.workId==='slides')!,options=stageOptions(comparison,slide)
  assert.ok(options.length>0)
  const chosen=selectForStages(selection,slide.id,options[0].id)
  assert.equal(stageCandidate(chosen,slide,comparison)?.id,options[0].id)
  const drafts=syncDrafts({},bundle.steps,bundle.context)
  drafts[slide.id]=editDraft(drafts[slide.id],'사용자 편집 초안')
  const session:Session={request,bundle,drafts,checks:{},comparison,selection:chosen}
  const changed=updateGuideRequest(session,{...request,budget:{freeOnly:true,maxMonthly:null,currency:null,country:null}})
  assert.equal(changed.drafts[slide.id].text,'사용자 편집 초안')
  assert.equal(changed.selection?.byStage[slide.id],options[0].id)
  const newBundle=buildGuideBundle(request,chosen)
  assert.notEqual(guideContext(slide,bundle.context),guideContext(slide,newBundle.context))
  assert.ok(newBundle.steps.every(s=>s.text.includes(request.text)))
})
test('a chosen service is never silently substituted in an incompatible stage',()=>{
  const request={text:'이미지를 생성하고 발표 대본을 작성해줘',overrides:{}},comparison=compareCandidates(request),bundle=buildGuideBundle(request,{default:null,byStage:{}})
  const image=bundle.steps.find(s=>s.workId==='image')!,writing=bundle.steps.find(s=>s.workId==='writing')!
  const option=stageOptions(comparison,image).find(p=>p.provider.id==='adobe')!
  assert.ok(option)
  assert.equal(stageCandidate({default:option.id,byStage:{}},writing,comparison),null)
})
test('changing a work company preserves other work choices and applies to every stage of this work',()=>{
  const request={text:'이미지 생성과 발표자료 제작과 발표 대본 작성',overrides:{}},bundle=buildGuideBundle(request,{default:null,byStage:{}})
  const previous={default:'chatgpt-free',byStage:Object.fromEntries(bundle.steps.map(s=>[s.id,s.workId==='image'?'firefly-standard':'chatgpt-free']))}
  const next=selectForWork(previous,bundle.steps,'slides','claude-free')
  for(const s of bundle.steps)assert.equal(next.byStage[s.id],s.workId==='slides'?'claude-free':previous.byStage[s.id])
})
