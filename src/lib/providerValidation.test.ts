import { test } from 'node:test'
import assert from 'node:assert/strict'
import { providerCatalog } from '../data/providerCatalog.ts'
import { validateCatalog } from './providerValidation.ts'

// Production catalog coverage retained from the archived evidence-audit suite.
test('catalog rejects an invalid capability status instead of admitting it to recommendations',()=>{
  const data=structuredClone(providerCatalog)
  Object.assign(data.plans[0].capabilities.textGeneration!,{status:'yes'})
  assert.ok(validateCatalog(data).some(e=>e.includes('capability status')))
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
