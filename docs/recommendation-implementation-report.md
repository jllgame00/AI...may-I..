# 추천 엔진 구현 보고서

확인일: 2026-10-21. 작업 시작 시 git 작업 트리는 깨끗했고 저장소·상위 경로의 별도 AGENTS.md는 발견되지 않았다. 기존 프로젝트에서 작업했으며 commit·push·배포는 수행하지 않았다.

## 1. 구현 내용과 변경 파일

사용자 요청 → 수정 가능한 작업·필수 기능 → 예산/기능 필터 → 단계별 평가 → 근거·제외 이유 → 선택한 플랜/모드/단계의 맞춤 프롬프트를 연결했다.

| 파일 | 변경 |
|---|---|
| `src/types.ts` | 모델, 평가 관측값·비교 집합, 플랜, 모델 연결, 출처, 조건부 결과 타입 분리 |
| `src/data/services.ts` | 고정 예시 점수 제거, 기존 서비스 표시 정보·요청 예시 유지 |
| `src/data/recommendationPolicy.ts` | 정책 버전, 60/25/15 비중, 작업별 평가 가중치 |
| `src/data/recommendationSnapshot.ts` | 공식 플랜 사실 6개와 출처·확인일, 평가 자료 확보 상태 |
| `src/lib/recommend.ts` | 순수 필터·정규화·점수 보류·복합 작업·선택 변경 함수 |
| `src/lib/prompts.ts` | 실제 선택한 플랜·모드·단계·한도·미확인 항목 반영 |
| `src/App.tsx` | 단계 선택과 카드/서비스 탭/플랜 선택 상태 공유, 재분석 초기화 |
| `src/components/RequestInterpretation.tsx`, `RequestForm.tsx` | 작업 선택·순서 변경, PDF/검색 필수 조건 편집 |
| `src/components/RecommendationEvidence.tsx`, `RecommendationDashboard.tsx` | 조건부 카드, 계산 내역, 평가/공식 출처·확인일·한계, 제외 이유 |
| `src/components/WorkflowBuilder.tsx`, `PromptPanel.tsx` | 단계별 서비스·플랜·모드 선택과 일관된 프롬프트/사용법, 빈 결과 처리 |
| `src/components/ui.tsx`, `Shell.tsx`, `src/styles.css` | 예시 데이터 안내 교체, 기존 네이비·보라 카드 스타일에 근거 UI 추가 |
| `src/lib/evidence.test.ts`, `recommend.test.ts`, `fixtures/recommendation.ts` | 정책 회귀 테스트, 기존 흐름 테스트, 테스트 전용 수치 |
| `tests/render.test.mjs`, `package.json` | 빈 결과·근거 보류·선택 일관성의 서버 렌더링 테스트와 통합 실행 |
| `README.md`, `docs/recommendation-methodology.md` | 현재 상태, 정책·계산·갱신 방법·이용 조건·남은 한계 |

기존 요청 예시, 이미지 텍스트 기획, 단계별 AI 변경, 서비스 탭, 프롬프트 복사/실패 안내, 재분석, 브랜드와 화면 스타일을 유지했다. 새로운 의존성은 추가하지 않았다. `vite.config.ts`의 `/AI...may-I../`, `.github/workflows/deploy.yml`, `package-lock.json`은 변경하지 않았다.

## 2. 실제 확보한 평가·플랜 데이터

수치는 검색 요약이나 기억에서 채우지 않았다. 공식 페이지를 직접 열어 확인한 사실만 요약했다. 이 자료는 지역·계정에 따른 실제 결제 화면을 대체하지 않는다.

| 서비스·플랜 | 가격 | 필수 기능 확인 상태 | 확인한 제한/출처 |
|---|---|---|---|
| ChatGPT Free | 무료 | PDF·웹 검색 지원 | 파일/데이터 분석 제한. [플랜](https://chatgpt.com/pricing/), [파일 안내](https://help.openai.com/en/articles/8555545-uploading-files-and-audio-to-chatgpt) |
| ChatGPT Plus | 유료, 금액·통화 null | PDF·웹 검색 지원 | 확장된 첨부·사용량. 조회한 가격 본문에는 금액 미노출. 같은 공식 출처 |
| Gemini Free | USD 0/월, 미국 안내 | Deep Research 검색 지원, PDF 미확인 | 표준 한도·32k 문맥·고수요 제한. [구독](https://gemini.google/subscriptions/), [한도](https://support.google.com/gemini/answer/16275805?hl=en) |
| Gemini Google AI Pro | USD 19.99/월, 미국 안내 | Deep Research 검색 지원, PDF 미확인 | 무료 대비 4배 사용량·1백만 토큰 문맥. 같은 공식 출처 |
| Claude Free | 무료 | 웹 검색 지원, 플랜별 PDF 미확인 | 메시지 수 미확인. [플랜](https://claude.com/pricing), [파일 안내](https://support.claude.com/en/articles/8241126-upload-files-to-claude) |
| Claude Pro | USD 20/월, 미국·월 결제 | 웹 검색 지원, 플랜별 PDF 미확인 | 사용량 확대·5시간 세션·주간 한도. [Pro 안내](https://support.claude.com/en/articles/8325606-what-is-the-pro-plan) |

AA 방법론/API 문서·이용 안내·약관, Arena-Rank/Creative Writing/약관, SWE-bench Verified/공식 실험 저장소를 확인했다. **공개 제품에 수록한 벤치마크 원점수는 0건, 정확한 평가 모델은 0건이다.**

- AA: 인증된 데이터와 제품 이용 권한 미확보. [Data Platform 약관](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf)의 공개 원자료와 모델 선택 가이드 관련 조건 때문에 API 키나 구독만으로 공개 제품 사용이 허용된다고 가정하지 않았다.
- Arena: [약관](https://help.arena.ai/articles/5629909088-terms-of-use)의 추출·재사용 제한 확인 후 수치·모델 목록을 제품에 수록하지 않았다. 방법론 코드의 Apache 라이선스를 데이터 라이선스로 간주하지 않았다.
- SWE-bench: [Verified 방법론](https://www.swebench.com/verified.html)의 500개 문제와 에이전트 버전별 차이 확인. [실험 저장소](https://github.com/SWE-bench/experiments)의 결과 재배포 라이선스와 정확한 플랜 연결은 미확인이다.
- 접근 실패: Gemini PDF 도움말은 두 번의 조회에서 timeout. Claude 무료 플랜 도움말의 시도한 URL은 접근 불가. 해당 근거를 지원 확인으로 바꾸지 않았다.

API 가격 데이터는 번들에 없으며 월 구독료와 섞지 않는다. 현재 models/observations/cohorts는 빈 배열이다. 공식 마케팅 모델군만으로 정확한 ID·버전·추론 모드를 채우지 않았고 여섯 플랜의 연결은 unknown이다.

## 3. 점수 추천과 조건부 후보

총점까지 추천 가능한 후보: **없음**. 정규화·가중치 계산 경로는 허구 값이 분리된 테스트 fixture로 검증했지만, 실제 UI에 그 수치를 노출하지 않는다.

- 무료만: Free 3개만 후보. 유료 3개는 제외 이유에서 확인 가능.
- PDF 필수: ChatGPT의 무료/Plus는 기능 근거가 있으나 모델·평가 연결 미확인으로 조건부. Gemini/Claude는 PDF 권한도 미확인으로 별도 표시.
- 웹 검색 필수: 확인한 검색 경로/한도를 표시하고 모델·평가 근거 부족으로 조건부.
- 무료 우선/유료 가능: 6개 플랜 비교. 우선순위를 바꾸어도 고정 60/25/15 정책을 임의 변경하지 않음.
- 애매한 요청: 작업을 임의로 글쓰기로 확정하지 않고 편집 안내. 후보가 없으면 조건 수정과 텍스트 붙여 넣기/직접 제공 출처 등의 대안 안내.
- 한국어 품질·실제 작업 성공률·객관적 절대 성능은 검증했다고 표현하지 않음.

## 4. 검증 결과

| 검사 | 결과 |
|---|---|
| 변경 전 기존 테스트 | 11/11 통과 |
| 테스트 우선 구현 | 새 핵심 테스트 최초 23개 중 21개 실패 확인 후 구현. 이후 리뷰 회귀 4개도 실패를 확인하고 수정 |
| 최종 `npm test` | 44/44 통과: 엔진 29 + 기존 MVP 회귀 11 + 서버 렌더링 4 |
| `npm run typecheck` | 통과 |
| `npm run build` | 실패: Vite 설정 로딩 → esbuild 자식 프로세스 `spawn EPERM`. 타입 오류가 아니라 실행 환경의 프로세스 시작 제한 지점에서 중단 |
| `npm run dev -- --port 5173` | 동일 `spawn EPERM`으로 실패 |
| PC·모바일 브라우저 | 미수행. 브라우저 도구 inventory의 apps/browsers가 모두 빈 배열이고 새 앱 서버도 시작하지 못함 |
| 코드 리뷰 | 독립 읽기 전용 리뷰 수행. 비교 집합 혼합, SWE 에이전트 버전 누락, 영어 or 오탐, 불완전 기능 출처 문제를 회귀 테스트로 수정 |
| `git diff --check` | 통과. Windows 줄바꿈 변환 경고만 표시 |
| 배포 설정·lockfile 비교 | 변경 없음 |

서버 렌더링 테스트는 실제 React 컴포넌트로 빈 화면·조건부 정보·선택 반영을 검사한다. 브라우저 클릭, 클립보드 권한, 키보드 이동, 모바일 레이아웃 검증을 대신하지 않는다. 기존 dist를 새 구현 빌드로 취급하지 않았다. 환경 설정 변경이나 실행 제한 우회는 하지 않았다.

## 5. 남은 데이터와 사용자 조치

1. AA/Arena 등에서 이 공개 추천 제품에 허용되는 데이터 이용 권한을 확보한다. SWE 결과도 데이터 라이선스 범위를 확인한다. 허가 없이 수치부터 추가하지 않는다.
2. 정확한 모델 ID·버전·추론 모드, 공식 플랜 접근 근거와 비교 가능한 평가 실행 기록을 확보한다. 데이터가 준비되면 방법론의 수동 갱신 절차를 따른다.
3. 한국 현지 가격, ChatGPT Plus 월 금액, Gemini/Claude의 플랜별 PDF 권한 및 필요한 이용 한도를 재확인한다.
4. 프로세스 실행이 허용된 정상 개발 환경에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run dev`를 실행한다. PC 1440×900과 모바일 390×844/320×740에서 아래 흐름을 확인한다.
   - 기본 복합 요청 → 무료만/PDF/검색 조건 → 각 단계별 카드·근거·제외 이유.
   - 작업 순서와 요구 기능 수정 → 재분석 → 이전 배정 초기화.
   - 단계별 다른 플랜 선택 → 서비스 탭/플랜 변경 → 카드·프롬프트·사용법 일치.
   - 프롬프트 복사 성공/실패, 키보드 접근, 긴 근거 링크·한국어·모델명의 가로 넘침.
   - 애매한 요청의 안내와 점수 보류 화면.

이번 작업에서는 commit·push·배포를 수행하지 않는다.

## 6. 추천 커밋 메시지

`feat: add evidence-based recommendation engine with official plan snapshots`
