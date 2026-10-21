# 벤치마크 데이터·모델 연결 감사

확인일: **2026-10-21**. 데이터 버전 `official-2026-10-21-audit-1`, 추천 정책 `recommendation-v1.0.0`.

후속 구현: [공개 투표 재분석 방법·실행 기록](arena-public-votes-methodology.md). 아래는 출처 감사 당시 기록이다. 이후 현재 추천과 독립적인 모델 평가 계산 도구·표시 영역을 추가했으나, 환경 제한으로 실제 원본 처리와 결과 JSON 생성은 아직 미완료다.

## 결론과 변경 범위

**제품에 추가한 평가 관측값 0개, 평가 모델 0개, 총점 추천 후보 0개다. 데이터 확보 완료가 아니다.** 실제 결과가 존재하는 경로와 데이터 공개 조건은 더 확인했지만, 재사용·평가 설정·현재 플랜 연결까지 충족하는 관측값은 확보하지 못했다. 검색 요약, 문서의 예제 JSON, 개별 문항 점수를 모델의 종합 결과로 채우지 않았다.

기존 6개 플랜, 추천 계산 함수, 60/25/15와 작업별 비중, UI, 프롬프트 흐름, Vite base와 배포 워크플로를 유지했다. `recommendationSnapshot.ts`의 조사 상태·연결 실패 이유·공식 출처를 구체화하고, `evidence.test.ts`에 보류 범위를 검증하는 테스트 4개를 추가했다. README와 기존 보고서/방법론에는 이번 감사 문서를 연결했다. 시작 시 작업 트리는 깨끗했다. commit·push·배포, 유료 가입·결제·외부 문의 전송은 하지 않았다.

## 1. 추천에 연결되는 실제 경로

`recommendationSnapshot` → `analyzeRequest` → 작업별 `recommendForTask` → 예산/필수 기능 필터 → 플랜의 `mappings` → 모델 확인 → `benchmarkDetails` → B/F/C 계산 → 카드의 `RecommendationEvidence` → 선택된 후보를 사용하는 `buildPrompt` 순서다.

| 단계 | 실제 검사 | 현재 결과 |
|---|---|---|
| 데이터 반입 | `models`, `observations`, `cohorts` | 모두 빈 배열. 런타임 API/크롤러/자동 갱신은 없음 |
| 모델·플랜 | `modelId`, 모델 `version`, `mapping.status`, `selectable`, `mode`, `model.reasoning === mapping.mode`, 날짜 있는 출처 | 6개 모두 `modelId:null`, `status:unknown`, `selectable:false`, `mode:null` |
| 비교 집합 | 작업 평가 ID별 정확히 하나의 고정 cohort, 2개 이상 모델, 중복 없음 | cohort 자체가 없음 |
| 비교 조건 | 평가 버전·환경·에이전트 버전·모드·단위·방향·기준일 일치, 모델마다 관측값 정확히 하나 | 실행할 실제 관측값 없음. SWE는 agentVersion 필수 |
| 관측값 신뢰 | 유한한 원점수, 종합지수 아님, 재배포 허용/근거 URL, 날짜 있는 출처, 모델 설정 | 검증할 실제 행 없음 |
| 부분 점수 | 각 평가별 min–max; 해당 작업의 모든 평가가 있어야 B | 기능 F와 비용 C는 독립 계산. B 누락을 0으로 바꾸지 않음 |
| 총점 | 연결 확인 및 B/F/C 모두 non-null | 모든 후보 null |

**현재 0개는 가져온 결과가 연결 코드에서 사라진 현상이 아니다.** 스냅샷 입력에 결과 자체가 없다. 모델·플랜 연결이 없으면 서비스 카드에 모델 벤치마크를 귀속시키지 않는 것도 의도된 동작이다. 나중에 모델만 확인되면 모델 자료로 보관·제시해야 하며, 이를 서비스의 점수로 계산하면 안 된다.

단일 cohort, 동일 `evaluatedAt` 등 엄격한 정책은 실제 자료 반입 때 따로 검토할 설계 제약이다. 이번에는 비교 조건을 충족한 실제 자료가 그 검사에서 탈락하는 사례를 확보하지 못했다. 이를 현재 점수 부재의 코드 오류라고 단정하거나 숫자를 위해 조건을 완화하지 않았다.

## 2. 출처별 상태를 분리한 조사

### Artificial Analysis

- **접근**: [API 문서](https://artificialanalysis.ai/data-api/docs), [제공 범위](https://artificialanalysis.ai/data-api), [웹 약관](https://artificialanalysis.ai/terms-of-use), [Data Platform Terms v1.1](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf) 본문 확인. API 실응답은 요청하지 않았다. 인증 키가 없는 상태이며 401/403을 실제로 받았다고 보고하지 않는다. 문서의 OpenAPI spec 링크는 웹 읽기 도구에서 Internal Error; 이를 API 전체 접근 금지로 해석하지 않는다.
- **정확한 데이터 접근 경로**: 문서의 REST base는 `https://artificialanalysis.ai/api/v2`, 모델 목록은 `GET https://artificialanalysis.ai/api/v2/language/models`, 인증은 `x-api-key`. Free 목록은 headline 지수 중심, Pro는 모델 상세 평가를 포함한다. 특정 모델별 실제 결과 URL/응답은 미확보다.
- **평가/모델 정보**: 문서의 현행 Intelligence Index는 v4.3.2지만 이는 개별 모델의 평가 기준일·실행 설정·점수를 확인한 것이 아니다. GDP.pdf/AA-LCR/AA-Omniscience/SciCode 등의 결과, 정확한 모델 ID/설정은 null 상태다. 종합 지수로 누락 슬롯을 대체하지 않는다.
- **이용 조건 범위**: 2026-08-19 개정 Data Platform 약관은 Free API에도 적용된다. §2.3의 짧은 개별 인용과 구조화된 데이터 재배포는 다르다. §2.4는 고객 대상 제품의 원자료 제공·외부 데이터 결합을 제한하고, §2.5는 모델 선택 가이드를 포함하는 외부 제품에 사전 서면 동의를 요구한다. 출처 표기만으로 해결되지 않는다.
- **판정**: 인증 데이터 미확보와 제품 사용 권한 미확보가 **별도** 장애물이다. 단순 유료 가입이나 API 키 발급만을 해결책으로 제시하지 않는다. 가입·문의는 수행하지 않았다.

### LiveBench

- **공식 연결 경로**: [공식 저장소](https://github.com/LiveBench/LiveBench)의 Data 절에서 [model_judgment](https://huggingface.co/datasets/livebench/model_judgment)와 [model_answer](https://huggingface.co/datasets/livebench/model_answer)로 연결된다. 로컬 `download_leaderboard.py`와 집계 스크립트가 안내된다. 스크립트 출력인 `all_groups.csv`/`all_tasks.csv`를 이미 공개된 공식 결과 파일인 것처럼 취급하지 않았다.
- **정확한 결과 파일**: [leaderboard-00000-of-00001.parquet](https://huggingface.co/datasets/livebench/model_judgment/blob/main/data/leaderboard-00000-of-00001.parquet). 공식 다운로드 URL: `https://huggingface.co/datasets/livebench/model_judgment/resolve/main/data/leaderboard-00000-of-00001.parquet`. 파일 페이지의 revision `9704e5d`, SHA256 `35ad896970151776145c96b31c5ddb3a2749ea9a1d91e6b7f1a4c4c04735182a` 확인. `main`은 가변 경로이므로 향후 반입 시 revision 고정이 필요하다.
- **확인한 내용**: [카드](https://huggingface.co/datasets/livebench/model_judgment/blob/main/README.md)에 leaderboard split 60,372행, `question_id/task/model/score/turn/tstamp/category`가 명시되어 있고 실제 행 미리보기도 열린다. `gpt-4o-2024-08-06`, `claude-3-5-sonnet-20241022`, `claude-3-7-sonnet-20250219-thinking-64k` 등 과거 ID가 관찰된다. 문항별 점수는 완성된 작업별 모델 점수가 아니다. timestamp를 전체 벤치마크 버전이나 동일 평가 기준일로 추정하지 않았다.
- **버전/설정**: 저장소 README는 2025-04-25 평가 릴리스와 2024-11-25 공개 질문 범위를 구분한다. 반면 현재 `livebench.ai`는 2.0 제목만 텍스트 도구로 읽혔다. 옛 HF 데이터가 현행 2.0과 같다는 근거는 없다. HF 판정 스키마에 샘플링 설정·토큰 예산·채점기 revision이 없으며, 모델명에 포함된 일부 정보만으로 모든 실행 설정을 확정할 수 없다.
- **라이선스**: [저장소 LICENSE](https://github.com/LiveBench/LiveBench/blob/main/LICENSE)는 FastChat Apache-2.0와 LiveCodeBench MIT 고지를 포함한다. 별도 HF 판정 데이터 카드에는 license 필드/허가문이 없고 파일 트리에도 별도 LICENSE가 확인되지 않았다. [License File 문의 #2](https://huggingface.co/datasets/livebench/model_judgment/discussions/2)는 2024-09-17 질문 이후 확인 가능한 답변이 없다. 코드 라이선스를 HF 결과에 자동 적용하지 않았다. **재사용 금지 확인이 아니라 허가 범위 미확인**이다.
- **실제 접근 실패 구분**: HF raw README와 data 디렉터리의 첫 직접 조회는 Internal Error였지만 blob/tree 링크 조회로 본문·파일 경로를 확인했다. 결과 데이터 전체가 접근 불가인 것은 아니다. 검색에서 발견한 `https://github.com/LiveBench/new-livebench`는 GitHub API와 웹 직접 열기 모두 404였으므로 검색에 보인 CSV를 자료로 채택하지 않았다. 전체 Parquet 다운로드·집계는 하지 않았다.
- **판정**: 결과 파일 경로와 문항별 결과의 존재는 확보. 결과 재배포 범위, 동일 릴리스/설정의 집계, 현행 모델·플랜 연결은 미확보. 현재 정책에는 LiveBench 슬롯도 없으므로 이름이 비슷한 자료 분석 평가를 GDP.pdf 등의 대체값으로 넣지 않았다.

### SWE-bench Verified

[공식 설명](https://www.swebench.com/verified.html)은 500개 Verified 문제와 bash-only mini-SWE-agent 환경을 명시한다. 1.x/2.x는 동등 비교를 보장하지 않고, 2.x는 temperature를 설정하지 않는다고 설명한다. 같은 2.0.0 기록 두 개를 골라 다음 파일을 **직접 열었다**.

| 항목 | GPT 기록 | Claude 기록 |
|---|---|---|
| 디렉터리 | `evaluation/verified/20260217_mini-v2.0.0_gpt-5-2-high` | `evaluation/verified/20260217_mini-v2.0.0_claude-4-5-sonnet-high` |
| 결과·설정 | [metadata.yaml](https://github.com/SWE-bench/experiments/blob/main/evaluation/verified/20260217_mini-v2.0.0_gpt-5-2-high/metadata.yaml) | [metadata.yaml](https://github.com/SWE-bench/experiments/blob/main/evaluation/verified/20260217_mini-v2.0.0_claude-4-5-sonnet-high/metadata.yaml) |
| 문항별 결과 | [per_instance_details.json](https://github.com/SWE-bench/experiments/blob/main/evaluation/verified/20260217_mini-v2.0.0_gpt-5-2-high/per_instance_details.json) | [per_instance_details.json](https://github.com/SWE-bench/experiments/blob/main/evaluation/verified/20260217_mini-v2.0.0_claude-4-5-sonnet-high/per_instance_details.json) |
| 확인한 모델 태그 | `gpt-5-2` (날짜 고정 API ID 미확인) | `claude-sonnet-4-5-20250929` |
| 에이전트/추론 | mini-SWE-agent 2.0.0 / high / attempts 1 | mini-SWE-agent 2.0.0 / high / attempts 1 |
| 평가일 | 디렉터리 20260217은 기록 식별자. 실제 평가일 별도 미확인 | 동일 |
| 결과 구조 | resolved 비율 필드, 500개 instance key 확인 | resolved 비율 필드, 500개 instance key 확인 |

metadata blob SHA는 각각 `6cffd319dc4424deb50f3bc950bf15766fc2845b`, `b17ec09bcc802828f53a48dd5a7fc2d2adbd7d3f`; 문항별 파일 SHA는 `cfdc6c07ad339e60e6d34b4d9050b85243b1bbc8`, `697da24c32b43e81245ac92a741afa39f1b3293b`다. 원점수는 재배포 범위가 확정되지 않아 제품 데이터나 이 보고서의 수치 표로 복제하지 않았다.

- **접근 성공**: [실험 저장소 README](https://github.com/SWE-bench/experiments/blob/main/README.md), 루트 목록, 위 두 기록의 파일 목록/metadata/문항별 JSON, [checklist](https://github.com/SWE-bench/experiments/blob/main/checklist.md). 결과가 없거나 API 키가 필요한 상황이 아니다. 구 기록의 trajectory는 metadata에 `s3://swe-bench-submissions/bash-only/<위 디렉터리 이름>/trajs`로 안내된다. S3 로그 전체는 내려받지 않았다.
- **접근 실패**: 공식 설명의 설정 링크 `https://github.com/SWE-agent/mini-swe-agent/blob/main/src/minisweagent/config/extra/swebench.yaml`는 웹에서 404. 같은 경로의 `ref=v2.0.0` GitHub 조회도 404. 따라서 세부 설정 파일까지 확인했다고 말하지 않는다.
- **이용 조건**: 루트/해당 두 디렉터리에는 별도 LICENSE가 확인되지 않았고, README/checklist의 공개·재현성 안내는 결과의 제3자 웹앱 번들 재배포 허가를 명시하지 않는다. 문제 데이터나 에이전트 코드의 라이선스를 제출 결과에 전이하지 않았다. 명시적 금지를 발견한 것이 아니라 결과물별 허가 범위가 미확인이다.
- **판정**: 두 결과의 존재와 일부 비교 조건 확보. 고정 GPT API ID, 전체 실행 설정, 결과 재배포 범위가 부족해 정규화 cohort를 만들지 않았다. Claude의 날짜 ID가 있어도 현재 채팅 플랜·모드와 동일한 실행이라는 근거는 없다. GPT-5.2의 현재 ChatGPT 제공 종료도 별도 장애물이다.

### Arena

- **공식 경로**: [Arena-Rank 공개 글](https://arena.ai/blog/arena-rank)은 [공식 HF 데이터셋](https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k)에서 `model_a/model_b/winner`를 읽어 Bradley–Terry를 계산하는 예를 직접 제공한다. 방법론 코드의 Apache-2.0과 데이터 라이선스는 별개다.
- **파일**: [data 디렉터리](https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k/tree/main/data)의 `train-00000-of-00007.parquet`부터 `train-00006-of-00007.parquet`까지 7개. [첫 파일](https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k/blob/main/data/train-00000-of-00007.parquet)의 공식 다운로드 URL은 `https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k/resolve/main/data/train-00000-of-00007.parquet`. 나머지도 해당 디렉터리에서 확인했다. 파일 revision `a9cb587`, 카드 revision `6322995`.
- **데이터 범위**: 카드에 135,634표, text-only 선호도, `creative_writing_v0.1`, `if_v0.1` 카테고리와 timestamp/모델 쌍/승자 등이 명시된다. 이는 과거 투표 원자료이며, 현재 Creative Writing 리더보드의 최종 점수·동일 비교 집합·평가 버전 파일이 아니다. API 버전 ID/샘플링/추론 예산/실행 환경을 보장하는 필드는 카드 스키마에서 확인되지 않는다. 전체 파일 다운로드·카테고리별 집계·신뢰구간 산출은 미수행이다.
- **이용 범위**: [데이터 카드](https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k/blob/main/README.md)에 CC-BY-4.0이 명시된다. 상세 License 절은 사용자 프롬프트는 CC-BY-4.0, 모델 출력은 각 제공사 약관 적용이라고 구분한다. [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)의 표시·변경 고지 조건을 지키는 투표 메타데이터 기반 파생 통계 경로는 유망하다. 모델 응답 원문까지 일괄 재사용 가능하다고 결론 내리지 않았다.
- **웹과 구별**: [웹 약관](https://help.arena.ai/articles/5629909088-terms-of-use)의 추출 제한을 별도 공개 HF 데이터 전체에 동일하게 덮어씌우지 않는다. 반대로 HF 허가를 현행 [Creative Writing 웹 리더보드](https://arena.ai/leaderboard/chat/text/creative-writing)의 재배포 권한으로 확대하지 않는다.
- **판정**: 공개 데이터와 라이선스 경로는 확보했고, “Arena 전체 이용 허가 없음”이라는 설명을 수정했다. 이번에 막힌 것은 투표 자료를 현재 정책의 공식 글쓰기 점수로 간주할 수 없다는 점과 실행 설정/현행 플랜 매핑이다. 임의 승률이나 전체 선호도 점수로 글쓰기 슬롯을 채우지 않았다.

### 추가 확인: IFBench 원저자 자료

LiveBench 안의 IFBench 안내를 따라 [원저자 저장소](https://github.com/allenai/IFBench/blob/main/README.md)와 [논문 v3](https://arxiv.org/html/2507.02833v3)를 직접 확인했다. 저장소는 코드 Apache-2.0와 데이터 ODC-BY-1.0을 구별한다. [논문 공개 페이지](https://arxiv.org/abs/2507.02833)는 CC-BY-4.0을 명시하므로 논문 내용의 출처 표시 재사용 경로는 있다.

그러나 확인한 본문/표·그래프의 모델 표시명만으로 정확한 API snapshot ID·추론 예산을 확정하지 못했다. Appendix G의 일반 temperature 0 안내에도 o3 temperature 1 등 예외가 있다. 릴리스 날짜가 평가 실행 날짜를 뜻하지 않으며 단일/멀티턴을 섞을 수 없다. `eval/eval_results_loose.jsonl`/`eval_results_strict.jsonl`이라는 파일 목록도 확인했지만 특정 두 모델의 공식 실행 결과로 확인한 것은 아니다. 따라서 이 경로 역시 현재 플랜의 IFBench 관측값으로 반입하지 않았다. 코드 허가 부족으로 막힌 자료라고 묶지 않는다.

## 3. 현재 플랜과 과거 모델의 연결

| 서비스 | 이번 공식 재확인 | 연결 판정 |
|---|---|---|
| ChatGPT Free/Plus | [릴리스 노트](https://help.openai.com/en/articles/6825453-chatgpt-release-notes)의 2026-06-12 항목은 GPT-5.2 Instant/Thinking/Pro 종료를 명시. [현재 플랜](https://chatgpt.com/pricing/)도 열어 확인 | SWE의 과거 GPT-5.2 결과를 현재 플랜으로 승격 불가. 현재 정확한 평가 모델/설정 연결은 unknown |
| Gemini Free/Google AI Pro | [모델 안내](https://support.google.com/gemini/answer/18648722?hl=en)는 무료 Auto/Flash-Lite, 유료 선택·사고 수준, 자동 라우팅 및 한도 이후 fallback을 설명 | 서비스 모델군을 과거 `gemini-2.0-flash`나 `Gemini 2.5 Pro` 평가 ID로 치환 불가. unknown |
| Claude Free/Pro | [요금표](https://claude.com/pricing)는 Pro에 추가 모델을 안내하며 [릴리스 노트](https://support.claude.com/en/articles/12138966-release-notes)는 최근 모델군을 안내 | 과거 Sonnet 4.5 API의 high + mini-SWE-agent를 현재 채팅 플랜과 같은 설정으로 볼 근거 없음. unknown. 모델이 확정적으로 미지원이라고 주장한 것은 아님 |

UI의 모델 선택 가능 여부만 확인해도 에이전트 실행 환경까지 같아지는 것은 아니다. 특히 SWE 결과는 도구·프롬프트·실행 예산을 포함한 평가이므로 일반 채팅 서비스 전체 점수로 전환하지 않는다. API 가격/평가 실행 비용은 월 구독료에 반영하지 않았다.

## 4. 모든 실제 후보의 보류 필드

실제 `recommendForTask` 실행 기준: `budget:'paid'`, 필수 기능 `['pdf','web']`. 세 작업 각각 실행했다. F/C는 품질 수치가 아니라 기존 정책의 조건 적합성 점수다.

- A: `gdp-pdf` 40% + `aa-lcr` 35% + `aa-omniscience` 25%.
- W: `arena-writing` 60% + `ifbench` 40%.
- C: `swe-verified` 60% + `scicode` 40%.
- D: 해당 작업의 관측값·cohort 없음 → `scores.benchmark=null`.
- M: `mapping.modelId=null`, `status=unknown`, `mode=null`, `selectable=false`, 모델 레코드 없음 → 연결 검사 실패.
- P: `price.amount/currency=null` → 비용 보류 (월 주기는 확인).
- F: PDF 플랜 지원 `unknown` → 기능 보류 (웹 검색은 확인).

| 실제 후보 | 필요한 평가 | 확보 | 평가 모델 연결 | 플랜 연결 | 기능 F / 비용 C | 총점 보류의 직접 원인 |
|---|---|---|---|---|---|---|
| ChatGPT Free · 분석 | A | 0/3 | 없음 | unknown | 100 / 100 | D, M |
| ChatGPT Plus · 분석 | A | 0/3 | 없음 | unknown | 100 / null | D, M, P |
| Gemini Free · 분석 | A | 0/3 | 없음 | unknown | null / 100 | D, M, F |
| Gemini Google AI Pro · 분석 | A | 0/3 | 없음 | unknown | null / 100 | D, M, F |
| Claude Free · 분석 | A | 0/3 | 없음 | unknown | null / 100 | D, M, F |
| Claude Pro · 분석 | A | 0/3 | 없음 | unknown | null / 100 | D, M, F |
| ChatGPT Free · 글쓰기 | W | 0/2 | 없음 | unknown | 100 / 100 | D, M |
| ChatGPT Plus · 글쓰기 | W | 0/2 | 없음 | unknown | 100 / null | D, M, P |
| Gemini Free · 글쓰기 | W | 0/2 | 없음 | unknown | null / 100 | D, M, F |
| Gemini Google AI Pro · 글쓰기 | W | 0/2 | 없음 | unknown | null / 100 | D, M, F |
| Claude Free · 글쓰기 | W | 0/2 | 없음 | unknown | null / 100 | D, M, F |
| Claude Pro · 글쓰기 | W | 0/2 | 없음 | unknown | null / 100 | D, M, F |
| ChatGPT Free · 코딩 | C | 0/2 | 없음 | unknown | 100 / 100 | D, M |
| ChatGPT Plus · 코딩 | C | 0/2 | 없음 | unknown | 100 / null | D, M, P |
| Gemini Free · 코딩 | C | 0/2 | 없음 | unknown | null / 100 | D, M, F |
| Gemini Google AI Pro · 코딩 | C | 0/2 | 없음 | unknown | null / 100 | D, M, F |
| Claude Free · 코딩 | C | 0/2 | 없음 | unknown | null / 100 | D, M, F |
| Claude Pro · 코딩 | C | 0/2 | 없음 | unknown | null / 100 | D, M, F |

필수 PDF를 해제하고 웹 검색만 요구하면 6개 모두 F=100이다. 무료만 선택하면 유료 3개는 점수 계산 전에 제외된다. 따라서 PDF 미확인/유료 가격 미확인은 모든 상황에 적용되는 전역 보류 조건이 아니다. 일부 필드를 확보해도 D/M이 남으면 총점은 계속 보류한다.

## 5. 계산 코드 점검 및 검증

새로 추가한 4개 테스트는 기존 코드에서 통과했다. 확인한 범위에서 잘못된 전역 보류나 데이터 유실 오류를 재현하지 못했으므로 계산 코드를 변경하지 않았다.

1. 한 작업의 평가 하나만 없으면 다른 평가별 정규화 값과 F/C는 유지; B/총점만 보류.
2. 분석·글쓰기 데이터가 전부 없어도 코딩 데이터가 충분하면 코딩 점수 계산.
3. 한 플랜의 모델 연결이 미확인이어도 다른 플랜의 정상 점수 계산.
4. 실제 6개 플랜 × 3개 작업의 D/M/F/P 조건 및 웹 검색만 요구할 때의 F 독립 계산 확인.

| 검증 | 결과 |
|---|---|
| 변경 전 `npm.cmd test` | 기존 44개 통과 |
| 추가 테스트 실행 | 48개 통과 |
| `npm.cmd run typecheck` | 통과 |
| `npm.cmd run build` | 1회 실행, Vite 설정 로딩의 esbuild 자식 프로세스 `spawn EPERM`, 종료 코드 1 |
| 빌드 재시도/제한 우회 | 하지 않음. 앞선 작업과 같은 환경 실패이므로 반복하지 않음 |
| 브라우저 | 이번 범위에서 미수행. 새 빌드 성공으로 보고하지 않음 |

## 6. 다음 자료 반입에 필요한 것

지금 기능 중심 조건부 추천을 유지하는 데 사용자 결제·키 입력·외부 문의는 필요 없다. 아래는 **점수 추천을 열기 위한 자료 조건**이며 이번에 완료된 항목이 아니다.

1. Arena 공개 투표 메타데이터를 이용하려면 버전 고정, creative-writing 필터, 공식 Arena-Rank 설정, 모델별 실행 설정을 확보하고 파생 평가임을 명시해야 한다. 과거 표본으로 계산한 값은 현행 웹 순위와 별도 평가다. 현재 정책을 그대로 유지하려면 기존 슬롯과 동일하다는 근거가 먼저 필요하다.
2. LiveBench/SWE 결과를 공개 번들에 넣으려면 해당 **결과 파일**에 적용되는 라이선스/명시적 허가와 재현 설정이 필요하다. 코드 LICENSE나 공개 읽기 가능만으로 대체할 수 없다. 이번에는 문의를 보내지 않았다.
3. AA를 선택한다면 §2.4/2.5를 충족하는 제품 이용 범위와 인증 접근이 모두 필요하다. API 키는 허용된 갱신 환경에서만 사용하며 프론트엔드·VITE·JSON에 넣지 않는다.
4. 각 작업의 필요한 슬롯을 동일 비교 조건의 모델 2개 이상으로 확보하고, 현재 플랜의 정확한 모델·모드 및 평가 환경 연결을 공식 자료로 확인해야 한다. 과거 모델을 최신 모델로 이름만 바꾸지 않는다. 일부 슬롯만 확보하면 해당 부분만 표시하고 총점은 보류한다.

사용자가 지금 수행할 검증은 일반 PowerShell에서 다음 명령을 각각 실행하는 것이다. 의존성은 이미 설치되어 있어 재설치를 요구하지 않는다.

```powershell
Set-Location 'D:\univ\3-1\contest\2026_KHU_AI_Challenge'
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

각 명령 성공 후에만 다음으로 진행한다. 빌드 성공 시 선택적으로 `npm.cmd run preview -- --port 4173 --strictPort`와 `http://127.0.0.1:4173/AI...may-I../`에서 기존 흐름을 확인한다. 이 명령들은 commit·push·배포를 수행하지 않는다.
