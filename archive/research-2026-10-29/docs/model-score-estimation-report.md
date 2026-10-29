# 공개 평가 기반 모델 점수 추정 구현·검증 보고서

실행일: 2026-10-29T04:27:43.561Z (UTC). 데이터 task-evidence-ranked-2026-10-28; SHA-256 `a9fdf7e5e2fbda6a8cc9db37cc5bba5bed4af9dd29195cba87ec44ee0fa50b13`. 모형 ordinal-bt-v1, 환산 sigmoid-centered-v1, 사전 기준 protocol-v1.

**추정·검증·앱 연결과 갱신 재계산을 구현했다. 현재 자료에서 공개 기준을 통과한 비교 집합은 0개이며 새 추정 점수·순위는 모두 보류한다. 기존 기능 추천과 출처 표 내부 원점수 순위는 그대로 유지한다.**

[적합 전 고정한 계획·판정 기준](model-score-estimation-protocol.md), [전체 111건의 원문 메타데이터·그래프·검증·네 사례 실행 JSON](model-score-estimation-results.json). 출력 숫자를 만들기 위해 조건·가중치를 반복 조정하지 않았다.

## 1. 현재 상태와 실제 자료 수

시작 Git 작업 트리는 깨끗했다. 저장소 및 D:/, D:/univ, D:/univ/3-1, D:/univ/3-1/contest에서 AGENTS.md를 찾지 못했다. 원본 데이터·모델·평가·출처, 원문·초안·단계별 프롬프트, 갱신·복구, Pages 워크플로와 Vite base는 보존했다. commit·push·배포·유료 평가·외부 수집을 실행하지 않았다. 방법론 문헌 웹 조회는 평가 데이터 수집과 구분한다.

실제 models=28, evaluations=111; 보고된 28/111과 일치한다. 구형 observations/cohorts 배열과 현재 evaluations를 중복 합산하지 않는다. 측정 식별 조건 묶음은 110개, 점수 충돌 없는 묶음 109개다. 충돌 1묶음, 확정 동일 점수 재게시 중복 0묶음이다. 110을 확정 독립 평가 수라고 부르지 않는다.

- western-grok46-deepswe / western-grok47-deepswe-grok46-comparison-column: 동일하게 저장된 조건에서 점수가 충돌한다. 다른 실행인지 재게시인지 확인 불가하므로 두 값을 추정에서 격리했다.

Grok 4.6 DeepSWE 1.1은 65.9와 65.2로 다르다. 기존 원자료·기존 출처 순위는 수정하지 않았으며 새 추정에만 격리를 적용했다. Qwen의 Kimi LiveCodeBench v6 48.9는 2025.02~05, Moonshot 53.7은 2024.08~2025.05로 다른 관측이다. MMLU-Pro/GPQA의 미공개 버전, HumanEval/Plus·Pass@5, HLE text-only/full, Terminal 2/3/4, Cursor 3.2/4도 이름만으로 합치지 않았다.

## 2. 연결 그래프와 추정 가능한 범위

원문 비교 표/공개 조건으로 사용할 수 있는 평가 노드 5개, 수치 관측 20개, 모델 9개다. 구성 정점 18개이며 서로 다른 effort와 에이전트는 별개다. 나머지 19개 모델은 검증된 공통 비교 그래프에서 고립된다. 제외된 관측은 JSON audit.excluded에 개별 사유를 기록했다. 단일 모델 자체 보고 여러 건만으로 다른 모델과 척도를 연결하지 않는다.

| 평가 노드 | 영역·대상 | 구성 수 | 정확한 모델/effort |
| --- | --- | --- | --- |
| qwen-lcb-v6-feb-may | coding/model | 3 | Qwen3 235B A22B Instruct 2507 (non-thinking); Kimi K2 Instruct (non-thinking); DeepSeek V3 0324 (미공개) |
| qwen-creative-v3 | writing/model | 3 | Qwen3 235B A22B Instruct 2507 (non-thinking); Kimi K2 Instruct (non-thinking); DeepSeek V3 0324 (미공개) |
| zapier-automationbench-1.0.6 | workflow/agent | 10 | Claude Sonnet 5.5 (max); Claude Opus 5.5 (max); GPT-6 Astra (max); Gemini 4 Argon (high); Gemini 4 Argon (medium); GPT-6 Astra (xhigh); GPT-6 Astra (high); Claude Sonnet 5.5 (xhigh); Claude Opus 5.5 (xhigh); GPT-6 Astra (medium) |
| grok47-cursor4 | coding/agent | 2 | Grok 4.7 (xhigh); Grok 4.6 (high) |
| grok47-terminal4 | coding/agent | 2 | Grok 4.7 (xhigh); Grok 4.6 (high) |

영역을 합치지 않은 진단 성분은 아래 6개다. 영역을 넘어 원문 Performance 표의 명시된 non-thinking 열을 연결하는 일반 모델 그래프에서는 Qwen/Kimi 두 구성이 다리를 만든다. DeepSeek는 effort 미확인이라 두 평가의 서로 다른 구성이다. 모델 단독 그래프는 하나(4개 구성·2개 평가), 에이전트 그래프는 AutomationBench(10개 구성·1개 평가), CursorBench(2·1), Terminal-Bench(2·1) 세 개로 총 4개의 서로 분리된 연결 성분이다. 이 네 성분의 전역 척도는 만들지 않는다.

전체 28개 모델의 판정:

| 정확한 모델·버전 | 전체 원관측 수 | 공통 비교 관측 수 | 추정 점수·순위 상태 |
| --- | --- | --- | --- |
| GPT-6.1 Sol / 6.1 | 1 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| GPT-6.1 Terra / 6.1 | 3 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| GPT-6 Astra / 6 | 5 | 4 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| Claude Sonnet 5.5 / 5.5 | 5 | 2 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| Claude Opus 5.5 / 5.5 | 4 | 2 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| DeepSeek R1 / DeepSeek-R1 | 5 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| DeepSeek R1 0528 / DeepSeek-R1-0528 | 5 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| DeepSeek V3 0324 / DeepSeek-V3-0324 | 6 | 2 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| Qwen3 235B A22B Instruct 2507 / Qwen3-235B-A22B-Instruct-2507 | 6 | 2 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| Qwen3 30B A3B Instruct 2507 / Qwen3-30B-A3B-Instruct-2507 | 6 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Kimi K2 Instruct / Kimi-K2-Instruct | 8 | 2 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| Kimi K2 Instruct 0905 / Kimi-K2-Instruct-0905 | 5 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Kimi K2 Thinking / Kimi-K2-Thinking | 6 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| GLM 4.6 / GLM-4.6 | 3 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| GLM 4.7 / GLM-4.7 | 5 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Llama 4 Scout 17B-16E Instruct / Llama-4-Scout-17B-16E-Instruct | 3 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Llama 4 Maverick 17B-128E Instruct / Llama-4-Maverick-17B-128E-Instruct | 3 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Mistral Small 3.1 24B Instruct 2503 / 3.1-2503 | 3 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Mistral Small 3.2 24B Instruct 2506 / 3.2-2506 | 3 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Magistral Small 2506 / 2506 (Small 1.0) | 4 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Grok 4.6 / 4.6 | 6 | 2 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| Grok 4.7 / 4.7 | 3 | 2 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| Gemini 4 Argon / gemini-4-argon | 6 | 2 | 진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음 |
| Gemini 3.1 Pro Preview / gemini-3.1-pro-preview | 4 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Gemini 3 Flash Preview / gemini-3-flash-preview | 3 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| Qwen-AgentWorld-35B-A3B / 60d2b0434a53d2e62a7c00a489586815d94ebffb | 0 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| WebWorld-14B / 0212f4ed8a4bcd3e299d902f0dbf48b2255611d4 | 0 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |
| WebWorld-32B / e7fceedc8713450842f9bc9b122c1759c40bcc5b | 0 | 0 | 공통 비교 연결 부족 · 점수/순위 없음 |

## 3. 관측 모형과 가정

규제 Bradley–Terry 계열의 평가 내 순서 복합 목적함수를 사용한다. p(i>j)=sigmoid(theta_i−theta_j), 평균 theta=0, L2 lambda=0.25다. 한 표의 전체 쌍 가중치 합을 1로 두어 모델 열이 많은 표가 가상의 반복 시행처럼 커지지 않게 했다. y는 원점수의 좋은 방향을 반영한 0/1, 동점은 0.5다. 미관측은 어떤 항도 추가하지 않으며 0점을 채우지 않는다. 문항 수·반복 횟수를 생성하지 않았다. 단위가 다른 원점수를 백분율로 바꾸거나 재구성하지 않는다.

이 모형은 원점수 크기·난이도를 예측하지 않고 숨긴 관측이 다른 모델보다 높을지 예측한다. 따라서 원점수 MAE 대신 순서 확률 Brier 오차와 순서 정확도를 검증한다. 실제 사용 성공 확률로 해석할 수 없다. 일반 잠재 역량은 제한된 영역의 공통 순서 경향이며 통계 분석·한국어 홍보 글·저장소 수정의 직접 실측 점수가 아니다. 영역별 자료가 없어 보류한 범위를 일반 점수로 대체하지 않았다.

원문 Performance 표의 같은 모델 열·공개 모드라는 가정은 미공개 도구·환경의 동등성을 증명하지 않는다. 다른 제공사의 표는 환경·judge·샘플링·평가 선택 편향이 달라 임의로 연결하지 않았다. 실제 평가 주체와 결과 게시자는 JSON의 evaluator/publisher에 따로 보존했다. 공개되지 않은 evaluator를 publisher로 채우지 않았다. 게시일이 다른 것만으로 비교를 차단하지 않는다.

방법론 참고: [BT 계산 연구 원문](https://jmlr.org/papers/v24/22-1086.html), [비교 그래프와 추정 존재성 연구](https://proceedings.mlr.press/v162/bong22a.html). 본 구현의 작은 집계 자료 검증은 논문의 표본 조건·통계적 보장을 그대로 충족한다는 주장이 아니다.

## 4. 기준선 대비 예측·안정성 검증

사전 기준은 구성≥3, 평가 노드≥3, 평가 가능한 관측 fold≥6 및 비율≥80%, 무정보 p=0.5 대비 Brier≥10% 개선, 순서 정확도≥65%, 평가 제거 순서 보존≥80%·전체 연결 유지≥80%, ±표 내 범위 1% 교란 20회 순서 보존≥90%다. 개별 공개 구성은 평가≥3개가 필요하다. 보조 기준선은 학습 내 Laplace 평활 승률 차이다. 판정 기준은 결과 후 변경하지 않았다.

| 범위·대상 | 구성/평가 | 검증 가능/전체 fold | 연결 단절 | 예측쌍 수 | BT Brier | p=.5 기준선 | 승률 기준선 | 순서 정확도 | 평가 제거 순서 보존 | 평가 제거 연결 유지 | 교란 보존 | 판정 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coding/model | 3/1 | 0/3 | 3 | 0 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 0.000 | 1.000 | 서로 다른 평가 노드 3개 미만; 검증 가능한 관측 부족 또는 연결 단절; 기준선 대비 Brier 10% 개선 미달; 순서 정확도 65% 미달; 평가 제거 시 연결·순위 안정성 부족 |
| coding/agent | 2/1 | 0/2 | 2 | 0 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 0.000 | 1.000 | 구성 3개 미만; 서로 다른 평가 노드 3개 미만; 검증 가능한 관측 부족 또는 연결 단절; 기준선 대비 Brier 10% 개선 미달; 순서 정확도 65% 미달; 평가 제거 시 연결·순위 안정성 부족 |
| coding/agent | 2/1 | 0/2 | 2 | 0 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 0.000 | 1.000 | 구성 3개 미만; 서로 다른 평가 노드 3개 미만; 검증 가능한 관측 부족 또는 연결 단절; 기준선 대비 Brier 10% 개선 미달; 순서 정확도 65% 미달; 평가 제거 시 연결·순위 안정성 부족 |
| writing/model | 3/1 | 0/3 | 3 | 0 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 0.000 | 1.000 | 서로 다른 평가 노드 3개 미만; 검증 가능한 관측 부족 또는 연결 단절; 기준선 대비 Brier 10% 개선 미달; 순서 정확도 65% 미달; 평가 제거 시 연결·순위 안정성 부족 |
| workflow/agent | 10/1 | 0/10 | 10 | 0 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 평가 불가 | 0.000 | 0.998 | 서로 다른 평가 노드 3개 미만; 검증 가능한 관측 부족 또는 연결 단절; 기준선 대비 Brier 10% 개선 미달; 순서 정확도 65% 미달; 평가 제거 시 연결·순위 안정성 부족 |
| general/model | 4/2 | 4/6 | 2 | 8 | 0.276 | 0.250 | 0.304 | 0.500 | 0.833 | 0.000 | 1.000 | 서로 다른 평가 노드 3개 미만; 검증 가능한 관측 부족 또는 연결 단절; 기준선 대비 Brier 10% 개선 미달; 순서 정확도 65% 미달; 평가 제거 시 연결·순위 안정성 부족 |

관측 하나를 숨길 때 그 측정 식별자가 포함된 모든 학습 쌍을 제거했다. 동일 측정의 alias와 점수 충돌은 적합 전 처리했다. 예측에는 숨긴 원점수를 사용하지 않고, 비교 상대의 관측과 학습 theta만 사용한다. 같은 평가의 쌍과 fold는 서로 상관되어 있으므로 예측쌍 수를 독립 시행 수로 해석하지 않는다.

일반 모델 성분의 6관측 중 4건(66.7%)만 평가 가능하며 2건은 해당 구성이 고립되어 예측할 수 없다. 8개 순서 예측에서 BT Brier≈0.276, 무정보≈0.250, 승률≈0.304, 순서 정확도 50%다. 단순 무정보 기준선보다 악화되어 공개하지 않는다. 다른 성분은 평가 노드를 하나 빼면 학습 연결이 사라진다. 교란 안정성이 높아도 예측 검증을 대신하지 못한다.

평가 제거 및 결정적 작은 교란의 범위만 계산한다. 부트스트랩·모수적 신뢰구간·사후 신뢰구간은 계산하지 않았다. 범위를 제공할 때는 민감도 범위이며 신뢰구간이 아니다. 비교가 연결되어 남아 있는 경우만 평가 제거 순서 보존을 계산하며 전체 연결 유지 비율도 따로 보고했다.

## 5. 점수·순위·불확실성의 앱 연결

공개된 새 추정 점수/순위: 0개 비교 집합, 0개 모델. 모든 score/rank는 null이다. 숫자를 맞추기 위해 현재 후보 전체에 점수를 부여하지 않았다. 진단 theta·민감도는 JSON에 연구용으로 남지만 공개 추천 점수로 표시하지 않는다.

통과 경로는 구현되어 있다. 고정 round(100*sigmoid(theta)) 지수, 정수 표시, 성분 내 순위, 3점 이내 또는 민감도 중첩의 근소·동등 표시, 모델/모드/에이전트·출처 상세, 웹 실행 상태를 별도 카드로 표시한다. 후보 표시 필터로 재적합·min–max하지 않는다. 12개 가상 평가 표의 명시적인 테스트 fixture로 통과 경로·상위 3개·필터 불변·마지막 정상 유지 렌더링을 검증했다. 이 fixture는 실제 모델 실측 결과나 현재 공개 artifact에 들어가지 않는다.

모든 현재 추정 구성은 한 평가 주체에 편중된다. 출처 편중·관측 부족·평가 제거 시 연결 단절을 상세로 표시한다. 기존 작업별 기능 충족·직접 원점수 순위와 분리한다. 작업별 가중 지수 합성은 하지 않으며 기존 기능 비중은 실증 성능 보정값으로 승격하지 않는다.

## 6. 네 작업의 실제 앱 함수·React 출력

각 입력에 interpretTask → compareCandidates → 현재 UI 규칙으로 선택 가능한 웹 후보 선택 → buildGuideBundle → 편집/조건변경 보존 → 다시 생성/복구 → copyText를 실제 실행했다. React 비교 화면을 서버 렌더링했다. 브라우저 사용자 이벤트와 OS 클립보드는 검증하지 못했다. copyText에는 메모리 writer와 실패 writer를 주입했으며 외부 AI 서비스로 프롬프트를 전송하지 않았다. 전체 단계 본문과 선택 context는 JSON cases에 있다.

### 설문 엑셀 분석·보고서

입력: 전공 수업에서 대학생 120명의 설문 결과를 분석해서 A4 4장짜리 보고서를 써야 해. 데이터는 엑셀에 있고, 학년별 만족도 차이와 공부 시간·성적의 관계를 보고 싶어. 통계를 잘 몰라서 분석 방법과 결과 해석도 쉽게 설명받고 싶어.

해석: analysis → writing; 입력 file; 필수 기능 spreadsheet, upload, code; 코딩 목적 해당 없음. 추정 점수 보류.

기존 공식 기능·용도 공동 추천: Claude Opus 5.5; Claude Sonnet 5.5.

실제 선택 가능 웹 후보: Claude Opus 5.5 (기존 추천 영역). 단계: statistics: 통계 분석 → interpretation: 결과 해석 → report: 보고서 초안 → review: 검토.

원문 보존·추가 후보 기본 접힘·편집 초안 보존·재생성/복구·복사 writer의 정확한 문자열·복사 실패 반환 assertion 통과.

### Python 알고리즘 문제 풀이

입력: 알고리즘 문제 풀이를 Python 코드로 작성해줘

해석: coding; 입력 summary; 필수 기능 없음; 코딩 목적 algorithm. 추정 점수 보류.

기존 출처 표 원점수 추천: Qwen3 235B A22B Instruct 2507 (집합 내 1위, LiveCodeBench 원점수 51.8); Kimi K2 Instruct (집합 내 2위, LiveCodeBench 원점수 48.9); DeepSeek V3 0324 (집합 내 3위, LiveCodeBench 원점수 45.2).

실제 선택 가능 웹 후보: Qwen3 235B A22B Instruct 2507 (기존 추천 영역). 단계: diagnose: 원인 분석 → implement: 코드 수정 → test: 테스트·검토.

원문 보존·추가 후보 기본 접힘·편집 초안 보존·재생성/복구·복사 writer의 정확한 문자열·복사 실패 반환 assertion 통과.

### React 저장소 오류 수정

입력: React 기존 저장소의 장바구니 오류 원인을 찾아 수정하고 회귀 테스트를 추가해줘

해석: coding; 입력 summary; 필수 기능 없음; 코딩 목적 repository. 추정 점수 보류.

기존 출처 표 원점수 추천: Grok 4.7 (집합 내 1위, DeepSWE 원점수 71); Grok 4.6 (집합 내 2위, DeepSWE 원점수 65.2).

실제 선택 가능 웹 후보: Claude Opus 5.5 (추가 확인 영역에서 선택; 원점수 선두와 다를 수 있음). 단계: diagnose: 원인 분석 → implement: 코드 수정 → test: 테스트·검토.

원문 보존·추가 후보 기본 접힘·편집 초안 보존·재생성/복구·복사 writer의 정확한 문자열·복사 실패 반환 assertion 통과.

### 한국어 동아리 모집 글

입력: 신입생 대상 독서 동아리 모집 홍보 글을 한국어로 친근하게 500자로 작성해줘. 매주 수요일에 책을 함께 읽고 토론하는 모임이야.

해석: writing; 입력 summary; 필수 기능 없음; 코딩 목적 해당 없음. 추정 점수 보류.

기존 공식 기능·용도 공동 추천: Claude Opus 5.5; Claude Sonnet 5.5; DeepSeek R1; DeepSeek R1 0528; DeepSeek V3 0324; Gemini 3 Flash Preview; Gemini 3.1 Pro Preview; Gemini 4 Argon; GLM 4.6; GLM 4.7; GPT-6 Astra; GPT-6.1 Sol; GPT-6.1 Terra; Kimi K2 Instruct; Kimi K2 Instruct 0905; Kimi K2 Thinking; Llama 4 Maverick 17B-128E Instruct; Llama 4 Scout 17B-16E Instruct; Qwen3 30B A3B Instruct 2507; Qwen3 235B A22B Instruct 2507.

실제 선택 가능 웹 후보: Claude Opus 5.5 (기존 추천 영역). 단계: outline: 메시지 구성 → compose: 홍보 글 초안 → polish: 검토·다듬기.

원문 보존·추가 후보 기본 접힘·편집 초안 보존·재생성/복구·복사 writer의 정확한 문자열·복사 실패 반환 assertion 통과.

## 7. 데이터 갱신·재계산·복구

새 명령 `npm run data:estimate`는 외부 요청 없이 현재 스냅샷을 진단·적합·검증한다. 기존 `data:refresh`의 수집/저장 후 및 `data:restore`의 복구 후에도 같은 saveEstimation을 직접 호출한다. `data:validate`는 기존 수집 스냅샷 검증 기능을 유지한다. Pages workflow는 수정하지 않았고 기존 refresh 호출을 통해 재계산이 연결된다.

src/data/score-estimation.json에 데이터 SHA-256·브라우저 freshness key·데이터 버전·모형·환산·프로토콜 버전·실제 계산 성공 시각·최근 30회 변경 이력을 저장한다. .refresh-cache/score-estimation-last-good.json은 복구 복사본이다. 각 파일은 임시 파일 작성 후 rename으로 교체한다. 두 파일을 묶는 원자적 트랜잭션은 아니지만 backup-first로 중단 시 복구 가능성을 유지한다. artifact 전체 형태·중복 성분·공개 provenance를 검증하고 손상본은 재사용하지 않는다.

검증 미통과 성분은 과거 통과한 동일 구성 성분을 stale로 유지하며 원래 계산 시각·데이터 해시를 보존한다. 정확한 모델 버전이 현재 카탈로그에 없으면 앱에 붙이지 않는다. 새 모델·모드·미연결 구성에 옛 수치를 상속하지 않는다. 현재는 과거 정상 공개 결과도 없어 보류 안내를 표시한다. 예기치 않은 계산/저장 오류는 작업을 실패시키며 기존 파일을 정상 결과로 바꾸지 않는다. 배포 작업은 실행하지 않았다.

이번 계산 성공: 2026-10-29T04:26:34.361Z; 외부 수집 성공: 없음(null). 기존 출처의 checkedAt·원점수는 바꾸지 않았다. 로컬 재계산을 최신 외부 수집 완료로 보고하지 않는다. refresh 연결은 코드와 로컬 검증으로 확인했으며 실외부 refresh·실복구 원본 변경은 실행하지 않았다.

## 8. 추가로 필요한 관측·키·권한

- 일반 모델 성분: Qwen3-235B-A22B-Instruct-2507 non-thinking, Kimi-K2-Instruct non-thinking, 제3의 정확한 버전·모드가 명시된 모델을 포함하는 공통 평가가 필요하다. 최소 3개 서로 다른 평가에 각 구성이 3회 이상 나타나고 관측 하나를 숨겨도 연결이 남아야 한다. 현재 DeepSeek 열의 effort는 추정해서 채우지 않는다. 새 자료도 순서 불일치가 계속되면 공개하지 않는다.
- 알고리즘 영역: 현재 v6 2025.02~05 비교 표 외에 동일 릴리스/모드의 적어도 두 추가 코딩 평가가 필요하다. 문제 기간·pass@k·도구·샘플링·평가자 메타데이터를 함께 확보해야 한다. Qwen30의 별도 카드 행을 동일 출처 비교 열로 자동 취급하지 않는다.
- 저장소·에이전트: Grok 4.6 DeepSWE 65.9/65.2의 원실행 식별과 harness/agent 버전, Grok 4.7 high/xhigh 및 다른 모델의 정확한 agent/tool 구성에 걸친 공통 평가가 필요하다. AutomationBench의 열 10개를 독립 벤치마크 10개로 세지 않는다. 별도의 최소 두 평가에서 동일 에이전트 구성을 재관측해야 한다.
- 설문: 정확한 릴리스/모드에 대한 통계 방법 선택·실제 계산·결과 해석의 공통 실측(예: StatQA 범위를 검토한 결과)이 없다. 일반 수학 점수나 파일 업로드 지원으로 대체할 수 없다.
- 한국어 글쓰기: 평가 언어·장르·judge/루브릭 revision·문제 기간을 명시한 한국어 홍보 글·수정 과제의 공통 측정이 필요하다. Creative Writing v3만으로 현재 한국어 품질 지수를 만들지 않는다.
- 추가 수치 출처 연결에는 기존 AA의 실제 인증 응답과 제품/공개 이용 범위 확인, LiveBench/공식 SWE 실험 결과의 정확한 버전·구성·재사용 범위 확인이 필요하다. 이번 구현에는 새 API 키·유료 모델 호출이 필요하지 않으며 비밀값을 읽거나 출력하지 않았다.
- 프로덕션 빌드에는 환경에서 esbuild 자식 프로세스 실행이 허용되어야 한다. 브라우저 검증에는 사용 가능한 브라우저 연결 호스트가 필요하다. 권한을 확대하거나 거부된 실행 방법을 우회하지 않았다.

## 9. 실행 검증과 미실행 항목

- `npm test`: 221개 통과(기존 210개 포함). 중복·충돌·재게시 순서 불변·구성/버전 분리·단절 fold·고정 환산·합성 통과 경로·artifact 손상·중복 일반 성분·React 카드·기존 초안 흐름 검증.
- `npm run typecheck`: 통과.
- `npm run data:estimate`: 실제 실행, 현재 6개 진단 성분/0개 통과. 수집 성공 시각은 null.
- `node scripts/model-score-estimation-report.mjs`: 네 사례 실제 함수 실행·React SSR·보존/복사 assertion 통과. .qa/model-score-*.html은 로컬 렌더 결과다.
- `npm run data:validate`: 기존 갱신 스냅샷의 4개 출처 검증 통과. `git diff --check` 통과. 기존 데이터·Pages·Vite base·프롬프트 원본의 Git diff 없음.
- `npm run build`: TypeScript 후 Vite config/esbuild `spawn EPERM`으로 실패. 실행 권한·configLoader·외부 빌드로 재시도하지 않았다. 기존 dist를 새 빌드 성공 결과로 주장하지 않는다.
- 처음 독립 `node --test <file>` 호출은 worker spawn EPERM이었다. 이후 저장소의 기존 `npm test`(`--test-isolation=none`)를 그대로 사용했다. 권한 확대는 하지 않았다.
- `npm run qa:preview`: 기존 소스 QA 미리보기(4175) 시작 성공. 프로덕션 빌드가 아니다. CUA inventory가 `browser access host is unavailable`을 반환하여 실제 브라우저 연결/클릭/스크린샷·모바일 오버플로·OS 클립보드 검증은 미실행이다. CDP나 다른 실행 경로로 우회하지 않았다.
- 독립 읽기 전용 코드 리뷰 후 일반 성분 중복, 손상 artifact의 UI 전달, 동률 나머지 후보 누락, 구성 상세 provenance 문제를 수정했다. 리뷰용 fixture나 진단 결과는 실측 공개 점수로 사용하지 않는다.
- 외부 평가 데이터 수집·data:refresh 실호출·원본 복구 변경·외부 서비스 실제 과제 실행·계정 권한 확인·유료 평가·commit·push·배포는 미실행.

