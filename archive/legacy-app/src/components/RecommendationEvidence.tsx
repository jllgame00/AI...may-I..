import { featureLabels, scoreWeights } from '../data/recommendationPolicy'
import { featureSupport } from '../lib/recommend'
import type { FeatureId, Recommendation, Source } from '../types'

function Sources({ sources }: { sources: Source[] }) {
  return <ul className="source-list">{sources.map((source, i) => <li key={`${source.url}-${i}`}><a href={source.url} target="_blank" rel="noreferrer">공식 출처 {i + 1} (새 창)</a> · 확인 {source.checkedAt}<p>{source.scope ?? '기존 조사 기록'} · {source.access ?? '기존 열람 기록'}</p></li>)}</ul>
}
export function priceLabel(item: Recommendation): string {
  const p = item.plan
  return p.tier === 'free' ? 'AI 구독료 없음 · 이용 제한 별도' : p.price.amount === null ? '유료 · 금액 미확인' : `${p.billing?.currencySymbol ?? p.price.currency ?? '통화 미확인'} ${p.price.amount} / ${p.price.period === 'month' ? '월' : p.price.period === 'year' ? '년' : '주기 미확인'} · ${p.price.region}`
}
export default function RecommendationEvidence({ item }: { item: Recommendation }) {
  return <details className="recommendation-evidence"><summary>추천 근거 보기</summary>
    <h4>조건 비교와 별도 성능 평가</h4>
    <p>작업 적합성: {item.suitability}. 성능 평가의 누락은 필수 기능 지원 여부와 별개입니다.</p>
    <p>벤치마크 60% + 필수 기능 25% + 비용 15%. 서비스의 추천 정책이며 성공 확률이 아닙니다.</p>
    <dl className="calculation-list">{(Object.entries(scoreWeights) as [keyof typeof scoreWeights, number][]).map(([key, weight]) => <div key={key}><dt>{{ benchmark: '작업 평가', features: '필수 기능', cost: '비용 적합성' }[key]}</dt><dd>{item.scores[key] === null ? '미확인 · 가중치 유지' : `${item.scores[key]} × ${weight} = ${Math.round(item.scores[key]! * weight * 100) / 100}`}</dd></div>)}</dl>
    <p>총점: {item.score === null ? '보류 (누락값을 0점으로 바꾸거나 비중을 재분배하지 않음)' : `${item.score} / 100`}</p>
    <h4>평가와 비교 대상</h4>
    {!item.benchmarks.length && <p>이번 작업의 평가 정책이 없습니다.</p>}
    {item.benchmarks.map(b => <div className="benchmark-detail" key={b.evaluationId}><strong>{b.label} · 평가 내부 {b.weight * 100}%</strong><p>{b.reason}</p>{b.observation ? <>
      <p>모델: {b.observation.modelId} · 버전 {item.model?.version} · 추론 {item.model?.reasoning}</p>
      <p>평가 버전 {b.observation.version} · 원점수 {b.observation.rawScore ?? '미확인'} {b.observation.unit} · {b.observation.higherIsBetter ? '높을수록 좋음' : '낮을수록 좋음'}</p>
      <p>환경 {b.observation.environment ?? '미확인'} · 에이전트 {b.observation.agentVersion ?? '미제공'} · 모드 {b.observation.evaluationMode}</p>
      <p>기준일 {b.observation.evaluatedAt ?? '미제공'} · 표본 {b.observation.sampleSize ?? '미제공'} · 신뢰구간 {b.observation.confidenceInterval ? `${b.observation.confidenceInterval.low}–${b.observation.confidenceInterval.high} (수준 ${b.observation.confidenceInterval.level ?? '미제공'})` : '미제공'}</p>
      <p>고정 비교 집합: {b.cohort?.modelIds.join(', ')} · cohort {b.cohort?.id}. min–max 정규화 {b.normalized?.toFixed(1)}.</p><Sources sources={[b.observation.source]} />
    </> : <p>원점수·모델 버전·실행 조건: 미확인. 수치 반영 없음.</p>}</div>)}
    <h4>서비스·플랜 공식 정보</h4><p>{item.service.name} · {item.plan.name} · {priceLabel(item)} · {item.plan.price.region}</p><Sources sources={item.plan.sources} />
    <p>{item.plan.billing?.note} · 세금: {item.plan.billing?.tax ?? '미확인'}</p>
    {(Object.keys(item.plan.features) as FeatureId[]).map(id => { const feature = featureSupport(item.plan,id); return <div key={id}><strong>{featureLabels[id]}: {{ supported: '지원 확인', limited: '제한적 지원', unsupported: '미지원 확인', unknown: '미확인' }[feature.status]}</strong><p>{feature.note}</p><Sources sources={feature.sources} /></div> })}
    <h4>모델·플랜 연결</h4><p>{item.mapping.status === 'confirmed' ? '연결 근거 있음' : '연결 미확인'} · {item.mapping.note}</p><Sources sources={item.mapping.sources} />
    <h4>평가의 한계</h4><p>영어·언어 혼합 평가는 한국어 품질 검증이 아닙니다. 에이전트 환경의 성능을 채팅 서비스 전체 성능으로 해석할 수 없습니다. 고정 비교 집합의 상대 점수이며 근소한 차이와 신뢰구간으로 확실한 우위를 주장하지 않습니다.</p>
  </details>
}
