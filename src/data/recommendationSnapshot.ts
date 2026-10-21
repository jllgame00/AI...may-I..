import type { FeatureSupport, RecommendationSnapshot, ServicePlan, Source } from '../types'
const checkedAt = '2026-10-21'
const source = (url: string): Source => ({ url, checkedAt })
const chat = source('https://chatgpt.com/pricing/')
const chatFiles = source('https://help.openai.com/en/articles/8555545-uploading-files-and-audio-to-chatgpt')
const google = source('https://gemini.google/subscriptions/')
const googleLimits = source('https://support.google.com/gemini/answer/16275805?hl=en')
const claude = source('https://claude.com/pricing')
const claudePro = source('https://support.claude.com/en/articles/8325606-what-is-the-pro-plan')
const claudeFiles = source('https://support.claude.com/en/articles/8241126-upload-files-to-claude')
const support = (status: FeatureSupport['status'], note: string, sources: Source[]): FeatureSupport => ({ status, note, sources })
const plans: ServicePlan[] = [
  ...(['free', 'paid'] as const).map(tier => ({
    id: `chatgpt-${tier === 'free' ? 'free' : 'plus'}`, serviceId: 'chatgpt' as const, name: tier === 'free' ? 'Free' : 'Plus', tier,
    price: { amount: tier === 'free' ? 0 : null, currency: null, period: 'month' as const, region: '공식 글로벌 안내 · 현지 결제 금액 미확인' },
    features: {
      pdf: support('supported', '무료·유료 PDF 첨부 지원. 계정·지역·선택 모델별 제한 적용.', [chatFiles]),
      web: support('supported', 'Free 검색 지원, Plus는 하위 플랜 기능 포함.', [chat]),
    },
    limits: [tier === 'free' ? '파일 첨부 메시지와 데이터 분석에 제한 적용. 정확한 현재 할당량은 계정에서 확인.' : '확장된 메시지·파일 첨부 제공. 무제한으로 해석하지 않음.'],
    freeScope: 'Free에서 PDF 첨부와 웹 검색을 제한 범위 안에서 시작할 수 있습니다.',
    upgrade: '첨부·사용량 한도가 부족하면 Plus의 확장 범위를 확인하세요. 월 금액은 이번 조회에서 미확인입니다.', sources: [chat, chatFiles],
  })),
  ...(['free', 'paid'] as const).map(tier => ({
    id: `gemini-${tier === 'free' ? 'free' : 'pro'}`, serviceId: 'gemini' as const, name: tier === 'free' ? 'Free' : 'Google AI Pro', tier,
    price: { amount: tier === 'free' ? 0 : 19.99, currency: 'USD', period: 'month' as const, region: '미국 안내 · 한국 결제 금액 아님' },
    features: {
      pdf: support('unknown', '파일 활용 안내는 확인했으나 PDF 형식·플랜별 도움말 접근 실패로 미확인.', [google, googleLimits]),
      web: support('supported', 'Deep Research의 검색 경로. 수요가 높으면 무료 사용이 제한될 수 있음.', [google, googleLimits]),
    },
    limits: [tier === 'free' ? '표준 사용 한도. 32k 토큰 문맥 안내.' : '무료 대비 4배 사용 한도. 1백만 토큰 문맥 안내.', '계산량 기반 한도는 5시간마다 갱신되며 주간 한도도 적용.'],
    freeScope: '무료에서 Deep Research를 제공하지만 수요에 따른 이용 제한이 있습니다. PDF는 미확인입니다.',
    upgrade: '사용량이나 더 긴 문맥이 필요하면 Google AI Pro를 검토하세요. 지역별 결제 화면을 확인하세요.', sources: [google, googleLimits],
  })),
  ...(['free', 'paid'] as const).map(tier => ({
    id: `claude-${tier === 'free' ? 'free' : 'pro'}`, serviceId: 'claude' as const, name: tier === 'free' ? 'Free' : 'Pro', tier,
    price: { amount: tier === 'free' ? 0 : 20, currency: 'USD', period: 'month' as const, region: '미국 안내 · 세금 별도 · 한국 결제 금액 미확인' },
    features: {
      pdf: support('unknown', '서비스 PDF 지원은 확인. Free/Pro 각각의 업로드 권한은 이번 조회에서 명시적 확인 부족.', [claudeFiles]),
      web: support('supported', 'Free와 Pro 기능표에서 웹 검색 지원 확인.', [claude]),
    },
    limits: [tier === 'free' ? '무료 사용 한도 적용. 정확한 메시지 수 미확인.' : 'Free보다 많은 사용량. 5시간 세션 한도와 주간 한도 적용. 정확한 메시지 수 미확인.'],
    freeScope: 'Free에서 웹 검색을 사용할 수 있습니다. PDF의 플랜별 권한은 확인이 필요합니다.',
    upgrade: '사용량 확대가 필요하면 Pro를 확인하세요. 월 USD 20은 월 결제 기준이며 연간 할인과 분리합니다.', sources: tier === 'free' ? [claude, claudeFiles] : [claude, claudeFiles, claudePro],
  })),
]

// Public, manually reviewed snapshot. No leaderboard rows or API prices are bundled.
export const recommendationSnapshot: RecommendationSnapshot = {
  version: 'official-2026-10-21', checkedAt, plans, models: [], observations: [], cohorts: [],
  mappings: plans.map(plan => ({
    id: `${plan.id}-unconfirmed`, planId: plan.id, modelId: null, status: 'unknown', selectable: false, mode: null,
    note: '플랜의 모델군 안내만으로 정확한 평가 모델 ID·버전·추론 설정을 연결할 수 없습니다. 이용 화면에서 모델·모드를 확인하세요.', sources: plan.sources.slice(0, 1),
  })),
  sources: [
    { ...source('https://artificialanalysis.ai/methodology/intelligence-benchmarking'), name: 'Artificial Analysis 방법론', status: '방법론 확인 · 수치 미포함', note: '문서·장문·사실 정확성·코딩 평가 선정. 한국어 품질 검증 아님.' },
    { ...source('https://artificialanalysis.ai/data-api/docs'), name: 'Artificial Analysis API', status: '인증·공개 이용 권한 미확보', note: 'API 키는 갱신 환경에서만 사용. 문서 예제는 관측값이 아님.' },
    { ...source('https://artificialanalysis.ai/data-api'), name: 'Artificial Analysis 이용 범위', status: '재배포 권한 확인 필요', note: '무료 API의 내부 사용과 공개 재배포 권한을 구분.' },
    { ...source('https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf'), name: 'Artificial Analysis Data Platform 약관', status: '제품 이용 동의 미확보', note: '원자료 공개와 모델 선택 가이드 이용에 관한 허가를 확인해야 함. 구독만으로 허가를 추정하지 않음.' },
    { ...source('https://arena.ai/blog/arena-rank'), name: 'Arena-Rank 방법론', status: '방법론 확인', note: '방법론 코드 라이선스가 리더보드 데이터 허가는 아님.' },
    { ...source('https://arena.ai/leaderboard/chat/text/creative-writing'), name: 'Arena Creative Writing', status: '수치 미포함', note: '추출·재사용 허가 미확보. 사용자 선호를 한국어 정확성으로 해석하지 않음.' },
    { ...source('https://help.arena.ai/articles/5629909088-terms-of-use'), name: 'Arena 이용 조건', status: '추출 제한 확인', note: '리더보드 수치·모델 목록을 제품으로 추출하지 않음.' },
    { ...source('https://www.swebench.com/verified.html'), name: 'SWE-bench Verified', status: '방법론 확인 · 수치 미포함', note: '500개 문제. 에이전트 버전이 다른 실행은 섞지 않음.' },
    { ...source('https://github.com/SWE-bench/experiments'), name: 'SWE-bench 공식 실험', status: '결과 재배포 권한 미확인', note: '공개 저장소만으로 결과 라이선스나 서비스 플랜 연결을 추정하지 않음.' },
  ],
}
