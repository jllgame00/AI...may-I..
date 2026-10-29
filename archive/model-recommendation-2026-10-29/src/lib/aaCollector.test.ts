import {it} from 'node:test'
import assert from 'node:assert/strict'
import {collectAA} from '../../scripts/aa-collector.ts'
import {AA_ENDPOINT} from './aaSnapshot.ts'

it('makes no request without a local key',async()=>{
  let calls=0
  await assert.rejects(()=>collectAA(undefined,(async()=>{calls++;return new Response()}) as typeof fetch))
  assert.equal(calls,0)
})
it('uses only the official header-authenticated endpoint, rejects redirects and never returns the key',async()=>{
  const key='synthetic-secret-not-a-real-key'
  const capture=await collectAA(key,(async(url,options)=>{
    assert.equal(url,AA_ENDPOINT);assert.equal((options!.headers as Record<string,string>)['x-api-key'],key)
    assert.equal(options!.redirect,'error')
    return new Response(JSON.stringify({status:200,data:[]}),{status:200})
  }) as typeof fetch)
  assert.ok(!JSON.stringify(capture).includes(key))
})
it('does not retry failures, expose unauthorized bodies, or cache a reflected secret',async()=>{
  let calls=0
  await assert.rejects(()=>collectAA('fixture-secret',(async()=>{calls++;return new Response('private body',{status:401})}) as typeof fetch),/HTTP 401/)
  assert.equal(calls,1)
  await assert.rejects(()=>collectAA('fixture-secret',(async()=>new Response(JSON.stringify({unexpected:'fixture-secret'}))) as typeof fetch),/저장하지/)
})
