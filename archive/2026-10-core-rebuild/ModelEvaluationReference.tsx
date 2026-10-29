import { useEffect, useState } from 'react'
import { evidenceForCandidate, loadModelEvidence } from '../lib/modelEvidence'
import type { EvaluatedModel, ModelEvidenceSnapshot } from '../lib/modelEvidence'
import type { Recommendation } from '../recommendationTypes'

const statusLabels = {
  scored: '집단 내 상대 점수',
  'insufficient-samples': '표본 부족 · 점수 보류',
  unidentifiable: '승패 비교 구조 부족 · 점수 보류',
  'numerical-failure': '계산 안정성 확인 실패 · 점수 보류',
}
function ModelTable({ models, candidates, snapshot }: { models: EvaluatedModel[]; candidates: Recommendation[]; snapshot: ModelEvidenceSnapshot }) {
  return <div className="model-table-scroll" tabIndex={0} role="region" aria-label="모델 평가 표 · 가로 스크롤 가능"><table className="model-evidence-table">
    <caption>데이터의 모델 ID 그대로 표시 · 모델 이름순 · 순위표 아님</caption>
    <thead><tr><th scope="col">평가 모델 ID</th><th scope="col">상대 점수 / 95% CI</th><th scope="col">비교 표본 · 상대 모델</th><th scope="col">현재 플랜 연결</th></tr></thead>
    <tbody>{models.map(model => {
      const linked = candidates.some(c => evidenceForCandidate(c, snapshot).planConfirmed && c.mapping.modelId === model.id)
      return <tr key={model.id}><th scope="row">{model.id}</th><td>{model.rating !== null && model.ci95 ? <><strong>{model.rating.toFixed(1)}</strong><br />{model.ci95[0].toFixed(1)}–{model.ci95[1].toFixed(1)}</> : statusLabels[model.status]}</td><td>{model.samples.toLocaleString()}표 · {model.opponents}개</td><td>{linked ? '모델 ID 연결 근거 있음 · 평가 설정 동일성 미확인' : '플랜 연결 미확인'}</td></tr>
    })}</tbody>
  </table></div>
}

export function ModelEvaluationReferenceView({ snapshot, candidates, loading = false }: { snapshot: ModelEvidenceSnapshot | null; candidates: Recommendation[]; loading?: boolean }) {
  return <section className="model-evaluation-reference" aria-labelledby="model-evaluation-title">
    <h2 id="model-evaluation-title">모델 평가 참고</h2>
    <p className="historical-warning">2025년 공개 투표 데이터 재분석 · 현재 모델 순위를 의미하지 않습니다.</p>
    <p>현재 서비스·플랜의 기능·예산 추천과 별도입니다. 과거 평가를 현재 추천 점수에 자동 반영하지 않습니다. 전체 선호도이며 글쓰기 등 특정 작업 능력의 순위가 아닙니다.</p>
    {!snapshot ? <p className="model-evidence-empty" role="status">{loading ? '모델 평가 스냅샷을 불러오는 중입니다.' : '모델 평가 스냅샷을 사용할 수 없습니다. 아직 생성되지 않았거나 파일을 읽을 수 없습니다. 현재 플랜 추천은 계속 사용할 수 있습니다.'}</p> : <>
      <p>데이터 기간: {snapshot.period?.start ?? '미확인'} — {snapshot.period?.end ?? '미확인'}<br />계산에 사용된 기간: {snapshot.usedPeriod ? `${snapshot.usedPeriod.start} — ${snapshot.usedPeriod.end}` : '충분한 표본 없음'}</p>
      <p>원본 {snapshot.counts.inputRows.toLocaleString()}행 → 세션당 첫 표 {snapshot.counts.retainedRows.toLocaleString()}표 → 표본 필터 후 {snapshot.counts.fittingRows.toLocaleString()}표 · 모델 {snapshot.modelCount}개 · 비교 집단 {snapshot.components.length}개</p>
      <p>추론 설정·API 날짜 버전: 데이터에서 미제공. 과거 모델 ID를 최신 모델로 치환하지 않았습니다.</p>
      <details className="model-candidate-matches"><summary>현재 후보와 평가 모델의 일치 여부</summary>
        {!candidates.length && <p>현재 단계에 추천 후보가 없습니다. 모델 평가는 아래에서 독립적으로 확인할 수 있습니다.</p>}
        <ul>{candidates.map(candidate => {
          const match = evidenceForCandidate(candidate, snapshot)
          return <li key={candidate.id}>{candidate.service.name} · {candidate.plan.name}: {match.status === 'unknown-model' ? '정확한 모델 ID 미확인 · 평가 데이터와 연결할 수 없음' : match.status === 'absent' ? `${candidate.mapping.modelId} — 평가 데이터에 없음` : `${match.model!.id} — ID 일치, ${match.planConfirmed ? '플랜 연결 근거 있음' : '플랜 연결 미확인'}. 평가 설정의 동일성은 미확인`}</li>
        })}</ul>
      </details>
      <p className="historical-warning">집단 간 점수는 비교할 수 없습니다. 각 집단 평균 1000인 상대 척도이며 성공 확률이 아닙니다. 신뢰구간이 겹치는 점수를 확실한 우위로 해석하지 마세요.</p>
      {snapshot.components.map(component => <details key={component.id} className="model-component" open>
        <summary>비교 집단 {component.id} · {component.models.length}개 모델 · {component.votes.toLocaleString()}표</summary>
        <p>비교 그래프: 연결됨 · 승리 방향 그래프: {component.stronglyConnected ? '강하게 연결됨' : '강한 연결 없음'} · {statusLabels[component.status]}</p>
        <ModelTable models={component.models} candidates={candidates} snapshot={snapshot} />
      </details>)}
      {!!snapshot.excludedModels.length && <details className="model-component"><summary>표본 조건 미충족 모델 ({snapshot.excludedModels.length})</summary><p>표본 수는 최소 표본 필터 전의 유효 세션 표 수입니다. 비교 집합 내 표본이 부족해 점수와 신뢰구간은 보류했습니다.</p><ModelTable models={snapshot.excludedModels} candidates={candidates} snapshot={snapshot} /></details>}
      <details className="model-method"><summary>출처·라이선스·계산 방법</summary>
        <p>{snapshot.source.attribution} · <a href={snapshot.source.url} target="_blank" rel="noreferrer">원본 데이터</a> · <a href={snapshot.source.licenseUrl} target="_blank" rel="noreferrer">CC-BY-4.0</a></p>
        <p>변경 사실: {snapshot.method.changes} 현재 Arena 리더보드를 재현한 결과가 아닙니다.</p>
        <p>{snapshot.method.name} · 방법 {snapshot.method.version} · 모델별 최소 {snapshot.method.minVotes}표. <a href={snapshot.method.reference} target="_blank" rel="noreferrer">참고한 공식 예제</a></p>
        <p>동률·both_bad는 0.5. 반복 세션은 첫 유효 표만 사용. sum-zero Bradley–Terry, 중심 1000·scale 400·base 10, sandwich 95% CI. 스타일·인기 보정 없음. 표본 선택 편향과 세션 간 동일 사용자 상관은 남아 있습니다.</p>
        <p>데이터 revision: <code>{snapshot.source.revision}</code><br />실행 패키지: {Object.entries(snapshot.method.packages).map(([name, version]) => `${name} ${version}`).join(' · ')}</p>
      </details>
    </>}
  </section>
}

export default function ModelEvaluationReference({ candidates }: { candidates: Recommendation[] }) {
  const [snapshot, setSnapshot] = useState<ModelEvidenceSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    // Static local asset only. No external leaderboard API or Python server.
    void loadModelEvidence(`${import.meta.env.BASE_URL}data/arena-public-votes.json`).then(data => {
      if (active) { setSnapshot(data); setLoading(false) }
    })
    return () => { active = false }
  }, [])
  return <ModelEvaluationReferenceView snapshot={snapshot} candidates={candidates} loading={loading} />
}
