import {it} from 'node:test'
import assert from 'node:assert/strict'
import {reviewAAResponse,authorizeAAPublication,publicAAObservations,AA_ENDPOINT} from './aaSnapshot.ts'
import {recommendationSnapshot as data} from '../data/recommendationSnapshot.ts'

// Synthetic transport fixtures, never live AA observations or public data.
const envelope={endpoint:AA_ENDPOINT,fetchedAt:'2026-10-28T00:00:00Z',payload:{status:200,data:[{id:'fixture-stable-aa-id',name:'fixture label',model_creator:{id:'fixture-creator'},evaluations:{artificial_analysis_intelligence_index:42,gpqa:null}}]}}
const definition={field:'artificial_analysis_intelligence_index',benchmark:'Artificial Analysis Intelligence Index',benchmarkVersion:'fixture-v1',domain:'general',unit:'index points',higherIsBetter:true,scope:'synthetic composite scope',components:['fixture component'],versionSource:'https://artificialanalysis.ai/methodology/intelligence-benchmarking'}
const review={mappings:[{aaId:'fixture-stable-aa-id',creatorId:'fixture-creator',modelId:'gpt-6.1-sol',modelVersion:'6.1',effort:'medium',identitySource:'https://artificialanalysis.ai/models/fixture'}],definitions:[definition]}
it('maps reviewed stable AA and creator IDs to an exact catalog release and keeps raw composite scores',()=>{
  const r=reviewAAResponse(envelope,review,data.models)
  assert.equal(r.observations.length,1);assert.equal(r.observations[0].rawScore,42)
  assert.equal(r.observations[0].benchmarkVersion,'fixture-v1')
  assert.equal(r.observations[0].index?.components[0],'fixture component')
  assert.equal(r.observations[0].kind,'independent')
})
it('rejects unknown releases, creator mismatches, missing versions and API example substitution',()=>{
  for(const patch of [{modelVersion:'next'},{creatorId:'wrong'},{modelId:'unregistered'}]){
    const changed=structuredClone(review);Object.assign(changed.mappings[0],patch)
    assert.equal(reviewAAResponse(envelope,changed,data.models).observations.length,0)
  }
  assert.equal(reviewAAResponse(envelope,{...review,definitions:[{...definition,benchmarkVersion:''}]},data.models).observations.length,0)
  assert.throws(()=>reviewAAResponse({...envelope,endpoint:'https://artificialanalysis.ai/api-reference'},review,data.models))
})
it('never coerces null, NaN, strings, or missing AA scores to zero and never substitutes the Coding Agent Index',()=>{
  for(const value of [null,NaN,'42',undefined]){
    const e=structuredClone(envelope);Object.assign(e.payload.data[0].evaluations,{artificial_analysis_intelligence_index:value})
    assert.equal(reviewAAResponse(e,review,data.models).observations.length,0)
  }
  assert.equal(reviewAAResponse(envelope,{...review,definitions:[{...definition,field:'artificial_analysis_coding_agent_index'}]},data.models).observations.length,0)
})
it('allows local validation independently of public permission and requires the specific publication scopes',()=>{
  const r=reviewAAResponse(envelope,review,data.models)
  assert.equal(r.observations.length,1)
  assert.throws(()=>authorizeAAPublication(r,null))
  assert.throws(()=>authorizeAAPublication(r,{attribution:true,reference:'API account'}))
  const rights={modelSelectionGuidance:true,structuredPublicDisplay:true,reference:'synthetic written grant reference',reviewedAt:'2026-10-28',expiresAt:'2027-01-01'}
  const snapshot=authorizeAAPublication(r,rights,'2026-10-28')
  assert.equal(snapshot.observations.length,1)
  assert.throws(()=>authorizeAAPublication(r,rights,'2027-02-01'))
  assert.equal(snapshot.attribution,'Source: Artificial Analysis (artificialanalysis.ai)')
})
it('revalidates public file dates, model modes, official index definition and authorization reference',()=>{
  const rights={modelSelectionGuidance:true,structuredPublicDisplay:true,reference:'public grant tracking reference',reviewedAt:'2026-10-28',expiresAt:'2027-01-01'}
  const valid=authorizeAAPublication(reviewAAResponse(envelope,review,data.models),rights,'2026-10-28')
  assert.equal(publicAAObservations(valid,data.models,'2026-10-28').length,1)
  for(const edit of [
    (s:typeof valid)=>{s.authorization.expiresAt='not-a-date'},
    (s:typeof valid)=>{s.observations[0].effort='unsupported-mode'},
    (s:typeof valid)=>{s.observations[0].benchmark='Coding Agent Index'},
    (s:typeof valid)=>{s.observations[0].benchmarkVersion='made-up-v999'},
    (s:typeof valid)=>{s.observations[0].source.checkedAt='invalid'},
    (s:typeof valid)=>{const e=s.observations[0];Object.assign(e.aa!,{capturedAt:2026});e.id=`aa:${e.aa!.apiModelId}:${e.aa!.field}:${e.aa!.benchmarkVersion}:2026`},
  ]){const s=structuredClone(valid);edit(s);assert.equal(publicAAObservations(s,data.models,'2026-10-28').length,0)}
  const mixed=structuredClone(valid);mixed.observations.push({...mixed.observations[0],effort:'bad'},structuredClone(mixed.observations[0]))
  assert.equal(publicAAObservations(mixed,data.models,'2026-10-28').length,1)
  assert.equal(valid.authorization.reference,rights.reference)
})
it('quarantines one incomplete mapping without blocking other verified observations',()=>{
  const source=structuredClone(envelope)
  source.payload.data.push({...source.payload.data[0],id:'second-unverified-id',model_creator:{id:'unexpected-creator'}})
  const checked=reviewAAResponse(source,{...review,mappings:[...review.mappings,{...review.mappings[0],aaId:'second-unverified-id'}]},data.models)
  assert.equal(checked.observations.length,1);assert.ok(checked.issues.length)
  const rights={modelSelectionGuidance:true,structuredPublicDisplay:true,reference:'synthetic public scope reference',reviewedAt:'2026-10-28',expiresAt:'2027-01-01'}
  assert.equal(authorizeAAPublication(checked,rights,'2026-10-28').observations.length,1)
})
