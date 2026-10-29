# 과거 구현·연구 보존 자료

현재 제품은 [루트 README](../README.md)의 작업 분석·공식 기능/이용 조건 기반 회사 추천·사용 안내·맞춤 프롬프트입니다. 아래 자료는 현재 앱, TypeScript 검사, 기본 Node/Playwright 테스트나 npm 운영 명령에서 실행하지 않습니다.

| 위치 | 보존 내용 |
| --- | --- |
| `model-recommendation-2026-10-29/` | 모델 중심 추천에서 전환하기 전 106개 파일과 미커밋 patch·해시. 경로·바이트를 유지하며 기본 테스트에서 계속 전수 검사 |
| `legacy-app/` | 더 이전 서비스/모델 비교 앱과 당시 데이터·테스트. 실행 불완전 상태를 포함한 역사 스냅샷 |
| `2026-10-core-rebuild/`, `prompt-only/` | 전환 과정의 서로 다른 구현·문서·브라우저 확인 기록 |
| [research-2026-10-29](research-2026-10-29/README.md) | 과거 문서·JSON·모델/벤치마크 조사, Arena 도구, 이전 보고서/브라우저 보조 도구 |
| [offline-evaluation-2026-10-29](offline-evaluation-2026-10-29/README.md) | 중단한 평가 스키마·과제·루브릭·합성 입력·채점/익명 리뷰·게이트·당시 테스트 |

이동한 80개 파일은 [해시 목록](production-cleanup-preservation.json)과 기본 테스트로 원본 바이트를 대조합니다. [전체 분류·이동 목록](../docs/production-cleanup-manifest.json)에서 원래 경로를 찾을 수 있습니다. 코드의 상대 import와 문서 링크는 당시 트리 기준으로 보존했으므로 독립 실행 가능한 새 프로젝트가 아닙니다. 재실행·데이터 수집·평가 플랫폼 복구를 안내하지 않습니다.

`public/data/arena-public-votes.json`의 배포 중복본은 제거했고, 같은 해시의 원본은 `legacy-app/public/data/arena-public-votes.json`에 유지합니다. 과거 모델 점수·가중치·합성 출력은 현재 회사 추천에 반입하지 않습니다.

사용자가 제공한 실제 응답은 별도 [SURVEY-01 원본 폴더](../evaluations/results/SURVEY-01/README.md)에 그대로 보존합니다. 프롬프트 개선 검토 사례이며 회사별 성능 순위 자료로 사용하지 않습니다. 기존 Git 이력·미커밋 작업·모델 전환 보존본을 초기화하지 않았습니다.
