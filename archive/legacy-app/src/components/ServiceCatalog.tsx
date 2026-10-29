import { catalogById, researchCoverage, searchCatalog } from '../data/catalog'
import { recommendationSnapshot } from '../data/recommendationSnapshot'
import { featureLabels } from '../data/recommendationPolicy'
import { featureSupport } from '../lib/recommend'
import { toggleComparison } from '../lib/taskSession'
import type { CatalogService, CatalogServiceId, FeatureId, ServicePlan } from '../types'

export interface CatalogState { query: string; status: string; route: string; detail: CatalogServiceId | null; compare: string[]; message: string }
export const initialCatalog: CatalogState = { query: '', status: '', route: '', detail: null, compare: [], message: '' }
export function planPrice(p: ServicePlan): string {
  return p.tier === 'free' ? 'AI 구독료 없음 · 이용 한도 별도' : `${p.billing?.currencySymbol ?? p.price.currency ?? '통화 미확인'} ${p.price.amount ?? '금액 미확인'} / ${p.price.period === 'month' ? '월' : '주기 미확인'} · ${p.price.region}`
}
function Sources({ plan }: { plan: ServicePlan }) {
  return <ul className="source-list">{plan.sources.map((s,i) => <li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noreferrer">공식 근거 {i+1} (새 창)</a> · {s.checkedAt}<p>{s.scope ?? '기존 공식 조사 기록'} · {s.access ?? '기존 열람 기록'}</p></li>)}</ul>
}
export default function ServiceCatalog({ state, onChange, onPrepare, onTask }: { state: CatalogState; onChange: (state: CatalogState) => void; onPrepare: (service: CatalogService, plan?: ServicePlan) => void; onTask: () => void }) {
  const items = searchCatalog(state.query,state.status,state.route)
  const detail = state.detail ? catalogById[state.detail] : null
  const plans = recommendationSnapshot.plans
  const comparison = state.compare.map(id => plans.find(p => p.id === id)!).filter(Boolean)
  const toggle = (id: string) => {
    const blocked = state.compare.length === 3 && !state.compare.includes(id)
    onChange({ ...state, compare: toggleComparison(state.compare,id), message: blocked ? '최대 3개 조합까지 비교할 수 있어요. 먼저 하나를 해제해 주세요.' : '' })
  }
  const planCard = (plan: ServicePlan) => <article className="catalog-plan" key={plan.id}><h3>{plan.name}</h3><p>{plan.route ?? '경로 미확인'} · {planPrice(plan)}</p><p>{plan.billing?.note} · 세금: {plan.billing?.tax ?? '미확인'}</p><p>무료 범위: {plan.freeScope}</p><p>유료 고려: {plan.upgrade}</p><p>{plan.limits.join(' ')}</p>
    <dl>{(Object.keys(featureLabels) as FeatureId[]).map(id => { const f = featureSupport(plan,id); return <div key={id}><dt>{featureLabels[id]} · {f.status === 'supported' ? '문서상 지원' : f.status === 'limited' ? '제한적 지원' : f.status === 'unsupported' ? '미지원 확인' : '미확인'}</dt><dd>{f.note}</dd></div> })}</dl><Sources plan={plan} />
    <div className="page-actions"><button className="secondary-button" aria-pressed={state.compare.includes(plan.id)} onClick={() => toggle(plan.id)}>{state.compare.includes(plan.id) ? '✓ 비교에서 빼기' : '비교에 추가'}</button><button className="primary-button" onClick={() => onPrepare(catalogById[plan.serviceId],plan)}>이 플랜으로 초안 준비</button></div></article>
  return <div className="page-enter"><div className="page-intro compact"><h1 tabIndex={-1}>서비스부터 둘러보기</h1><p>후보 {researchCoverage.candidates}개 · 첫 상세 조사 묶음 {researchCoverage.firstBatch}개 모두 부분 조사 · 필수 항목 전체 확인 완료 {researchCoverage.fullyChecked}개</p><p>확대 조사 원본은 미확보입니다. 상세 근거를 읽은 3개 외에는 후보 등록 상태로 열람할 수 있어요. 탐색 태그는 기능 지원 인증이 아닙니다.</p></div>
    <div className="catalog-filters panel"><label>이름·별칭·제공사 검색<input type="search" value={state.query} onChange={e => onChange({ ...state, query: e.target.value })} /></label><label>조사 상태<select value={state.status} onChange={e => onChange({ ...state, status: e.target.value })}><option value="">전체 (미확인 포함)</option>{['후보 등록','일부 정보 확인','주요 정보 확인','접근 확인 필요','제공 종료 확인'].map(s => <option key={s}>{s}</option>)}</select></label><label>이용 경로<select value={state.route} onChange={e => onChange({ ...state, route: e.target.value })}><option value="">전체</option><option value="개인 웹 채팅">개인 웹 채팅 확인</option><option value="미확인">상세 경로 미확인</option></select></label><button className="secondary-button" onClick={() => onChange({ ...state, query: '', status: '', route: '' })}>필터 초기화</button></div>
    <p role="status" aria-live="polite">{items.length}개 서비스 · 이름순</p>
    {!items.length && <p className="empty-state">검색 조건에 맞는 등록 서비스를 찾지 못했어요. 필터를 초기화해 보세요.</p>}
    <div className="catalog-grid">{items.map(s => <article className="panel catalog-card" key={s.id}><h2>{s.name}</h2><p>{s.provider} · {s.aliases.join(' / ')}</p><p><strong>조사 상태: {s.researchStatus}</strong></p><p>{s.routes}</p><p>핵심 미확인: {s.unknowns}</p><p>탐색 태그: {s.tags.join(' · ')} (지원 기능 근거 아님)</p><button className="secondary-button" onClick={() => { onChange({ ...state, detail: s.id }); requestAnimationFrame(() => document.getElementById('catalog-detail')?.focus()) }}>{s.name} 상세 보기</button></article>)}</div>
    {detail && <section className="panel catalog-detail" aria-label={`${detail.name} 상세`}><h2 id="catalog-detail" tabIndex={-1}>{detail.name} 상세</h2><p>{detail.researchStatus} · {detail.routes}</p><p>{detail.unknowns}</p><a href={detail.url} target="_blank" rel="noreferrer">공식 홈페이지 열기 (새 창 · 실시간 검증 아님)</a>
      {detail.id === 'mistral' && <p>사용자 명세의 ‘Mistral Vibe(구 Le Chat)’ 명칭으로 등록했습니다. 명칭 전환·이용 경로의 공식 확인은 보류합니다.</p>}
      {plans.filter(p => p.serviceId === detail.id).length ? plans.filter(p => p.serviceId === detail.id).map(planCard) : <div className="empty-state"><p>정확한 플랜·가격·지원 기능 미확인입니다. 가상 무료 플랜을 만들지 않았습니다.</p><p>일반 초안은 준비할 수 있지만 서비스별 기능 적합성 검증은 완료되지 않았어요.</p><button className="secondary-button" onClick={() => onPrepare(detail)}>일반 초안 준비하기</button></div>}
      <button className="secondary-button" onClick={onTask}>작업 설정으로 이동</button></section>}
    <section className="panel comparison-panel"><h2>서비스+플랜 비교 ({comparison.length}/3)</h2><p role="status">{state.message}</p>{!comparison.length && <p>상세 화면에서 정확한 플랜을 비교에 추가하세요.</p>}
      {comparison.map(p => <button key={p.id} className="secondary-button" onClick={() => toggle(p.id)}>{catalogById[p.serviceId].name} · {p.name} ×</button>)}
      {!!comparison.length && <div className="comparison-fields">{['가격·결제', ...Object.keys(featureLabels), '중요 제한', '출처·확인일'].map(field => <section key={field}><h3>{field in featureLabels ? featureLabels[field as FeatureId] : field}</h3>{comparison.map(p => <div key={p.id}><strong>{catalogById[p.serviceId].name} · {p.name}</strong>{field === '가격·결제' ? <p>{planPrice(p)}<br />{p.billing?.note} · 세금: {p.billing?.tax ?? '미확인'}</p> : field === '중요 제한' ? <p>{p.limits.join(' ')}</p> : field === '출처·확인일' ? <Sources plan={p} /> : <p>{({ supported: '지원', limited: '제한적 지원', unsupported: '미지원 확인', unknown: '미확인' })[featureSupport(p,field as FeatureId).status]} · {featureSupport(p,field as FeatureId).note}</p>}</div>)}</section>)}</div>}
    </section>
  </div>
}
