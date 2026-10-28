import { it } from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSnapshot as snapshot } from '../data/recommendationSnapshot.ts'
import { compareCandidates } from './aiGuide.ts'
import { compareEvaluationResults } from './currentEvidence.ts'
import type { PromptRequest } from '../types.ts'

// Hand-audited against the five accessible primary pages on 2026-10-28.
// This manifest pins observed facts, not a derived ranking or inferred settings.
const sources={sol:'https://openai.com/index/introducing-gpt-6-1-sol/',terra:'https://openai.com/index/introducing-gpt-6-1-terra/',sonnet:'https://www.anthropic.com/claude-sonnet-5-5',opus:'https://www.anthropic.com/claude-opus-5-5',zapier:'https://zapier.com/benchmarks'}
const expected = [
  ['sol-factual-low','gpt-6.1-sol','6.1','오류 유발 대화 사실성 평가','미공개',7.7,'low',false,'provider','OpenAI','OpenAI',sources.sol],
  ['terra-terminal-max','gpt-6.1-terra','6.1','Terminal-Bench','4.0',50.3,'max',true,'provider','OpenAI','미확인',sources.terra],
  ['terra-factual-low','gpt-6.1-terra','6.1','오류 유발 프롬프트 사실성 평가','미공개',16.7,'low',false,'provider','OpenAI','OpenAI',sources.terra],
  ['terra-factual-max','gpt-6.1-terra','6.1','오류 유발 프롬프트 사실성 평가','미공개',4.3,'max',false,'provider','OpenAI','OpenAI',sources.terra],
  ['astra-science-sol-report','gpt-6-astra','6','Terminal-Bench Science','0.1',68.1,null,true,'provider','OpenAI','OpenAI',sources.sol],
  ['sonnet-terminal','claude-sonnet-5-5','5.5','Terminal-Bench','4.0',70.6,null,true,'provider','Anthropic','미확인',sources.sonnet],
  ['sonnet-frontier-max','claude-sonnet-5-5','5.5','FrontierCode','1.1',46.2,'max',true,'provider','Anthropic','미확인',sources.sonnet],
  ['sonnet-frontier-xhigh','claude-sonnet-5-5','5.5','FrontierCode','1.1',52.1,'xhigh',true,'provider','Anthropic','미확인',sources.sonnet],
  ['opus-terminal-xhigh','claude-opus-5-5','5.5','Terminal-Bench','4.0',66.4,'xhigh',true,'provider','Anthropic','Anthropic',sources.opus],
  ['opus-frontier-max','claude-opus-5-5','5.5','FrontierCode','1.1',54.4,'max',true,'provider','Anthropic','미확인',sources.opus],
  ['sonnet-automation-max','claude-sonnet-5-5','5.5','AutomationBench','1.0.6',44.75,'max',true,'independent','Zapier','Zapier',sources.zapier],
  ['opus-automation-max','claude-opus-5-5','5.5','AutomationBench','1.0.6',42.47,'max',true,'independent','Zapier','Zapier',sources.zapier],
  ['astra-automation-max','gpt-6-astra','6','AutomationBench','1.0.6',41.4,'max',true,'independent','Zapier','Zapier',sources.zapier],
]
it('matches all 13 primary-source facts and preserves unknown settings and evaluation scope', () => {
  const rows=snapshot.evaluations!.filter(e=>expected.some(r=>r[0]===e.id))
  assert.deepEqual(rows.map(e=>[e.id,e.modelId,e.modelVersion,e.benchmark,e.benchmarkVersion,e.rawScore,e.effort,e.higherIsBetter,e.kind,e.publisher,e.evaluator,e.source.url]),expected)
  assert.deepEqual([...new Set(rows.map(e=>e.modelId))].sort(),snapshot.models.filter(m=>['OpenAI','Anthropic'].includes(m.provider)).map(m=>m.id).sort())
  for(const e of rows) {
    assert.equal(e.unit,'%');assert.equal(e.source.checkedAt,'2026-10-28')
    assert.equal(e.trials,null);assert.equal(e.harness,null)
    if(e.benchmark==='FrontierCode')assert.equal(e.subset,'Main')
    if(e.publisher==='Zapier') {
      assert.equal(e.subset,'전체');assert.match(e.tools!,/47.*6/)
      assert.match(e.limitations,/답변 문장 품질은 채점하지 않음/)
      assert.equal(e.publishedAt,null);assert.equal(e.evaluatedAt,null)
      assert.equal(e.fallbacks,e.modelId==='gpt-6-astra'?null:'제공사 기본 fallback 라우팅')
    }
  }
})
it('never turns the currently incomplete evaluation conditions into definite pairwise rankings', () => {
  const rows=snapshot.evaluations!.filter(e=>expected.some(r=>r[0]===e.id))
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++) {
    const result=compareEvaluationResults(rows[i],rows[j])
    assert.equal(result.comparable,false);assert.equal(result.delta,null)
  }
})
it('keeps task and access states independent of subscription prices across routes and tasks', () => {
  for(const task of ['analysis','writing','coding'] as const) {
    const request:PromptRequest={text:task==='analysis'?'설문 통계 보고서':task==='coding'?'Python 코드 수정':'환영 이메일',overrides:{},tasks:[task],inputMode:'summary'}
    const result=compareCandidates(request)
    assert.ok(result.recommendations.length)
    for(const c of result.recommendations) {
      assert.equal(c.score,null)
      assert.equal(c.suitability,c.accessStatus==='연결 미확인'?'확인 후 선택':'조건 비교 가능')
      if(c.plan.id==='claude-pro'){
        assert.equal(c.mapping.status,'confirmed');assert.equal(c.accessStatus,'연결 근거 확인')
        assert.equal(c.mapping.selectable,true)
        assert.ok(c.mapping.sources.some(s=>s.url.includes('academy.claude.com')))
        assert.equal(c.assessment?.account.status,'unchecked')
      }
      if(task!=='coding')assert.ok(c.evidence?.every(e=>e.domain==='writing'&&task==='writing'))
    }
  }
})
