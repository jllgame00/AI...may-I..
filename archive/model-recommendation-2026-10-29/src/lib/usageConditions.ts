import type { Recommendation } from '../recommendationTypes'

// Usage information only. Never consumed by recommendation eligibility/order.
export function planPrice(c:Recommendation):string {
  if(c.plan.unassigned)return c.mapping.routeKind==='api'?'API 경로 · 요금·무료 제공 범위 미확인 (월 구독료와 별개)':'플랜·가격·사용 한도 미확인 · 무료 이용을 보장하지 않음'
  if(c.plan.billingKind==='usage') {
    const p=c.model?.apiPrice
    return p?`유료 API 사용량 과금 · 입력 USD ${p.input} / 캐시 입력 USD ${p.cachedInput} / 출력 USD ${p.output} (각 100만 토큰당) · 월 구독료 아님`:'유료 API 사용량 과금 · 가격 미확인'
  }
  if(c.plan.tier==='free')return '무료 플랜 · AI 구독료 없음 (이용 한도 별도)'
  const p=c.plan.price
  return `유료 구독 · ${c.plan.billing?.currencySymbol ?? p.currency ?? '통화 미확인'} ${p.amount ?? '금액 미확인'} / ${p.period==='month'?'월':p.period==='year'?'년':'주기 미확인'} · ${p.region}`
}
