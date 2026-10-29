import type { FeatureSupport, ServicePlan, Source } from '../types'

// Supplied research report, not a live fetch. Dates below are the report's explicit
// source-reading dates; unvisited sources keep the previous evidence and conflict.
const source = (url: string, scope: string, access = '제공 조사 문서에 본문 열람 기록'): Source => ({ url, checkedAt: '2026-10-28', scope, access })
const chat = source('https://chatgpt.com/pricing/', '웹 개인 플랜 가격표 · 숫자 가격 일부 미추출')
const chatBlocked = source('https://help.openai.com/en/articles/8555545-file-uploads-faq', 'PDF 전용 제한 확인 불가', '조사 문서에 403·미열람 기록')
const google = source('https://one.google.com/intl/ko_kr/about/google-ai-plans/', '한국 Google AI Pro 월 가격 · 세금 미확인')
const googleFiles = source('https://support.google.com/gemini/answer/14903178?hl=ko', 'Gemini 웹 파일·사진·시트 분석 안내')
const googleLimits = source('https://support.google.com/gemini/answer/16275805?hl=ko', '미가입/Pro 컨텍스트·PDF 분석 안내')
const claude = source('https://claude.com/pricing', 'Free/Pro 기능·가격 · 통화코드·적용 국가 미확인')
const claudeUnread = source('https://support.claude.com/en/articles/8241126-upload-files-to-claude.md', '업로드·PDF 내용 미확인', '조사 문서에 원문 미열람 기록')
const support = (status: FeatureSupport['status'], note: string, sources: Source[]): FeatureSupport => ({ status, note, sources })

export function applyResearch(plans: ServicePlan[]): ServicePlan[] {
  return plans.map(previous => {
    const paid = previous.tier === 'paid'
    const plan: ServicePlan = { ...previous, route: '개인 웹 채팅', billing: { annualTotal: null, monthlyEquivalent: null, currencySymbol: null, tax: '미확인', note: '앱/API·지역별 결제 조건은 별도 확인' } }
    if (plan.serviceId === 'chatgpt') {
      plan.price = { amount: paid ? null : 0, currency: null, period: 'month', region: '한국 계정 제공·유료 금액·세금 미확인' }
      plan.features = {
        pdf: support('unknown', '기존 10/21 일반 파일 도움말의 PDF 지원 주장과 10/28 전용 FAQ 미열람 기록의 확인 범위가 다릅니다. 플랜별 PDF 분석·제한을 재확인하기 전에는 우선 후보로 확정하지 않습니다.', [...previous.features.pdf.sources, chatBlocked]),
        web: support('supported', '웹 가격표에서 해당 플랜의 Search 표시 확인', [chat]),
        upload: support(paid ? 'supported' : 'limited', '일반 파일 업로드. Free 제한적, Plus 확대. PDF 세부 지원과 구분.', [chat]),
        imageInput: support(paid ? 'supported' : 'limited', 'Vision 표시. 계정·사용량 제한은 별도 확인.', [chat]),
        spreadsheet: support(paid ? 'supported' : 'limited', 'Data analysis 표시. 정확한 확장자·시트·수식 처리 범위 미확인.', [chat]),
        code: support(paid ? 'supported' : 'limited', 'Data analysis 도구 표시. 언어·환경·패키지·임의 실행 범위 미확인.', [chat]),
      }
      plan.sources = [chat, ...previous.features.pdf.sources, chatBlocked]
      plan.freeScope = 'Free의 검색은 확인. 업로드·Vision·분석은 제한적이며 PDF는 근거 범위 차이로 재확인 필요.'
      plan.upgrade = '사용량이 부족할 때 Plus 범위를 확인하세요. 현재 한국 결제 금액은 미확인입니다.'
      plan.limits = ['메시지·도구의 정확한 횟수, 파일 크기·개수·스캔 PDF 처리 미확인. 텍스트 채팅 표기를 도구 무제한으로 해석하지 않음.']
    } else if (plan.serviceId === 'gemini') {
      plan.name = paid ? 'Google AI Pro' : 'Google AI 요금제 미가입'
      plan.price = { amount: paid ? 29000 : 0, currency: paid ? 'KRW' : null, period: 'month', region: paid ? '한국 페이지 · 세금 포함 여부 미확인' : 'AI 유료 요금제 미가입 구분 · 정확한 Free 상품명 미확인' }
      plan.features = {
        pdf: support(paid ? 'supported' : 'limited', 'PDF 분석 예시·파일 분석 안내 확인. 암호·스캔·표/그림 처리·페이지별 한도는 미확인. 무료 제한 안에 해당 작업이 들어오는지는 미확인.', [googleFiles, googleLimits]),
        web: support(paid ? 'supported' : 'limited', 'Deep Research 경로. 무료는 수요에 따른 제한. 일반 검색의 별도 권한표 미확인.', [google, googleLimits]),
        upload: support(paid ? 'supported' : 'limited', '프롬프트당 최대 10파일(가용성 변동), 비동영상 파일 최대 100MB. 컨텍스트는 별도 제한.', [googleFiles]),
        imageInput: support(paid ? 'supported' : 'limited', '사진 업로드·분석. 형식별 범위와 사용량은 확인 필요.', [googleFiles]),
        spreadsheet: support(paid ? 'supported' : 'limited', '시트 분석·차트 안내. 정확한 형식·수식 처리 범위 미확인.', [googleFiles]),
        code: support('limited', '시트·차트 분석은 확인. 임의 코드 실행 환경은 미확인. Colab 구독 혜택을 채팅 내 실행으로 간주하지 않음.', [google, googleFiles]),
      }
      plan.sources = [google, googleFiles, googleLimits]
      plan.freeScope = '요금제 미가입 상태에서도 PDF·사진·시트 분석 안내가 있으나 제한적입니다. 해당 파일·작업이 한도 안에 들어가는지 확인해야 합니다.'
      plan.upgrade = '사용량·컨텍스트가 부족하면 Pro를 검토하세요. 한국 월 29,000원 표시, 세금과 실제 결제 총액을 확인하세요.'
      plan.limits = [paid ? 'Pro 컨텍스트 100만 토큰 안내. 표준 대비 4배를 고정 질문 횟수로 변환하지 않음.' : '미가입 컨텍스트 32,000토큰, 수요·사용량 제한 적용.', '파일 크기·개수 한도와 전체 내용을 읽는 컨텍스트 한도는 다름. 스캔·암호 PDF 처리 미확인.']
    } else {
      plan.price = { amount: paid ? 20 : 0, currency: null, period: 'month', region: '가격표 $ 기호 확인 · ISO 통화코드·적용 국가·한국 결제액 미확인' }
      plan.billing = { annualTotal: paid ? 200 : null, monthlyEquivalent: paid ? 17 : null, currencySymbol: '$', tax: paid ? '세금 별도' : '해당 없음', note: '월 $20 또는 연 $200 선결제·월 $17 표시. 통화코드·적용 국가 미확인. 연간 월 환산은 월 결제 가격이 아님.' }
      plan.features = {
        pdf: support('unknown', '기존 서비스 수준 PDF 기록은 플랜 권한 근거가 아닙니다. 10/28 업로드 도움말 원문 미열람. PDF/스캔/페이지 제한 미확인.', [...previous.features.pdf.sources, claudeUnread]),
        web: support('supported', paid ? '가격표에 명시된 Free 포함 근거로 검색 지원 확인.' : 'Free 가격표에서 웹 검색 확인.', [claude]),
        upload: support('unknown', 'create files는 파일 생성이며 업로드 근거가 아님. 업로드 도움말 미열람.', [claudeUnread]),
        imageInput: support('unknown', '업로드 도움말 미열람. 이미지 입력 범위 미확인.', [claudeUnread]),
        spreadsheet: support('limited', '코드 실행·파일 생성은 확인. 시트 입력 형식·분석 범위 미확인.', [claude]),
        code: support('supported', 'run code 표시. 언어·환경은 미확인. Claude Code 에이전트와 채팅 실행은 별개.', [claude]),
      }
      plan.sources = [claude, ...previous.features.pdf.sources, claudeUnread]
      plan.freeScope = 'Free 검색·코드 실행 표기 확인. 파일 생성과 업로드를 구분하며 PDF는 미확인입니다.'
      plan.upgrade = '더 많은 사용량이 필요할 때 Pro 검토. 한국 가격·통화·모델 버전·정확한 할당량 확인 필요.'
      plan.limits = ['Free 사용량 제한, Pro 더 많은 사용량. 모델별 최대 컨텍스트를 모든 플랜의 보장으로 해석하지 않음. 파일 크기·개수·PDF 페이지 한도 미확인.']
    }
    return plan
  })
}
