# Provider 근거 검증 및 작업 평가 기반 구축 보고서

작업일 2026-10-29. 기준 커밋 `6e9f86c` (`feat: rebuild model recommendations and guided prompt workflow`). 기존 미커밋 Provider 전환을 바탕으로 추가했습니다. commit·push·배포·로그인·구독·외부 AI 요청은 실행하지 않았습니다.

## 결과 구분

| 구분 | 현재 상태 |
| --- | --- |
| 구현 완료 | 19개 기능의 서비스/경로별 근거 구조, 미확인 backlog, 비용 5상태, 과제 3개·합성 원본·정답·자동/수동 채점·2회 준비 양식·익명 리뷰·향후 반입 게이트 |
| 공식 자료로 확인 완료 | 16개 출처 접근 기록 중 14개 문서 내용 확인, 1개 무본문, 1개 접근 실패. 35개 기능 항목에 제한 조건을 포함한 공식 근거 연결 |
| 실제 AI 서비스 테스트 완료 | **0건. 등록된 실행 및 점수는 모두 빈 배열** |
| 자동 테스트 통과 | 최종 검증 표 참조. 기존 58개 회귀 검사 포함 |
| 사용자 수동 검증 필요 | 실제 계정 기능·지역·사용량, 각 과제 실행·실물 차트·본문 사실·익명 독립 평가·실제 낭독 시간 |
| 미완료 및 제한 | 554개 세부 범위 미확인. 이 환경의 build는 spawn EPERM, Playwright는 패키지 없음. 회사 점수·성능 순위 미도입 |

## 1. 기존 작업 보존과 변경 경계

[리팩토링 보고서](provider-refactor-report.md)와 [제품 검증 보고서](provider-product-validation-report.md), 현재 엔진·스키마·테스트·갱신 구조를 확인했습니다. 작업 전 `npm test` 58개 및 카탈로그 검증을 통과했습니다. 이전 수정·삭제·미추적 파일을 되돌리지 않았습니다.

기존 파일 260개와 tracked diff·Git 상태·최근 커밋을 `.qa/provider-evaluation-before-20261029T055723Z.zip`에 보관하고 전체 SHA-256을 검증했습니다. 별도 worktree의 HEAD에는 미커밋 리팩토링이 없으므로 현재 작업 폴더에서 보존본을 바탕으로 작업했습니다.

운영 `provider-catalog.json`, 추천 엔진, 요구 분석, UI 컴포넌트·CSS, 프롬프트 생성/편집/복사/복구, 복합 작업, 기존 배포 설정은 변경하지 않았습니다. 활성 검증기에 enum·유효한 HTTPS URL·실제 달력 날짜/미래 날짜·주요 서비스 소유 관계 검사를 추가했습니다. 정상 카탈로그의 추천 결과나 정책 가중치를 수정하지 않습니다. 평가 모듈이 앱 진입점 import 그래프에 들어가지 않는 검사도 추가했습니다.

최종 보존 대조에서 기존 260개 중 255개는 바이트가 동일하고, 의도한 `README.md`, `docs/README.md`, `package.json`, `providerPolicy.ts`, `providerValidation.ts` 다섯 파일만 변경되었습니다. 삭제된 기존 파일은 없습니다. 이전 `.qa/provider-product-cases.json`의 8개 입력과 현재 추천을 비교해 회사·서비스·상태·점수·순위가 모두 동일함을 확인했습니다. 근거 변경에 따른 추천 변화는 없습니다. 대조 기록은 `.qa/provider-evaluation-preservation-result.json`과 `.qa/provider-evaluation-regression.json`입니다.

## 2. 실제 등록 목록과 공식 검증 현황

**12 Provider / 13 Service / 18 Plan·미확인 경로**. 감사 기준의 회사가 모두 존재합니다. Google만 Gemini와 NotebookLM 두 서비스를 가집니다. Mistral의 등록 서비스 ID는 `mistral`, 이름은 `Mistral 웹`입니다. 모델명이 아닙니다.

| Provider ID / 회사 | Service ID / 등록 서비스 | 이번 공식 조사에서 확인한 범위 | 후속 확인 |
| --- | --- | --- | --- |
| openai / OpenAI | chatgpt / ChatGPT | [데이터 분석 도움말](https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt)의 XLSX/PDF·계산·차트, [플랜 안내](https://chatgpt.com/pricing/)의 Free 텍스트와 제한 | 정확한 계정별 파일·차트·코드·다운로드 권한, KR/무료 한도 |
| anthropic / Anthropic | claude / Claude | [파일 도움말](https://support.claude.com/en/articles/8241126-upload-files-to-claude)의 PDF/XLSX와 활성화 조건, [플랜 안내](https://claude.com/pricing)의 Free 검색·파일·코드 | PDF 시각 분석 범위, 계정 활성화·XLSX 입력/차트 실물·지역 |
| google / Google | gemini / Gemini; notebooklm / NotebookLM | [Gemini 파일 도움말](https://support.google.com/gemini/answer/14903178?hl=en), [Notebook 소스 도움말](https://support.google.com/gemininotebook/answer/16215270?hl=en)의 PDF·이미지 등 | XLSX 확장자·무료 기능/한도·실행/다운로드·명칭 전환 |
| xai / xAI | grok / Grok | [소비자 FAQ](https://docs.x.ai/grok/faq)의 PDF/XLSX 입력·분석·시각 처리 | 구독·지역·용량·무료 계정 권한·차트·실제 정확도 |
| deepseek / DeepSeek | deepseek / DeepSeek | [공식 홈페이지](https://www.deepseek.com/)에서 웹·API 경로 구분 | 웹 플랜별 19개 기능. API 소개를 웹 무료 기능으로 복사하지 않음 |
| alibaba / Alibaba | qwen / Qwen | [공식 사이트](https://qwen.ai/) 열기 시 읽을 본문 없음 | 19개 기능 및 웹 플랜·지역 전부 후속 조사 |
| moonshot / Moonshot AI | kimi / Kimi | [공식 사이트](https://www.kimi.com/)의 채팅 shell만 확보 | 기능·플랜 문서와 권한·파일 형식 후속 조사 |
| perplexity / Perplexity | perplexity / Perplexity | [파일 도움말](https://www.perplexity.ai/help-center/en/articles/10354807-file-uploads)의 첨부·PDF 문맥 처리 | XLSX·차트·무료 범위·출처 정확성·내보내기 |
| microsoft / Microsoft | copilot / Microsoft Copilot | [개인용 안내](https://www.microsoft.com/en-us/copilot/solutions/individuals) 확인 | 문서의 Microsoft 365 앱 권한과 등록 소비자 웹 경로가 달라 해당 기능 미이식 |
| adobe / Adobe | firefly / Adobe Firefly | [공식 플랜 안내](https://www.adobe.com/products/firefly/plans.html)의 이미지·영상 기능과 제한 | 무료 일일 생성이 한국 계정에 적용되는 범위·크레딧·다운로드. 상세 가격 미반입 |
| runway / Runway | runway / Runway | [공식 플랜 안내](https://runway.com/pricing)의 Standard 이미지/영상·크레딧 | 국가·계정·무료 도구 범위·실제 출력. 월/연 환산 혼합 금지 |
| mistral / Mistral AI | mistral / Mistral 웹 | [공식 Vibe 페이지](https://mistral.ai/products/vibe/)의 Le Chat 전환·검색·문서 작업 | 등록 경로의 현재 플랜, Free/Pro 구분·권한 확인 후 명칭 정리 |

NotebookLM 도움말은 Gemini Notebook으로, Le Chat 제품 URL은 Vibe로 이동했습니다. 조사에는 이동된 URL과 관찰을 기록하고 기존 서비스 ID·UI·운영 경로를 임의로 바꾸지 않았습니다. Grok의 최초 도움말 URL은 접근 실패로 남기고, 확인 가능한 소비자 FAQ를 별도 출처로 추가했습니다. Qwen은 열기 성공 자체를 기능 확인으로 기록하지 않았습니다.

이는 기능 문서 검토이며 실제 작업 성능 또는 한국 무료 계정 이용 보장이 아닙니다. 문서에서 확인한 35개 항목은 모두 제한 조건이 있어 `limited`입니다. `supported`나 `unsupported`를 억지로 채우지 않았습니다. `unknown`은 미지원·품질 0점을 의미하지 않습니다.

## 3. 근거·기능 데이터 구조와 조사 부족

[기계 판독 감사](provider-evidence-audit.json)의 `providers`, `sources`, `cells`, `backlog`, `cases`, `candidates`, `runs`, `scores`를 제공합니다. `cells`는 **(13 서비스 + 18 경로) × 19 기능 = 589개**입니다. 서비스 수준 근거를 플랜 경로에 자동 확장하지 않아 554개가 미확인입니다. 운영 카탈로그에 있던 과거 확인 근거를 일괄 재조사 완료로 복사한 수치가 아닙니다.

각 cell은 Provider ID, Service ID, planId 또는 서비스 scope, 웹 channel, featureId, 상태, region, limitations, verification, unknownReason을 갖습니다. 연결된 `sources`에 URL, sourceType, 실제 checkedAt, 접근 시도 attemptedAt, read/no-content/failed 및 관찰이 있습니다. 미확인은 출처가 빈 배열이며 확인일을 만들지 않습니다. 본문을 못 읽은 출처의 checkedAt은 null입니다. `generatedAt`은 감사 파일 생성 시각이고 출처 확인일과 다릅니다. 기존 카탈로그의 10월 28일/29일 확인일을 갱신하지 않았습니다.

19개 기능은 텍스트 생성/수정, 요약, 웹 조사, 출처 제시, 코드 작성/수정, PDF 입력/내용 분석/스캔·이미지 독해, XLSX 입력/내용 분석, 차트, 파일 다운로드, 이미지/영상 생성, 설문 문항, 실제 폼, 코드 실행, 장문 처리, 복합 작업을 구분합니다. 출처 **제시**와 출처의 **정확성 검증**, 입력과 새 파일 생성, 문항 작성과 실제 폼 생성은 같은 성공으로 인정하지 않습니다.

우선 조사할 항목은 다음과 같습니다.

1. DeepSeek/Qwen/Kimi/Copilot의 소비자 웹 플랜·기능·국가. 미확인 경로 ID를 실제 구독 범위로 정리합니다.
2. 전 서비스의 정확한 무료/유료·KR 계정 기능. Claude XLSX 활성화, Gemini 네이티브 XLSX, PDF 스캔 범위, 차트와 다운로드를 각각 확인합니다.
3. 출처 제시·설문 초안·실제 폼·장문/복합 작업의 경로별 근거. 일반 텍스트 채팅의 존재를 성공률이나 실제 폼 권한으로 바꾸지 않습니다.
4. 파일 크기·페이지·행 수·사용량, 변경되는 서비스 명칭과 로그인 경로. 현재 PDF 실험은 텍스트 PDF이며 스캔/OCR·장문 스트레스 평가는 별도 과제로 필요합니다.

비용 함수는 `free-available`, `free-with-limits`, `paid-required`, `unknown`, `budget-mismatch`로 구분합니다. 필수 기능이 정확한 무료 경로에서 확인되지 않으면 무료 플랜 존재만으로 free 상태를 반환하지 않습니다. 예산 불일치와 비용 미확인도 구분합니다. 이 함수와 새 근거는 운영 화면·추천에 연결하지 않았습니다. 상세 요금제 비교 UI는 추가하지 않았습니다.

## 4. 평가 과제·정답·방법

[실행·채점 가이드](provider-evaluation-guide.md)에 고정 프롬프트, 입력 양식, 수동 절차, 지표별 분류와 시간 기준을 설명했습니다. 전체 프롬프트·expectedResult·루브릭은 `src/data/providerEvaluationCases.ts`와 감사 JSON에 있습니다. 정답은 서비스에 전달하지 않습니다.

| 과제 | 입력과 알려진 정답 | 자동 항목 | 수동 항목 |
| --- | --- | --- | --- |
| A / survey-v1 | 학년·빈도·목적·만족도·장벽·개선 제안의 6개 설문, 실제 폼 생성 요구 없음 | 필수 ID·개수·비어 있지 않음·중복·유형·선택지 형식·폼 미생성 선언 | 의미 적합성·명확성·중립성·중복/유도·선택지·실사용 가능성 |
| B / xlsx-v1 | 기존 Sales 12행. 합계 2000, 평균 2000/12, South & units>=10 합계 940, 지역 North 890/South 1110, 월 500/740/760 | 파일/시트/행/해시 식별·숫자·필터·그룹·차트 계열 | 실제 첨부 입력·그려진 차트·축/단위·다운로드·본문 허위 해석 |
| C / pdf-v1 | 합성 3쪽. p1 참가120/완료96/80%, p2 주12→9시간/예산2400, p3 비무작위·단일 캠퍼스·4주 등 한계 | 요약·대본 사실 필드 각각의 6개 사실·값·페이지, 450~650 공백 어절 | 본문 대조·추가 허위 사실·핵심 누락·구성·정보 전달·실제 낭독 |

자동 채점이 지정 숫자와 구조화 필드에 한정됨을 명시했습니다. 모든 자연어 허위 사실을 자동 탐지한다고 주장하지 않습니다. 5분 대본은 450~650어절의 형식 검사와 **실제 독립 낭독 270~330초** 확인을 분리합니다. 어절 수로 발표 시간을 확정하지 않습니다.

XLSX는 Artifact Tool로 생성하고 저장된 ZIP/XML의 실제 숫자를 독립 계산하는 테스트를 추가했습니다. PDF는 ReportLab으로 생성하고 pypdf로 3쪽 본문과 알려진 문장을 검증했습니다. XLSX와 PDF 전 페이지를 렌더링해 가독성·잘림·배치를 확인했습니다. 원본에는 정답 시트가 없고 별도 코드에 정답이 있습니다. 합성 입력과 unit-test 전용 가상 응답을 실제 AI 결과로 등록하지 않았습니다.

## 5. 실행·채점·재현성 구조

- EvaluationCase: 요청한 9개 필드와 고정 prompt, 항목별 metrics를 포함합니다.
- EvaluationRun: 요청한 필드에 provenance, prompt/rubric 버전, fixture 해시, region/environmentKey/settings, repetition/sessionId, 원문 캡처 해시·실행 증거를 추가했습니다. 최초 준비는 두 회차 planned이며 출력·시각·점수는 비어 있습니다.
- EvaluationScore: 요청한 필드와 evaluatorId, blindPacketId, independent를 기록합니다. 수동 미평가를 0점으로 만들지 않습니다.
- registry는 실제 또는 명확히 표시한 demo 기록을 구조적으로 검증할 수 있지만, 향후 실측 게이트는 real·실행 완료·파일 검증·반복·독립 채점을 모두 요구합니다. demo와 미실행 기록을 운영 근거로 승인하지 않습니다.
- 익명 묶음에는 원문·구조화 결과·중립 이름의 첨부·정답·빈 루브릭을 제공합니다. 대응표는 따로 보관합니다. 회사명 치환만으로 이미지/음성의 완전한 익명화를 보장하지 않아 담당자의 잔여 단서 확인 절차를 명시했습니다.
- 회차 평균의 범위/표준편차와 회차 내 평가자 불일치를 구분합니다. 수집자의 비익명 점수는 제외합니다. 증거가 부족하면 통계·확정 점수·순위를 생성하지 않습니다.

별도 검토자가 원문/첨부 리뷰 누락, 실행 기록 재사용, 비익명 점수 통계 혼입, 감사 실행 건수 상수 문제를 지적했고 수정했습니다. 반복 간 변동과 평가자 간 차이를 나누라는 제안도 반영했습니다. 실제 실행 여부를 프로그램이 원격 인증하지는 않으므로 원문·실행 증거와 담당자 검토가 최종 필요합니다.

## 6. 점수 도입 전 조건

현재 운영 순서는 기능·예산 조건 검사와 공동 후보 제공까지 유지합니다. 향후에는 비교 가능한 실측 조회와 충분성 검사를 그 뒤에 연결합니다. 이 단계에서 연결한 평가 점수·새 순위는 없습니다.

정확한 과제/경로의 파일럿 게이트는 동일 과제·입력 해시·프롬프트/루브릭·지역·경로·환경·설정, 실제 접근 가능한 플랜, 90일 이내 최소2회, 모든 자동 항목과 각 수동 지표의 두 독립 익명 평가를 요구합니다. 파일 검증 함수를 제공하지 않으면 거부합니다. 모델 재현 조건이 다르면 혼합하지 않습니다.

이 조건은 회사 점수 계산의 충분조건이 아닙니다. 작업 유형당 서로 다른 대표 과제 최소3개와 각2회, 회사 간 공통 과제 집합, 완전한 평가·불일치 검토·변동 안정성, 사전 고정한 지표/정규화/가중치/동률 규칙, 사용자 기능·비용·접근 조건이 필요합니다. 비용·편의성 실측이 없으면 총점도 도입하지 않습니다. 구체적 통계 정책은 실측 자료를 보고 별도 검토합니다.

모델 벤치마크를 회사 점수로 변환하거나 최고 모델/서비스를 대표값으로 삼지 않습니다. 미확인 기능은 품질0점이 아니며 미평가 회사를 후순위로 확정하지 않습니다. 서비스 개수에 보너스를 주지 않습니다. 사용자에게 없는 플랜의 실적과 서로 다른 작업 유형을 혼합하지 않습니다.

## 7. 최종 검증 결과

| 검사 | 결과 |
| --- | --- |
| `npm test` | **79개 통과**, 실패0·건너뜀0. 기존58 + 신규21 |
| `npm run typecheck` | 통과 |
| `npm run evaluation:typecheck` | 스크립트 포함 통과 |
| `npm run data:validate` | 통과, 12 Provider / 13 Service / 18 Plan |
| `npm run evaluation:validate` | 통과, real 완료0·점수0 |
| `npm run evaluation:audit` | 589 cells / 공식 제한 근거35 / unknown554 |
| 준비 양식 실생성 | 두 회차 planned·점수0·정답 키 비노출 확인 |
| CLI 전체 흐름 | `.qa`의 명시적 demo 기록으로 validate/grade/blind 및 첨부 복사 확인. registry 미기록 |
| 원본 파일·입력 검증 | XLSX 독립 수치 검산·PDF 3쪽 추출·전체 이미지 확인 |
| `npm run build` | 실패: Vite 설정 로드 중 esbuild `spawn EPERM` |
| `npm run test:playwright` | 실행0, `playwright-package-unavailable` |
| `git diff --check` / 기존 파일 | 통과. 계획한 기존5개만 변경, 나머지255개 동일, 8개 추천 결과 동일 |

사용자가 이전 단계에서 로컬 프로덕션 빌드·Playwright E2E 성공을 알려 주었습니다. 이는 이번 도구 환경에서 다시 실행해 성공한 결과와 구분합니다. 환경·권한·Vite 설정을 바꾸거나 이전 dist를 이번 빌드 성공으로 보고하지 않았습니다. Playwright·브라우저 패키지를 설치하지 않았습니다. 빌드 로그는 `.qa/provider-evaluation-build.log`, E2E 로그는 `.qa/provider-evaluation-playwright.log`에 있습니다. 렌더링의 Poppler 기본 Symbol/ArialUnicode display-font 경고는 있었지만 Helvetica 본문과 3쪽 이미지는 확인했습니다.

## 8. 이번 변경 파일과 다음 우선순위

| 범위 | 파일 |
| --- | --- |
| 기존 검증 보강 | `src/lib/providerValidation.ts`, `src/data/providerPolicy.ts` |
| 근거/평가 타입·데이터 | `src/evaluationTypes.ts`, `src/data/providerEvidenceRegister.ts`, `src/data/providerEvaluationCases.ts`, `evaluations/results/registry.json` |
| 독립 기능/비용·채점·게이트 | `src/lib/providerEvidence.ts`, `src/lib/providerEvaluation.ts` |
| 회귀 검증 | 두 모듈의 `.test.ts`, `tests/evaluation-workflow.test.mjs` |
| CLI·fixture 생성 | `scripts/provider-evaluation-core.ts`, `scripts/provider-evaluation.mts`, `scripts/build-evaluation-fixtures.mjs`, `scripts/build-evaluation-pdf.py` |
| 합성 입력 | `evaluations/fixtures/sales-v1.xlsx`, `library-pilot-v1.pdf`, `sales-source.json`, `manifest.json` |
| 설정/문서 | `package.json`, `tsconfig.evaluation.json`, `README.md`, `docs/README.md`, 이 보고서·실행 가이드·감사 JSON·구현 계획 |

다음은 무료/유료 KR 계정·실제 플랜의 사전 확인 → 권한 있는 사용자와 두 회차 파일럿 → 두 독립 익명 평가·변동/불일치 확인 → 추가 과제·반복 확장 → 별도 점수 정책 검토 순서입니다. 현재 작업은 검증 가능한 근거/실험 기반 구축까지이며, 회사별 실제 작업 품질이나 추천 성능 향상을 입증한 단계는 아닙니다.
