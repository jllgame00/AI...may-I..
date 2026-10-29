import { test } from 'node:test'
import assert from 'node:assert/strict'
import { providerCatalog } from '../data/providerCatalog.ts'
import { validateCatalog } from './providerValidation.ts'
import { evidenceRegister } from '../data/providerEvidenceRegister.ts'
import { costCondition, evidenceMatrix, resolveFeature, validateEvidenceRegister } from './providerEvidence.ts'

test('catalog rejects an invalid capability status instead of admitting it to recommendations',()=>{
  const data=structuredClone(providerCatalog)
  Object.assign(data.plans[0].capabilities.textGeneration!,{status:'yes'})
  assert.ok(validateCatalog(data).some(e=>e.includes('capability status')))
})

test('audit covers every operation for every service and route without promoting service claims',()=>{
  assert.deepEqual(validateEvidenceRegister(evidenceRegister,providerCatalog,'2026-10-29'),[])
  assert.equal(evidenceMatrix(evidenceRegister,providerCatalog).length,(13+18)*19)
  assert.equal(resolveFeature(evidenceRegister,'grok',null,'xlsxInput').status,'limited')
  assert.equal(resolveFeature(evidenceRegister,'grok','grok-unreviewed','xlsxInput').status,'unknown')
  assert.equal(resolveFeature(evidenceRegister,'qwen',null,'formCreation').status,'unknown')
})

test('invalid claims, links, dates and wrong plan scopes fail validation',()=>{
  const data=structuredClone(evidenceRegister)
  const claim=data.claims[0]
  Object.assign(claim,{status:'yes',planId:'claude-free',scope:'route'})
  Object.assign(data.sources[0],{url:'javascript:alert(1)',checkedAt:'2026-02-30'})
  const errors=validateEvidenceRegister(data,providerCatalog,'2026-10-29')
  for(const text of ['status','scope','URL','date'])assert.ok(errors.some(e=>e.includes(text)),text)
})

test('unreviewed, conflicting and inaccessible evidence stays unknown',()=>{
  const data=structuredClone(evidenceRegister),claim=data.claims.find(c=>c.serviceId==='grok'&&c.featureId==='xlsxInput')!
  claim.verification='unverified'
  assert.equal(resolveFeature(data,'grok',null,'xlsxInput').status,'unknown')
  claim.verification='reviewed'
  data.claims.push({...claim,id:'conflict',status:'unsupported'})
  assert.equal(resolveFeature(data,'grok',null,'xlsxInput').status,'unknown')
  data.claims.pop();data.sources.find(s=>s.id===claim.sourceIds[0])!.access='failed'
  assert.equal(resolveFeature(data,'grok',null,'xlsxInput').status,'unknown')
})

test('source documents cannot be assigned to another service to establish support',()=>{
  const data=structuredClone(evidenceRegister),claim=data.claims.find(c=>c.serviceId==='grok'&&c.featureId==='xlsxInput')!
  claim.sourceIds=['openai-data']
  assert.ok(validateEvidenceRegister(data,providerCatalog,'2026-10-29').some(e=>e.includes('source service scope')))
  assert.equal(resolveFeature(data,'grok',null,'xlsxInput').status,'unknown')
})

test('free plans never borrow paid claims or infer file input from file creation',()=>{
  const free=providerCatalog.plans.find(p=>p.id==='chatgpt-free')!
  const paid=providerCatalog.plans.find(p=>p.id==='runway-standard')!
  assert.equal(costCondition(free,['imageGeneration'],evidenceRegister,providerCatalog),'unknown')
  assert.equal(costCondition(free,['textEditing'],evidenceRegister,providerCatalog),'free-with-limits')
  assert.equal(costCondition(paid,['videoGeneration'],evidenceRegister,providerCatalog),'paid-required')
  assert.equal(costCondition(free,['textEditing'],evidenceRegister,providerCatalog,true),'budget-mismatch')
  assert.equal(resolveFeature(evidenceRegister,'claude','claude-free','xlsxInput').status,'unknown')
})

test('catalog rejects calendar rollover and future evidence dates',()=>{
  for(const checkedAt of ['2026-02-30','2099-01-01']){
    const data=structuredClone(providerCatalog);data.evidence[0].checkedAt=checkedAt
    assert.ok(validateCatalog(data).some(e=>e.includes('evidence date')))
  }
})

test('catalog rejects malformed HTTPS evidence URLs, not just non-HTTPS schemes',()=>{
  for(const url of ['https://','https://not a host/path','https://user:password@example.com/']){
    const data=structuredClone(providerCatalog);data.evidence[0].url=url
    assert.ok(validateCatalog(data).some(e=>e.includes('evidence scope')),url)
  }
})

test('audit rejects missing major companies and a major service moved to the wrong company',()=>{
  for(const id of ['openai','anthropic','google','xai','deepseek','alibaba','moonshot','perplexity','microsoft','adobe','runway','mistral']){
    const data=structuredClone(providerCatalog);data.providers=data.providers.filter(p=>p.id!==id)
    assert.ok(validateCatalog(data).some(e=>e===`missing provider ${id}`),id)
  }
  const data=structuredClone(providerCatalog),service=data.services.find(s=>s.id==='grok')!
  service.providerId='alibaba';data.providers.find(p=>p.id==='xai')!.serviceIds=[];data.providers.find(p=>p.id==='alibaba')!.serviceIds.push('grok')
  assert.ok(validateCatalog(data).some(e=>e.includes('required service owner grok')))
})
