import { compareEvaluationResults } from '../lib/currentEvidence'
import type { ModelEvaluation } from '../recommendationTypes'

const kindLabels = {provider:'제공사 발표',independent:'독립 평가 · 운영기관 직접 발표','independent-reported':'독립 평가 · 제공사 재인용'}
export function EvaluationFact({ result:e,selectedMode,peers=[] }: { result:ModelEvaluation;selectedMode?:string|null;peers?:ModelEvaluation[] }) {
  const comparisons=peers.filter(p=>p.modelId!==e.modelId && p.benchmark===e.benchmark).map(p=>({p,comparison:compareEvaluationResults(e,p)}))
  return <div className="evaluation-fact">
    <p><strong>{e.benchmark} {e.benchmarkVersion==='미공개'?'(버전 미공개)':e.benchmarkVersion}{e.subset?` · ${e.subset}`:''}: {e.rawScore===null?'점수 미확인':`${e.rawScore}${e.unit==='%'?'':' '}${e.unit}`}</strong><br />{kindLabels[e.kind]} · {e.higherIsBetter?'높을수록 좋음':'낮을수록 좋음'}</p>
    <p><strong>{e.evaluationType==='agent'?'모델·도구·에이전트 실행 구성 평가':'모델 평가'}</strong> · 평가 설정: {e.effort ?? 'effort 미확인'}{selectedMode && e.effort!==selectedMode?` · 선택한 ${selectedMode} 설정과 동일한 결과로 볼 수 없음`:''}{e.fallbacks?` · ${e.fallbacks}`:''}</p>
    <p className="evidence-limit">{e.limitations}</p>
    <p className="minor-note">자료 시점: 발표 {e.publishedAt??'미공개'} · 평가 {e.evaluatedAt??'미공개'} · 확인 {e.source.checkedAt}. 이 고정 모델·평가 버전의 기록이며 현재 서비스의 실시간 순위가 아니에요.</p>
    {e.index&&<p>출처의 공식 종합지수 {e.index.name} {e.index.version} · 구성: {e.index.components.join(' / ')} · 범위: {e.index.scope}. 자체 100점이나 구성 평가와의 합산이 아니에요.</p>}
    <p><a href={e.source.url} target="_blank" rel="noreferrer">{e.publisher} · {e.benchmark} 평가 원문 (새 창)</a> · 확인 {e.source.checkedAt}</p>
    <details><summary>평가 실행 조건·비교 한계·이용 조건</summary>
      <dl className="evidence-conditions"><dt>정확한 평가 모델</dt><dd>{e.modelId} · v{e.modelVersion}</dd><dt>도구</dt><dd>{e.tools ?? '미확인'}</dd><dt>에이전트·하네스</dt><dd>{e.harness ?? '미확인'}</dd><dt>환경</dt><dd>{e.environment ?? '미확인'}</dd><dt>시도 횟수</dt><dd>{e.trials ?? '미확인'}</dd><dt>대체 모델 실행</dt><dd>{e.fallbacks ?? '미확인 (없음으로 간주하지 않음)'}</dd><dt>평가 / 발표 주체</dt><dd>{e.evaluator} / {e.publisher}</dd><dt>발표 / 평가일</dt><dd>{e.publishedAt ?? '미기재'} / {e.evaluatedAt ?? '미기재'}</dd></dl>
      <p>에이전트 이름 / 버전: {e.agentName??'미공개'} / {e.agentVersion??'미공개'}</p><p>{e.terms}</p>{comparisons.length?comparisons.map(({p,comparison})=><p key={p.id}>{p.modelId} ({p.effort ?? '설정 미확인'})와 동일 조건 비교: {comparison.comparable?`원점수 차이 ${comparison.delta} ${e.unit==='%'?'%p':e.unit}. `:'우열 판단 보류 · '}{comparison.reason}</p>):<p>동일 평가의 다른 모델 비교 자료가 이 화면에 없어요. 단독 원점수로 우열을 정하지 않아요.</p>}
    </details>
  </div>
}
