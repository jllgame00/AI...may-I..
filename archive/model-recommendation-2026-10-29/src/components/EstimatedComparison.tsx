import type { Comparison } from '../types'
import type { ScorePublication } from '../lib/scorePublication'
import { exactWebModel } from '../lib/taskReadiness'

export default function EstimatedComparison({comparison}:{comparison:Comparison}) {
  const publication:ScorePublication|undefined=comparison.decision?.estimation
  if(!publication)return null
  const scopes=comparison.analysis.tasks.flatMap(task=>task==='analysis'?['analysis','statistics']:task==='coding'?['coding']:['writing'])
  const relevant=publication.published.filter(r=>scopes.includes(r.scope))
  const groups=relevant.length?relevant:publication.published.filter(r=>r.scope==='general')
  const attempts=publication.attempts.filter(r=>scopes.includes(r.scope)||r.scope==='general')
  return <section className="estimated-comparison" aria-label="공개 평가 기반 추정 추천 점수">
    {groups.length>0?<>
      <h2>공개 평가 기반 추정 추천 점수</h2>
      <p>검증을 통과한 비교 집합 안의 추천 지수입니다. 정확도·작업 성공 확률·벤치마크 원점수가 아닙니다.</p>
      {groups.map(group=><section key={group.id} data-estimation-scope={group.scope}>
        <h3>{group.scope==='general'?'일반 역량 참고':group.scope==='coding'?'공개 코딩 평가 참고':group.scope==='writing'?'공개 글 생성 평가 참고':group.scope} · {group.type==='agent'?'에이전트 실행 구성':'모델 구성'}</h3>
        <p>{group.scope==='general'?'특정 작업의 실측 능력으로 검증된 점수가 아닙니다.':group.scope==='writing'?'한국어·요청 장르 품질은 별도 검증되지 않았습니다.':'현재 웹 작업의 성공률을 측정한 점수는 아닙니다.'} 비교 집합 간 점수·순위를 합산하지 않습니다.</p>
        {group.stale&&<p role="status">재검증 미통과 · 마지막 정상 공개 결과 유지 (계산 {group.computedAt??'이전 실행'}, 데이터 {group.datasetHash?.slice(0,12)??'이전 버전'})</p>}
        <div className="candidate-grid">{[...group.scores].filter(s=>s.score!==null).sort((a,b)=>a.rank!-b.rank!).slice(0,3).map(score=>{
          const candidate=comparison.decision?.weighted?.rows.find(r=>r.candidate.model?.id===score.modelId&&r.candidate.model.version===score.modelVersion)?.candidate
          const confirmed=!!candidate&&exactWebModel(candidate)&&candidate.mapping.mode===score.effort&&group.type==='model'
          return <article className="candidate-card" data-estimation-model={score.modelId} key={score.configId}>
            <h2>{candidate?.model?.name??score.modelId}</h2>
            <p className="recommendation-rank">집합 내 {score.rank}위 · {score.score}점{score.nearTie?' · 근소한 차이·동등 수준':''}</p>
            <p>공개 평가 기반 추정 추천 점수</p>
            <p>공통 평가 {score.tables}개로 추정 · {score.sourceConcentrated?'평가 주체 편중 · 불확실성 큼':score.uncertain?'불확실성 큼':'검증 범위 안의 비교'}</p>
            <p>웹 실행: {confirmed?'정확한 모델·평가 모드 제공 근거 확인 · 계정·도구 별도 확인':'평가 구성과 일치하는 웹 실행 미확인'}</p>
            <a href="#recommended-options">기존 후보에서 기능·실행 조건 확인</a>
            <details><summary>추정 방식·불확실성·출처</summary>
              <p>모델 {score.modelId} · 버전 {score.modelVersion} · 평가 모드 {score.effort??'미공개 (해당 평가 표에 한정)'}</p>
              <p>에이전트: {score.execution.agentName??'미공개'} · 버전 {score.execution.agentVersion??'미공개'} · 도구 {score.execution.tools??'미공개'} · 하네스 {score.execution.harness??'미공개'} · 환경 {score.execution.environment??'미공개'} · fallback {score.execution.fallbacks??'미공개'}</p>
              <p>규제 Bradley–Terry · 평가 내 순서만 사용 · 고정 sigmoid 환산 · 후보 표시 변경으로 재계산하지 않습니다. 일반 역량과 영역 지수를 중복 가산하지 않습니다. 작업별 합성 가중치는 사용하지 않습니다.</p>
              <p>관측 {score.observations}개 · 평가 주체 {score.evaluators.join(', ')} · 민감도 범위 {score.sensitivity.join('~')}점. 평가 제거·작은 교란에 따른 범위이며 신뢰구간이 아닙니다. 제공사 간 환경 차이와 평가 선택 편향은 보정하지 못합니다.</p>
              {group.sources?.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">평가 출처</a> · 기록 확인 {source.checkedAt}</p>)}
            </details>
          </article>
        })}</div>
        {group.scores.filter(s=>s.score!==null).length>3&&<details><summary>나머지 추정 결과</summary>{[...group.scores].filter(s=>s.score!==null).sort((a,b)=>a.rank!-b.rank!).slice(3).map(s=><p key={s.configId}>{s.modelId} · {s.effort??'미공개'} · 집합 내 {s.rank}위 · {s.score}점{s.nearTie?' · 근소한 차이·동등 수준':''}</p>)}</details>}
      </section>)}
    </>:<p className="minor-note">{publication.state==='outdated'?'평가 데이터 변경 · 추정 점수 재검증 대기':'공개 평가 추정 점수는 검증 근거 부족으로 보류했습니다.'} 기존 작업·기능 추천은 아래에서 확인할 수 있습니다.</p>}
    <details><summary>추정 점수 검증 결과</summary>
      <p>모형 {publication.artifact?.modelVersion??'재계산 필요'} · 환산 {publication.artifact?.scaleVersion??'재계산 필요'} · 계산 성공 {publication.artifact?.computedAt??'미확인'} · 외부 수집 성공 {publication.artifact?.lastExternalCollectionAt??'이번 실행에서 수집하지 않음'}</p>
      <p>미관측은 0점이 아닙니다. 연결되지 않은 집합은 전역 순위로 환산하지 않습니다. 출처 표는 독립적인 동일 환경 평가를 보장하지 않습니다.</p>
      {attempts.map(attempt=><p key={attempt.id}>{attempt.scope} · {attempt.type==='agent'?'에이전트 구성':'모델 구성'} {attempt.configIds.length}개 · 평가 {attempt.tableIds.length}개 · 검증 가능 {attempt.validation.evaluableFolds}/{attempt.validation.totalFolds}건 · {attempt.passed?'통과':`보류: ${attempt.reasons.join(', ')}`}{attempt.validation.brier!==null?` · 예측 오차 ${attempt.validation.brier.toFixed(3)} / 기준선 ${attempt.validation.baselineBrier?.toFixed(3)}`:''}</p>)}
    </details>
  </section>
}
