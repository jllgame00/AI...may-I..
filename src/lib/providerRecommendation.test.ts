import { test } from 'node:test'
import assert from 'node:assert/strict'
import { providerCatalog } from '../data/providerCatalog.ts'
import { compareProviders } from './providerRecommendation.ts'
import { analyzeRequirements } from './providerRequirements.ts'
import { validateCatalog } from './providerValidation.ts'
import { PROVIDER_POLICY } from '../data/providerPolicy.ts'
import type { PromptRequest } from '../types.ts'
const request=(text:string,extra:Partial<PromptRequest>={}):PromptRequest=>({text,overrides:{},...extra})
const all=(r:ReturnType<typeof compareProviders>)=>[...r.recommendations,...r.remaining,...r.conditional,...r.excluded]
test('recommendations use confirmed conditions without performance weights, scores or ranks',()=>{
  assert.ok(!('weights' in PROVIDER_POLICY));assert.ok(!('scoring' in PROVIDER_POLICY))
  for(const row of all(compareProviders(request('발표 대본 작성')))){
    for(const field of ['score','rank','tied','components'])assert.ok(!(field in row),field)
    assert.ok(row.checks.length>0);assert.ok(row.reason)
  }
})
test('catalog registers twelve companies and thirteen services including two Google services',()=>{
  assert.deepEqual(validateCatalog(providerCatalog),[])
  assert.equal(providerCatalog.providers.length,12);assert.equal(providerCatalog.services.length,13)
  const broken=structuredClone(providerCatalog);broken.providers=broken.providers.filter(p=>p.id!=='adobe')
  assert.ok(validateCatalog(broken).some(s=>s.includes('adobe')))
})
for(const [text,capability] of [
  ['만족도 설문 문항을 작성해줘','surveyDraft'],['기존 XLSX 파일을 분석해줘','spreadsheetAnalysis'],['PDF 논문을 업로드해서 분석해줘','pdfAnalysis'],['5분 발표 대본을 작성해줘','textGeneration'],['React 코드 오류 원인을 분석하고 수정해줘','codeGeneration'],['포스터 이미지를 생성해줘','imageGeneration'],
] as const)test(`requirements: ${text}`,()=>{
  const r=analyzeRequirements(request(text));assert.ok(r.required.includes(capability));assert.ok(r.questions.length<=3)
  const result=compareProviders(request(text));assert.ok(result.recommendations.length<=3)
  for(const row of result.recommendations){assert.ok(row.checks.every(c=>c.status==='supported'));assert.ok(!('score' in row));assert.ok(!('rank' in row))}
})
test('different creation, input and execution operations never imply each other',()=>{
  assert.ok(analyzeRequirements(request('실제 설문 폼을 생성해줘')).required.includes('formCreation'))
  assert.ok(!analyzeRequirements(request('설문 문항 작성')).required.includes('formCreation'))
  assert.ok(!analyzeRequirements(request('코드 오류를 설명해줘')).required.includes('codeExecution'))
  assert.ok(analyzeRequirements(request('Python 코드를 실행해줘')).required.includes('codeExecution'))
  assert.ok(!analyzeRequirements(request('새 XLSX 파일을 생성해줘')).required.includes('spreadsheetAnalysis'))
  assert.ok(!analyzeRequirements(request('이미지 생성')).required.includes('imageInput'))
})
test('company identity and results are independent of models and arbitrary historical benchmarks',()=>{
  const data=structuredClone(providerCatalog)
  data.models=['explanatory-a','explanatory-b'].map(id=>({id,version:'1',providerId:'google',serviceId:'gemini',planIds:['gemini-free'],note:'explicit test-only model metadata',evidenceIds:['gemini-subscriptions']}))
  const original=compareProviders(request('발표 대본 작성'),data)
  data.models=[]
  Object.assign(data,{evaluations:[{rawScore:100000,modelId:'gpt',benchmark:'irrelevant'}]})
  assert.deepEqual(compareProviders(request('발표 대본 작성'),data),original)
  const rows=all(original);assert.equal(new Set(rows.map(r=>r.provider.id)).size,12)
  assert.equal(rows.filter(r=>r.provider.id==='google').length,1)
})
test('unknown, missing evidence, limited and explicit violations have distinct outcomes',()=>{
  const data=structuredClone(providerCatalog)
  for(const plan of data.plans)plan.capabilities.textGeneration={status:'unknown',note:'unknown',evidenceIds:[]}
  assert.equal(compareProviders(request('글 작성'),data).recommendations.length,0)
  for(const plan of data.plans)plan.capabilities.textGeneration={status:'supported',note:'unsupported claim without source',evidenceIds:[]}
  assert.equal(compareProviders(request('글 작성'),data).recommendations.length,0)
  const plan=data.plans.find(p=>p.id==='claude-free')!
  plan.capabilities.textGeneration={status:'unsupported',note:'fixture explicit denial',evidenceIds:['claude-pricing']}
  const result=compareProviders(request('글 작성'),data)
  assert.equal(result.allOptions.find(r=>r.id===plan.id)!.checks[0].status,'unsupported')
})
test('free-only never borrows paid support, and an explicit budget change recomputes eligibility',()=>{
  const data=structuredClone(providerCatalog)
  for(const p of data.plans)if(p.tier==='free')p.capabilities.imageGeneration={status:'unknown',note:'fixture no free proof',evidenceIds:[]}
  const free=compareProviders(request('무료로 이미지를 생성해줘'),data)
  assert.equal(free.recommendations.length,0)
  assert.ok(free.allOptions.filter(p=>p.plan.tier==='paid').every(p=>p.budgetStatus==='unmet'))
  const p=data.plans.find(p=>p.id==='firefly-standard')!
  p.price={...p.price,amount:10000,currency:'KRW',country:'KR',taxIncluded:true,evidenceIds:['firefly-pricing']}
  const budget={freeOnly:false,maxMonthly:9000,currency:'KRW',country:'KR'}
  assert.ok(!compareProviders(request('이미지 생성',{budget}),data).recommendations.some(r=>r.plan.id===p.id))
  assert.ok(all(compareProviders(request('이미지 생성',{budget:{...budget,maxMonthly:11000}}),data)).some(r=>r.plan.id===p.id&&r.status==='eligible'))
})
test('capability evidence cannot leak from one plan or service to another',()=>{
  const data=structuredClone(providerCatalog),plan=data.plans.find(p=>p.id==='notebooklm-unreviewed')!
  plan.capabilities.textGeneration={status:'supported',note:'wrong scope',evidenceIds:['gemini-pricing']}
  const result=compareProviders(request('글 작성'),data)
  assert.equal(result.allOptions.find(p=>p.id===plan.id)!.status,'conditional')
})
test('composite work retains per-stage requirements and one company recommendation per work',()=>{
  const result=compareProviders(request('기존 XLSX 설문 결과를 분석하고 발표자료를 만들고 발표 대본을 작성해줘'))
  assert.ok(result.requirements.composite)
  assert.ok(result.requirements.works.some(w=>w.category==='analysis'))
  assert.ok(result.requirements.works.some(w=>w.category==='slides'))
  assert.ok(result.requirements.works.some(w=>w.category==='writing'))
  for(const rows of Object.values(result.byWork))assert.equal(new Set(rows.map(r=>r.provider.id)).size,rows.length)
})
test('negated or optional search never erases the actual task',()=>{
  const negative=analyzeRequirements(request('웹 검색 없이 코드 오류를 수정해줘'))
  assert.ok(negative.required.includes('codeGeneration'));assert.ok(!negative.required.includes('webSearch'))
  const optional=analyzeRequirements(request('가능하면 검색도 해서 발표 대본을 작성해줘'))
  assert.ok(optional.required.includes('textGeneration'));assert.ok(optional.preferred.includes('webSearch'));assert.ok(!optional.required.includes('webSearch'))
})
test('output files are not treated as uploaded inputs',()=>{
  const output=analyzeRequirements(request('발표 대본을 PDF 파일로 만들어줘'))
  assert.ok(!output.required.includes('pdfUpload'));assert.ok(!output.required.includes('pdfAnalysis'))
  assert.ok(output.required.includes('pdfCreation'));assert.ok(!output.inputFormats.includes('pdf'))
  const mixed=analyzeRequirements(request('기존 XLSX 자료를 분석해서 PDF 보고서로 저장해줘'))
  assert.ok(mixed.required.includes('spreadsheetAnalysis'));assert.ok(!mixed.required.includes('pdfUpload'));assert.ok(mixed.required.includes('pdfCreation'))
})
test('known file size and count restrictions are applied without losing units',()=>{
  const result=compareProviders(request('기존 XLSX 파일 1GB를 분석해줘'))
  const option=result.allOptions.find(p=>p.id==='claude-free')!
  assert.equal(option.status,'excluded')
  assert.equal(analyzeRequirements(request('기존 XLSX 파일 3개를 분석해줘')).bounds.fileCount,3)
})
test('explicit quantities require corresponding capacity evidence, and paid budgets require a known country',()=>{
  const result=compareProviders(request('기존 XLSX 파일 5000개를 분석해줘'))
  assert.equal(result.recommendations.length,0)
  const data=structuredClone(providerCatalog),plan=data.plans.find(p=>p.id==='firefly-standard')!
  plan.price={...plan.price,currency:'USD',country:null,amount:10,taxIncluded:true}
  const r=compareProviders(request('이미지 생성',{budget:{freeOnly:false,maxMonthly:15,currency:'USD',country:null}}),data)
  assert.equal(r.allOptions.find(p=>p.id===plan.id)!.budgetStatus,'unknown')
})
test('input files and new output files are independent operations across all work categories',()=>{
  for(const text of ['기존 XLSX 파일을 분석해서 새 XLSX 파일을 생성해줘','PDF 파일을 분석해서 새 XLSX 파일을 생성해줘']){
    const r=analyzeRequirements(request(text));assert.ok(r.required.includes('spreadsheetCreation'));assert.ok(r.required.includes('fileUpload'))
    if(text.startsWith('PDF'))assert.ok(r.required.includes('pdfAnalysis'));else assert.ok(r.required.includes('spreadsheetAnalysis'))
  }
  assert.ok(analyzeRequirements(request('첨부한 DOCX 파일을 읽고 홍보 글을 작성해줘',{inputMode:'file'})).required.includes('fileUpload'))
  const pdf=analyzeRequirements(request('PDF 보고서 파일을 생성해줘'))
  assert.ok(pdf.required.includes('pdfCreation'));assert.ok(!pdf.required.includes('pdfUpload'))
  const stages=analyzeRequirements(request('PDF 파일을 분석해서 새 XLSX 파일을 생성해줘')).works
  assert.ok(!stages.find(w=>w.category==='analysis')!.required.includes('spreadsheetCreation'))
  assert.ok(stages.find(w=>w.category==='writing')!.required.includes('spreadsheetCreation'))
})
