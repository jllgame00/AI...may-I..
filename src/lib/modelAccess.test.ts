import { referenceComparison as compareCandidates } from './fixtures/catalog.ts'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSnapshot as data } from '../data/recommendationSnapshot.ts'
import { buildGuideBundle, executionRoutes, guideContext } from './aiGuide.ts'
import { accessOptions, accessCategory, primaryAccessCandidates } from './modelAccess.ts'
import { syncDrafts, editDraft } from './promptSession.ts'
import eastern from '../data/research/eastern-access.json' with {type:'json'}

it('preserves 25 exact releases and 107 original observations while reviewing all 15 installable checkpoints',()=>{
  assert.ok(data.models.length>=25)
  assert.equal(data.evaluations!.filter(e=>!e.id.startsWith('qwen-table-')).length,107)
  assert.equal(data.evaluations!.length,111)
  const models=data.models.filter(m=>m.route?.kind==='self-hosted'&&!/^[a-f0-9]{40}$/.test(m.version))
  assert.equal(models.length,15)
  for(const m of models){
    const options=accessOptions(m)
    assert.ok(options.some(r=>r.kind==='self-hosted'&&r.exactVersion==='confirmed'))
    assert.ok(options.some(r=>r.kind==='web'&&r.exactVersion!=='confirmed')||m.provider==='Mistral AI')
  }
})
it('does not turn same-provider current chat or retired APIs into exact-version access',()=>{
  for(const m of data.models.filter(m=>m.route?.kind==='self-hosted')){
    for(const r of accessOptions({...m,version:'different-release'}))assert.notEqual(r.exactVersion,'confirmed')
  }
  const request={text:'코드 오류 수정',tasks:['coding' as const],overrides:{}}
  const cs=compareCandidates(request).recommendations
  const primary=primaryAccessCandidates(cs)
  assert.equal(primary.length,data.models.length)
  assert.ok(primary.some(c=>accessCategory(c)==='web'))
  assert.ok(primary.filter(c=>accessCategory(c)==='web').every(c=>c.mapping.status==='confirmed'&&!c.configuration))
  assert.ok(!cs.some(c=>c.mapping.hostedModelId==='mistral-small-2503'))
})
it('reads access options without mutating source manifests or multiplying route IDs',()=>{
  const before=JSON.stringify(eastern)
  for(const m of data.models){accessOptions(m);const routes=accessOptions(m);assert.equal(routes.length,new Set(routes.map(r=>r.id)).size)}
  assert.equal(JSON.stringify(eastern),before)
})
it('retains hosted IDs and installation facts as references, never serializing them into copied tasks',()=>{
 const request={text:'코드 오류 수정',tasks:['coding' as const],overrides:{}}
 const cs=compareCandidates(request).recommendations
 const c=cs.find(c=>c.model?.id==='Qwen/Qwen3-235B-A22B-Instruct-2507'&&c.mapping.routeKind==='api'&&!c.configuration)!
 assert.equal(c.mapping.hostedModelId,'qwen/qwen3-235b-a22b-2507')
 assert.equal(executionRoutes(c)[0].url,c.mapping.url)
 assert.ok(cs.some(i=>i.model?.id===c.model!.id&&i.mapping.routeKind==='self-hosted'))
 const first=buildGuideBundle(request,{default:c.id,byStage:{}}).steps[0]
 assert.doesNotMatch(first.text,/qwen\/qwen|가중치|직접 설치/)
 const drafts=syncDrafts({},[first],guideContext(first));drafts[first.id]=editDraft(drafts[first.id],'편집 초안')
 assert.equal(drafts[first.id].text,'편집 초안')
})
