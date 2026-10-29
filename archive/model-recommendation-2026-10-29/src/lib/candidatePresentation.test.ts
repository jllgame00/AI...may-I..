import {it} from 'node:test'
import assert from 'node:assert/strict'
import {compareCandidates} from './aiGuide.ts'
import {candidateSummary,sourceLabel,userFacingLimit} from './candidatePresentation.ts'

it('keeps metric and deployment qualifiers with compact benchmark facts',()=>{
  const candidates=compareCandidates({text:'Python 버그 수정',overrides:{}}).recommendations
  const c=candidates.find(c=>c.model?.id==='mistralai/Mistral-Small-3.2-24B-Instruct-2506'&&c.accessStatus==='연결 근거 확인')!
  const summary=candidateSummary(c,[])
  assert.ok(!summary.facts.some(f=>f.includes('92.9')) || summary.facts.some(f=>f.includes('92.9')&&f.includes('Pass@5')))
  assert.match(summary.limit,/FP8|평가.*차이|평가.*다르/)
})
it('does not turn writing reference scores with unknown language and judging into compact fit claims',()=>{
  const candidates=compareCandidates({text:'한국어 소개문 작성',tasks:['writing'],overrides:{}}).recommendations
  for(const c of candidates){
    const summary=candidateSummary(c,[])
    if(c.evidence?.some(e=>e.domain==='writing'))assert.ok(summary.facts.every(f=>!f.includes('%')||/한국어.*미확인/.test(f)))
  }
})
it('names evidence links and turns entitlement audit notes into account actions',()=>{
  assert.equal(sourceLabel({url:'https://learn.chatgpt.com/docs/models',checkedAt:'2026-10-28'}),'ChatGPT Work 모델·추론 설정 안내')
  assert.match(userFacingLimit('Work·Codex 제공을 일반 Chat 권한으로 확장하지 않음.'),/계정에서 확인/)
})
