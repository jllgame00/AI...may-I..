# Playwright 수집 오류 수정 보고서

검증일: 2026-10-29, Windows PowerShell / Node v24.13.0 / npm 11.20.0 / 캐시 Playwright 1.64.1.

## 원인과 재현

작업 시작 시 루트 `playwright.config.*`와 `@playwright/test` 의존성이 없었습니다. Playwright 기본 수집이 Node.js 단위 테스트와 역사 자료를 함께 import했습니다. `node:test`의 테스트 출력은 Playwright E2E 실행 결과가 아니었습니다.

오류의 실제 import는 `archive/legacy-app/src/lib/workflow.test.ts:5`의 `buildStagePrompt, stagePromptContext`입니다. `buildStagePrompt` 호출은 같은 파일 63·87행뿐이며, 해당 보관 폴더의 `prompts.ts`는 `buildPrompt`만 export합니다. 현재 활성 `src/lib/prompts.ts`는 이전 Provider 전환 작업에서 이미 삭제된 상태였습니다. 활성 `src/`, `tests/`에는 `buildStagePrompt` 참조가 없습니다. 현재 호출부는 `src/lib/aiGuide.ts`의 `buildGuideBundle`, `guideContext`, `stageOptions` 등을 사용하고 `providerFlow.test.ts`에서 검증합니다. 보관 코드에 구형 API를 추가하거나 현재 앱에 모델 로직을 복원하지 않았습니다.

기존 캐시 CLI로 수정 전 `test --list`를 실행해 같은 SyntaxError, Node 테스트 출력, `Error: No tests found`, `Total: 0 tests in 0 files`를 재현했습니다. 로그: `.qa/playwright-repair-discovery-before.log`. 보관 테스트를 Node로 직접 실행해도 같은 import 오류가 발생했습니다.

기존 보고서의 16개는 `tests/provider-playwright.mjs`에 있던 **8개 입력 × 2개 화면 폭의 라이브러리 반복문**이었습니다. 파일과 검증 코드는 있었지만 `@playwright/test`의 `test()` 등록은 없었습니다.

## 수정 파일과 검증 유지

| 파일 | 변경 |
| --- | --- |
| `playwright.config.ts` | `testDir: ./tests/e2e`, `testMatch: **/*.spec.ts`, archive/src/Node 단위 테스트 제외. Chromium 1440×900, 320×900 프로젝트. 빌드 성공 후 preview 자동 실행, 기존 서버 재사용 안 함 |
| `tests/e2e/provider-flow.spec.ts` | 설문 문항, XLSX 분석, PDF 분석, 발표 대본, 코드, 이미지, 무료 이미지, 복합 작업을 `test()`로 등록. 8개 × 2프로젝트 = 16개 |
| `tests/provider-playwright.mjs` | 기존 직접 실행 경로를 공식 CLI 호환 진입점으로 전환. 실제 시나리오는 E2E spec에 위치 |
| `package.json`, `package-lock.json` | `@playwright/test` 1.64.1 고정, CLI 실행·목록·Chromium 설치 명령 정리 |
| `README.md`, `docs/README.md`, 기존 제품/로컬 실행 보고서 | 현재 명령·결과 위치·수집과 실행의 차이 반영 |
| `docs/superpowers/plans/2026-10-29-playwright-discovery.md` | 조사·수정·검증 기록 |

최대 3개 회사·회사 중복 없음, 접힌 조건부 후보, 상세 사용 방법, 무료→유료 허용→무료 재계산, 단계별 원문 보존, 회사 선택 중복 방지, 정확한 실제 클립보드 복사, 초안 재생성·복구, 복합 작업의 회사 변경 후 초안 보존, 뒤로 가기 후 초안 보존, PC/모바일 가로 넘침, 화면 캡처, `pageerror`/`console.error` 검사를 유지했습니다. 재생성으로 본문이 바뀌는지와 모델 정보 비노출 검사도 포함합니다. 검증 삭제·skip·에러 무시는 없습니다.

현재 추천 엔진·UI·데이터·활성 프롬프트 API·보관 파일을 변경하지 않았습니다. 이전 runner 원문은 `.qa/playwright-repair-provider-runner-before.mjs`에 보존했습니다. commit·push·배포는 하지 않았습니다.

## 실제 결과와 제한

| 검사 | 관측 결과 |
| --- | --- |
| 수정 전·후 현재 Node 테스트 | 각각 80개 통과, 실패·건너뜀 0 |
| 수정 후 Playwright 수집 진단 | **exit 0, Total: 16 tests in 1 file**. E2E spec만 발견, Node 테스트 출력·missing export 없음 |
| 일반 `npx playwright test --list` | **실행 불가**. 로컬 CLI 미설치이며 npm 오프라인 캐시에서 `ENOTCACHED` |
| `@playwright/test` 정상 설치 시도 | **실패**. 명령에 `--offline=false`를 줘도 연결 `ECONNREFUSED 127.0.0.1:9` |
| Chromium E2E 실행 시도 | **exit 1, spawn EPERM**. 서버 프로세스 준비에서 실패. 브라우저 시나리오 실행·통과 0건 |
| 설치된 Chromium 직접 launch 진단 | 바이너리는 존재하지만 `browserType.launch: spawn EPERM` |
| 앱 타입 검사 | 통과 |
| E2E spec·설정 타입 검사 | 캐시의 공식 Playwright 타입을 임시 paths로 연결하여 통과 |
| 평가 스크립트 타입 검사 | 통과 |
| Provider 데이터 검증 | 통과, 12 Provider / 13 Service / 18 Plan |
| 평가 데이터 검증 | valid, 실제 외부 서비스 실행 0·등록 점수 0 |
| `npm run build` | 타입 검사 이후 esbuild `spawn EPERM`, exit 1 |

수집 진단은 기존 npm 캐시의 공식 `playwright/test` 구현에 **진단용 임시 Node resolve hook**으로 `@playwright/test` import를 연결해 실행했습니다. 프로젝트의 config/spec은 그대로 사용했습니다. 이 hook은 `.qa/playwright-repair-cache-hook.mjs`에만 있으며 프로젝트 명령에는 연결하지 않았습니다. **정상 패키지 설치나 일반 npx 명령의 성공을 의미하지 않습니다.**

패키지 설치가 막혀 lock의 새 wrapper 항목은 버전·공식 tarball 경로·의존성으로 추가했습니다. 다운로드하지 않은 `@playwright/test`의 integrity 값을 만들지 않았습니다. `playwright`, `playwright-core` 항목과 integrity는 기존 공식 npm 캐시 lock에서 읽었습니다. 네트워크가 되는 로컬에서 `npm install`로 wrapper 설치와 lock의 integrity 보완을 완료해야 합니다. 이 환경에서 `npm ci` 재설치 성공은 확인하지 못했습니다.

로그는 `.qa/playwright-repair-discovery-before.log`, `playwright-repair-discovery-cached.log`, `playwright-repair-discovery-standard.log`, `playwright-repair-chromium.log`, `playwright-repair-browser-launch.json`, `playwright-repair-build.log`, `playwright-repair-unit-after.log`에 있습니다. 오류가 없는 수집 결과를 실제 브라우저 통과로 계산하지 않습니다. 프로세스 생성 제한의 구체적인 호스트 정책은 확인되지 않았습니다. 독립 코드 리뷰에서 기존 검증 누락·수집 설정·Windows CLI 호환성의 수정 필요 사항은 발견되지 않았고, npm Arborist의 가상 의존성 트리도 새 lock 항목을 정상 해석했습니다.

## 로컬에서 남은 재검증

네트워크와 자식 프로세스 실행이 허용되는 일반 로컬 PowerShell에서:

```powershell
Set-Location -LiteralPath 'D:\univ\3-1\contest\2026_KHU_AI_Challenge'
npm install --offline=false
npm ls @playwright/test --depth=0
npm run setup:chromium
npx playwright test --list
npx playwright test
```

각 단계가 성공한 후 다음 단계로 진행합니다. `--list`의 기대 결과는 `Total: 16 tests in 1 file`이며, 실제 E2E는 **16 passed**와 exit 0을 별도로 확인해야 합니다. 서버는 설정이 새 빌드 후 자동 실행하므로 별도 preview를 켜지 않습니다. 4173 포트 사용 중이면 그 서버를 확인해야 합니다. 기존 `dist`로 실패한 빌드를 대신하지 않습니다.

새 결과 `.qa/provider-product-playwright.json`은 **Playwright 표준 JSON reporter 형식**이며 과거의 `status/executed/checks` 형식이 아닙니다. 성공 판단은 `stats.expected === 16`, `unexpected === 0`, `skipped === 0`, `flaky === 0`, `errors` 없음과 exit 0입니다. `--list`도 JSON을 기록하므로 수집 결과 JSON을 실행 통과 근거로 쓰면 안 됩니다. 스크린샷과 실패 trace는 `.qa/playwright-results/`에 남습니다.

구성 방식은 [Playwright 공식 테스트 설정](https://playwright.dev/docs/test-configuration), [공식 webServer 설정](https://playwright.dev/docs/test-webserver)을 따릅니다.
