# AI..may I..?

팀 **Ai...Khu**. 자연어 작업을 정리하고, 공식 근거로 AI 회사와 서비스를 선택한 뒤 맞춤 프롬프트를 편집·복사하는 안내 앱입니다.

**작업 입력 → 해석·조건·예산 수정 → 회사 최대3개 공동 후보 → 서비스 선택 → 단계별 프롬프트 편집·복사**로 진행합니다. 회사 상세보기는 기능·사용법·무료/유료 조건을 안내하며, 모델 정보와 상세 가격표는 표시하지 않습니다. 내부 플랜 데이터와 공식 근거는 유지합니다.

## 현재 추천 정책

- 12개 회사·13개 서비스·18개 플랜/미확인 경로를 등록합니다. Google의 Gemini와 NotebookLM은 별도 서비스이고 회사는 한 번만 등장합니다. 모델이 추가·삭제되어도 회사 등록은 유지됩니다.
- 실제 플랜별 필수 기능과 무료·예산 조건을 먼저 검사합니다. PDF 업로드/분석/생성, XLSX 분석/생성, 문항 초안/실제 폼, 코드 생성/실행, 이미지 입력/생성, 검색/사실 검증을 구분합니다.
- 공식 근거가 없거나 제한 조건이 해결되지 않으면 조건부입니다. 명시적 불일치·확인된 한도 초과는 제외합니다. 무료 플랜에 유료 기능을 적용하지 않습니다.
- 회사별 직접 작업 품질과 비교 가능한 비용·편의 평가가 부족해 **종합점수와 확정 성능 순위는 산정하지 않습니다.** 제안 가중치 40/30/20/10은 신규 정책이며 실증 보정되지 않았습니다. 부분 항목을 재가중해 100점을 만들지 않습니다.
- 필수 조건이 확인된 공동 후보를 회사명 중립 순서로 최대3개 먼저 보여줍니다. 나머지 공동 후보·조건부·제외 후보는 접어서 제공합니다. 표시 순서는 품질 순위가 아닙니다.
- 사용자의 원문·조건·회사/플랜 선택·단계별 편집 초안은 세션 메모리에 보존합니다. 단계별 회사 변경은 다른 작업의 선택을 지우지 않습니다. 초안 재생성/이전 초안 복구와 정확한 본문 복사를 유지합니다.
- 파일은 이 앱에 업로드하지 않습니다. AI API 호출·자동 작업 실행·로그인·결제·메시지 전송은 제공하지 않습니다.

[새 정책·데이터 구조](docs/provider-recommendation-policy.md), [변경 전 전수 조사](docs/provider-recommendation-audit.md), [최초 리팩토링 보고서](docs/provider-refactor-report.md), [최종 제품 화면·빌드 진단·검증 보고서](docs/provider-product-validation-report.md), [최초 7개 함수/React 실행 사례와 프롬프트](docs/provider-recommendation-cases.json).

## 데이터와 역사 자료

현재 회사 데이터의 단일 입력은 `src/data/provider-catalog.json`, 정책은 `src/data/providerPolicy.ts`입니다. 공식 출처·확인일·적용 서비스/플랜을 각각 기록합니다. 기능 미확인을 지원 또는 미지원으로 바꾸지 않습니다. 최신 숫자 가격을 읽지 못한 곳에는 과거 가격을 자동 이월하지 않습니다.

원본 **28개 모델·111개 평가**와 기존 추천/추정 엔진·테스트·미커밋 작업은 [역사 스냅샷 안내](archive/model-recommendation-2026-10-29/ARCHIVE-NOTES.md)에 보존했습니다. 106개 보존 파일의 SHA-256을 테스트합니다. 과거 벤치마크·모델 점수·이전 가중치·구형 fallback은 현재 앱 import 그래프에 없습니다. 이전 연구/설계 문서는 해당 시점의 기록이며 현재 추천 설명은 위 문서를 기준으로 합니다.

운영 추천과 분리한 [Provider 근거·작업 평가 기반](docs/provider-evidence-evaluation-report.md)을 추가했습니다. 19개 기능의 서비스/경로별 감사, 합성 XLSX/PDF 과제와 알려진 정답, 자동/수동 채점, 두 회차 준비·익명 독립 리뷰 절차를 제공합니다. **실제 AI 서비스 실행과 등록 점수는 0건**이며 운영 회사 점수·순위는 도입하지 않았습니다. [수동 실행 가이드](docs/provider-evaluation-guide.md)를 따라 `npm run evaluation:validate`, `npm run evaluation:typecheck`, `npm run evaluation:audit`로 검사할 수 있습니다.

[Playwright 수집 오류 수정·최신 실행 결과](docs/provider-playwright-repair-report.md), [로컬 실행·평가 준비 기록](docs/provider-local-execution-report.md), [ChatGPT·Claude·Gemini·Grok 평가 체크리스트](docs/provider-consumer-pilot-checklist.md)를 제공합니다. E2E는 `@playwright/test`를 사용하며 패키지와 Chromium은 별도로 설치합니다.

## 실행·검증

Node.js 22.18 이상, Pages workflow는 Node.js 24입니다.

```powershell
npm ci
npm test
npm run typecheck
npm run data:validate
npm run build
npm run dev
```

제품 화면 검증 당시 정책/SSR/격리 테스트 58개, 근거·평가 기반 추가 후79개, 실행 준비 단계의 반입 조건 검사 추가 후 **80개**가 통과했습니다. 앱/평가 스크립트 타입 검사와 카탈로그/평가 데이터 검증도 통과했습니다. 이번 도구 환경의 프로덕션 빌드는 esbuild 자식 프로세스의 `spawn EPERM`으로 실패했습니다. 프로젝트를 읽지 않는 최소 esbuild 변환과 단순 Node 자식 프로세스도 같은 오류였습니다. 사용자가 별도 로컬 환경에서 알려 준 프로덕션 빌드·Playwright E2E 성공과 구분하며, 이번 환경에서는 실제 브라우저·모바일·OS 클립보드 재검증을 완료하지 못했습니다.

Playwright는 `tests/e2e/*.spec.ts`만 수집합니다. `tests/e2e/provider-flow.spec.ts`의 8개 작업을 Chromium PC 1440px·모바일 320px에서 각각 실행하는 **16개 등록 테스트**입니다. `src/lib/*.test.ts`, `tests/*.test.mjs`와 `archive/`는 수집하지 않습니다. 현재 캐시된 공식 runner를 통한 수집 진단은 **16개 발견**이며, 일반 `npx` 실행은 패키지 설치 제한으로 막혔습니다. Chromium·서버의 프로세스 생성도 `spawn EPERM`으로 거부되어 **브라우저 시나리오 실행 0건**입니다. 수집 성공을 E2E 통과로 보지 않습니다.

네트워크와 자식 프로세스 실행이 허용되는 로컬 PowerShell에서:

```powershell
npm install --offline=false
npm run setup:chromium
npx playwright test --list
npx playwright test
```

E2E 실행 시 설정이 빌드와 preview를 자동으로 시작·종료합니다. 별도 preview를 실행하지 마세요. 결과는 `.qa/provider-product-playwright.json`(Playwright 표준 JSON), 스크린샷·실패 trace는 `.qa/playwright-results/`에 저장됩니다. 기존 `npm run test:browser`는 준비된 preview와 Chromium `:9222`를 사용하는 수동 도구로 유지했습니다. `qa:preview`는 기존 소스 QA 보조 도구이며 프로덕션 빌드가 아닙니다.

## 갱신·복구

```powershell
npm run data:refresh
npm run data:restore
npm run report:providers
# 새로 검토한 전체 데이터 반입
node scripts/refresh-data.mts --import reviewed-provider-catalog.json
```

현재 `data:refresh`는 공식 검토 스냅샷을 검증·보존합니다. 외부 수집을 실행하거나 출처 확인일을 오늘로 덮지 않습니다. 저장 성공 시각과 해시는 별도로 남기며 자동 수집 성공 시각은 null입니다. 잘못된 반입은 마지막 정상 데이터를 덮지 않고, 복구는 Provider 전용 backup/seed만 사용합니다. 과거 모델 수집기는 역사 자료로 분리했습니다.

기존 GitHub Pages base `/AI...may-I../`, 예약 시각·권한·배포 설정은 유지합니다. 이번 작업에서는 commit·push·워크플로 실행·배포·유료 평가를 하지 않았습니다.
