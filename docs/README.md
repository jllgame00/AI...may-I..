# Current Provider recommendation documentation

Latest test repair: [Playwright discovery isolation, 16 registered E2E tests, and execution limits](provider-playwright-repair-report.md). This supersedes the older standalone-library-runner commands below.

Current implementation: [Provider policy](provider-recommendation-policy.md), [pre-change audit](provider-recommendation-audit.md), [refactor results](provider-refactor-report.md), [product UI and validation follow-up](provider-product-validation-report.md), [initial executed examples](provider-recommendation-cases.json).

Evidence and evaluation foundation: [implementation and verification report](provider-evidence-evaluation-report.md), [manual execution and grading guide](provider-evaluation-guide.md), [complete evidence matrix and research backlog](provider-evidence-audit.json). No real AI service runs or scores have been recorded. These offline tools do not change production recommendations.

Execution readiness: [Windows build/Playwright revalidation](provider-local-execution-report.md), [four consumer-service pilot checklist](provider-consumer-pilot-checklist.md), [blank preparation slots](../evaluations/preparation/consumer-pilot.json). Scheduled slots are not evaluation results.

The model-centered design, weighting, benchmark, estimation and earlier implementation documents listed below are historical records. They do not define the active recommendation policy. Their original data/code is preserved in `archive/model-recommendation-2026-10-29`.

---

# 문서 구분

현재 제품 기준은 위 Provider 정책과 제품 UI 후속 검증 문서입니다. 아래 과거 문서의 당시 수량·정책·검증 결과를 현재 성과로 해석하지 않습니다.

## 이전 핵심 앱 구현 기록

- [핵심 앱 구조·추천·실수집·검증·남은 실행](core-implementation.md)
- [설문 4단계와 코딩·홍보 글의 실제 프롬프트 전문](generated-prompt-examples.md)
- [현재 코드로 계산한 추천 예시 전체](recommendation-examples.json)
- [핵심 재구성 작업 계획과 검증 기록](superpowers/plans/2026-10-28-core-rebuild.md)
- [프로젝트 README와 실행 명령](../README.md)

## 보존한 연구와 이전 구현 기록

모델·평가·접근·출처 자료와 당시 비교·수집·검증 코드는 역사 자료로 보존합니다. 현재 회사 추천 경로에서 과거 모델 점수나 수집기를 사용하지 않습니다.

- [모델 카탈로그와 당시 평가 목록](model-catalog-snapshot.md), [모델 이용 경로 조사](model-access-review.md)
- [AA 인증·권한 조사와 전용 도구](aa-data-integration.md)
- [이전 근거 기반 순위 기록](evidence-ranking-report.md), [이전 웹 채팅 프롬프트 수정 기록](web-chat-prompt-usability.md)
- [이전 카드 수정 기록](request-card-repair-report.md), [이전 모델 확장 방법론](model-recommendation-methodology.md)
- [이전 최종 가이드 구현 기록](final-ai-guide-application.md), [취소된 프롬프트 전용 방향](prompt-workspace-application.md)
- [이전 화면·README 보존본](../archive/2026-10-core-rebuild/README.md), [더 오래된 앱 보존본](../archive/README.md)
- `chatkhu-design-application.md`, `chatkhu-contrast-check.json`, `workflow-direction-application.md`, `recommendation-methodology.md`, `recommendation-implementation-report.md`, `benchmark-data-audit.md`, `arena-public-votes-methodology.md`: 당시 기획·조사·구현·평가 기록
- `AI_may_I_개발자료_조사비교_20261028.docx`, `AI_may_I_정보구조_UIUX_Codex설계명세.docx`: 사용자 제공 원본 보존

ChatKHU는 과거 기획·조사 도구, Codex는 현재 구현·검증 도구로 기록합니다. 제품에 ChatKHU 호출이나 자동 AI 실행을 구현한 것은 아닙니다. Super Agent 비교 실험이나 통계 오류 감소 효과 검증은 수행하지 않았습니다.
