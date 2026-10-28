import { recommendationSnapshot } from '../data/recommendationSnapshot'
import { compareEvaluationResults, evidenceForModel, mappingLabel } from '../lib/currentEvidence'
import type { ModelEvaluation, Recommendation } from '../recommendationTypes'

const kindLabels = {provider:'제공사 발표',independent:'독립 평가 · 운영기관 직접 발표','independent-reported':'독립 평가 · 제공사 재인용'}
export function EvaluationFact({ result:e,selectedMode,peers=[] }: { result:ModelEvaluation;selectedMode?:string|null;peers?:ModelEvaluation[] }) {
  const comparisons=peers.filter(p=>p.modelId!==e.modelId && p.benchmark===e.benchmark).map(p=>({p,comparison:compareEvaluationResults(e,p)}))
  return <div className="evaluation-fact">
    <p><strong>{e.benchmark} {e.benchmarkVersion==='미공개'?'(버전 미공개)':e.benchmarkVersion}{e.subset?` · ${e.subset}`:''}: {e.rawScore===null?'점수 미확인':`${e.rawScore}${e.unit}`}</strong><br />{kindLabels[e.kind]} · {e.higherIsBetter?'높을수록 좋음':'낮을수록 좋음'}</p>
    <p>평가 설정: {e.effort ?? 'effort 미확인'}{selectedMode && e.effort!==selectedMode?` · 선택한 ${selectedMode} 설정과 동일한 결과로 볼 수 없음`:''}{e.fallbacks?` · ${e.fallbacks}`:''}</p>
    <p className="evidence-limit">{e.limitations}</p>
    <p><a href={e.source.url} target="_blank" rel="noreferrer">{e.publisher} 원문 (새 창)</a> · 확인 {e.source.checkedAt}</p>
    <details><summary>평가 실행 조건·비교 한계·이용 조건</summary>
      <dl className="evidence-conditions"><dt>정확한 평가 모델</dt><dd>{e.modelId} · v{e.modelVersion}</dd><dt>도구</dt><dd>{e.tools ?? '미확인'}</dd><dt>에이전트·하네스</dt><dd>{e.harness ?? '미확인'}</dd><dt>환경</dt><dd>{e.environment ?? '미확인'}</dd><dt>시도 횟수</dt><dd>{e.trials ?? '미확인'}</dd><dt>대체 모델 실행</dt><dd>{e.fallbacks ?? '미확인 (없음으로 간주하지 않음)'}</dd><dt>평가 / 발표 주체</dt><dd>{e.evaluator} / {e.publisher}</dd><dt>발표 / 평가일</dt><dd>{e.publishedAt ?? '미기재'} / {e.evaluatedAt ?? '미기재'}</dd></dl>
      <p>{e.terms}</p>{comparisons.length?comparisons.map(({p,comparison})=><p key={p.id}>{p.modelId} ({p.effort ?? '설정 미확인'})와 비교: {comparison.comparable?`원점수 차이 ${comparison.delta} ${e.unit==='%'?'%p':e.unit}. `:'우열 판단 보류 · '}{comparison.reason}</p>):<p>동일 평가의 다른 모델 비교 자료가 이 화면에 없어요. 단독 원점수로 우열을 정하지 않아요.</p>}
    </details>
  </div>
}
export function CandidateEvidence({ candidate,peers }: { candidate:Recommendation;peers:Recommendation[] }) {
  const evidence=candidate.evidence ?? []
  const results=[...new Map(peers.flatMap(c=>c.evidence ?? []).map(e=>[e.id,e])).values()]
  return <section className="candidate-evidence"><h3>{evidence.length?'작업 관련 성능 근거':'조건 기반 후보 · 성능 근거 부족'}</h3><p>{candidate.evidenceNote}</p>{evidence.map(e=><EvaluationFact key={e.id} result={e} selectedMode={candidate.mapping.mode} peers={results}/>)}</section>
}
export default function CurrentModelCatalog() {
  const data=recommendationSnapshot
  return <details className="extras current-catalog" id="current-model-catalog"><summary>이번에 확인한 정확한 모델 {data.models.length}개 · 실제 평가 결과 {data.evaluations?.length ?? 0}건</summary>
    <p>2026-10-28 수동 확인 자료입니다. 현재 작업에 맞는 근거만 후보 카드에 연결해요. 아래 자료 전체가 현재 작업의 점수라는 뜻은 아니에요. 비교 조건이 부족하면 동등한 조건 후보 또는 비교 근거 부족으로 남겨요.</p>
    {data.models.map(model=><article className="catalog-model" key={model.id}><h3>{model.provider} · {model.name}</h3><p>{model.id} · v{model.version} · 지원 설정: {model.modes?.join(' / ')}</p><p>{model.availability}</p><p>{model.capabilities?.join(' · ')}</p><p>중요 제한: {model.limits?.join(' ')}</p><p>속도: {model.speed}</p><p>설정 부담: {model.setup}</p>
      <p>API 별도 사용량 과금: 입력 USD {model.apiPrice?.input} / 캐시 입력 USD {model.apiPrice?.cachedInput} / 출력 USD {model.apiPrice?.output} (각 100만 토큰당). 월 구독료가 아니며 도구·세금·지역 비용은 별도 확인해요.</p>
      <details><summary>플랜·이용 경로와 출처</summary>{data.mappings.filter(m=>m.modelId===model.id).map(m=><p key={m.id}>{data.plans.find(p=>p.id===m.planId)?.name} · {mappingLabel(m)} · {m.mode} · {m.status==='confirmed'?'연결 확인':'플랜 연결 미확인'}<br />{m.note}</p>)}{model.sources?.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">공식 모델 근거 (새 창)</a> · {s.checkedAt} · {s.scope}</p>)}</details>
      <details><summary>이 모델의 실제 평가 원점수 · {evidenceForModel(model,data).length}건</summary>{evidenceForModel(model,data).map(e=><EvaluationFact key={e.id} result={e}/>)}</details>
    </article>)}
    <p>Sonnet 5.5 시스템 카드는 응답 크기 제한으로 한 번 접근에 실패했어요. 발표 페이지에서 확인한 점수만 수록했고 숨겨진 설정은 미확인으로 유지했어요.</p>
  </details>
}
