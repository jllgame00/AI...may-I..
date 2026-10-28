import type { ModelEvaluation } from '../recommendationTypes'
import { researchedEvaluations } from './researchCatalog.ts'

export const QWEN_TABLE='https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507'
// Additional columns of the SAME source table. In particular, Kimi's 48.9
// covers Feb–May, unlike the existing Moonshot 53.7 (Aug–May) observation.
const additions=[
  {id:'qwen-table-kimi-lcb-v6',template:'east-qwen235-2507-lcb',modelId:'moonshotai/Kimi-K2-Instruct',modelVersion:'Kimi-K2-Instruct',rawScore:48.9,effort:'non-thinking'},
  {id:'qwen-table-deepseek-lcb-v6',template:'east-qwen235-2507-lcb',modelId:'deepseek-ai/DeepSeek-V3-0324',modelVersion:'DeepSeek-V3-0324',rawScore:45.2,effort:null},
  {id:'qwen-table-kimi-creative-v3',template:'east-qwen235-2507-creative',modelId:'moonshotai/Kimi-K2-Instruct',modelVersion:'Kimi-K2-Instruct',rawScore:88.1,effort:'non-thinking'},
  {id:'qwen-table-deepseek-creative-v3',template:'east-qwen235-2507-creative',modelId:'deepseek-ai/DeepSeek-V3-0324',modelVersion:'DeepSeek-V3-0324',rawScore:81.6,effort:null},
]
export const supplementalEvaluations:ModelEvaluation[]=additions.map(({template,...row})=>({
  ...researchedEvaluations.find(e=>e.id===template)!,...row,
  source:{url:QWEN_TABLE,checkedAt:'2026-10-28',scope:'Performance 表의 Kimi K2 / Deepseek-V3-0324 비교 열. 다른 제공사·기간 결과와 별도 관측.'},
  limitations:'Qwen 제공사 비교 표의 해당 열 원점수. 독립 재현·완전한 동일 실행 조건 검증이 아님. 열별 추론 설정·샘플링·환경·fallback·반복 수는 미공개인 부분을 추정하지 않음. 평가 언어·judge 미확인. 현재 웹 채팅에서 같은 모델·설정의 제공을 보장하지 않음.',
}))

// Explicit source-table scope: missing settings NEVER pass the strict
// same-conditions comparator. This narrower exception permits only reviewed
// columns, preserving every disclosed field, and is labelled as source-reported.
export const taskSourceGroups=[
  {id:'qwen-lcb-v6-feb-may',task:'coding' as const,benchmark:'LiveCodeBench',version:'v6',subset:'2025-02 — 2025-05',
    members:['east-qwen235-2507-lcb','qwen-table-kimi-lcb-v6','qwen-table-deepseek-lcb-v6']},
  {id:'qwen-creative-v3',task:'writing' as const,benchmark:'Creative Writing',version:'v3',subset:null,
    members:['east-qwen235-2507-creative','qwen-table-kimi-creative-v3','qwen-table-deepseek-creative-v3']},
].map(g=>({...g,source:QWEN_TABLE,expected:g.members.map(id=>{
  const e=[...researchedEvaluations,...supplementalEvaluations].find(e=>e.id===id)!
  // Snapshot metadata only. Scores deliberately stay out of this contract.
  const {rawScore:_score,limitations:_limits,terms:_terms,publishedAt:_published,evaluatedAt:_evaluated,source:_source,...conditions}=e
  return conditions
})}))

export const taskEvidenceResearch=[
  {url:'https://statqa.github.io/',checkedAt:'2026-10-28',scope:'StatQA: 통계 방법 선택·적용 가능성 평가. 현재 등록된 정확한 릴리스의 비교 결과 미확보.'},
  {url:'https://github.com/X-PLUG/WritingBench',checkedAt:'2026-10-28',scope:'WritingBench: judge·문항 개정 이력 확인. 기존 제공사 표의 평가 버전·judge와 연결 미확인.'},
]

