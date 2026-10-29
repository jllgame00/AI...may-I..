# 회사 중심 전환: 변경 전 전수 조사 및 분류

2026-10-29. 기준 HEAD `6e9f86c57e44e9c44b5205939ee59eca47b53b7d`. AGENTS.md는 저장소/상위 경로에서 발견되지 않았다. 작업 시작부터 package.json, refresh-data, WeightedComparison, evaluationGroups, taskRanking, recommendationTypes, render 테스트와 이전 턴의 점수 추정 파일들이 미커밋 상태다. 이를 포함한 변경 전 전체 src/scripts/tests/README/package 설정을 `archive/model-recommendation-2026-10-29/`에 먼저 복사하고 SHA-256 목록을 남긴다. 사용자 수정과 원본 연구 자료를 버리지 않는다. commit/push/배포/유료 평가는 실행하지 않는다.

| 조사 항목 | 실제 위치/현재 동작 | 분류 및 조치 |
|---|---|---|
| 모델 후보 생성 | recommend.referenceCandidatesForTask, catalogCandidates, modelAccess: model/plan/mapping마다 후보 생성, model 없는 서비스 후순위 | 제거: 회사/서비스/플랜 등록과 기능 근거로 독립 후보 생성 |
| 모델 원점수 순위 | taskRanking, evidenceComparisons, evaluationGroups, codingIntent의 benchmark fit 4/3/2, providerComparisons/taskEvidence의 검토 표 | 역사 보존: 새 엔진에서 평가·비교 집합·fit 함수 import 금지 |
| 기능 가중값 | weightedRecommendation: upload 1, 나머지 2; supported 100/unsupported 0; 추천 rank=1+score 비교 | 제거: 신규 기능 gate와 별도 항목 정책 사용, unknown=null |
| 기존 정책/타입 | recommendationPolicy의 task-evidence-ranking-v3, recommendationTypes의 Recommendation/WeightedTaskDecision/TaskScoreComponent | 역사 보존 후 활성 경로에서 제거. 새 Provider 타입으로 교체 |
| 잠재 모델 역량 | scoreEstimation, scorePublication, EstimatedComparison, score-estimation.json, estimate-core/estimate-models | 이전 미커밋 작업 포함 역사 보존. 새 추천/갱신 fallback으로 실행하지 않음 |
| 모델 자동 우선 | recommend의 model 존재 우선, taskReadiness의 task order, currentEvidence의 benchmark 선택, source group의 Grok/Qwen 집합 대표 선정 | 제거: 특정 회사/모델 이름은 점수에 사용하지 않음 |
| 공식 기능·가격 | baselineSnapshot, researchOverlay, webTaskSupport, currentModels의 reviewedPlans; 서비스 근거와 API/model 근거 혼재 | 수정: 유효한 웹 플랜 근거만 새 독립 스냅샷으로 명시 이관. 미열람/범위 충돌·세부 형식 미확인은 유지 |
| unknown/limited | featureConstraints의 출처/제한 비교는 유용하지만 메모 정규식으로 spreadsheet 작성 범위를 승격 | 수정: 새 구조화된 capability/format/quantity 검사를 구현. 미확인을 지원/미지원으로 승격하지 않음 |
| 13개 서비스 | archive/legacy-app/src/data/catalog.ts에 13개, 현재 src/data/services.ts에는 3개+catalog descriptor | 수정: 12개 회사/13개 서비스 명시 등록. Google에 Gemini/NotebookLM; 모델 데이터와 무관하게 존속 |
| 원본 평가 | recommendationSnapshot 실제 28모델/111평가(25+공식 발견3). 모델·agent/기간/버전/출처 차이 포함 | 역사 자료로 보존: 원본 전체 유지. 회사 점수에 합산·평균·최고값·상속 금지 |
| 자연어 분석 | recommend의 classifyTask/interpretRequest, aiGuide의 interpretTask | 수정: 분류·원문/override 개념은 유지하되 세분 기능·예산·형식·복합 작업을 새 요구 타입으로 분석 |
| 프롬프트 | promptEngine, surveyTask, workStages, aiGuide의 surveyStages/buildGuideBundle, promptSession | 유지/수정: 원문·해석·초안·복사·다시생성/복구 그대로. 모델 후보 선택만 서비스/플랜 ID로 교체. 구형 lib/prompts는 비활성 옛 workflow이므로 역사 보존 |
| UI | CandidateComparison/WeightedComparison/CurrentModelEvidence/EstimatedComparison의 모델 중심 카드, StageWorkspace의 모델 선택 | 수정: 레이아웃 재사용, 회사 최대3 카드/조건부 기본접힘/서비스·플랜 상세. 모델/원점수 카드 제거 |
| 테스트 | model/provider 브랜드 고정 기대, 알고리즘 Qwen 선두/Grok repository 우선, 28행/기능100 공동1위 SSR 등 | 역사 보존 후 활성 suite 교체. 새 정책의 독립성·기능/무료 gate·중복·예산·단계 상태 검증. promptEngine/promptSession 테스트는 재사용 |
| 갱신 | refresh-data/refresh-core의 Qwen 카드·발견·AA, 기존 Pages 작업 | 역사 자료 수집기로 격리. 현재 data:refresh/validate/restore는 새 회사 스냅샷 검증·복구만 수행, 수집 완료를 가장하지 않음. Pages base/배포 설정은 유지 |
| README/설계 | 모델 순위와 가격 무시 정책, 165/221개 등 과거 검사 숫자 | 수정: 현재 문서는 회사 gate/예산/unknown/점수보류 정책으로 교체. 옛 문서는 역사 기록임을 명시 |

## 새 설계 및 구현 순서

사용자 명세의 실제 구현 요청을 기준으로 진행한다. 기존 결과를 회사명으로 치환하는 접근과 모델 점수를 회사로 합산하는 접근은 배제한다. `Provider → Service → Plan → Capability/Evidence`의 독립 정규화 데이터와 하나의 신규 정책을 사용한다. Model/Evaluation은 보조·역사 데이터로 분리하고 추천 입력 타입에서 평가를 받지 않는다.

1. 변경 전 보존 복사와 해시 확인.
2. 신규 타입·13서비스 데이터·공식 확인 범위 이관. 회사 누락/중복/고아 관계/근거 scope 검증.
3. 실패 테스트부터 요구 분석, 기능/예산 gate, 회사 중복 제거·최대3/공동/조건부, 점수 null 정책 구현.
4. 기존 프롬프트 생성·편집을 연결하고 각 단계 요구사항으로 서비스/플랜 선택을 검증. 이전 단계 선택을 호환하지 않는 후속 단계에 강제하지 않음.
5. 활성 구형 코드·타입·테스트를 보존 위치로 격리하고 import 그래프로 재유입/fallback을 차단.
6. 테스트·타입 검사·가능한 빌드/E2E·최종 결과 보고.

## 신규 점수 정책의 사전 결정

초기 가중치는 적합성 .4/실제 작업 품질 .3/비용 .2/편의 .1로 단일 정책에 기록한다. 현재에는 서비스/플랜·작업·조건이 일치하는 직접 품질 실측과 비교 가능한 편의 데이터가 없으므로 종합점수/성능 순위는 null이다. 확인된 필수 기능을 통과하면 점수 없이 공동 우선 후보가 될 수 있다. 모든 필수 기능/예산이 확인되어야 우선 후보이고 limited/unknown은 조건부, 명시적 불일치는 제외한다. 가중치 재분배나 부분 점수의 100점 환산은 하지 않는다.

서비스/플랜 대표 선택은 같은 회사 내에서 명시적 예산 충족, 확인된 필수 조건, 사용자가 이미 선택한 호환 경로, 확인된 무료 경로, 중립 ID 순으로 수행한다. 이 순서는 회사 품질 순위가 아니다. 회사 간 품질 근거가 없으면 중립 이름순으로 최대3개를 먼저 보이고 나머지 공동 후보는 접는다. 제외/조건부 회사를 세 자리 채우기에 사용하지 않는다. 조건부 후보를 사용자가 선택할 때는 주의사항과 미확인 조건을 표시한다.
