# Deliverable First 프롬프트 생성 개선 결과

기준: 2026-10-29, 시작 커밋 `0f79525`, 작업 시작 Git 상태 clean. commit·push·배포·외부 AI 호출은 하지 않았습니다.

## 실제 확인한 문제와 확인하지 못한 인과관계

사용자가 추가로 공유한 서비스 전달 프롬프트는 설문 완성본 요청이며, 핵심 메시지·개요·홍보 글·대본 생성 지시가 없습니다. 이 원문을 `tests/fixtures/survey-request.ts`의 `suppliedServicePrompt`에 그대로 재현했습니다. 최초 명세의 소폭 다른 표현도 `surveyRequest`로 보존했습니다. 서비스별 전체 대화·앱의 선택 단계·실제 답변 원문은 확보하지 못했습니다. 따라서 ChatGPT/Gemini/Claude의 보고된 응답 차이를 앱 생성기의 직접 결과라고 단정하지 않습니다.

별도로 커밋된 생성 API를 호출하여 다음 결함을 재현했습니다.

1. 활성 `src/lib/prompts.ts`는 존재하지 않습니다. 현재 경로는 `promptEngine.ts` → `aiGuide.ts` → `workStages.ts`입니다.
2. 이전 `providerRequirements.ts`의 `설문.*(?:문항|질문)` 검사는 줄바꿈을 넘지 않습니다. 첫 줄의 `설문지를 작성`도 설문 문항 의도로 인식하지 못했습니다. 제공된 여러 줄 요청은 `writing / textGeneration`만 필요하다고 분류됐습니다. 짧은 `설문지를 만들어줘`는 작업 자체가 비었습니다.
3. 일반 writing에는 일괄적으로 `outline → compose → polish`가 붙었습니다. 첫 단계 출력 계약은 **핵심 메시지·문단별 개요·추가로 필요한 정보**, 두 번째 제목은 **홍보 글 초안**이었습니다. 이후 제목을 일반 글로 바꿔도 본문의 홍보·기획 지시는 남았습니다.
4. 짧은 `설문 문항을 작성해줘`는 전용 분기에 잡혔지만 **설문 설계부터** 시작했고, stage.output은 포괄적인 **글·발표 대본**이었습니다.
5. 일반 단계 생성기는 전체 요청과 `base.main.text`를 매 단계에 다시 넣어 다른 작업 지시를 혼입시켰습니다. 같은 writing 카테고리인 설문+홍보도 독립 산출물로 표현하지 못했습니다.
6. 선택한 회사 ID는 생성 본문을 바꾸지 않았습니다. 수정 전에도 OpenAI·Anthropic·Google·xAI 본문은 같았습니다. 회사별 우열이나 성능 가정은 원인으로 확인되지 않았습니다.

수정 전 원문, 실제 선택 ID와 현재 생성 결과는 [기계 판독 결과](deliverable-first-results.json), 사람이 읽을 수 있는 [전후 프롬프트 전문](deliverable-first-prompt-comparison.md)에 보관했습니다. 원래 서비스 실험의 AI 응답과 이 로컬 재현은 별개입니다.

## 변경한 로직과 템플릿

`WorkCategory`는 추천에 필요한 큰 작업 종류로 유지했습니다. 별도의 `DeliverableKind`/`DeliverableContract`에 목표, 산출물, 필수 조건, 입력 자료, 요청한 부가 설명, 미확인 사항, 실행 지시를 저장합니다.

명시적 `deliverableKind` → 직접 수정한 의미 있는 결과 형식 → 자연어 추론 순서로 적용합니다. `설문 설계안`뿐 아니라 형식 필드의 짧은 `개요`·`기획안`도 완성 설문 지시를 대체합니다. 표·JSON 같은 표현 형식은 산출물의 의미를 임의로 바꾸지 않습니다. 기존 요청의 PDF 입력/분석 필요 조건은 최종 출력 형식을 선택해도 유지합니다.

완성 설문은 첫 단계 `survey-compose` 하나에서 실제 질문·선택지·척도를 요구합니다. 기획 요청은 설계안만, 발표 대본·보고서·이메일은 해당 본문을 요구합니다. 다른 일반 글에 홍보 기획 단계를 강제로 붙이지 않습니다. 코딩의 원인 확인·수정·검증, 설문 **결과 데이터**의 통계·해석·보고서처럼 필요한 기존 단계는 유지했습니다. 기존 설문 문항 자체를 분석/요약하는 요청은 새 설문지나 통계 분석으로 바꾸지 않습니다.

복합 작업은 각 단계의 활성 실행 계약을 분리했습니다. 전체 원문은 `<원문>` 참고 자료로 그대로 보존하고, 실제 수행은 그 뒤의 **현재 단계 실행 지시**로 한정합니다. 공통 기본 프롬프트를 단계별로 중복 삽입하지 않습니다. 설문+홍보는 `실제 설문지 → 홍보 문구`, 논문+대본은 `자료 분석 → 결과 검토 → 실제 대본`이며 필요한 검토 결과만 인계합니다. 홍보 글에 붙은 200자 조건이나 분석 방법 설명은 해당 산출물에만 적용합니다.

설문 템플릿은 Q1~Q10, 객관식 7문항의 실제 선택지, 5점 척도 2문항의 값·의미, 주관식 1문항의 실제 질문, 안내문·응답하지 않을 권리·비사용자 분기를 명시합니다. 비사용자에게 만족도를 강제하거나 모든 문항에 무응답 선택지를 붙이지 않도록 합니다. 조사 주체·기간·법률·개인정보 처리 조건·익명성/파기 약속은 만들지 않습니다. 문항 수 합계가 실제로 충돌할 때만 그 필수 조건을 확인하도록 합니다.

## 변경 파일

| 파일 | 역할 |
| --- | --- |
| `src/types.ts` | 산출물 타입·출력 계약, 선택적인 명시적 산출물 필드 |
| `src/lib/deliverables.ts` | 산출물 추론·기획/완성본 구분·명시값 우선·부정 표현·입력 자료 구분 |
| `src/lib/deliverablePrompts.ts` | 산출물별 실행 계약·설문 문항 조건·입력/설명/분량 범위 분리 |
| `src/lib/promptEngine.ts` | 기본 프롬프트와 기존 선택형 복합 템플릿에 계약 연결 |
| `src/lib/workStages.ts` | writing의 일괄 기획 단계 교체, 기존 코딩 단계·편집용 ID 유지 |
| `src/lib/aiGuide.ts` | 단계별 계약·작업별 인계 연결, 설문 문항 분석과 통계 분석 구분 |
| `src/lib/providerRequirements.ts` | 설문·명시 산출물의 작업 추출 수정, 기존 입력 처리 필요 조건 보존 |
| `src/lib/surveyTask.ts` | 원문과 현재 단계 지시의 경계 표시 |
| `src/lib/deliverables.test.ts` | 새 Node 회귀 테스트 38개 |
| `tests/fixtures/survey-request.ts` | 명세 입력·추가로 공유한 실제 서비스 입력 |
| `tests/e2e/deliverable-survey.spec.ts` | 세 회사의 정확한 설문 생성·클립보드 검증, 두 화면 폭에서 6개 |
| `docs/deliverable-first-results.json`, `docs/deliverable-first-prompt-comparison.md`, `docs/prompts/deliverable-first/*.txt` | 전후 원문·회사별 실제 생성물 |
| `README.md`, `docs/README.md`, 이 보고서, `docs/superpowers/plans/2026-10-29-deliverable-first.md` | 현재 동작·근거·검증·계획 기록 |

## 기존·개선 프롬프트 비교

| 요청 | 이전 첫 결과 | 개선된 계약 |
| --- | --- | --- |
| 제공한 10문항 설문 | 핵심 메시지·문단별 개요·추가 정보 | 실제 Q1~Q10 설문지·선택지·척도·안내문 |
| 설문 문항 작성 | 설문 설계, 출력은 글·발표 대본 | 실제 설문지 |
| 설문지 기획 | 일반 글쓰기 기획 또는 미분류 | 설문 설계안만 |
| 발표 대본 작성 | 메시지 구성/개요 | 실제 발표 대본 |
| 보고서/이메일 작성 | 공통 글쓰기 단계 | 실제 본문 |
| 설문지+홍보 글 | writing의 공통 세 단계 | 설문지와 홍보 문구의 독립 계약·인계 |

## 실제 최종 생성 프롬프트 전문

다음 파일은 설명용 예문을 손으로 쓴 것이 아니라 `buildGuideBundle()`에 실제 카탈로그의 각 회사 선택 ID를 넣고 생성한 **복사 대상 단계 본문**입니다.

- [ChatGPT에 전달할 전문](prompts/deliverable-first/chatgpt.txt)
- [Claude에 전달할 전문](prompts/deliverable-first/claude.txt)
- [Gemini에 전달할 전문](prompts/deliverable-first/gemini.txt)
- [전후 전문을 한 화면에서 비교](deliverable-first-prompt-comparison.md)

세 본문은 1,426자로 같고 SHA-256도 같습니다. 같은 입력에는 같은 산출물·필수 조건을 제공하며, 확인되지 않은 회사별 프롬프트 최적화를 만들지 않았습니다. 서비스 사용 링크·기능 안내는 기존 UI에서 별도로 유지합니다. 개별 모델명·버전·벤치마크는 추가하지 않았습니다.

## 검증 결과

| 검사 | 실제 결과 |
| --- | --- |
| 시작 시 기존 Node 테스트 | **80/80 통과** |
| 최종 `npm test` | **118/118 통과**, 실패·건너뜀 0. 기존 80 + 새 38 |
| `npm run typecheck` | 통과 |
| `npm run evaluation:typecheck` | 통과 |
| E2E spec·설정 TypeScript 검사 | 실제 설치된 Playwright 타입으로 통과 |
| `npm run data:validate` | 통과: 12 Provider / 13 Service / 18 Plan |
| `npm run evaluation:validate` | valid, 외부 서비스 실행 0·등록 점수 0 |
| 일반 `npx playwright test --list` | **22개 발견**: 기존 16 + 새 6. 이번에는 임시 import hook 없이 로컬 설치 패키지 사용 |
| 기존 16개만 수집 | `Total: 16 tests in 1 file` |
| 기존 16개 Chromium 실행 시도 | **exit 1, spawn EPERM**. webServer 준비 프로세스 실행 거부, 시나리오 실행 0 |
| 새 설문 E2E 6개 실행 시도 | **exit 1, spawn EPERM**, 시나리오 실행 0 |
| `npm run build` | TypeScript 이후 Vite/esbuild의 **spawn EPERM**, exit 1 |
| 세 회사 선택 시 실제 프롬프트 생성 | 성공: 동일 본문·동일 해시, 단계는 실제 설문지 하나 |
| 보호 파일 해시 | 추천 엔진·정책·공식 데이터·평가·UI·편집/복사·기존 E2E 설정/파일 등 **12개 변경 없음** |
| 기존 8개 브라우저 입력의 추천 결과 | 커밋의 추출기와 현재 추출기를 각각 실행하여 필수 기능·모든 옵션 판정·예산 상태·대표/조건부/제외 회사가 동일함을 확인 |
| 실제 외부 AI 실험 | **미실행**. AI가 개선된 설문지를 생성했다고 판정하지 않음 |

새 테스트는 완성본/기획안 구분, 여러 줄 설문 조건, 문항 유형·합계, 명시 출력 우선, 두 writing 산출물 분리, 논문→대본 인계, 부정 표현, 기존 설문 분석, 없는 사실·불필요 질문 방지, 회사 변경과 편집·복구 보존을 확인합니다. 생성된 문자열은 출력 계약을 검사하는 대상이며 AI 응답 품질의 증거로 사용하지 않습니다.

독립 리뷰에서 찾은 여섯 문제(짧은 기획 형식, 단계별 분량, 기존 설문 입력 구분, PDF 처리 필요 조건, 부가 설명 혼입, 일반 부정 표현)를 실제 실패 테스트로 재현한 뒤 수정했습니다. 목차+발표 개요가 같은 stage ID를 사용해 편집 초안을 공유하던 추가 경계 사례도 실패 재현 후 서로 다른 ID로 고쳤습니다. 최종 전체 테스트가 통과했고 기존 테스트의 검증을 삭제하거나 무력화하지 않았습니다.

로그: `.qa/deliverable-unit-before.log`, `deliverable-regressions-red.log`, `deliverable-review-red.log`, `deliverable-unit-final.log`, `deliverable-playwright-list.log`, `deliverable-playwright-list-all.log`, `deliverable-e2e-original16.log`, `deliverable-e2e-survey.log`, `deliverable-build-final.log`, `deliverable-recommendation-preservation.json`. 경로는 모두 `.qa/` 기준입니다.

## 남은 제한과 로컬 재검증

이 환경의 프로세스 생성 제한 때문에 프로덕션 번들·실제 브라우저·OS 클립보드 회귀를 이번 변경으로 재검증하지 못했습니다. 과거 로컬 성공을 이번 성공으로 대체하지 않았고, 실패 후 남아 있는 dist로 E2E를 진행하지 않았습니다. 원래 16개 spec과 설정은 바이트 단위로 유지했습니다.

일반 로컬 PowerShell에서 다음을 실행하면 기존 16개와 새 설문 6개를 구분해 확인할 수 있습니다. Playwright 설정이 빌드와 preview를 시작하므로 별도 preview를 켤 필요는 없습니다.

```powershell
npm test
npm run typecheck
npm run evaluation:typecheck
npm run data:validate
npm run evaluation:validate
npm run build
npx playwright test --list
npx playwright test tests/e2e/provider-flow.spec.ts
npx playwright test tests/e2e/deliverable-survey.spec.ts
```

생성기를 직접 재실행해 설문 본문을 출력하려면:

```powershell
node --input-type=module -e "import {buildGuideBundle} from './src/lib/aiGuide.ts'; import {suppliedServicePrompt} from './tests/fixtures/survey-request.ts'; console.log(buildGuideBundle({text:suppliedServicePrompt,overrides:{}},{default:null,byStage:{}}).steps[0].text)"
```

자연어 분류는 규칙 기반입니다. 검사한 사례를 넘어 모든 표현을 정확하게 해석한다고 보장하지 않습니다. 실제 결과물 품질은 저장한 세 서비스용 프롬프트로 별도 실험하고 응답 원문·사용 서비스/조건·프롬프트 전문을 함께 대조해야 합니다.
