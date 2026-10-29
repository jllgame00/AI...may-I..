# 기록의 적용 범위

이 문서는 이전 모델 확장 단계의 조사·구현 기록입니다. 최신 추천 계산·실수집·한계는 [핵심 앱 재구성 기록](core-implementation.md)을 따릅니다. 아래의 과거 수량·검증 결과는 당시 시점을 유지합니다.

# 최신 순위 정책 변경

2026-10-28 사용자의 새 지시에 따라 일괄 순위 금지·모델명 중립 정렬을 대체했다. 기존 107건 보존 + 동일 Qwen 표 비교 열 4건 보완으로 현재 111건이다. [실제 코딩·설문·글쓰기 추천 순서, 선택 기준, 연구·검증 한계](evidence-ranking-report.md)가 최신 기준이며 아래 수집·구현 기록보다 우선한다. `compareCandidates`는 `taskRanking.ts`의 데이터 기반 순위 또는 숫자 없는 기능 기반 검토 결과를 첫 화면에 제공한다. 기존 `score=null`은 임의 종합점수를 만들지 않는다는 의미이며 작업별 원점수 순위는 `decision.entries[].rank`에 기록한다.

> 이후 입력·복사 본문 변경: [웹 채팅 흐름과 최신 검증](web-chat-prompt-usability.md)을 따릅니다. 아래 수치·화면·경로 선택 설명은 당시 적용 기록입니다. 원래 모델·평가·출처는 보존합니다.

# AI..may I..? 다중 제공사 모델·에이전트 추천 기준

현재 적용: **2026-10-28**. 실제 공식 원문을 확인한 **정확한 모델 25개·평가 관측값 107건**을 앱에 연결했다. 기존 5개·13건 대비 **20개·94건 추가**이며 모드별 실행을 별도 모델로 세지 않았다. 조사 목표 20개·50건을 충족했다. 모든 제공사의 최신 모델을 망라했다는 뜻은 아니다.

## 최신 보완: 실제 이용 경로와 AA 연결 (2026-10-28)

**25개 모델·107건 관측을 그대로 유지**했다. 이번 AA 공개 관측 추가는 **0건**이다. [15개 체크포인트의 실제 경로 조사](model-access-review.md), [AA 실제 접근·정확한 적용 조항·로컬 수집/갱신 절차](aa-data-integration.md)를 현재 상세 기준으로 추가했다.

- 기본 소비자 탐색에서 고유 모델별 대표 경로는 **웹4 / API18 / 설치2 / 정확 버전 경로 미확인1**이다. 추가 필수 기능이 없을 때의 구분이며 로그인·크레딧·권한·실제 실행은 보장하지 않는다. 웹/API를 먼저 설명하는 것은 이용 준비의 구분이며 성능·가격 순위가 아니다.
- 최초 설치형15개 중13개는 현재 정확 버전 호스팅 근거를 확인했다. 그중1개는 웹 데모도 있다. 설치 경로15개는 고급 선택지에서 모두 유지한다. API/설치 중복을 새 모델로 세지 않는다. 이름·원 평가107건·평가 당시 ID/버전은 변경하지 않았다.
- 새41개 서비스 경로 기록은 확인14개(13모델), 정확 버전 미확인25개, 은퇴2개다. 서비스 존재와 해당 체크포인트 제공을 분리하며 미확인/은퇴 경로를 확정 선택으로 연결하지 않는다. FP8·호스팅 조건과 평가 조건의 차이를 숨기지 않는다.
- 기존 소비자 플랜과 API 선택을 보존하고 일반 사용에서도 확인된 API 대안을 선택할 수 있게 했다. 44개 모델/경로 선택이25개 모델에 대응한다. 선택한 호스팅용 ID와 체크포인트 ID·URL은 구분해 프롬프트에 넣고 편집 초안을 보존한다.
- 107건 전체는 공통 시험 집합이 아니다. 고정 릴리스, 모델/agent, benchmark/version/subset, 발표/평가/확인일을 보인다. 운영기관별/제공사별 비교 그룹에 들어간 대상만 그 지표 안에서 원점수 순서를 표시한다. 최신 서비스 모델에 과거 점수를 상속하지 않는다.
- AA 공개 API 키 없음, API 실응답0; 원문에서 직접 확인한 지수 결과2개와 공개 사용 범위는 별개로 기록한다. API 모델 Coding Index가 Coding Agent Index라는 가정을 하지 않는다. 원문 숫자는 현재 앱의 구조화 점수·추천에 넣지 않았다. 모든 공개 인용을 금지하는 결론도 내리지 않는다.
- AA는 로컬 수집→명시적 stable ID/버전/설정/지표 검토→부분 격리→공개 사용 범위 검토→공개 snapshot 재검증 경로를 구현했다. 실제 키 없이 합성 테스트만 수행했으며 데이터 수집 완료로 보고하지 않는다.

이번 실제 검증: **테스트117개 통과 / 타입 검사 통과 / AA 수집·브라우저 검사 스크립트 구문 검사 통과 / diff 검사 통과**. AA 키 없음 상태의 명령은 HTTP 요청 없이 종료했다. 빌드·실제 브라우저·모바일·키보드·클립보드는 기존 EPERM/호스트 제한을 반복하지 않아 미실행이다. [수동 확인 절차](aa-data-integration.md)와 아래 기존 흐름의 확인 항목을 유지한다. Pages 설정·기존 사용자 변경을 보존하고 commit·push·배포하지 않았다.

## 실제 저장 자료와 출처

[정확한 등록 모델 25개·관측 107건 전체 목록](model-catalog-snapshot.md)에 저장 ID·버전·추론 모드·연결 평가·원점수·출처·확인일·이용 경로를 기록했다. 원본 13건의 ID·모델·버전·원점수·발표 주체·출처는 보존했고, AutomationBench의 실행 조건과 평가 종류만 직접 확인한 최신 설명으로 보완했다.

| 제공사 | 정확한 모델 | 모델 수 |
|---|---|---:|
| OpenAI | GPT-6.1 Sol, GPT-6.1 Terra, GPT-6 Astra | 3 |
| Anthropic | Claude Sonnet 5.5, Claude Opus 5.5 | 2 |
| Google | Gemini 4 Argon (`gemini-4-argon`), Gemini 3.1 Pro Preview, Gemini 3 Flash Preview | 3 |
| DeepSeek | DeepSeek-R1, DeepSeek-R1-0528, DeepSeek-V3-0324 | 3 |
| Alibaba Qwen | Qwen3-235B-A22B-Instruct-2507, Qwen3-30B-A3B-Instruct-2507 | 2 |
| Moonshot AI | Kimi-K2-Instruct, Kimi-K2-Instruct-0905, Kimi-K2-Thinking | 3 |
| SpaceXSI (xAI) | Grok 4.6, Grok 4.7 | 2 |
| Z.ai | GLM-4.6, GLM-4.7 | 2 |
| Mistral AI | Mistral-Small-3.1-24B-Instruct-2503, Mistral-Small-3.2-24B-Instruct-2506, Magistral-Small-2506 | 3 |
| Meta | Llama-4-Scout-17B-16E-Instruct, Llama-4-Maverick-17B-128E-Instruct | 2 |

- **97건 제공사 발표**, **10건 독립 운영기관 Zapier 직접 발표**. 평가 이름이 외부 벤치마크이거나 외부 모델이 judge여도 실행·발표가 제공사이면 독립 평가로 바꾸지 않는다.
- 평가 단위는 **모델 70건 / 에이전트 실행 구성 37건**. 지표 영역은 coding35, science18, math14, workflow11, browsing1, knowledge9, reasoning6, vision5, writing5, factuality3이다.
- 실제 수치 출처는 **24개 고유 원문 URL**. 공식 제공사 모델 카드·출시 표(공식 Hugging Face 계정 포함)와 Zapier 운영기관 원문이다. 출처별 필요한 집계 사실만 기록했고 이미지나 검색 요약의 반올림 수치를 정밀 원점수로 쓰지 않았다.
- `src/data/currentModels.ts`는 기존 모델·13건, `research/eastern-models.json`은 추가10개·51건, `research/western-models.json`은 추가10개·33건이다. `operatorEvaluations.ts`에 Zapier7건, `providerComparisons.ts`에 Grok4.7 발표의 Grok4.6 비교열3건을 추가했다. `researchCatalog.ts`와 `recommendationSnapshot.ts`가 실제 앱에 병합한다.
- Grok4.6은 공식 공개 버전명을 식별자로 저장했다. API ID를 추정하지 않는다. 가중치 ID는 `deepseek-ai/...`, `Qwen/...`, `moonshotai/...`, `zai-org/...`, `mistralai/...`, `meta-llama/...` 체크포인트이며 상용 API 별칭으로 대체하지 않는다.

주요 공식 출처: [DeepSeek R1](https://huggingface.co/deepseek-ai/DeepSeek-R1), [Qwen 2507](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507), [Kimi Thinking](https://huggingface.co/moonshotai/Kimi-K2-Thinking), [GLM4.7](https://huggingface.co/zai-org/GLM-4.7), [Llama4](https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct), [Mistral3.2](https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506), [Grok4.7](https://x.ai/news/grok-4-7), [Gemini Argon](https://deepmind.google/models/model-cards/gemini-4-argon/), [Zapier](https://zapier.com/benchmarks). 개별 수치 출처는 전체 목록과 코드에 별도 연결한다.

## 실제 추천 흐름과 분리 기준

작업 입력 → 작업 목적·필수 기능·이용 경로 확인 → 관련 모델·실행 구성 비교 → 사용자 선택 → 단계별 프롬프트·선택 후 이용 조건 → 외부 직접 실행·검토를 유지한다.

1. **예산 입력·무료만/무료 우선 필터·가격 가중치가 없다.** 가격·한국 결제액 미확인만으로 후보를 제외하거나 순서를 바꾸지 않는다. 우선순위 선호만으로 성능·속도 점수도 만들지 않는다.
2. 필수 기능이 확인된 미지원이면 해당 경로를 제외한다. 제한/미확인이면 `확인 후 선택`, 추가 기능이 필요 없거나 경로에서 지원 근거가 있으면 `조건 비교 가능`이다. 모델의 기능과 파일·검색·코드 실행 도구의 경로 권한은 별개다.
3. 정확한 ID·릴리스 버전에 대응하는 평가만 작업에 연결한다. `modelReference` 후보는 플랜 권한의 확인 여부와 독립적으로 평가를 표시하되 자동 라우팅에 특정 모델 점수를 부여하지 않는다. 실제 플랜 연결은 버전·지원 모드·선택 가능·날짜 있는 연결 출처를 별도로 검사한다.
4. 기본 소비자/API 탐색에서도 추가20개 모델의 공식 평가를 숨기지 않는다. 요청한 경로에서 선택 가능한지 확인하지 못한 모델은 그 제약을 표시한다. Work를 명시하면 기존 확인된 Work 범위로 좁힌다. API만 있는 모델을 소비자 서비스의 선택 메뉴에 있다고 안내하지 않는다.
5. **새 상용 플랜이나 소비자 매핑을 만들지 않았다.** 기존3개 서비스·6개 구독 플랜·2개 API 과금 경로는 보존했다. 추가 모델의 `plan.unassigned`는 기존 화면이 이용 정보 공백을 보여주기 위한 기술적 접근 설명이며 실제 상품/SKU가 아니다. `snapshot.plans`나 구독 매핑에는 넣지 않는다. tier는 unknown, 금액은 null이고 무료로 표시하지 않는다.
6. 새 모델20개 중 Google3개·Grok4.7은 공식 API 문서를 확인했다. 최초에15개는 가중치/자체 호스팅만 확인했으나 최신 경로 보완에서 그중13개 모델의 호스팅을 확인했다. 상세는 위 최신 보완과 별도 경로 문서를 따른다. Grok4.6은 현재 고정 버전 실행 경로가 미확인이다. 새20개 전부 소비자 플랜별 접근권을 보장하지 않는다. 가중치 공개를 장비·호스팅 비용 없음으로 해석하지 않는다.
7. 가격·구독·토큰 요금·사용 한도·세금은 선택 후 이용 조건에만 표시한다. API는 월 구독과 별도이며 확인한 OpenAI/Anthropic 요금과 추가 경로의 가격 미확인을 구분한다.

`recommend.ts`의 일반 카드 순서는 작업 조건 상태·정확한 모델 여부·이름순이며 성능 순위가 아니다. `score`와 benchmark 합계는 null이다. 원점수 null/NaN을0점으로 바꾸지 않는다. 모델 버전을 바꾸면 이전 점수 연결이 끊긴다. 비슷한 이름·동일 계열로 점수를 상속하지 않는다.

## 작업별로 실제 연결된 근거

| 작업 | 이번 연결 범위 | 한계 |
|---|---|---|
| 코딩 | 20개 모델에35건 관련 관측. Terra·Sonnet·Opus, Qwen2, DeepSeek3, Gemini Argon/3.1 Pro, Meta2, Mistral3, Kimi Instruct/0905, Grok2, GLM4.7 | 모델 코드 생성과 도구/에이전트 실행 평가를 구분. 동일 버전의 공개 비교 표만 별도 순서 제공 |
| 글쓰기 | Qwen235B/30B의 Creative Writing/Writing, Kimi K2 Thinking의 Longform Writing 총5건 | 언어·judge·루브릭 등 미공개를 표시. 한국어 품질이나 현재 과제 성공률로 일반화·확정 순위화하지 않음 |
| 설문 통계 보고서 | 텍스트 직접 입력 시25개 모두 기능 조건 기반 후보 | 직접 평가 없음. 코딩·AIME·GPQA를 설문 통계의 성공 점수로 쓰지 않음. 파일이면 도구/형식 권한 미확인 별도 안내 |
| 업무 실행 자동화 | Astra·Sonnet·Opus·Argon의 AutomationBench10구성, Kimi Instruct의 Tau2 워크플로 결과 | 작업/환경에 따라 별개. Tau2를 AutomationBench와 합산하지 않음. 답변 글의 품질 평가로 사용하지 않음 |
| 웹 정보 탐색 | Kimi Thinking BrowseComp | 업무 시스템 실행과 별도 도메인. 일반 논문 요약을 과학 시험 점수로 대체하지 않음 |
| 과학 연구 문제 | GPQA 등과 Astra Terminal-Bench Science, 관련18개 모델 | 과학 문제 풀이 참고이며 논문 분석·설문 전체 성공률이 아님 |
| 수학/추론 문제 | 명시적 수학12개 모델, 추론6개 모델 관련 결과 | 원래 벤치마크 버전/문제/도구/토큰 설정에 한정, 일반 글쓰기나 통계 대신 적용하지 않음 |
| 이미지 이해 | Gemini3개·Meta2개 MMMU 계열 결과 | 이미지 생성과 구분. 경로의 이미지 입력·업로드 권한은 별도 확인 |

예: 코딩에서 Sol·Astra·Gemini3Flash·KimiThinking·GLM4.6은 이번 수집에 직접 코딩 근거가 없어서 조건 기반 후보로 남긴다. 다른 후보의 근거까지 보류하지 않는다. 관련 근거 유무와 경로/필수 기능의 미확인은 별도 상태다. 수학/추론 키워드도 분석 작업으로 제안하되 사용자가 수정할 수 있다.

## 두 종류의 비교와 실제 순서 제공

`compareEvaluationResults`는 **같은 실행 조건의 모델 결과 비교**다. benchmark·version·subset·unit·방향·effort·도구·하네스·환경·시도·fallback·평가 주체를 확인한다. 에이전트라면 이름·버전도 확인한다. 미공개 또는 차이가 있으면 이 방식의 차이 계산을 보류한다. 발표일 차이만으로 비교를 막지 않는다.

`sourceComparisonGroups`는 **출처가 같은 표에 나란히 발표한 실행 구성 비교**다. 도구·모드 차이가 있는 구성을 모두 버리는 대신 비교 대상을 설명한다. 명시적 그룹·URL·평가명·버전·subset·unit·방향·평가/발표 주체·근거 종류·모델 ID/버전·agent 단위를 whitelist로 검사한다. 한 그룹의 단일 원점수 내림차순이며 다른 그룹을 합산하거나 지수+구성 평가를 중복 반영하지 않는다.

| 비교 범위 | 순서가 표시되는 구성 | 해석 |
|---|---|---|
| Zapier AutomationBench1.0.6 / 전체 | Argon high51.29, medium50.08; Sonnet max44.75; Opus max42.47; Astra max41.40, xhigh38.96, high37.14; Sonnet xhigh36.83; Opus xhigh35.77; Astra medium34.09 (%) | 독립 운영기관의10개 에이전트 구성. Claude는 default fallback 포함. API-mode/search+execute/최대50단계/비공개 held-out. 공개600-task 세트와 동일하지 않음. 통상1%이내 변동 보고·신뢰구간 미공개라 근소 차이 확정 우열 금지 |
| Grok4.7 발표 CursorBench4.0 | Grok4.7 xhigh46.3 / Grok4.6 high40.4 (%) | 제공사 자체 표의 코딩 도구+모델 구성. 하네스/환경/반복 미공개 |
| 같은 발표 DeepSWE1.1 | Grok4.7 **high**71.0 / Grok4.6 high65.2 (%) | 4.7의 별표 high 각주 보존. 표 나머지 xhigh를 전이하지 않음 |
| 같은 발표 Terminal-Bench4.0 | Grok4.7 xhigh37.6 / Grok4.6 high20.3 (%) | 4.6 최초 발표의 Terminal3.0과 혼합하지 않음. 다른 제공사 Terminal4.0 결과도 이 그룹에 편입하지 않음 |

Grok4.6 최초 발표의 DeepSWE65.9와 이후4.7 발표 비교열65.2는 서로 다른 관측으로 유지하며 설정 동일성을 추정하지 않는다. Mistral3.1 HumanEval88.41과3.2 HumanEval Plus Pass@5 92.90도 서로 다른 평가다. Pass@5를5회 독립 실행으로 채우지 않는다. 출처에 없는 버전·환경·시도 수·정밀도는 만들지 않는다.

## 선택·프롬프트·초안

- 일반 모델 카드25개와 작업에 관련된 에이전트 구성을 별도 선택할 수 있다. 비교 그룹에서도 선택 버튼이 실제 configuration ID에 연결된다. 구성 후보 수를 모델 수로 보고하지 않는다.
- 선택한 ID·버전·경로·추론 설정·에이전트 이름/버전·도구·환경·fallback/미공개가 단계별 프롬프트·선택명·외부 링크에 반영된다. 설정이 지원 목록에 없으면 임의 API 인자로 넣지 않는다. 평가 effort가 미공개인 Work/chat 구성도 literal null 대신 추론 설정 미확인으로 안내한다.
- 공식 가중치 ID는 체크포인트로 안내하고 API ID로 실행하도록 안내하지 않는다. API는 직접 설정, 미확인 실행 경로는 공식 발표 링크임을 표시한다. 일반 채팅에서 에이전트 평가가 재현된다고 표현하지 않는다.
- 프롬프트는 확인한 입력·도구·작업 요구에 따른 일반 초안이다. 이름 교체로 모델별 최적화가 검증됐다고 표현하지 않는다.
- 선택 변경에도 편집 초안을 덮어쓰지 않는다. stale 경고·명시적 재생성·이전 초안 복구, 단계별 검토·다음 단계, 복사 실패의 수동 선택 안내, hash 이동과 키보드 구조를 보존했다. 긴 체크포인트 ID·구성 설명은 줄바꿈하도록 했다.
- 외부 AI/API 호출·키 입력·자동 실행·결제는 없다. ChatKHU 전제는 없고 기존 제작 기록은 보존한다. Pages base와 배포 설정은 변경하지 않는다.

## Artificial Analysis·다른 운영기관 접근 및 이용 조건

최초 조사 및 후속 기록은 `src/data/research/access-log.json`과 각 제공사 JSON의 researchLog에 둔다. 다음 최초 조사 이력 중 AA 원문 접근/권한 구분은 위 최신 보완과 aa-data-integration.md로 갱신했다.

- [AA API 원문](https://artificialanalysis.ai/api-reference): 공식 GET `/api/v2/data/llms/models`와 `x-api-key` 인증·출처 표기·캐시 안내 확인. 사용할 키가 없고 공개 제품 활용 권한을 확보하지 못했으므로 인증 데이터는 요청하지 않았다. 예제 숫자를 관측으로 세지 않는다.
- [Coding Agents](https://artificialanalysis.ai/agents/coding-agents), [코딩 방법론](https://artificialanalysis.ai/methodology/coding-agents-benchmarking): Coding Agent Index v2.0은 FrontierCode1.1/Terminal4.0/SWE-Atlas-QnA-AA를 동일 가중 반영. 모델 단독 채팅 지수가 아니다. 접근 가능한 본문에는 실제 수치 행이 없어 **점수0건**이다.
- [Intelligence 방법론](https://artificialanalysis.ai/methodology/intelligence-benchmarking): Intelligence Index v5.0의9평가·4분야 구성과 주로 영어 텍스트라는 범위를 확인했다. 최초 조사에서 점수0건이었다. 후속 조사에서는 별도 비교 원문의 두 지수 값을 직접 확인했으나 공개 관측에는 미편입했으며 임의 자체 점수로 만들지 않았다. 인증·조건이 해결되면 이름/버전/구성/범위를 보존한 공식 지수 단독 비교 그룹으로 추가할 수 있고 구성 점수와 재합산하지 않는다.
- [AA 약관](https://artificialanalysis.ai/docs/legal/Terms-of-Use.pdf)의 개인/비상업 이용 범위·복제/배포·자동 수집 제한을 확인했다. 브라우저 내부 데이터·차트 추출이나 인증 우회를 하지 않았고 해당 출처만 보류한 채 다른 수집을 계속했다.
- Terminal-Bench/SWE-bench 공식 리더보드는 현재 접근 가능한 본문에 수치 행이 없었다. 이전 버전 URL 리디렉션을 그 버전 데이터로 간주하지 않았다. SWE-bench 공식 실험 저장소의 코드 공개를 결과 재배포 허가로 간주하지 않는다.
- Grok4/Fast는 공식 종료 상태를 발견해 새 활성 후보로 추가하지 않았다. Grok4.6의 정확한 현재 API 연결은 미확인으로 남겼다.
- 이전 Sonnet 시스템 카드의13MB 응답 제한, 기존 spawn EPERM·연결 제한은 재시도하지 않았다.

제공사/운영기관 원문에서 필요한 사실 수치·조건·링크만 수록했다. 모델의 MIT/Apache/Community License가 벤치마크 문항·출력·전체 결과의 라이선스라는 뜻은 아니다. 별도 데이터 재배포/제품 활용 허가는 출처별로 미확인인 부분을 `terms`에 명시한다. AA의 제한 자료는 포함하지 않았다. 공개 원문 사실 인용과 전체 데이터 복제는 구분한다.

## 갱신·회귀 검사 방법

1. 정확한 릴리스 ID·버전과 공식 원문을 먼저 확인한다. 모드는 모델 개수가 아니다. 새 릴리스는 별도 모델·평가 레코드로 추가하고 이름만 최신화하거나 과거 점수를 상속하지 않는다.
2. 원점수·단위·좋은 방향, 평가명/version/subset, model/agent, 에이전트·공개 버전·추론 설정·도구·환경·시도·fallback, 평가/발표 주체·날짜·확인일·URL·한계·이용 조건을 기록한다. 미공개는 null/미확인이다.
3. 모델·평가와 상용 플랜·API·가중치 경로의 근거를 따로 확인한다. 출처 장애는 해당 자료만 미확인으로 남긴다. 공개 이용 조건을 확인하기 전 인증 데이터나 전체 자료를 넣지 않는다.
4. 같은 공개 비교 표의 구성 순서를 제공하려면 명시적 그룹과 whitelist를 추가한다. 벤치마크 버전·집합·원문이 다르면 그룹을 분리한다. 발표일만 다르다는 이유로 차단하지 않는다.
5. 관련 작업 연결과 선택→프롬프트→경로→초안 보존을 확인한다. 가격·무료 여부를 바꿔도 후보 ID/순서/적합성이 같은지 검사한다. 원점수 null/모델 버전 변경/평가 버전 변경/agent 구성을 교란하는 회귀를 실행한다.
6. [전체 스냅샷 문서](model-catalog-snapshot.md)의 실제 개수와 원문을 함께 갱신한다. 관측 수, 모델 수, 모델별 모드 수를 혼동하지 않는다.

## 이전 확장 검증 이력·남은 수동 항목

| 이번 실제 실행 | 결과 |
|---|---|
| 이전 확장 당시 `npm.cmd test` | **102개 통과 / 실패0**. 데이터·버전·원점수13건 보존, 새25모델 선택, 구성/source whitelist, 작업 관련성, 초안·복사 성공/실패, 정적 React 화면 렌더링/선택 핸들러 포함 |
| `npm.cmd run typecheck` | 통과 |
| `node --check tests/browser-check.mjs` | 구문 검사 통과. 실제 시나리오 실행이 아님 |
| `git diff --check` | 통과 |
| Vite 빌드 / 실제 브라우저 | 이번 미실행. 아래 환경 제한을 반복하지 않음 |

코드 리뷰에서 평가 모드 미공개 시 Work/chat 안내에 literal null이 나오는 문제를 실제 두 구성으로 재현하고, 미확인 안내로 수정 후 회귀 실패→통과를 확인했다. BrowseComp와 업무 실행, 과학 시험과 일반 논문 분석을 구분하는 회귀도 추가했다. 새 모델·평가·모드 개수와24개 고유 수치 출처는 실제 snapshot에서 대조했다. 브라우저 검사 스크립트의 구문 통과는 실제 브라우저 실행 통과가 아니다.
- 기본/native Vite 빌드가 이전 Windows `spawn EPERM`으로 실패한 동일 방식과 localhost/브라우저 호스트 연결 실패를 반복하지 않았다. 이번 빌드와 실제 브라우저·모바일·키보드·시스템 클립보드 검사는 **미실행**이며 성공으로 보고하지 않는다.
- 실행 환경 준비 후: 설문 직접입력→25모델→선택→4단계→편집→모델변경/초안보존; DeepSeek 체크포인트→Gemini API 전환; 업무 자동화→AutomationBench high 구성 선택; 코딩→Grok 평가버전별 구성 선택; 파일/이미지 권한 미확인; 320px/720px 줄바꿈; Tab/방향키/Enter; 복사 성공·권한 거부를 수동 확인한다.

이전 작업 중심 전환의90개 테스트/빌드·브라우저 실패 기록은 당시 검증 이력이며 이번 결과로 재사용하지 않는다. 원본 사용자 변경·아카이브·제작 기록을 보존했고 commit·push·배포하지 않는다.

추천 커밋 메시지: `feat: connect multi-provider model and agent benchmark evidence`
