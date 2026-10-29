# 중단한 오프라인 평가 체계 보존

이 폴더는 제품에서 사용하지 않는 평가 코드·과제·합성 자료·테스트의 **변경 없는 역사 기록**입니다. 기존 `survey-v1`(도서관 6문항), XLSX/PDF 과제, 루브릭·배점·fixture 해시·빈 registry를 수정하지 않았습니다. 새 SURVEY-01 루브릭이나 점수를 만들지 않습니다.

원래 경로 구조를 `src/`, `scripts/`, `tests/`, `evaluations/`, `tsconfig.evaluation.json` 아래에 보존했습니다. 파일별 원본 SHA-256은 [보존 목록](../production-cleanup-preservation.json)에 있습니다. 현재 npm 명령·앱 import·타입 검사·기본 테스트에서는 제외합니다.

현재 제품에서 쓰는 카탈로그 검증 네 가지는 `src/lib/providerValidation.test.ts`에, 제품 import 격리 검사는 `tests/provider-isolation.test.mjs`에 유지했습니다. 나머지 평가 전용 테스트는 대상 코드와 함께 보존했습니다.

이전 코드는 당시 활성 카탈로그·타입·추천 모듈과 작업 디렉터리에 의존합니다. 이 폴더만으로 독립 실행이 된다고 보장하지 않으며, 현재 제품에서 누락된 import를 채우거나 평가 기능을 복구할 필요가 없습니다. 합성 입력/단위 테스트 출력은 실제 서비스 성능 근거가 아닙니다.

실제 사용자 응답 8건은 [원래 위치](../../evaluations/results/SURVEY-01/README.md)에 보존합니다. 현재 제품·실행 방법은 [루트 README](../../README.md)를 따릅니다.
