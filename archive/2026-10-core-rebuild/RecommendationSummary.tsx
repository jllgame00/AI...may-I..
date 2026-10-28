import { accessCategory, accessLabels } from '../lib/modelAccess'
import type { TaskRecommendationEntry } from '../recommendationTypes'

export default function RecommendationSummary({entry,primary}:{entry:TaskRecommendationEntry;primary:boolean}) {
  const e=entry.evaluation,c=entry.candidate
  return <div className="recommendation-reason">
    <p className="recommendation-position">{entry.rank===null?(primary?'우선 검토 후보':'대안 검토 후보'):`${entry.tied?'공동 ':''}${entry.rank}위 · ${entry.rank===1?(entry.tied?'공동 우선 추천':'우선 추천'):'대안'}`}</p>
    <p><strong>추천 이유</strong><br/>{entry.reason}</p>
    <p><strong>평가 대상 설정</strong><br/>{e?`${e.modelVersion} · ${e.effort??'추론 설정 미공개'} · ${e.evaluationType==='agent'?`에이전트 ${e.agentName??'미공개'} ${e.agentVersion??''}`:'모델 평가'}`:`${c.model?.version} · 직접 평가 설정 없음`}</p>
    <p className="recommendation-score"><strong>{e?`${e.benchmark} ${e.benchmarkVersion} · ${e.rawScore} ${e.unit}`:'사용 가능한 평가 원점수 없음'}</strong>{entry.rank===null&&e&&' · 참고값, 순위 산정에 사용하지 않음'}</p>
    <p><strong>{entry.relevance==='direct'?'직접 근거':entry.relevance==='indirect'?'간접 근거':'기능 근거'}</strong> · {entry.relation}</p>
    <p>{entry.limitation}</p>
    <p className="web-availability"><strong>웹 채팅 이용</strong> · {accessLabels[accessCategory(c)]}<br/>선택 경로 설정: {c.mapping.mode??'미확인'} · 필수 기능: {c.suitability}. 평가 설정의 재현 여부는 별도입니다.</p>
  </div>
}
