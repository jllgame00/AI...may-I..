# 고정 모델 이용 경로 재확인

확인일 **2026-10-28**. 25개 모델·107건 관측을 변경하지 않고 기존 설치형15개만 경로를 보완했다. 로그인·결제·API호출·실제 추론은 실행하지 않았다.

기본25개 모델의 가장 간단한 확인 경로: **웹4 / API18 / 설치2 / 경로미확인1**. 추가 필수 기능 없는 소비자 기본 탐색 기준이며 경로 개수가 아닌 고유모델 수다. 웹은 로그인·크레딧·권한이 필요할 수 있으며 무료를 의미하지 않는다.

기존 설치형15개 중13개에 정확 릴리스의 호스팅 경로가 있다. 그중1개는 웹데모와API 둘다 확인했다. 설치형15개 경로는 고급 선택지로 계속 선택 가능하며 웹/API와 중복되는13개를 모델 수에 더하지 않는다.

| 정확한 체크포인트 | 확인된 웹/API | 현재 가장 간단한 경로 | 연결 미확인·은퇴·제한 |
|---|---|---|---|
| `deepseek-ai/DeepSeek-R1` (DeepSeek-R1) | [Hugging Face Inference Providers · Novita](https://huggingface.co/deepseek-ai/DeepSeek-R1) | API 설정 | DeepSeek 공식 웹 채팅 · 정확 버전 미확인: 정확버전 미확인; DeepSeek 공식 API · 해당 구버전 미확인: 정확버전 미확인 |
| `deepseek-ai/DeepSeek-R1-0528` (DeepSeek-R1-0528) | [OpenRouter API · DeepSeek-R1-0528](https://openrouter.ai/deepseek/deepseek-r1-0528) | API 설정 | DeepSeek 공식 웹 채팅 · 정확 버전 미확인: 정확버전 미확인; DeepSeek 공식 API · 해당 구버전 미확인: 정확버전 미확인 |
| `deepseek-ai/DeepSeek-V3-0324` (DeepSeek-V3-0324) | [OpenRouter API · DeepSeek-V3-0324](https://openrouter.ai/deepseek/deepseek-chat-v3-0324) | API 설정 | DeepSeek 공식 웹 채팅 · 정확 버전 미확인: 정확버전 미확인; DeepSeek 공식 API · 해당 구버전 미확인: 정확버전 미확인 |
| `Qwen/Qwen3-235B-A22B-Instruct-2507` (Qwen3-235B-A22B-Instruct-2507) | [OpenRouter API · Qwen3-235B-A22B-Instruct-2507](https://openrouter.ai/qwen/qwen3-235b-a22b-2507) | API 설정 | Qwen 공식 채팅 · 정확 버전 미확인: 정확버전 미확인; Alibaba Cloud Model Studio · 정확 버전 미확인: 정확버전 미확인 |
| `Qwen/Qwen3-30B-A3B-Instruct-2507` (Qwen3-30B-A3B-Instruct-2507) | [OpenRouter API · Qwen3-30B-A3B-Instruct-2507](https://openrouter.ai/qwen/qwen3-30b-a3b-instruct-2507) | API 설정 | Qwen 공식 채팅 · 정확 버전 미확인: 정확버전 미확인; Alibaba Cloud Model Studio · 정확 버전 미확인: 정확버전 미확인 |
| `moonshotai/Kimi-K2-Instruct` (Kimi-K2-Instruct) | [OpenRouter API · Kimi-K2-Instruct](https://openrouter.ai/moonshotai/kimi-k2) | API 설정 | Kimi 공식 채팅 · 정확 버전 미확인: 정확버전 미확인; Kimi 공식 API · 구버전 제공 제한 예정: 정확버전 미확인 |
| `moonshotai/Kimi-K2-Instruct-0905` (Kimi-K2-Instruct-0905) | [Hugging Face Inference Providers · Novita](https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905) | API 설정 | Kimi 공식 채팅 · 정확 버전 미확인: 정확버전 미확인; Kimi 공식 API · 구버전 제공 제한 예정: 정확버전 미확인 |
| `moonshotai/Kimi-K2-Thinking` (Kimi-K2-Thinking) | [OpenRouter API · Kimi-K2-Thinking](https://openrouter.ai/moonshotai/kimi-k2-thinking) | API 설정 | Kimi 공식 채팅 · 정확 버전 미확인: 정확버전 미확인; Kimi 공식 API · 구버전 제공 제한 예정: 정확버전 미확인 |
| `zai-org/GLM-4.6` (GLM-4.6) | [Z.ai 공식 API · glm-4.6](https://docs.z.ai/guides/llm/glm-4.6) | API 설정 | Z.ai 공식 채팅 · 정확 버전 미확인: 정확버전 미확인 |
| `zai-org/GLM-4.7` (GLM-4.7) | [Z.ai 공식 API · glm-4.7](https://docs.z.ai/guides/llm/glm-4.7) | API 설정 | Z.ai 공식 채팅 · 정확 버전 미확인: 정확버전 미확인 |
| `meta-llama/Llama-4-Scout-17B-16E-Instruct` (Llama-4-Scout-17B-16E-Instruct) | [Google Cloud 호스팅 API · Llama 4 Scout](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/llama/llama4-scout) | API 설정 | Meta AI · 정확한 Scout 버전 선택 미확인: 정확버전 미확인 |
| `meta-llama/Llama-4-Maverick-17B-128E-Instruct` (Llama-4-Maverick-17B-128E-Instruct) | [Google Cloud 호스팅 API · Llama 4 Maverick](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/llama/llama4-maverick) | API 설정 | Meta AI · 정확한 Maverick 버전 선택 미확인: 정확버전 미확인 |
| `mistralai/Mistral-Small-3.1-24B-Instruct-2503` (3.1-2503) | 현재 확인된 호스팅 없음 | 직접 설치 | Mistral Vibe Chat (구 Le Chat): 정확버전 미확인; Mistral 직영 API · Small 2503 은퇴: 해당경로 은퇴; Microsoft Foundry · Small 2503 제공 조건 확인 필요: 정확버전 미확인 |
| `mistralai/Mistral-Small-3.2-24B-Instruct-2506` (3.2-2506) | [DeepInfra · Small 3.2 2506 웹 데모](https://deepinfra.com/mistralai/Mistral-Small-3.2-24B-Instruct-2506); [DeepInfra 호스팅 API · Small 3.2 2506](https://deepinfra.com/mistralai/Mistral-Small-3.2-24B-Instruct-2506/api) | 웹 데모 | Mistral Vibe Chat (구 Le Chat): 정확버전 미확인; Mistral 직영 API · Small 2506 상태 확인 필요: 정확버전 미확인 |
| `mistralai/Magistral-Small-2506` (2506 (Small 1.0)) | 현재 확인된 호스팅 없음 | 직접 설치 | Mistral Vibe Chat (구 Le Chat): 정확버전 미확인; Mistral 직영 API · Magistral Small 2506 은퇴: 해당경로 은퇴 |

DeepInfra Small3.2는 FP8 제공이며 원 평가와 동일 정밀도를 보장하지 않는다. HF Inference Providers의 Novita 경로2개는 패널의 정확 체크포인트 연결은 확인했지만 Novita 직통 모델ID는 미확인이다. 이를 일반 API ID로 추정하지 않는다. OpenRouter6개는 공식 모델 페이지와 가중치 연결·현재 제공자 표를 확인했다. Google Cloud Meta2개는 해당 instruct MaaS ID·지역·계정 설정을 확인했다. GLM2개는 Z.ai 현재 가격표와 정확 API 식별자를 확인했다. 상세 실행·과금·도구 권한은 사용자 계정에서 확인한다.

Kimi 직영 API는 신규 가입자에 대한2026-10-31 제한과12월말 종료 예정이 공지돼 있다. 이는 현재 확정 호스팅의 종료로 전이하지 않는다. DeepSeek의 현재 V4 API별칭, Meta AI의 현재 모델, Mistral Vibe의 자동 선택을 이 과거 체크포인트와 연결하지 않았다. Small3.1 Azure경로는 deprecated상태와 미래 은퇴일을 기록하되 신규배포/체크포인트 동일성까지 미확인이라 선택 경로로 확정하지 않았다.

경로별 공식 원문·확인일·조건은 `src/data/research/eastern-access.json`과 `western-access.json`에 저장했다. 이 기록의41개 서비스 경로에는14개 확인 경로(13개 모델),25개 미확인 경로,2개 은퇴 경로가 포함된다. 추가 자체 호스팅15개는 별도 fallback이다. 가격은 추천 순위나 이 그룹 구분에 쓰지 않는다.

## 실행 환경 준비 후 수동 확인

이번에는 기존 Windows 빌드의 spawn EPERM과 브라우저 호스트 연결 제한을 반복하지 않았다. 실제 브라우저 성공으로 보고하지 않는다. 현재 소스를 빌드·preview할 수 있는 환경에서 다음을 확인한다.

1. 설문 보고서 → 요약 통계 직접 입력 → 웹4/API18의 기본 카드와 고급 설치15개를 확인한다. 통계 분석에 코딩 점수가 붙지 않아야 한다. 설치/API가 중복되는13개를 모델 수에 더하지 않는다.
2. DeepInfra Small3.2 웹 데모 선택 → 단계별 프롬프트에서 exact2506·로그인/크레딧·FP8 제한·실제 링크를 확인한다. 웹 화면이 무료나 평가 동일성을 뜻하지 않아야 한다.
3. Qwen235B2507의 OpenRouter 경로 선택 → 프롬프트 편집 → 같은 모델의 설치 경로로 변경한다. 원래 초안이 유지되고 명시적 재생성 후에는 API용 ID 대신 가중치 체크포인트·설치 안내가 나와야 한다. 반대로 API로 바꾸면 호스팅 ID와 URL이 일치해야 한다.
4. Mistral Small3.1/Magistral2506는 설치 경로로 남고 직영 은퇴 API는 선택 후보로 제공하지 않아야 한다. Meta AI·DeepSeek·Kimi 최신 웹서비스를 과거 체크포인트 확정 경로로 표시하지 않아야 한다.
5. 320px/720px에서 긴 모델 ID·호스팅 설명·경고가 잘리는지 확인한다. Tab/방향키/Enter로 기본·고급 선택, 단계 검토, 되돌아가기를 확인한다. 복사 후 실제 붙여넣기와 권한 거부 시 수동 선택·초안 보존도 확인한다.
6. AA 영역의 앱 관측0건, 원문 확인 링크, API/공개 조건/지수 구분을 확인한다. 로컬 수집용 키·원본 응답이 브라우저 요청이나 정적 자산에 들어가지 않아야 한다.

`node --check tests/browser-check.mjs`는 구문 검사다. 별도 preview4173/격리 Chromium9222가 준비된 환경에서 스크립트를 실제 실행한 결과와 구분한다.
