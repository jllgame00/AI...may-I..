# Provider 제품 화면 정리 및 검증 보고서

후속 수정: 이 문서의 라이브러리 runner는 이후 `@playwright/test` 등록 방식으로 전환했습니다. 현재 파일·명령·수집 개수·실행 제한은 [Playwright 수집 오류 수정 보고서](provider-playwright-repair-report.md)를 기준으로 확인하세요. 아래 실행 결과는 당시 기록입니다.

검증일: 2026-10-29. 이 보고서는 [기존 Provider 리팩토링 보고서](provider-refactor-report.md) 이후의 화면 정리와 재검증만 다룹니다. 기존 추천 정책 `provider-evidence-v1`과 데이터 `provider-catalog-2026-10-29-v1`은 변경하지 않았습니다.

## 1. 기존 작업 보존

먼저 기존 보고서와 Git 변경사항을 확인했습니다. 기존의 다수 수정·삭제·미추적 파일은 앞선 Provider 전환 작업이며 되돌리거나 덮어쓰지 않았습니다.

- 작업 직전 활성 코드·스크립트·테스트·문서 43개와 당시 tracked diff를 `.qa/provider-product-before-20261029T051713Z.zip`에 보존했습니다. ZIP 내부 `manifest.json`의 SHA-256 43개를 모두 검증했습니다.
- 추천 엔진, 요구 분석기, 데이터 검증기, 카탈로그 JSON, 정책, 타입, 프롬프트 생성·세션 함수, `PromptEditor`, CSS, 갱신·복구 스크립트, 기존 브라우저 runner는 위 ZIP과 바이트가 일치합니다. 상세 비교는 `.qa/provider-product-preservation.json`에 기록했습니다.
- 기존 역사 스냅샷의 106개 파일 해시와 구형 모델 엔진의 활성 import 그래프 격리 테스트도 통과했습니다. 원본 28개 모델·111개 평가를 현재 추천에 다시 연결하지 않았습니다.
- 하위 백업 폴더 생성은 `WinError 5`로 거부되어, 이미 쓰기 가능한 `.qa`에 단일 ZIP을 저장했습니다. 권한·ACL을 변경하지 않았습니다.

commit, push, 배포, 유료 평가, 외부 데이터 수집을 실행하지 않았습니다.

## 2. 제품 화면 변경

메인 카드와 회사 상세보기, 단계별 프롬프트 화면을 회사·대표 서비스 중심으로 정리했습니다.

- 회사명, 대표 서비스, 공동 우선/조건부 상태, 필수 기능 충족 여부, 핵심 이유를 표시합니다.
- 상세보기는 기능 상태, 실제 사용 순서, 공식 서비스 열기, 맞춤 프롬프트 편집·복사 안내에 집중합니다.
- 플랜 이름·숫자 가격·통화/세금 표·플랜 대안 비교·내부 가중치·모델/벤치마크 설명을 화면에서 제거했습니다. 근거 링크는 서비스의 공식 이용 안내와 확인일로 표시하며, 모델명이나 가격이 들어갈 수 있는 내부 `scope`를 그대로 출력하지 않습니다.
- 무료 여부는 정확한 서비스·플랜에 적용되는 검토 완료 근거와 0원 기록이 있는 경우에 표시합니다. 필수 기능이 미확인이면 별도로 조건부라고 안내합니다.
- 유료 대표 경로는 **“이 추천 경로는 유료 이용 필요”**라고 표시합니다. 무료 대안의 미확인을 회사 전체의 유료 필수 조건으로 바꾸지 않습니다. 무료 경로의 작업 지원·한도가 추가 확인 대상이면 그 상태를 함께 표시합니다.
- 사용자 입력 예산·통화·국가 수정은 유지합니다. 이는 사용자가 제공하는 조건이며 서비스 가격표가 아닙니다.
- 내부 플랜·기능·비용·공식 출처 데이터는 그대로 보존합니다. 점수와 확정 순위는 계속 산정하지 않습니다.

단계별 선택 목록은 회사당 한 항목으로 표시하고 이미 선택한 호환 경로의 내부 ID를 유지합니다. 선택·초안 관리 코드를 바꾸지 않아 다른 단계의 회사 선택이나 편집 내용을 지우지 않습니다. 추가 확인 후보의 기본 접힘도 유지합니다. 사용자가 직접 입력한 원문·편집 초안은 임의로 지우거나 치환하지 않습니다.

## 3. `spawn EPERM` 재현과 원인 범위

기존 명령을 그대로 재실행했습니다.

```text
npm run build
> tsc -b && vite build
failed to load config from ...\vite.config.ts
Error: spawn EPERM
    at ChildProcess.spawn (node:internal/child_process:421:11)
    at Object.spawn (node:child_process:796:9)
    at ensureServiceIsRunning (...\node_modules\esbuild\lib\main.js:2272:29)
    at build (...\node_modules\esbuild\lib\main.js:2170:26)
    at bundleConfigFile (.../vite/dist/node/chunks/config.js:36066:23)
    at bundleAndLoadConfigFile (.../vite/dist/node/chunks/config.js:36053:24)
    at loadConfigFromFile (.../vite/dist/node/chunks/config.js:36022:179)
    at resolveConfig (.../vite/dist/node/chunks/config.js:35671:28)
    at resolveConfigToBuild (.../vite/dist/node/chunks/config.js:33694:9)
    at createBuilder (.../vite/dist/node/chunks/config.js:34126:25)
```

프로젝트 코드를 import하지 않는 최소 진단도 실행했습니다.

```js
await esbuild.transform('const value: number = 1', { loader: 'ts' })
```

동일하게 `ensureServiceIsRunning → ChildProcess.spawn → EPERM`으로 실패했습니다. TypeScript 검사는 통과했고, 현재 관측된 빌드 차단은 Vite 설정을 번들링하기 위해 esbuild 자식 프로세스를 시작하는 실행 환경·권한 계층에서 발생합니다. 추천 함수나 React 화면을 읽다가 발생한 오류는 아닙니다. 어느 호스트 보안 정책이 거부했는지는 이 로그만으로 특정할 수 없습니다. 차단 이후의 실제 프로덕션 번들 단계는 검증하지 못했습니다.

| 실행 환경 | 확인값 |
| --- | --- |
| 작업 디렉터리 | `D:\univ\3-1\contest\2026_KHU_AI_Challenge` |
| OS / 아키텍처 | Windows `10.0.26200` / x64 |
| 셸 | PowerShell |
| Node / npm | `v24.13.0` / `11.20.0` |
| node 실행 파일 | `C:\Program Files\nodejs\node.exe` |
| TypeScript / Vite / esbuild | `5.9.3` / `7.3.7` / `0.28.2` |
| 접근 제한 | workspace-write, 네트워크 제한, 권한 상승 불가 |

전체 빌드 출력은 `.qa/provider-product-build.log`, 최소 재현의 스택·환경은 `.qa/provider-product-build-diagnostic.json`에 보관했습니다. 실행 정책, 환경 변수, Vite 설정, 의존성, 샌드박스 플래그를 변경하거나 다른 빌드 방식으로 우회하지 않았습니다.

## 4. 실행한 자동 검증

| 검사 | 실제 결과 |
| --- | --- |
| `npm test` | **58개 통과**, 실패 0, 건너뜀 0 |
| `npm run typecheck` | 통과, exit 0 |
| `npm run data:validate` | 통과: 12 Provider / 13 Service / 18 Plan |
| 역사 자료 해시·구형 추천 격리 | 위 테스트에 포함, 통과 |
| 작업 직전 ZIP 해시 및 내부 엔진·데이터 비교 | 통과 |
| `node --check tests/provider-playwright.mjs` | 문법 검사 통과 |
| `git diff --check` | 통과; 기존 Git 줄바꿈 정책의 LF→CRLF 안내만 출력 |
| `npm run build` | 실패, exit 1: esbuild `spawn EPERM` |
| `npm run test:playwright` | **미실행 0건**, npm exit 1: Playwright 패키지 없음 |

이번에 추가한 회귀 검사는 무료 표시의 검토 완료 근거 요구, 회사 선택 중복 제거와 기존 선택 보존, 회사 상세보기·프롬프트 화면의 내부 플랜명/가격/모델 자료 노출 방지입니다. 가상의 내부 민감 표시 문자열을 넣어도 사용자 화면에 나오지 않음을 React 서버 렌더링으로 검사했습니다. 기존 기대 회사 순위나 엔진 점수 테이블을 수정하지 않았습니다.

## 5. 실제 함수·React 출력 검증

자연어 분석, 실제 추천 함수, 단계별 프롬프트 생성과 React 서버 렌더링을 8개 작업에 실행했습니다. 아래는 메인 영역의 공동 우선 후보이며 표시 순서는 품질 순위가 아닙니다.

| 입력 사례 | 공동 우선 회사 / 서비스 | 조건부 회사 수 | 프롬프트 단계 |
| --- | --- | ---: | ---: |
| 설문 문항 작성 | Anthropic / Claude, Google / Gemini, OpenAI / ChatGPT | 9 | 3 |
| 기존 XLSX 설문 결과 분석 | Anthropic / Claude, OpenAI / ChatGPT | 10 | 2 |
| PDF 논문 분석 | 없음 | 12 | 2 |
| 5분 발표 대본 작성 | Anthropic / Claude, Google / Gemini, OpenAI / ChatGPT | 9 | 3 |
| 코드 오류 수정 | Anthropic / Claude, Google / Gemini, OpenAI / ChatGPT | 9 | 3 |
| 포스터 이미지 생성 | Adobe / Adobe Firefly, Google / Gemini, OpenAI / ChatGPT | 8 | 1 |
| 무료 포스터 이미지 생성 | 없음 | 12 | 1 |
| XLSX 분석 + 발표자료 + 발표 대본 | Anthropic / Claude | 11 | 6 |

무료 이미지와 PDF 사례에서 확인된 필수 기능 근거가 부족하므로 우선 후보를 억지로 채우지 않습니다. 조건부 후보를 사용자가 명시적으로 선택해 프롬프트를 준비할 수 있습니다. 현재 데이터 범위를 반영한 결과이며 새 공식 수집 결과가 아닙니다.

실행 산출물은 `.qa/provider-product-cases.json`, `.qa/provider-product-case-1.html`~`8.html`입니다. 이 파일들은 실제 함수/서버 렌더링 결과이며 브라우저 화면 캡처가 아닙니다.

| 사용자 흐름 | 확인된 범위 | 남은 검증 |
| --- | --- | --- |
| 입력 → 해석 → 회사 추천 | 실제 함수와 8개 SSR 출력, 원문 보존 | 실제 클릭·포커스·뒤로가기 |
| 회사 중복 / 최대 3개 | 엔진·SSR·단계 선택 함수 통과 | 브라우저 이벤트 후 DOM |
| 회사 상세보기 | 서비스·기능·사용법·공식 링크 출력, 내부 정보 비노출 검사 | 실제 열기/접기, 모바일 배치 |
| 무료·유료 / 예산 변경 | 정책 단위 검사와 무료 이미지 SSR, 플랜 범위 근거 검사 | 실제 컨트롤 변경 후 재계산 |
| 복합 작업 단계별 회사 변경 | 단계별 상태·선택·초안 보존 함수 통과 | 실제 select 이벤트 |
| 프롬프트 편집·복구·복사 | 초안 함수와 SSR, 성공/실패 writer 모의 실행 | OS 클립보드와 실제 버튼 이벤트 |
| PC·모바일 / 콘솔 | 실행 가능한 E2E 시나리오 추가 | 레이아웃·스크린샷·브라우저 오류 전부 미확인 |

## 6. 브라우저 E2E와 미완료 항목

`tests/provider-playwright.mjs`와 `npm run test:playwright`를 추가했습니다. 로컬 preview를 대상으로 8개 작업 × PC 1440px/모바일 320px의 **16개 시나리오**를 준비했습니다. 회사 중복, 상세보기, 무료→유료 허용→무료 조건 재계산, 단계별 회사 선택, 원문 보존, 정확한 클립보드 복사, 초안 복구·선택 변경 후 보존, 가로 넘침, 화면 캡처, `pageerror`/`console.error`를 검사하도록 작성했습니다.

현재 설치된 `playwright`와 `@playwright/test`는 없습니다. runner 실행 결과는 `status: not-run`, `executed: 0`, 사유는 `playwright-package-unavailable`입니다. `.qa/provider-product-playwright.json`에 기록했습니다. 빈 `pageErrors`/`consoleErrors` 배열은 브라우저를 실행하지 않은 결과이며 오류가 없었다는 증거가 아닙니다. 패키지·브라우저를 다운로드하지 않았습니다.

컴퓨터 사용 도구의 상태 조회도 `apps: []`, `browsers: []`, `native pipe unavailable (os error 2)`, `browser access host unavailable`을 반환했습니다. 따라서 실제 PC·모바일 화면, 키보드/스크린리더, 브라우저 콘솔, OS 클립보드 검증은 완료하지 못했습니다. 기존 `test:browser` CDP runner도 호스트가 없어 실행하지 않았습니다.

남은 작업은 esbuild 자식 프로세스를 정상 실행할 수 있는 환경에서 동일한 `npm run build`를 재실행하고, Playwright·Chromium 및 로컬 preview가 제공되는 환경에서 `npm run test:playwright`를 실행하는 것입니다. E2E 코드는 아직 실브라우저로 검증되지 않았으므로 그 결과도 확인해야 합니다. 환경 제한을 우회하거나 권한을 임의 변경하지 않았습니다.

## 7. 이번 후속 작업의 변경 파일

기존 리팩토링의 전체 Git 변경 목록과 이번 변경을 구분합니다.

| 파일 | 변경 내용 |
| --- | --- |
| `src/components/CandidateComparison.tsx` | 회사 상세·기능·사용법·무료/유료 표시, 플랜 가격/모델 조사 UI 제거 |
| `src/components/StageWorkspace.tsx` | 단계별 회사 중복 제거, 내부 플랜/가격/원시 근거 비노출 |
| `src/App.tsx` | 푸터를 제품 이용 범위 안내로 정리 |
| `src/lib/providerPresentation.ts` | 화면용 접근 조건·기능 상태·사용 순서·회사 선택 목록 함수 추가 |
| `src/lib/providerPresentation.test.ts` | 무료 근거·선택 보존·중복 방지 검사 추가 |
| `tests/provider-render.test.mjs` | 무료 사례, 상세·프롬프트 화면 비노출 회귀 검사 추가 |
| `tests/provider-playwright.mjs` | 선택 실행하는 실제 브라우저 E2E runner 추가 |
| `package.json` | `test:playwright` 명령 추가; 의존성 변경 없음 |
| `README.md`, `docs/README.md` | 현재 화면 정책·검증 상태·보고서 연결 |
| `docs/provider-recommendation-policy.md` | 내부 플랜 데이터와 화면 표시 정책 구분 |
| `docs/provider-refactor-report.md` | 기존 본문을 유지하고 후속 검증 문서 연결 |
| `docs/provider-product-validation-report.md` | 이 보고서 |

추천 엔진·카탈로그·프롬프트 생성/편집 상태·갱신/복구·Pages 설정은 이번 후속 작업에서 수정하지 않았습니다. 새 점수나 브랜드 우선순위도 추가하지 않았습니다.
