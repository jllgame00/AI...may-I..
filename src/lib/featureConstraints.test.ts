import { it } from 'node:test'
import assert from 'node:assert/strict'
import { featureSupportForTask } from './featureConstraints.ts'
import { compareCandidates, DEMO_REQUEST } from './aiGuide.ts'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import type { FeatureSupport } from '../recommendationTypes.ts'
const source={url:'https://example.org/documented-limit',checkedAt:'2026-10-29'}
const bounded:FeatureSupport={status:'limited',note:'테스트용 공식 한도: 파일 10MB 이하, 2개 이하, 1000행 이하, CSV만 지원.',sources:[source],constraints:{maxFileSizeMB:10,maxFiles:2,maxRows:1000,formats:['csv']}}
it('compares all explicit documented constraints with task facts, including inclusive boundaries',()=>{
  const result=featureSupportForTask(bounded,'upload','CSV 파일 2개, 파일당 10MB, 1000행을 분석해줘')
  assert.equal(result.status,'supported')
  assert.ok(result.checks.every(c=>c.result==='met'))
  assert.equal(featureSupportForTask(bounded,'upload','CSV 파일 1개, 0.005GB, 500행 분석').status,'supported')
})
it('rejects a known violation even when other conditions are missing; never treats unknown as a failure',()=>{
  for(const task of ['CSV 파일 1개, 11MB, 500행','CSV 파일 3개, 5MB, 500행','CSV 파일 1개, 5MB, 1001행','XLSX 파일 1개, 5MB, 500행'])assert.equal(featureSupportForTask(bounded,'upload',task).status,'unsupported',task)
  const missing=featureSupportForTask(bounded,'upload','CSV 파일 1개, 5MB를 분석해줘')
  assert.equal(missing.status,'limited');assert.ok(missing.checks.some(c=>c.result==='unknown'&&c.condition.includes('행')))
  assert.equal(featureSupportForTask({...bounded,constraints:{...bounded.constraints,unresolved:['계정별 추가 처리 제한']}},'upload','CSV 파일 1개, 5MB, 500행').status,'limited')
})
it('does not infer bounds from a vague note or unsourced metadata and does not confuse sample size with rows',()=>{
  assert.equal(featureSupportForTask({status:'limited',note:'한도 내 지원',sources:[source]},'upload','파일 1개 1MB').status,'limited')
  assert.equal(featureSupportForTask({...bounded,sources:[]},'upload','CSV 파일 1개 5MB 500행').status,'unknown')
  assert.equal(featureSupportForTask(bounded,'upload','CSV 파일 1개 5MB, 대학생 120명 설문').status,'limited')
})
it('keeps partially specified multi-file sizes conditional and ignores explicitly excluded formats',()=>{
  const partial=featureSupportForTask(bounded,'upload','CSV 파일 2개 중 하나는 5MB, 500행이고 다른 파일 크기는 미정')
  assert.equal(partial.status,'limited')
  assert.equal(featureSupportForTask(bounded,'upload','CSV 파일 2개 중 하나는 11MB, 500행이고 다른 파일 크기는 미정').status,'unsupported')
  assert.equal(featureSupportForTask(bounded,'upload','XLSX가 아니고 CSV 파일 1개 5MB 500행을 분석해줘').status,'supported')
})
it('keeps uncertain quantities and unbounded lower limits conditional instead of treating them as exact sizes',()=>{
  for(const task of ['CSV 파일 1개, 500행, 크기는 5MB인지 모르겠어','CSV 파일 1개, 500행, 10MB 이상','CSV 파일 1개, 500행, 약 5MB','CSV 파일 1개, 500행, 5~15MB'])assert.equal(featureSupportForTask(bounded,'upload',task).status,'limited',task)
  assert.equal(featureSupportForTask(bounded,'upload','CSV 파일 1개, 500행, 5MB 이하').status,'supported')
  assert.equal(featureSupportForTask(bounded,'upload','CSV 파일 1개, 500행, 10MB 초과').status,'unsupported')
})
it('does not promote existing Excel/CSV input analysis merely because a new sheet is requested afterward',()=>{
  const support=snapshot.mappings.find(m=>m.routeKind==='work'&&m.features?.spreadsheet)!.features!.spreadsheet!
  for(const task of ['엑셀을 분석해서 새 시트를 만들어줘','CSV를 읽어 새 스프레드시트 표를 작성해줘','새 스프레드시트 표를 만들지 말아줘'])assert.equal(featureSupportForTask(support,'spreadsheet',task).status,'limited',task)
})
it('matches the actual documented spreadsheet operation scope without a model-specific exception',()=>{
  const sourceData=JSON.stringify(snapshot)
  const full=compareCandidates({text:'요약 값을 직접 입력해 새 스프레드시트 표를 작성해줘',tasks:['analysis'],requiredFeatures:['spreadsheet'],inputMode:'summary',overrides:{}}).decision!.weighted!
  const work=full.rows.filter(r=>r.candidate.mapping.routeKind==='work')
  assert.equal(work.length,3)
  assert.ok(work.every(r=>r.judgment==='recommended'&&r.components[0].declaredStatus==='limited'&&r.components[0].status==='supported'))
  const original=compareCandidates({text:DEMO_REQUEST,overrides:{}}).decision!.weighted!
  assert.ok(original.rows.filter(r=>r.candidate.mapping.routeKind==='work').every(r=>r.judgment==='conditional'&&r.components[0].checks!.some(c=>c.result==='unknown')))
  assert.equal(JSON.stringify(snapshot),sourceData)
})
