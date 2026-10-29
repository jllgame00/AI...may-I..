# 핵심 앱 재구성 구현과 검증 기록

2026-10-28~29 사용자 최종 명세를 기준으로 재구성했습니다. 계획만 남기지 않고 입력·해석·비교·선택·프롬프트 편집·복사 경로를 연결했습니다. 실제 외부 AI 이용과 통계 분석은 사용자가 수행합니다. 브라우저와 배포 빌드는 아래 환경 제한 때문에 확인하지 못했습니다.

## 시작 상태와 변경 범위

AGENTS.md를 프로젝트·상위 경로에서 찾지 못했습니다. `git status`, `git diff`, package·Vite·소스·데이터·테스트·Pages 설정을 확인했습니다. 시작 작업 트리에는 중단된 변경과 새 파일이 있었으며 타입 오류 4건, 테스트 150 통과·5 실패 상태였습니다. 실제 데이터는 모델 25개·관측값 111건이었습니다.

Git 초기화·reset·clean·commit·push는 수행하지 않았습니다. 기존 변경을 최종 명세에 맞춰 통합했습니다. 사용하지 않는 화면 컴포넌트와 고정 모델 기능 후보 목록은 `archive/2026-10-core-rebuild/`에 보존하고 활성 코드에서 제거했습니다. 패키지를 추가하거나 React/Vite/TypeScript/Tailwind를 바꾸지 않았습니다.

## 활성 구조

| 파일 | 책임 |
| --- | --- |
| `src/App.tsx` | 세 단계 화면, hash 이동, 세션 메모리와 초안 소유 |
| `AnalysisPanel` / `ConditionFields` | 해석과 직접 수정. 자동 추정과 사용자 입력 구분 |
| `CandidateComparison` | 최대 3개 기본 후보, 다른 후보·평가·출처 상세, 웹 선택만 허용 |
| `StageWorkspace` / `PromptEditor` | 단계별 편집·복사·실패 처리·재생성·복구·외부 링크·검토 |
| `aiGuide` / `surveyTask` / `workStages` | 규칙 해석, 원문 보존, 작업별 목표·입력·산출물·인계 |
| `taskRanking` / `evidenceComparisons` | 모든 유효 집합 검토, 대표 평가 선정, 집합별 원점수·동점 |
| `baselineSnapshot` | 기존 모델·평가·출처·플랜·접근 자료 |
| `refreshSnapshot` / `recommendationSnapshot` | 검증된 정상 갱신 패치와 신규 식별 정보를 결합 |
| `scripts/refresh-core.ts` / `refresh-data.mts` | 수집·정규화·검증·변경 탐지·원자 저장·영속 복구 |

원문은 변경하지 않고 보관하며 복사 본문에도 원문 맥락으로 포함합니다. 자동 추출이 놓친 조사 기간·가중치 등 추가 조건을 누락시키지 않기 위한 선택입니다. 직접 수정한 연구 질문·자료·설명 수준·조건은 원문보다 우선한다는 지시를 둡니다. 분석·해석 단계에 최종 보고서 분량을 강제하지 않습니다. 원문에서 단어를 삭제해 남은 조각을 연결하지 않습니다.

모르는 값은 빈칸·미정으로 남깁니다. 이미 적힌 조건을 별도 질문으로 다시 요구하지 않으며, 결과 형식·분량 등을 직접 수정할 수 있습니다. 파일·모델 기능과 실행 조건 안내는 웹페이지에 두고 작업 프롬프트에는 계정·플랜·ID·URL을 넣지 않습니다.

## 추천 계산과 실제 예시

비교 집합은 평가 이름·버전·기간·실행 조건·출처를 유지합니다. 엄격한 동일 조건 비교와 제공사 게시 비교 열을 구분합니다. 모든 집합을 모은 뒤 작업 관련성, 엄격한 조건 여부, 비교 모델 수를 검토합니다. 가격·무료 여부·브랜드 선호는 사용하지 않습니다. 정렬 보조 ID는 표시 결정용이며 점수나 우열 근거가 아닙니다.

| 요청 | 대표 평가·범위 | 실제 결과와 해석 |
| --- | --- | --- |
| 알고리즘 문제 풀이 | [Qwen 공식 모델 카드](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507)의 LiveCodeBench v6, 2025.02~05, 확보한 3개 모델 열 | Qwen3 235B 2507 51.8 → Kimi K2 48.9 → DeepSeek V3 0324 45.2. 제공사 게시 표 내부 순위이며 현재 전체 모델 순위·웹 제공을 뜻하지 않음 |
| React 기능 구현 | [Grok 4.7 공식 발표](https://x.ai/news/grok-4-7)의 CursorBench 4.0, 2개 실행 구성 | Grok 4.7 46.3, Grok 4.6 40.4. 도구·effort가 포함된 실행 구성 비교. 해당 API/에이전트 결과를 웹 선택 버튼으로 제공하지 않음 |
| React 오류 수정 | 같은 제공사 표의 DeepSWE 1.1, 2개 실행 구성 | Grok 4.7 71, Grok 4.6 65.2. 저장소 수정 평가라 대표로 선정. LiveCodeBench와 합산하지 않음 |
| 대표 설문 | 직접 통계 정확성 비교 미확보 | AIME·일반 추론 자료 등을 간접 검토. 예: DeepSeek R1의 AIME 2024 79.8은 통계 성공률이 아님. 동등 후보이며 웹 버전·엑셀 분석 지원 미확인 표시 |
| 한국어 동아리 홍보 글 | 언어·장르·judge가 일치하는 비교 부족 | Creative Writing v3·WritingBench·Longform Writing을 참고하지만 다른 평가를 합산하거나 한국어 순위로 변환하지 않음. 동등 후보 이름순 표시 |

[계산 결과 전체](recommendation-examples.json)는 현재 코드에서 생성합니다. 대표 집합 밖의 GPT·Claude 등은 다른 평가 근거 또는 근거 부족으로 남기며 낮은 성능으로 판정하지 않습니다. 새 식별 모델 3개는 아직 기능·평가가 없어 자동 웹 후보로 승격하지 않습니다. 동점은 공동 순위, 누락·중복 ID·버전 불일치는 순위에서 제외합니다.

## 대표 사례와 실제 생성 본문

[설문 4단계 프롬프트 전문](generated-prompt-examples.md)에 입력 원문, 각 목표·입력 위치·결과 형식·인계 내용을 수록했습니다. 같은 문서에 코딩과 홍보 글 전문도 있습니다.

대학생 120명은 요청에 적힌 조사 대상이며 실제 응답 수·분석별 유효 표본 수를 자료로 확인하도록 합니다. 학년별 만족도 차이와 공부 시간·성적 관계를 유지하고, 척도·집단 수·독립성·분포, 산점도·이상치 등을 검토해 방법을 선택하도록 요청합니다. 자료에 없는 통계값·유의확률·인용은 만들지 않도록 합니다. A4 4장은 초안·검토 조건에 반영하며 서식 없이 글자 수로 페이지를 보장하지 않습니다.

생성 본문을 직접 읽어 조각난 문장, 중복 원점수 설명, `글와` 같은 조사 오류를 정리했습니다. 원문 맥락과 추출 필드의 반복은 추가 조건 보존을 위한 구분입니다. 화면 캡처를 확인했다는 뜻은 아닙니다.

## 자동 갱신 실수집 결과

마지막 실제 확인: **2026-10-29 00:16:09 KST** (`2026-10-28T15:16:09.178Z`). 최종 정규화 값은 `src/data/refresh-snapshot.json`에 있습니다.

| 출처 | 응답·정규화 결과 | 상태 |
| --- | --- | --- |
| [Qwen 235B 공식 카드](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507/raw/main/README.md) | HTTP 200, 검토된 10개 관측값 | 정상 |
| [Qwen 30B 공식 카드](https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507/raw/main/README.md) | HTTP 200, 검토된 6개 관측값 | 정상 |
| [Hugging Face 공식 Qwen 모델 API](https://huggingface.co/api/models?author=Qwen&filter=text-generation&sort=lastModified&direction=-1&limit=5&full=true&config=true) | HTTP 200, 최근 5개 중 식별·commit·Apache-2.0 조건을 충족한 3개 | 정상 |
| Artificial Analysis | 인증 키·공개 활용 조건 미확인. 요청하지 않음 | 별도 비활성화 |

추가된 식별 정보는 `Qwen/Qwen-AgentWorld-35B-A3B`, `Qwen/WebWorld-14B`, `Qwen/WebWorld-32B`입니다. `license:other`인 최신 두 항목은 추가 조건을 통과시키지 않았습니다. 저장소 ID·commit만 확인했으며 이름으로 기능·플랜·웹 제공을 추정하지 않습니다.

기존 111건 중 16건의 값이 실제 카드와 일치함을 다시 확인했습니다. 새 평가 16건을 추가했다는 뜻이 아닙니다. 정규화 필드·행 순서 규칙을 확정한 뒤 같은 응답을 재수집해 확인 시각만 전진하고 `changedAt`이 유지되는 것을 확인했습니다. 소스 확인 시각을 전체 111건 재검증 시각으로 표시하지 않습니다.

제공사 카드의 소수 사실 수치와 원문 링크를 사용합니다. 전체 벤치마크 문항·데이터셋 재배포를 하지 않습니다. 카드의 라이선스 메타데이터를 다른 제공사의 평가 데이터 이용 허가로 확장하지 않습니다. AA는 기존 전용 수집·권한 검증 도구를 보존하되 일일 경로에서 다른 출처를 차단하지 않습니다.

실패 시 출처별 이전 정상 패치·발견 모델을 유지합니다. 성공 상태에는 완전한 관측 ID 집합·정상 점수·hash·변경 시각이 필요합니다. 빈 성공 응답·잘린 스냅샷은 복구 후보로 채택하지 않습니다. 기본 파일과 복구 파일 중 최신 유효 스냅샷을 선택하고 검증 후 임시 파일→rename으로 저장합니다. 다음 GitHub 실행은 캐시를 복원하며 캐시가 없어도 커밋된 기본 스냅샷으로 시작합니다.

## 검증 결과와 제한

- `npm test`: **165 통과 / 0 실패**. 이전 개수를 목표로 삼지 않고 폐기된 고정 후보 수·화면 문구 테스트를 정리했습니다.
- `npm run typecheck`, `npm run data:validate`, `node --check tests/browser-check.mjs`, `git diff --check`: 통과.
- 원문·추가 조건·수정 우선·미정, 단계 목적·인계, 집합 선택·동점·누락·하위 우열 금지, 출처 값 변경→실제 추천 변경, 웹/성능 분리, 초안 유지·복구·복사와 실패, 출처 실패 격리·비정상 스냅샷 복구를 자동 검증했습니다.
- React 서버 렌더링으로 입력·추천 카드·단계 편집·외부 링크·핵심 제한·접힌 출처 구조를 확인했습니다. CSS에는 700px 이하 한 열과 320px 대응 규칙을 구현했습니다. 실제 화면 배치 검증은 아닙니다.
- `npm run build`: 관리형 Windows에서 Vite의 esbuild 자식 프로세스가 `spawn EPERM`으로 거부됐습니다. 별도 in-process 시도도 Vite 내부 resolver·define 경로에서 같은 환경 제한을 만나 제거했습니다. 성공한 배포 빌드나 새 dist를 제공한다고 주장하지 않습니다.
- 브라우저 연결 호스트 불가. Chrome CUA는 `Computer Use was not approved to use Google Chrome`으로 거부됐습니다. 다른 UI 자동화로 우회하지 않았습니다. PC·320px·키보드·실제 시스템 클립보드·스크린샷은 **미실행**입니다.

독립 코드 검토의 중요한 네 결함(추가 설문 조건 누락, 기능 해제 무시, 미정 분량 복원, 불완전 복구본 채택)은 재현 실패를 확인한 뒤 수정했고 전체 테스트를 다시 통과시켰습니다. 경미한 확인 명령 오류·발견 모델 순서로 인한 변경 감지·불필요한 문자열 치환도 정리했습니다. 남겨 둔 코드 검토 결함은 없습니다.

## 남은 실행과 설정

일반 로컬 환경에서 다음을 실행해 배포 빌드와 실제 브라우저를 확인해야 합니다. 자동 배포 설정은 작성만 했으며 이번 세션에서 실행하지 않았습니다.

```powershell
npm.cmd ci
npm.cmd run data:refresh
npm.cmd run data:validate
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview -- --port 4173
```

별도 터미널에서 격리된 Chrome 세션을 준비합니다. 아래 경로는 Chrome 기본 설치 위치 예시입니다. 기존 개인 프로필에 원격 디버깅을 켜지 않습니다.

```powershell
$qaChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$qaProfilePath = Join-Path $PWD '.qa\browser-profile'
Start-Process -FilePath $qaChromePath -WindowStyle Hidden -ArgumentList @('--remote-debugging-port=9222', "--user-data-dir=`"$qaProfilePath`"", '--no-first-run', 'about:blank')
npm.cmd run test:browser
```

이 테스트는 설문·코딩·홍보 글 전체 단계, 편집 복사·거부 처리, 모델·조건·뒤로 이동 보존, 재생성·복구, PC·320px 화면과 키보드를 검사하고 `.qa/`에 테스트 픽스처의 스크린샷·결과를 남깁니다. 외부 서비스에는 요청을 보내지 않습니다. 제한 환경 소스 미리보기를 확인하려면 `npm run qa:preview` 후 `$env:QA_BASE_URL='http://127.0.0.1:4175/AI...may-I../'`를 설정할 수 있으나 생산 빌드 검증과 구분해야 합니다.

GitHub에서는 Pages Source를 GitHub Actions로 유지하고 저장소의 예약·수동 워크플로 실행이 활성화돼 있어야 합니다. 활성 출처에는 Secrets가 필요 없습니다. AA를 켜려면 실제 인증 키와 공개 이용 범위 검증을 기존 전용 도구에서 먼저 완료해야 합니다. 이 작업은 남은 필수 설정이 아니라 별도 보류 범위입니다.

ChatKHU는 과거 기획·조사 도구, Codex는 이번 점검·구현·실수집·자동 검증·문서화 도구입니다. 외부 AI 결과의 정확성이나 통계 오류 감소를 실험으로 입증하지 않았습니다.

추천 커밋 메시지: `feat: rebuild task-to-prompt flow with scoped evidence and resilient refresh`
