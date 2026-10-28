import type { FeatureSupport, RecommendationSnapshot, ServicePlan, Source } from '../recommendationTypes'
import { applyResearch } from './researchOverlay.ts'
import { researchedModels, researchedEvaluations, expandedResearchSources } from './researchCatalog.ts'
import { operatorEvaluations, automationConfiguration } from './operatorEvaluations.ts'
import { providerComparisonEvaluations, markProviderComparison } from './providerComparisons.ts'
import aaVerified from './research/aa-verified.json' with {type:'json'}
import {publicAAObservations} from '../lib/aaSnapshot.ts'
import { apiPlans, currentEvaluations, currentMappings, currentModels, currentResearchSources, MODEL_CHECKED_AT, reviewedPlans } from './currentModels.ts'
const checkedAt = '2026-10-21'
const source = (url: string): Source => ({ url, checkedAt })
const chat = source('https://chatgpt.com/pricing/')
const chatFiles = source('https://help.openai.com/en/articles/8555545-uploading-files-and-audio-to-chatgpt')
const google = source('https://gemini.google/subscriptions/')
const googleLimits = source('https://support.google.com/gemini/answer/16275805?hl=en')
const claude = source('https://claude.com/pricing')
const claudePro = source('https://support.claude.com/en/articles/8325606-what-is-the-pro-plan')
const claudeFiles = source('https://support.claude.com/en/articles/8241126-upload-files-to-claude')
const mappingEvidence = {
  chatgpt: { source: source('https://help.openai.com/en/articles/6825453-chatgpt-release-notes'), note: 'GPT-5.2의 2026-06-12 ChatGPT 제공 종료 확인. 과거 API 평가를 현재 Free/Plus 모델에 연결하지 않음. 현재 평가 ID·추론 설정 연결은 미확인.' },
  gemini: { source: source('https://support.google.com/gemini/answer/18648722?hl=en'), note: '무료 Auto/Flash-Lite 및 유료 모델·사고 수준 선택 안내 확인. 자동 선택·한도 도달 시 모델 변경이 가능하며, 안내의 모델군과 평가 버전 ID·실행 설정 일치는 미확인.' },
  claude: { source: source('https://support.claude.com/en/articles/12138966-release-notes'), note: '현재 모델군 출시 안내와 Pro의 추가 모델 제공은 확인. 과거 API 평가 버전·추론 설정을 현재 Free/Pro 채팅 환경과 동일하다고 확인할 근거는 미확보.' },
}
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
const previousSnapshot: RecommendationSnapshot = {
  version: 'official-2026-10-21+supplied-research-2026-10-28', checkedAt, plans: applyResearch(plans), models: [], observations: [], cohorts: [],
  mappings: plans.map(plan => ({
    id: `${plan.id}-unconfirmed`, planId: plan.id, modelId: null, status: 'unknown', selectable: false, mode: null,
    note: mappingEvidence[plan.serviceId as keyof typeof mappingEvidence].note, sources: [plan.sources[0], mappingEvidence[plan.serviceId as keyof typeof mappingEvidence].source],
  })),
  sources: [
    { ...source('https://artificialanalysis.ai/methodology/intelligence-benchmarking'), name: 'Artificial Analysis 방법론', status: '방법론 확인 · 수치 미포함', note: '문서·장문·사실 정확성·코딩 평가 선정. 한국어 품질 검증 아님.' },
    { ...source('https://artificialanalysis.ai/data-api/docs'), name: 'Artificial Analysis API', status: '문서 접근 성공 · 인증 데이터 미요청', note: '공식 REST 경로와 x-api-key 인증 확인. 키가 없어 실응답은 받지 않았으며 문서 예제는 관측값이 아님.' },
    { ...source('https://artificialanalysis.ai/data-api'), name: 'Artificial Analysis 이용 범위', status: '재배포 권한 확인 필요', note: '무료 API의 내부 사용과 공개 재배포 권한을 구분.' },
    { ...source('https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf'), name: 'Artificial Analysis Data Platform 약관', status: '제품 이용 동의 미확보', note: '원자료 공개와 모델 선택 가이드 이용에 관한 허가를 확인해야 함. 구독만으로 허가를 추정하지 않음.' },
    { ...source('https://arena.ai/blog/arena-rank'), name: 'Arena-Rank 방법론', status: '방법론 확인', note: '방법론 코드 라이선스가 리더보드 데이터 허가는 아님.' },
    { ...source('https://arena.ai/leaderboard/chat/text/creative-writing'), name: 'Arena Creative Writing', status: '수치 미포함', note: '추출·재사용 허가 미확보. 사용자 선호를 한국어 정확성으로 해석하지 않음.' },
    { ...source('https://help.arena.ai/articles/5629909088-terms-of-use'), name: 'Arena 웹 이용 조건', status: '웹 추출 제한 확인', note: '웹 리더보드 추출과 별도 라이선스로 공개된 Hugging Face 데이터셋을 구분.' },
    { ...source('https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k/blob/main/README.md'), name: 'Arena 공식 공개 선호도 데이터', status: 'CC-BY-4.0 표기 확인 · 평가 수치 미산출', note: '투표·카테고리 데이터 공개. 모델 출력은 제공사 약관 적용. 실행 설정과 현재 Creative Writing 평가의 동일성이 미확인이라 추천 점수로 대체하지 않음.' },
    { ...source('https://huggingface.co/datasets/livebench/model_judgment/blob/main/README.md'), name: 'LiveBench 공식 모델 판정 데이터', status: '공개 파일·행 확인 · 데이터 라이선스 미기재', note: 'leaderboard Parquet 공개 경로 확인. 코드 라이선스를 별도 호스팅된 판정 데이터에 자동 적용하지 않음. 금지로 판정한 것은 아님.' },
    { ...source('https://huggingface.co/datasets/livebench/model_judgment/discussions/2'), name: 'LiveBench 데이터 라이선스 문의 기록', status: '공개 문의에 답변 미확인', note: '2024-09-17 License File 문의에 확인 가능한 답변 없음. 외부 문의를 새로 전송하지 않음.' },
    { ...source('https://www.swebench.com/verified.html'), name: 'SWE-bench Verified', status: '방법론 확인 · 수치 미포함', note: '500개 문제. 에이전트 버전이 다른 실행은 섞지 않음.' },
    { ...source('https://github.com/SWE-bench/experiments'), name: 'SWE-bench 공식 실험', status: '개별 결과 접근 성공 · 재배포 범위 미확인', note: 'mini-SWE-agent 2.0.0의 두 metadata.yaml과 인스턴스 결과 확인. 결과 라이선스, 실행 설정의 완전한 동일성, 현재 플랜 연결은 미확인.' },
  ],
}

export const recommendationSnapshot: RecommendationSnapshot = {
  ...previousSnapshot, version:'multi-provider-evidence-2026-10-28',checkedAt:MODEL_CHECKED_AT,
  plans:[...reviewedPlans(previousSnapshot.plans),...apiPlans()],models:[...currentModels,...researchedModels],
  mappings:currentMappings(previousSnapshot.mappings),evaluations:[...currentEvaluations.map(e=>e.benchmark==='AutomationBench'?automationConfiguration(e):{...e,evaluationType:e.domain==='coding'||e.domain==='science'?'agent' as const:'model' as const,agentName:null,agentVersion:null}),...researchedEvaluations.map(markProviderComparison),...operatorEvaluations,...providerComparisonEvaluations,...publicAAObservations(aaVerified,[...currentModels,...researchedModels])],
  sources:[...expandedResearchSources,...currentResearchSources,...previousSnapshot.sources],
}
