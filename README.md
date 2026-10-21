AI...may I..?
어떤 AI를 쓸지부터, 어떻게 쓸지까지.

**AI...may I..?**는 사용자의 작업과 예산에 맞는 AI 서비스를 비교하고, 선택한 서비스에 맞춘 프롬프트와 사용 방법을 안내하는 웹 서비스입니다.

## 공식 정보 기반 추천 엔진 (2026-10-21)

기존 MVP의 고정 예시 점수를 필수 조건 필터와 근거 기반 순수 함수로 교체했습니다. 요청의 작업·순서·필수 기능을 수정하고, 단계별 서비스·플랜을 선택하면 카드·프롬프트·사용법에 함께 반영됩니다.

- 정책: 작업 평가 60% + 필요한 기능 25% + 비용 적합성 15%. 예산·미지원 기능을 먼저 필터링합니다.
- 데이터: ChatGPT Free/Plus, Gemini Free/Google AI Pro, Claude Free/Pro의 공식 안내 스냅샷. 실시간 조회가 아닙니다.
- 현재 벤치마크 관측값과 정확한 평가 모델 연결은 **0건**입니다. 공개 재사용 권한·모델/플랜 연결을 추정하지 않으므로 **총점 추천은 없고 기능 중심 조건부 후보만 제공합니다**.
- 예시 수치는 테스트 fixture에만 존재합니다. API 키, 외부 AI 호출, 로그인, 결제, 자동 갱신은 없습니다.
- Vite `base`와 GitHub Pages 워크플로를 보존했습니다. 이번 작업에서 commit·push·배포는 수행하지 않았습니다.

[정책·계산법·데이터 갱신 절차](docs/recommendation-methodology.md) · [변경 파일·확보 데이터·검증 결과](docs/recommendation-implementation-report.md)

현재 테스트·타입 체크 결과와 빌드/브라우저 제한은 위 구현 보고서가 기준입니다. 아래 2026-10-10 기록은 이전 작업의 이력이며 현재 검증 결과가 아닙니다.

- 팀: Ai...Khu (에이...아이쿠!)
- 참가 예정 대회: 2026 KHU AI Challenge — AI 활용 경진대회
- 현재 단계: 인터랙티브 프론트엔드 MVP
  기획 배경
  생성형 AI 서비스가 다양해지면서 사용자는 자신의 작업에 어떤 AI가 적합한지 판단하기 어려워지고 있습니다. AI 초보자는 서비스별 기능과 무료·유료 차이를 비교하기 어렵고, 서비스를 선택한 뒤에도 원하는 결과를 얻기 위해 무엇을 입력해야 하는지 고민하게 됩니다.
  AI...may I..?는 AI 선택, 비용 판단, 프롬프트 작성, 사용법 안내를 하나의 흐름으로 연결하여 이러한 부담을 줄이고자 합니다.
  서비스 방향
  사용자가 AI의 선택 이유를 이해하고 직접 결정하도록 돕습니다.
- 모델 성능뿐 아니라 서비스의 기능, 이용 제한, 비용을 함께 비교합니다.
- 무료로 시작할 수 있는 범위와 유료 기능이 필요한 조건을 설명합니다.
- 추천 이유를 제시하고 사용자가 다른 AI를 선택할 수 있도록 합니다.
- 복합 작업을 단계별로 나누어 AI 활용 계획을 제안합니다.
- 선택한 서비스에 맞춘 프롬프트와 사용 방법을 제공합니다.
  ChatKHU 계정이나 이용 자격을 전제로 하지 않는 일반 사용자 대상 서비스를 지향합니다. 현재 MVP에는 ChatKHU 연동이나 외부 모델 자동 실행 기능이 없습니다.
  공식 기능·요금 스냅샷과 평가 정책을 분리하고 추천 근거·출처·확인일을 제공합니다. 미확인 정보는 null/unknown으로 유지하며 평가·모델 연결 근거가 부족하면 총점을 보류합니다.
  주요 기능
  기능 동작
  자연어 작업 입력 하고 싶은 작업을 자유롭게 입력
  예산·우선순위 선택 비용 조건과 중요하게 생각하는 기준 설정
  분석 진행 연출 작업 파악부터 활용법 생성까지 5단계 진행 표시
  AI 서비스 비교 ChatGPT·Gemini·Claude 추천 카드와 이유 확인
  작업 분해 복합 작업의 단계별 AI 활용 계획 확인
  단계별 AI 변경 사용자가 각 단계의 AI를 직접 선택
  맞춤 프롬프트 서비스별 탭에서 프롬프트 확인 및 복사
  사용법 안내 선택한 서비스에서 프롬프트를 활용하는 방법 확인
  재분석 입력과 조건을 변경하여 추천 다시 확인

네이비·보라 계열 대시보드를 사용하며, 모바일 레이아웃, 키보드 포커스, 모션 감소 설정을 고려하여 구현했습니다. 실제 화면 검증은 별도로 필요합니다.
사용자 흐름

1. 원하는 작업을 입력합니다.
2. 예산과 우선순위를 선택합니다.
3. 분석 진행 화면을 거쳐 추천 결과를 확인합니다.
4. AI 서비스의 추천 이유와 무료·유료 활용 조건을 비교합니다.
5. 복합 작업의 단계별 AI를 확인하고 필요하면 변경합니다.
6. 서비스별 프롬프트를 복사하고 사용법을 확인합니다.
   시연 예시
   입력:
   연구 자료를 분석하고 발표 대본을 작성해 줘. 과제라 비용은 가능한 쓰고 싶지 않아.

시연 포인트:

- 예산 조건이 추천 결과에 어떻게 반영되는지 확인합니다.
- 자료 분석과 대본 작성이 분리되는지 확인합니다.
- 단계별 AI를 직접 변경합니다.
- 서비스 탭을 전환하여 프롬프트를 비교하고 복사합니다.
- 조건을 바꾸어 재분석합니다.
  추천은 확인한 공식 정보 스냅샷과 로컬 순수 함수를 사용합니다. 분석 진행 화면은 외부 AI의 실제 처리 상태가 아닌 시연용 연출입니다.
  기술 스택
  구분 기술
  UI React
  개발 서버·빌드 Vite
  언어 TypeScript
  스타일 Tailwind CSS
  현재 실행 범위 프론트엔드·로컬 추천 로직

현재 MVP는 별도 백엔드나 AI API 키 없이 실행하도록 구성되었습니다.
## 실행 방법

요구 환경

- Node.js 22.18 이상
- npm
- 최초 의존성 설치가 가능한 네트워크 환경

현재 저장소에는 `package-lock.json`이 있으므로 `npm ci`를 사용합니다. lockfile을 함께 커밋해 동일한 의존성을 설치하세요. lockfile이 없는 새 사본에서는 정상 네트워크 환경에서 `npm install`로 생성한 뒤 포함해야 합니다. 가짜 lockfile을 작성하거나 의존성 버전 변경, `audit fix --force`를 실행할 필요는 없습니다.

현재 Codex 셸은 네트워크가 의도적으로 제한되어 있습니다. Windows 시작 메뉴 등에서 **별도로 연 일반 PowerShell**에서 다음 명령을 실행하세요. Codex 셸에서 다시 PowerShell을 실행하면 제한 환경변수를 상속할 수 있습니다. 각 명령이 성공한 경우에만 다음 명령으로 진행하세요.

```powershell
Set-Location -LiteralPath 'D:\univ\3-1\contest\2026_KHU_AI_Challenge'
npm.cmd ci --cache .npm-cache
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

이 명령은 사용자·전역 npm 설정이나 조직의 프록시 설정을 변경하지 않습니다. 일반 PowerShell에서의 설치 성공 여부는 아직 확인하지 못했습니다. 그 환경에서도 실패하면 프록시를 임의로 해제하지 말고 실제 오류와 승인된 네트워크 설정을 확인하세요.

개발 서버가 출력하는 `Local` 주소를 브라우저에서 엽니다. 기본 주소는 http://127.0.0.1:5173/AI...may-I../ 이며 포트 사용 중이면 출력 주소가 달라집니다.

프로덕션 빌드가 성공한 후에는 `npm.cmd run preview`로 결과물을 확인할 수 있습니다.

  주요 파일
  경로 역할
  src/App.tsx 화면 구성과 사용자 흐름
  src/components/ 화면별 UI 컴포넌트
  src/data/services.ts 서비스 표시 정보와 요청 예시
  src/data/recommendationSnapshot.ts 공식 플랜·기능·출처 스냅샷
  src/data/recommendationPolicy.ts 작업별 평가 선정과 정책 가중치
  src/lib/recommend.ts 추천 로직
  src/lib/prompts.ts 맞춤 프롬프트 생성 로직
  src/lib/recommend.test.ts 기존 MVP 회귀 테스트
  src/lib/evidence.test.ts 조건 필터·비교 가능성·누락·선택 일관성 테스트
  tests/render.test.mjs 빈 결과·점수 보류·선택 상태의 서버 렌더링 테스트
  src/types.ts 공통 타입
  src/main.tsx 앱 진입점
  src/styles.css 공통 스타일
  index.html HTML 진입점과 페이지 메타데이터
  package.json 의존성과 실행 스크립트

MVP 범위와 제한
현재 구현은 AI 선택과 활용 안내 흐름을 보여주는 프로토타입입니다.

- 공식 페이지에서 직접 확인한 최소 플랜 사실만 사용합니다. 한국 현지 요금·미확인 기능·모델 연결을 추정하지 않습니다.
- 외부 AI API를 호출하지 않습니다.
- 로그인·결제·유료 구독 기능이 없습니다.
- 파일을 AI에 전달하거나 작업을 자동 실행하지 않습니다.
- 단계별 AI 변경은 활용 계획을 바꾸는 기능이며 실제 모델 전환 실행이 아닙니다.
- 스냅샷 이후 변경될 수 있으므로 실제 이용 전에 각 서비스에서 무료 범위·한도·현지 요금을 확인하세요.
## 이전 검증 상태 (기록 보존)

아래는 2026-10-10 당시 진단 기록입니다. 당시의 예시 데이터·브랜드 변경·배포 준비 기록을 보존하며, 현재 상태는 상단의 추천 엔진 구현 보고서를 참고하세요.

2026-10-10 개발 환경 재진단 결과입니다. Node.js 24.13.0 / npm 11.20.0은 프로젝트의 Node.js 22.18+ 요구 조건을 충족합니다. 저장소와 상위 디렉터리에서 별도의 `AGENTS.md`는 발견되지 않았고, 작업 시작 시 Git 작업 트리는 깨끗했습니다. 기존 `package.json`과 소스·브랜드·예시 데이터는 변경하지 않았습니다. lockfile과 `node_modules`는 여전히 없습니다.

| 항목 | 결과 |
| --- | --- |
| 추천 로직 테스트 | 이번 작업에서 `npm test`를 다시 실행해 11개 모두 통과 |
| 의존성 설치 | 미완료: 아래 진단으로 의도적인 네트워크 제한 확인. 이전 온라인·오프라인 설치 실패 명령은 반복하지 않음 |
| 타입 체크 | 이번 작업에서 `npm run typecheck` 실행, 종료 코드 1: `tsc` 없음 |
| 프로덕션 빌드 | 이번 작업에서 `npm run build` 실행, 종료 코드 1: `tsc` 없음 |
| 개발 서버 | 이번 작업에서 `npm run dev` 실행, 종료 코드 1: `vite` 없음 |
| 브라우저 동작·PC·모바일 화면 검증 | 미수행: Browser 연결 재확인 결과 `No browser is available`, 개발 서버도 시작하지 못함 |
| 배포 | 미진행 |

### 설치 실패의 출처

- 프로젝트 `.npmrc`, 사용자 npm 설정 파일, 전역 npm 설정 파일: 없음. npm 내장 설정 파일에서도 해당 프록시·오프라인 설정은 발견되지 않았습니다.
- npm의 유효 `proxy`·`https-proxy` 설정: 미설정. 레지스트리는 `https://registry.npmjs.org/`입니다.
- **현재 프로세스 환경변수**: `HTTP_PROXY`·`HTTPS_PROXY`·`ALL_PROXY`가 `http://127.0.0.1:9`, `NPM_CONFIG_OFFLINE=true`, `CODEX_SANDBOX_NETWORK_DISABLED=1`입니다.
- Windows 사용자·시스템에 영구 저장된 환경변수에서는 위 프록시·오프라인 설정이 발견되지 않았습니다. 프로젝트 npm 캐시는 비어 있습니다.

이 증거와 현재 세션의 네트워크 제한 정책을 종합하면, 이전 `ECONNREFUSED`·`ENOTCACHED`는 사용자 npm 설정 오류가 아니라 **Codex 실행 환경의 의도적인 제한**에 따른 결과입니다. [OpenAI Windows sandbox 문서](https://learn.chatgpt.com/docs/windows/windows-sandbox)도 샌드박스가 프로세스와 자식 프로세스의 네트워크 권한을 제한하며, 일부 세션은 의도적으로 외부 네트워크를 사용할 수 없다고 설명합니다. 제한 환경변수 삭제, 조직 프록시 우회, 전역 설정 변경은 하지 않았습니다. 인증 정보는 출력하거나 파일에 저장하지 않았습니다.

### 수동 화면 확인 항목 (아직 미수행)

일반 PowerShell에서 설치·타입 체크·테스트·빌드가 모두 성공하고 개발 서버를 실행한 뒤 확인하세요.

1. PC와 모바일 크기(예: 1440×900, 390×844, 320×740)에서 자연어 요청을 입력하고 예산·우선순위를 선택한 뒤 분석합니다. 추천 화면의 요청·조건·점수와 무료·유료 안내에 선택 내용이 반영되는지 확인합니다.
2. 작업 설계에서 단계별 AI를 변경하고 맞춤 프롬프트로 이동합니다. ChatGPT·Gemini·Claude 탭마다 해당 서비스 프롬프트가 표시되고, 변경한 단계별 AI가 본문에 반영되는지 확인합니다.
3. 프롬프트를 복사해 메모장 등에 붙여 넣고 현재 본문과 일치하는지 확인합니다. 쓰기 권한이 거부되어도 대체 복사가 성공할 수 있습니다. 대체 복사까지 실패할 때는 실패·직접 복사 안내가 표시되고 성공 안내가 나타나지 않는지 확인합니다.
4. 재분석에서 요청·예산·우선순위를 바꿉니다. 새 추천과 작업 설계가 생성되고 이전의 직접 변경한 AI 배정이 남지 않으며, 프롬프트 탭도 새 최상위 추천 서비스로 초기화되는지 확인합니다.
5. 모바일에서 가로 넘침·브랜드명 잘림이 없고, 예산·우선순위 선택과 분석·AI 변경·탭·복사·재분석 버튼에 접근할 수 있는지 확인합니다. 추천·점수·플랜의 MVP 예시 데이터 표시가 유지되는지도 확인합니다.

서비스명·브라우저 제목·페이지 설명·사용 가이드·추천 화면을 `AI...may I..?`로 변경했고 메인 화면에 슬로건, 푸터에 팀명 `Ai...Khu`를 반영했습니다. 내부 패키지 이름 `prompt-mate`는 유지했습니다. 기존 추천·점수·플랜의 MVP 예시 데이터 표시도 유지했습니다.
다음 개발 단계

1. 의존성 설치와 빌드·타입 체크 완료
2. PC·모바일에서 전체 사용자 흐름 검증
3. 공식 서비스 정보 및 외부 평가 자료를 정리한 데이터 구조 마련
4. 추천 기준·출처·확인일을 보여주는 UI 구현
5. 요구사항 분석과 프롬프트 생성의 실제 AI 연동 검토
   AI 연동 이후에도 사용자에게 추천 근거와 선택권을 제공하는 서비스 방향을 유지합니다.

## GitHub Pages 배포

배포 대상은 `origin`의 `https://github.com/jllgame00/AI...may-I...git`에서 확인한 `jllgame00/AI...may-I..`입니다. URL의 `.git` 접미사를 제외하면 저장소 이름 끝의 점은 두 개입니다. 현재 브랜치와 로컬에 기록된 원격 기본 브랜치(`origin/HEAD`)는 모두 `main`입니다. 원격 최신 기본 브랜치 조회(`git ls-remote --symref origin HEAD`)는 Codex의 기존 프록시 연결 제한으로 실패했으므로 최신 원격 상태까지 확인한 것은 아닙니다.

- 예상 주소: https://jllgame00.github.io/AI...may-I../
- Vite `base`: `/AI...may-I../`. 일반 프로젝트 Pages의 저장소 하위 경로이며, `소유자.github.io` 저장소라면 `/`를 사용합니다. 저장소 이름이나 배포 대상이 바뀌면 이 설정과 아래 주소도 함께 수정하세요.
- favicon은 `%BASE_URL%favicon.svg`로 참조하고, 앱 진입점의 `/src/main.tsx`는 Vite가 빌드 시 `base` 아래의 번들 경로로 변환합니다. 현재 소스에는 다른 루트 절대 경로의 정적 자산 참조가 없습니다. 향후 자산은 import하거나 `import.meta.env.BASE_URL`을 사용하세요.
- 화면 전환은 React 상태로 처리하며 클라이언트 URL 라우터는 없습니다. 저장소 기본 주소에서 새로고침하며, 새 라우터나 `404.html` 리디렉션은 추가하지 않았습니다.
- `.gitignore`에 기존의 `dist/`, `node_modules/`, `.npm-cache/` 제외 설정이 있고 현재 Git 추적 파일에도 포함되지 않습니다. `package-lock.json`은 기존 파일을 보존했습니다.

### GitHub 설정 및 배포 확인

1. [저장소 Pages 설정](https://github.com/jllgame00/AI...may-I../settings/pages)에서 **Settings → Pages → Build and deployment → Source: GitHub Actions**를 선택합니다. GitHub가 제안하는 별도 워크플로를 생성할 필요는 없습니다.
2. 사용자가 준비된 변경 사항과 `package-lock.json`을 커밋하고 `main`에 푸시하면 `.github/workflows/deploy.yml`이 실행됩니다. 이 설정 작업에서는 커밋·푸시·실제 배포를 수행하지 않았습니다.
3. [Actions 탭](https://github.com/jllgame00/AI...may-I../actions)에서 **Deploy to GitHub Pages**의 `build`와 `deploy`가 모두 성공했는지 확인합니다. 수동 실행은 **Run workflow → Branch: main**을 선택합니다. 다른 브랜치에서 수동 실행하면 배포 작업을 건너뜁니다.
4. 실행 결과의 `github-pages` 환경 링크 또는 **Settings → Pages → Visit site**를 열고 예상 주소와 일치하는지 확인합니다. favicon·JS·CSS에 404가 없는지, 새로고침 후에도 앱이 열리는지 확인하세요.

워크플로는 프로젝트의 Node.js `>=22.18.0` 요구 조건을 충족하는 Node.js 24를 사용하며, `npm ci → npm run typecheck → npm test → npm run build → dist 업로드 → Pages 배포` 순서로 실행합니다. 빌드 작업에는 `contents: read`, 배포 작업에만 `pages: write`와 `id-token: write`를 부여합니다. `deploy`는 `needs: build`로 연결되어 설치·검증·빌드·업로드 중 하나라도 실패하면 실행되지 않습니다. 공식 Pages Actions와 `github-pages` 환경을 사용하며 별도 토큰이나 AI API 키는 필요하지 않습니다. 구성 근거는 [GitHub 공식 워크플로 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)와 [Vite 공식 Pages 안내](https://vite.dev/guide/static-deploy.html#github-pages)입니다.

### 로컬 배포용 빌드 확인

정상 실행 환경의 PowerShell에서 각 명령이 성공한 뒤 다음 명령을 실행하세요. Codex의 네트워크·프록시 제한 설정은 변경하지 마세요.

```powershell
npm.cmd ci --cache .npm-cache
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

http://127.0.0.1:4173/AI...may-I../ 를 열고 새로고침합니다. 개발자 도구의 Network에서 JS·CSS·favicon이 `/AI...may-I../` 아래에서 정상 로드되는지 확인하고, 입력 → 조건 확인 → 추천 → 작업 설계 → 프롬프트 흐름과 스냅샷·미확인 표시를 확인하세요. 포트를 변경하면 URL도 같은 포트로 수정하세요.

### 이번 배포 준비 검증 (2026-10-10)

| 항목 | 결과 |
| --- | --- |
| 실행 환경 | Node.js 24.13.0 / npm 11.20.0, 기존 lockfile 및 설치된 의존성 확인 |
| 타입 체크 | 변경 후 `npm run typecheck` 통과 |
| 기존 테스트 | 변경 후 `npm test` 11개 모두 통과 |
| 프로덕션 빌드 | `npm run build` 실패: Vite 설정 로딩 중 `spawn EPERM`. 기본 제공 `--configLoader native`로도 빌드 중 프로세스 생성 제한으로 실패 |
| 기본 preview | `npm run preview -- --port 4173 --strictPort` 실패: 설정 로딩 중 `spawn EPERM` |
| 제한된 preview 확인 | `npm run preview -- --configLoader native --port 4173 --strictPort`로 서버 시작, `/AI...may-I../`와 `/AI...may-I../favicon.svg`의 HTTP 200 확인 후 서버 종료. 기존 `dist`를 제공한 결과이며 새 배포용 빌드 검증은 아님 |
| 새 빌드의 자산·브라우저·새로고침 검증 | 미완료: 새 빌드를 생성하지 못함. 기존 `dist/index.html`에는 이전 루트 경로(`/assets/`, `/favicon.svg`)가 남아 있어 성공한 배포 결과로 간주하지 않음 |
| 깨끗한 의존성 재설치 (`npm ci`) | 미수행: 기존 설치를 보존하고 네트워크 제한을 우회하지 않음. GitHub Actions 및 정상 네트워크 환경에서 확인 필요 |
| Git 추적·변경 검사 | 제외 디렉터리의 미추적 상태 및 `git diff --check` 확인. 소스 로직·의존성·예시 데이터 변경 없음 |
| GitHub Actions 실행·실제 Pages 배포 | 미수행 |

위 표는 이전 배포 준비 이력입니다. 현재 공식 정보 스냅샷 엔진도 외부 AI API를 호출하지 않으며 정적 GitHub Pages 구조를 유지합니다.
