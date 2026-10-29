# 로컬 실행 재검증 및 수동 평가 준비 보고서

후속 수정: [Playwright 수집 오류·16개 테스트 등록·최신 검증 결과](provider-playwright-repair-report.md). 아래 최초 실행 결과는 당시 기록이며, 3절의 명령은 현재 `@playwright/test` 방식으로 갱신했습니다.

검증일: 2026-10-29. 기준 커밋 `6e9f86c`. [이전 근거·평가 보고서](provider-evidence-evaluation-report.md), [평가 가이드](provider-evaluation-guide.md), 현재 Git 상태를 확인했습니다. 기존 미커밋 작업을 보존하고 제품 기능·추천·UI를 확장하지 않았습니다. commit·push·배포·외부 AI 실험을 하지 않았습니다.

## 1. 실제 실행 결과

| 검사 | 실제 관측 결과 |
| --- | --- |
| 작업 시작 시 `npm test` | 기존 **79개 통과**, 실패0·건너뜀0 |
| `npm run typecheck` | 통과 |
| `npm run evaluation:typecheck` | 통과 |
| `npm run data:validate` | 통과, 12 Provider / 13 Service / 18 Plan |
| `npm run evaluation:validate` | 통과, 실제 완료0·등록 점수0 |
| `npm run build` | exit1, esbuild `spawn EPERM` |
| esbuild 최소 변환 | 프로젝트 미import, `const value: number = 1` 변환도 `spawn EPERM` |
| Node 자식 프로세스 최소 실행 | `spawn(process.execPath,['--version'])`도 `spawn EPERM` |
| Playwright npm 조회 / 정상 설치 시도 | exit1, `ENOTCACHED`, npm `only-if-cached` 모드에 패키지 없음 |
| `npm run test:playwright` | exit2, **not-run / 실행0 / 통과 판정 없음**, 패키지 부재 |
| 추가 게이트 검증 포함 최종 테스트 | **80개 통과**, 실패0·건너뜀0. 기존79 + 조건별 게이트 검사1 |

로그: `.qa/provider-execution-build.log`, `.qa/provider-execution-diagnostic.json`, `.qa/provider-execution-playwright-install.log`, `.qa/provider-execution-e2e.log`. 재현용 정보만 보관하고 전체 환경변수나 계정 정보를 출력하지 않았습니다.

## 2. EPERM 진단 대조

이전 `.qa/provider-product-build-diagnostic.json`과 현재 결과의 Node v24.13.0, Windows 10.0.26200 x64, TypeScript5.9.3, Vite7.3.7, esbuild0.28.2가 같습니다. 두 실행 모두 `ensureServiceIsRunning → ChildProcess.spawn → EPERM`에서 실패했습니다.

추가로 프로젝트를 읽지 않는 Node의 단순 자식 프로세스 생성도 거부됐습니다. 따라서 **관측된 빌드 차단은 앱 추천 코드 실행 이전의 프로세스 생성 환경 계층**입니다. 어떤 호스트 보안 정책이 거부했는지는 이 자료만으로 특정할 수 없습니다. 전체 번들 빌드 단계는 아직 검증하지 못했으므로 프로젝트에 다른 빌드 문제가 없다고 단정하지 않습니다. 소스 타입 검사 통과와 사용자 로컬에서의 이전 성공 보고는 구분해 기록합니다.

권한·ACL·실행 정책·Vite/esbuild 설정·샌드박스 플래그를 변경하거나 다른 빌드 방식으로 우회하지 않았습니다.

## 3. Windows 로컬 설치와 실행 명령

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

## 4. 실제 회사별 평가 준비

[4개 소비자 서비스 체크리스트](provider-consumer-pilot-checklist.md)와 [기계 판독 준비표](../evaluations/preparation/consumer-pilot.json)를 추가했습니다. ChatGPT·Claude·Gemini·Grok을 우선 조사 대상으로 지정했습니다. 기존 3과제 × 가능 시 최소2회의 **24개 빈 예약 칸**이며, 실제 run이나 점수가 아닙니다.

계정별 실제 플랜·경로·지역·기능·입력 한도는 아직 확인하지 않았습니다. 문서에서 확인한 파일 한도와 계정 검증 결과는 분리합니다. 모든 계정 기능은 unknown으로 시작하고 실제 미지원만 unsupported로 기록합니다. Grok은 기존 등록 플랜이 unreviewed라 정확한 플랜 근거를 확인한 뒤 진행합니다. Gemini XLSX도 기존 보수적 준비 필터를 임의 해제하지 않았습니다.

기존 고정 입력 파일·해시·프롬프트·정답·루브릭을 유지합니다. 정답은 서비스에 전달하지 않습니다. 미실행 회차를 복제하거나 가상 출력·점수를 입력하지 않았습니다. 실제 계정 확인·파일 첨부·응답 수집·차트 확인·두 독립 익명 평가·낭독 측정은 사용자 수동 단계로 남아 있습니다.

## 5. 실측 기록 체계 점검

기존 EvaluationRun의 Provider/Service/planId/channel/testedAt, 과제·버전·입력 해시, 실제 출력 원문·해시·첨부, EvaluationScore의 자동/독립 수동 점수 구조가 요구사항을 수용합니다. 작업 성공 여부와 실측 소요 시간의 전용 필드는 기존 Run에 없지만 **executionEvidence JSON을 통해 확장 필드로 보관 가능**합니다.

이를 위해 [빈 실행 기록 양식](../evaluations/preparation/execution-record-template.json)에 실제 플랜명·입력 및 제출 프롬프트 전문 참조·시작/끝 시각·elapsedSeconds·clockSource·taskCompleted·오류·제한을 명시했습니다. Run 타입·채점·추천을 변경하지 않았습니다. 기존 검증기는 실행 증거와 파일/결과 일치를 검사하지만 추가 시간 필드를 원격 측정하거나 강제 검증하지 않습니다. 담당자는 로그의 시각·타이머·성공 근거를 대조해야 합니다. 미측정을 0초, 미평가를0점으로 바꾸지 않습니다.

실제 응답 확보(completed)와 사용자 요구 전체 완수(taskCompleted)를 구분합니다. 추가 시간 자료는 기록만 하며 비용·편의 점수로 자동 환산하지 않습니다.

## 6. 추천 반입 게이트와 현재 활용 가능 근거

추가 단위 검사는 과제, Provider, Service, Plan, 웹/API, 지역, 환경, 입력 해시, promptVersion, rubricVersion, 사용자 플랜 접근 불일치를 각각 검사합니다. demo/synthetic도 거부합니다. 불일치 시 eligibleRunIds와 수치 통계가 비고 회사 점수는 null입니다. 기존 검사는 반복 부족·실제 파일 미확인·동일 세션·독립 리뷰 부족·설정 차이도 거부합니다.

현재 활용 가능한 운영 근거는 기존 카탈로그의 공식 검토 완료 기능·플랜 범위와 무료/예산 조건입니다. 신규 체크리스트의 문서 한도는 수동 사전 확인 참고이며, 운영 데이터에 자동 반영하지 않았습니다. 회사별 실제 품질·속도·편의·신뢰할 순위를 뒷받침할 실측은 없습니다.

registry는 계속 비어 있고 운영 앱은 평가 모듈을 import하지 않습니다. 실제 결과를 입력한 뒤에도 정확한 작업·비교 조건·사용자 이용 권한과 충분성 검토를 통과해야 하며, 별도 연결·점수 정책 검토 전에는 회사 점수나 확정 순위를 만들지 않습니다.

## 7. 보존과 변경 파일

작업 전 기존 파일282개와 Git diff·상태를 `.qa/provider-execution-before-20261029T064031Z.zip`에 보관하고 해시를 검증했습니다. 기존 미커밋 삭제·수정·미추적 작업을 되돌리지 않았습니다.

이번 변경은 package.json의 설치 명령2개, 반입 게이트 조건별 테스트1개, 준비 JSON2개, 체크리스트·이 보고서·[실행 결과 JSON](provider-local-execution-results.json)과 기존 안내 문서의 연결입니다. 기존 파일282개 중277개는 바이트가 같고, README·docs/README·평가 가이드·package.json·조건별 게이트 테스트만 의도대로 변경했습니다. 추천 엔진·UI·카탈로그·공식 근거 register·입력 파일·기존16개 E2E runner·package-lock.json은 동일합니다. 이전8개 추천 사례의 회사·서비스·상태·점수·순위도 동일합니다. 삭제된 기존 파일은 없습니다.
