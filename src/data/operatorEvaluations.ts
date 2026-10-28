import type { ModelEvaluation } from '../recommendationTypes'

export const ZAPIER_GROUP='zapier-automationbench-1.0.6'
export function automationConfiguration(e:ModelEvaluation):ModelEvaluation {
  return {...e,evaluationType:'agent',agentName:'AutomationBench API 모드 (에이전트 이름 미공개)',agentVersion:null,
    comparisonGroup:ZAPIER_GROUP,
    tools:'search (BM25 상위 5개 API 스키마) / execute; 47개 모의 앱 · 6개 업무 분야',
    environment:'격리된 모의 회사 · API 모드 · task당 최대 50단계 · 비공개 held-out 평가 세트',
    limitations:'에이전트 실행 구성 비교. effort·기본 fallback 차이 포함. task_completed_correctly 엄격 성공률이며 답변 문장 품질은 채점하지 않음. 공개 600-task 세트와 리더보드의 비공개 평가 세트를 구분. 실행 변동은 통상 1% 이내로 보고되며 근소한 차이를 확정 우열로 해석하지 않음.',
    terms:'Zapier 공개 리더보드의 필요한 사실 수치와 원문 출처를 인용. 전체 데이터·과제 재배포 허가나 코드 라이선스 적용을 추정하지 않음.'}
}
const row=(id:string,modelId:string,modelVersion:string,effort:string,rawScore:number,fallbacks:string|null=null):ModelEvaluation=>automationConfiguration({
  id,modelId,modelVersion,effort,rawScore,fallbacks,benchmark:'AutomationBench',benchmarkVersion:'1.0.6',subset:'전체',domain:'workflow',unit:'%',higherIsBetter:true,
  tools:null,harness:null,environment:null,trials:null,evaluator:'Zapier',publisher:'Zapier',kind:'independent',publishedAt:null,evaluatedAt:null,
  source:{url:'https://zapier.com/benchmarks',checkedAt:'2026-10-28',scope:'1.0.6 전체 공개 리더보드 및 API-mode 실행 설명. 하위 분야 best-effort 표와 분리.'},limitations:'',terms:'',
})
export const operatorEvaluations:ModelEvaluation[]=[
  row('argon-automation-high','gemini-4-argon','gemini-4-argon','high',51.29),
  row('argon-automation-medium','gemini-4-argon','gemini-4-argon','medium',50.08),
  row('astra-automation-xhigh','gpt-6-astra','6','xhigh',38.96),
  row('astra-automation-high','gpt-6-astra','6','high',37.14),
  row('sonnet-automation-xhigh','claude-sonnet-5-5','5.5','xhigh',36.83,'제공사 기본 fallback 라우팅'),
  row('opus-automation-xhigh','claude-opus-5-5','5.5','xhigh',35.77,'제공사 기본 fallback 라우팅'),
  row('astra-automation-medium','gpt-6-astra','6','medium',34.09),
]
