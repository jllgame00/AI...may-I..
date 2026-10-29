# 회사 중심 추천 전환 완료 보고

> 후속 제품 화면 정리·58개 테스트·빌드 `EPERM` 진단과 브라우저 미실행 범위는 [제품 검증 보고서](provider-product-validation-report.md)에 기록했습니다. 아래 본문은 최초 리팩토링 실행 기록으로 보존합니다. 이후 화면은 개별 모델 정보와 상세 플랜 가격 비교를 표시하지 않습니다.

생성 2026-10-29T05:12:55.734Z. 정책 provider-evidence-v1, 데이터 provider-catalog-2026-10-29-v1.

**모델별 점수·순위·가중치·fallback을 활성 추천 경로에서 제거하고, 회사 → 서비스 → 플랜 → 기능/공식 근거로 교체했다. 현재 직접 작업 품질 근거가 부족해 종합점수와 확정 순위는 만들지 않으며, 확인된 필수 조건을 통과한 회사만 공동 우선 후보로 표시한다.**

[변경 전 조사·유지/수정/제거/역사 보존 분류](provider-recommendation-audit.md), [현재 데이터·판정 정책](provider-recommendation-policy.md), [실제 7개 사례·단계별 프롬프트·선택·검증 JSON](provider-recommendation-cases.json).

## 기존 문제와 정리 결과

기존 후보는 회사가 아니라 모델·버전·모드·API/웹 mapping 조합이었다. taskRanking/codingMetricFit는 특정 Qwen/Grok 표를 작업 대표 순위로 골랐고 weightedRecommendation은 지원 여부를 100/0과 파일 첨부1:나머지2의 비중으로 계산했다. 모델이 없는 서비스의 후순위 처리, 과거 원점수 대표 집합과 추정 score artifact가 현재 작업 선택에 섞일 수 있었다. Free 기능과 서비스/모델 범위도 여러 overlay에서 합쳐졌다.

변경 전 106개 파일(기존 미커밋 수정 및 이전 턴의 추정 코드 포함)을 archive/model-recommendation-2026-10-29에 원본 바이트와 SHA-256 manifest로 보존했다. 28개 모델·111건 평가는 역사 자료로 남겼다. 구형 recommend/weightedRecommendation/taskRanking/evidenceComparisons/scoreEstimation/modelAccess 및 관련 타입·설정·모델 카드·기대 순위 테스트는 활성 src에서 제거했다. active import graph가 이 코드에 도달하지 않는 테스트와 보존 파일 해시 검사가 있다. 원본 README와 별도 ARCHIVE-NOTES를 구분한다.

변경 전부터 존재한 미커밋 작업을 없애지 않았다. 전체 복사본과 working-tree-before.patch가 보관되어 있다. 구형 수집기는 자동 호출되지 않으며 새 회사 자료의 복구 fallback으로도 쓰이지 않는다. 옛 README/설계/점수 보고서는 당시 구현 기록이다.

## 새 데이터와 알고리즘

Provider 12개, Service 13개, Plan 18개. Google의 Gemini/NotebookLM은 하나의 회사 ID에 연결한다. 주요 12개 회사·13개 서비스의 누락/중복·고아 관계를 데이터 검증에서 탐지한다. 모델 추가·삭제 및 임의의 과거 benchmark 변경으로 현재 결과가 달라지지 않는 테스트를 실행했다.

신규 요구 분석은 입력/출력 형식·문항 초안/실제 폼·코드 생성/실행·이미지 입력/생성·PDF 업로드/분석/생성을 구분한다. 필수/선호 기능, 무료 조건·월 예산·통화·국가, 명시된 크기·개수·분량을 추출한다. 미입력은 null, 질문은 최대3개이며 화면에서 수정한다. 규칙 기반이며 새 유료 LLM API를 사용하지 않는다.

각 실제 플랜의 필수 기능과 scope가 일치하는 reviewed Evidence부터 확인한다. unknown·미해결 limited·명시한 처리량의 용량 근거 부족은 조건부다. 명시적 unsupported·확인된 한도 초과·무료 조건에 유료 플랜은 제외한다. 무료에서 유료 기능을 빌리지 않으며 PDF 분석과 XLSX 생성에서 역으로 업로드 지원을 추정하지 않는다. 통화/국가/월 청구액/세금 총액이 불명확하면 유료 예산 충족을 확정하지 않는다.

동일 회사 안의 실제 플랜 대안에서 gate 통과·확인된 기능/선호 기능·무료 경로·중립 ID 순으로 대표를 고른다. 회사 사이의 품질 점수나 브랜드 보너스가 아니다. 공동 후보는 회사명 중립 순서로 최대3개를 먼저 표시하고 나머지를 접는다. 조건부/제외 후보는 별도다. 전체 작업을 수행할 단일 플랜이 없어도 각 단계의 실제 플랜을 비교할 수 있으며 서로 다른 서비스 기능을 합쳐 가상의 플랜을 만들지 않는다.

새 가중치는 제안된 40/30/20/10을 providerPolicy 한 곳에서 관리한다. 실증 보정되지 않았다. 내부 fit=100은 필수 gate의 정책 코딩이며 UI에 품질 점수로 표시하지 않는다. 직접 작업 품질·비용 우열·편의 실측이 없으므로 나머지 항목과 총점/순위는 null이다. 구형 가중치·모델 평균/최댓값·이전 버전 상속·누락0·남은 비중 재분배는 사용하지 않는다.

Model은 보조 plan-reference 타입으로 분리했으며 현재 활성 목록은 비어 있다. 개별 릴리스의 현재 플랜 제공을 새로 검증하지 않았기 때문이다. 원본 28개 모델의 버전·모드·이용 경로는 역사 데이터에 그대로 남아 있다. 현재 카드 상세는 서비스에서 실제 선택 가능 모델을 확인하도록 안내하며 구버전 모델을 회사 성능으로 표시하지 않는다.

## 실제 작업 사례와 선택/프롬프트 검증

실제 앱 함수와 React 서버 렌더링으로 다음 작업을 수행했다. 입력·조건 분석 → 회사 비교 → 실제 서비스/플랜 ID 선택 → 각 단계 프롬프트 생성 → 편집·조건 변경 보존 → 재생성/이전 초안 복구 → copyText의 성공/실패 writer를 실행했다. 이는 외부 AI 서비스에서 실제 파일을 처리했다는 뜻이 아니다. 브라우저 이벤트·OS 클립보드는 미실행이다.

| 작업 | 공동 우선 후보(표시 순서는 성능 순위 아님) | 조건부 회사 수 | 실제 선택 경로 | 단계 수 |
| --- | --- | --- | --- | --- |
| 설문 문항 작성 | Anthropic / Claude Free; Google / Gemini Free; OpenAI / ChatGPT Free | 9 | writing: Anthropic / Claude Free (eligible) | 3 |
| 기존 XLSX 분석 | Anthropic / Claude Free; OpenAI / ChatGPT Plus | 10 | analysis: Anthropic / Claude Free (eligible) | 2 |
| PDF 논문 분석 | 없음 | 12 | analysis: Anthropic / Claude Free (conditional) | 2 |
| 발표 대본 | Anthropic / Claude Free; Google / Gemini Free; OpenAI / ChatGPT Free | 9 | writing: Anthropic / Claude Free (eligible) | 3 |
| 코드 오류 분석 | Anthropic / Claude Free; Google / Gemini Free; OpenAI / ChatGPT Free | 9 | coding: Anthropic / Claude Free (eligible) | 3 |
| 이미지 생성 | Adobe / Adobe Firefly Standard; Google / Gemini Google AI Pro; OpenAI / ChatGPT Plus | 8 | image: Adobe / Adobe Firefly Standard (eligible) | 1 |
| 복합 작업 | Anthropic / Claude Free | 11 | analysis: Anthropic / Claude Free (eligible); slides: Anthropic / Claude Free (eligible); writing: Anthropic / Claude Free (eligible) | 6 |

### 설문 문항 작성

입력: 대학생의 학습 만족도 설문 문항을 작성해줘

필수 기능: textGeneration, surveyDraft. 점수·순위: 모두 null.

단계: 설문 설계 [writing] → 설문 문항 초안 [writing] → 문항 검토 [writing]. 원문·편집 초안·선택 context 및 접힘 상태의 SSR/함수 assertion 통과.

### 기존 XLSX 분석

입력: 기존 XLSX 설문 결과를 분석하고 학년별 차이를 설명해줘

필수 기능: fileUpload, spreadsheetAnalysis, codeExecution. 점수·순위: 모두 null.

단계: 통계 분석 [analysis] → 결과 해석 [analysis]. 원문·편집 초안·선택 context 및 접힘 상태의 SSR/함수 assertion 통과.

### PDF 논문 분석

입력: PDF 논문을 업로드해서 핵심 주장과 한계를 분석해줘

필수 기능: fileUpload, pdfUpload, pdfAnalysis. 점수·순위: 모두 null.

단계: 자료 분석 [analysis] → 결과 검토 [analysis]. 원문·편집 초안·선택 context 및 접힘 상태의 SSR/함수 assertion 통과.

### 발표 대본

입력: 대학생 대상 5분 발표 대본을 작성해줘

필수 기능: textGeneration. 점수·순위: 모두 null.

단계: 메시지 구성 [writing] → 글·대본 초안 [writing] → 검토·다듬기 [writing]. 원문·편집 초안·선택 context 및 접힘 상태의 SSR/함수 assertion 통과.

### 코드 오류 분석

입력: React 코드 오류의 원인을 분석하고 수정안과 테스트를 작성해줘

필수 기능: codeGeneration. 점수·순위: 모두 null.

단계: 원인 분석 [coding] → 코드 수정 [coding] → 테스트·검토 [coding]. 원문·편집 초안·선택 context 및 접힘 상태의 SSR/함수 assertion 통과.

### 이미지 생성

입력: 교내 환경 캠페인 포스터 이미지를 생성해줘

필수 기능: imageGeneration. 점수·순위: 모두 null.

단계: 이미지 생성 [image]. 원문·편집 초안·선택 context 및 접힘 상태의 SSR/함수 assertion 통과.

### 복합 작업

입력: 기존 XLSX 설문 결과를 분석하고 발표자료를 만들고 발표 대본을 작성해줘

필수 기능: fileUpload, spreadsheetAnalysis, codeExecution, slidesCreation, textGeneration. 점수·순위: 모두 null.

단계: 통계 분석 [analysis] → 결과 해석 [analysis] → 발표자료 만들기 [slides] → 메시지 구성 [writing] → 글·대본 초안 [writing] → 검토·다듬기 [writing]. 원문·편집 초안·선택 context 및 접힘 상태의 SSR/함수 assertion 통과.

단계별 회사 변경은 해당 작업 또는 해당 단계에만 적용한다. 비교 화면 복귀 후 다른 작업 선택을 삭제하지 않는다. 기존 default 경로는 단계 필수 기능이 확인된 경우만 상속하고, 미확인 기능에 자동 적용하지 않는다. 같은 회사/서비스가 호환되면 계속 사용할 수 있고 자동 추가 구독·결제·서비스 전환을 하지 않는다.

## 공식 근거 범위와 부족한 회사·플랜

기존 유효한 웹 서비스 조사 기록은 원본으로 보존했고 현재 가격/Free 범위가 불명확한 숫자를 그대로 새 정책에 이월하지 않았다. 이번에는 ChatGPT/Claude/Gemini/Firefly/Runway의 공식 가격·기능 페이지와 도움말을 수동 열람했다. OpenAI/Anthropic/Google의 모델 벤치마크는 반입하지 않았다. 최신 자동 수집 완료로 표시하지 않는다.

| 공식 확인 출처 | 확인일 | 적용 범위 |
| --- | --- | --- |
| [chatgpt-pricing](https://chatgpt.com/pricing/) | 2026-10-29 | Free/Plus 텍스트 채팅, Free 첨부·이미지 생성·분석 제한 및 Plus 확대. 이번 응답에서 숫자 월 가격 미추출. |
| [chatgpt-data](https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt) | 2026-10-29 | XLSX/CSV/PDF 업로드·코드 기반 데이터 분석. 형식은 플랜/계정별로 달라질 수 있어 가격표와 조합하며 PDF 플랜별 범위는 미확인으로 유지. |
| [chatgpt-overview](https://chatgpt.com/overview/) | 2026-10-29 | 텍스트 작성·코드 작성/디버깅 사용 사례. 웹 텍스트 채팅 권한과 조합한 용도, 작업 품질 평가는 아님. |
| [claude-pricing](https://claude.com/pricing) | 2026-10-29 | Free 웹 대화·웹 검색·파일 생성·코드 실행 및 Pro 포함. 월 $20/연 $200; 지역·ISO 통화·세금 총액 별도. |
| [claude-files](https://support.claude.com/en/articles/8241126-upload-files-to-claude) | 2026-10-29 | 웹 PDF/CSV/XLSX 첨부. XLSX는 코드 실행·파일 생성 활성화 필요. |
| [claude-execution](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude) | 2026-10-29 | 코드 실행·파일 생성과 업로드 자료 분석, Excel·PowerPoint 생성. Free/Pro 제공과 계정 활성화·사용량 별도. |
| [gemini-pricing](https://one.google.com/intl/ko_kr/about/google-ai-plans/) | 2026-10-29 | Google AI Pro와 Gemini 앱의 글·보고서 활용 및 이미지 생성 확대. 이번 읽기에서 정확한 한국 가격 숫자 미확보. |
| [gemini-subscriptions](https://gemini.google/subscriptions/) | 2026-10-29 | Free Google 계정 $0/월, 일상 작업·Canvas·이미지 생성. Pro는 Free 포함. 미국 페이지이며 국가별 제공 조건 별도. |
| [gemini-files](https://support.google.com/gemini/answer/14903178?hl=en) | 2026-10-29 | Gemini 개인 웹의 파일·문서·시트 분석. 무료 사용량 제한, 정확한 확장자·계산 런타임은 별도 확인. |
| [gemini-limits](https://support.google.com/gemini/answer/16275805?hl=ko) | 2026-10-28 | 저장된 공식 개인 미가입/Pro 기능·파일 한도 검토. 일반 업로드와 임의 코드 실행은 구분. |
| [firefly-pricing](https://www.adobe.com/products/firefly/plans.html) | 2026-10-29 | 무료 일일 생성 제한. Standard 표준 이미지 생성/벡터 기능과 premium 크레딧 구분. 응답 가격은 일본 JPY 1580/월·세금 포함, 한국 가격 아님. |
| [runway-pricing](https://runway.com/pricing) | 2026-10-29 | Free 125 일회성 크레딧. Standard 이미지/영상 생성, 월 $15와 연간 월 환산 $12 구분. 국가/세금 미확인. |
| [claude-artifacts](https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them) | 2026-10-29 | Free/Pro 웹 대화의 Artifacts에서 코드·단일 페이지 웹·도구를 생성/편집. 코드 실행과 별개의 코드 작성 용도. |
| [gemini-canvas](https://gemini.google/overview/canvas/) | 2026-10-29 | 모든 Gemini 사용자의 Canvas에서 코드 생성·문서 작성. 실행 런타임/저장소 자동 접근을 보장하지 않음. |

xAI/Grok, DeepSeek, Alibaba/Qwen, Moonshot/Kimi, Perplexity, Microsoft/Copilot, Mistral 서비스 및 NotebookLM의 현재 세부 웹 플랜/기능/무료 권한은 이관 가능한 충분한 검토 자료가 없어 unknown plan으로 남았다. 회사 등록은 유지된다. NotebookLM/Gemini Notebook 및 Le Chat/Vibe 명칭·경로 전환도 별도 확인 사항이다. 타사의 광범위한 제품 소개나 API 기능을 개인 무료 웹 플랜에 복사하지 않았다.

PDF 논문의 현재 전체 처리 범위·페이지·스캔/도표 조건은 미확인이라 기본 입력에서는 공동 우선 후보가 없다. 명시한 대용량/파일 수/행 수는 별도 확인한다. 실제 설문 폼 배포·출처 검증 성공·임의 코드 런타임·특정 저장소 접근은 문항 작성·검색·코드 생성과 다르며 현재 근거로 확정하지 않는다. Firefly 가격은 일본 JPY 표기이고 한국 가격으로 표시하지 않는다. Claude/Runway의 $ 기호는 근거 없이 ISO 통화로 보정하지 않는다.

## 변경 파일과 유지 범위

- 새 데이터/정책/타입: src/providerTypes.ts, src/data/provider-catalog.json, providerCatalog.ts, providerPolicy.ts; scripts/provider-catalog-seed.ts는 새 Provider 복구 seed.
- 새 분석/판정: src/lib/providerRequirements.ts, providerRecommendation.ts, providerValidation.ts.
- 연결 변경: App.tsx, types.ts, aiGuide.ts, AnalysisPanel/CandidateComparison/StageWorkspace; workStages의 일반 글 입력 안내를 비홍보 작업에도 맞춤.
- 유지: main.tsx·styles.css·Vite Pages base, PromptEditor/ConditionFields, promptEngine/promptSession/surveyTask의 원문·편집·복사·복구 구조. 스타일·레이아웃의 무관한 리디자인 없음.
- 유지보수/테스트: scripts/provider-data-core.ts, refresh-data.mts, provider-report.mjs, 신규 단위·보존/import 격리·SSR 테스트, 갱신된 browser-check.mjs. 옛 전체 테스트는 보존본에 격리.
- README·현재 정책·변경 전 조사·이 보고서·사례 JSON. 기존 연구 문서/원문/기록은 삭제하지 않음.
- Pages schedule/base/권한/배포 작업은 유지하고, 실행하지 않은 수집을 암시하던 단계 이름만 새 수동 검토 스냅샷 검증/보존으로 수정. 워크플로를 실행하지 않음.

## 데이터 갱신·복구와 검증 결과

`data:refresh`는 새 Provider 스냅샷만 검증·보존하고 출처 날짜를 갱신하거나 원격 수집하지 않는다. `--import <reviewed.json>`은 검토된 전체 스냅샷의 schema/관계/근거 검증 후 저장한다. `data:restore`는 새 Provider 복구본/seed만 사용한다. 임시 파일→rename 저장, 잘못된 import 거부와 손상 primary의 backup 복구를 실제 임시 폴더 테스트로 확인했다. 저장 성공 시각/해시는 .refresh-cache/provider-state.json에 따로 기록하며 externalCollectionAt=null이다.

최종 실행 기록:

```json
{
  "unitAndReactSSR": {
    "command": "npm test",
    "passed": 52,
    "failed": 0
  },
  "typecheck": {
    "command": "npm run typecheck",
    "exitCode": 0
  },
  "catalog": {
    "command": "npm run data:validate",
    "exitCode": 0,
    "providers": 12,
    "services": 13,
    "plans": 18
  },
  "maintenance": {
    "refresh": "validated-and-preserved, no external collection",
    "restore": "executed against identical valid Provider backup",
    "invalidImportAndCorruptPrimaryRecovery": "passed using a temporary directory"
  },
  "preservation": {
    "files": 106,
    "sha256": "all passed; archive text normalization disabled"
  },
  "activeImportGraph": "cannot reach model snapshots, scoring, benchmark tables or archived fallback",
  "browserRunnerSyntax": {
    "command": "node --check tests/browser-check.mjs",
    "exitCode": 0
  },
  "productionBuild": {
    "command": "npm run build",
    "exitCode": 1,
    "reason": "Vite/esbuild child-process spawn EPERM after TypeScript"
  },
  "browserE2E": {
    "executed": false,
    "reason": "CUA browser access host and native pipe unavailable; no alternate automation attempted"
  },
  "externalAIExecution": false,
  "paidCalls": false,
  "commitPushDeploy": false
}
```

이전 221개 중 모델 순위·기능100/공동1위·Qwen/Grok 고정 결과에 의존하던 테스트는 현 정책의 기대값만 바꾼 것이 아니라 역사 보존 후 교체했다. 순수 프롬프트/초안 테스트17개는 그대로 재사용했다. 새 테스트는 회사 중복·모델 독립성·잘못된 scope·unknown/limited·무료/예산·명시한 용량·부정/선호 표현·입력/출력 분리·단계 선택 유지·React 렌더·원본 해시·import 경계를 검증한다.

프로덕션 빌드는 TypeScript 후 Vite/esbuild의 자식 프로세스 spawn EPERM으로 실패했다. 우회 실행·환경 권한 확대·대체 빌드/기존 dist의 성공 보고를 하지 않았다. CUA는 browser access host와 native pipe unavailable을 반환했다. 기존 E2E runner는 회사 카드/예산/새 단계 선택자에 맞춰 교체했으나 실제 브라우저·반응형·키보드·OS 클립보드 E2E는 미실행이다. 수동 검증용 기존 qa:preview는 배포 빌드 대체가 아니다.

commit·push·배포·외부 모델 실행·유료 API/평가·로그인/결제·메시지 전송은 하지 않았다.

## 남은 개선 과제

미확인 8개 서비스의 공식 개인 웹 플랜·기능·국가·무료 한도 조사, PDF/파일 용량과 실제 폼/출처 검증 조건의 구조화, 서비스·플랜·작업 조건이 일치하는 직접 품질 및 편의성 평가가 필요하다. 그 자료가 생기기 전에는 40/30/20/10 종합점수 경로를 임의로 활성화하지 않는다. 자연어 규칙은 복잡한 생략·부정·파일 역할에서 추가 사례 검증이 필요하며 해석 수정으로 보정할 수 있다. 브라우저 연결과 esbuild 실행이 가능한 환경에서 수정된 E2E와 실제 배포 빌드를 검증해야 한다.
