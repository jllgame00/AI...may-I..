import type { ModelEvaluation, Recommendation } from '../recommendationTypes'
import { ZAPIER_GROUP } from '../data/operatorEvaluations.ts'

// A source-declared configuration leaderboard, not a same-settings model trial.
// No component averaging, composite reconstruction, or cross-version ranking.
export const declaredGroups=[{id:ZAPIER_GROUP,benchmark:'AutomationBench',version:'1.0.6',subset:'전체' as string|null,source:'https://zapier.com/benchmarks',evaluator:'Zapier',kind:'independent',unit:'%',higherIsBetter:true,
  label:'AutomationBench 1.0.6 · 업무 실행 구성 비교',scope:'동일 운영기관의 전체 held-out 리더보드. 모델·effort·fallback이 다른 에이전트 실행 구성의 성공률 비교이며 모델 단독 채팅 순위가 아닙니다. 통상 1% 이내 실행 변동, 신뢰구간 미공개. 근소한 차이는 확정 우열이 아닙니다.'},
  ...[{id:'grok47-cursor4',benchmark:'CursorBench',version:'4.0'},{id:'grok47-deepswe1.1',benchmark:'DeepSWE',version:'1.1'},{id:'grok47-terminal4',benchmark:'Terminal-Bench',version:'4.0'}].map(g=>({...g,subset:null,source:'https://x.ai/news/grok-4-7',evaluator:'SpaceXSI (xAI)',kind:'provider',unit:'%',higherIsBetter:true,
    label:`${g.benchmark} ${g.version} · 코딩 실행 구성 비교`,scope:'SpaceXSI (xAI)의 Grok 4.7 발표 표에 나란히 실린 Grok 4.6 / 4.7 실행 구성 비교. 제공사 발표이며 독립 평가가 아닙니다. effort 차이를 포함하며 에이전트·환경·반복 수가 미공개여서 모델 단독 성능 또는 동일 설정의 확정 우열을 뜻하지 않습니다.'}))]
export function sourceComparisonGroups(candidates:Recommendation[]) {
  return declaredGroups.map(g=>{
    const rows:{result:ModelEvaluation;candidate:Recommendation}[]=[]
    const seen=new Set<string>()
    for(const c of candidates) {
      const e=c.configuration
      if(!e || seen.has(e.id) || e.comparisonGroup!==g.id || e.benchmark!==g.benchmark || e.benchmarkVersion!==g.version || e.subset!==g.subset || e.source.url!==g.source || e.evaluator!==g.evaluator || e.publisher!==g.evaluator || e.kind!==g.kind || e.unit!==g.unit || e.higherIsBetter!==g.higherIsBetter || e.rawScore===null || !Number.isFinite(e.rawScore) || e.evaluationType!=='agent')continue
      if(c.model?.id!==e.modelId || c.model.version!==e.modelVersion)continue
      seen.add(e.id);rows.push({result:e,candidate:c})
    }
    rows.sort((a,b)=>(b.result.rawScore!-a.result.rawScore!)*(g.higherIsBetter?1:-1))
    return {...g,rows}
  }).filter(g=>g.rows.length>1)
}
