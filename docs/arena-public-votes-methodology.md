# 공개 투표 재분석 설계와 실행 기록

## 두 영역의 경계

현재 서비스·플랜 추천은 기존 `recommend.ts`와 공식 플랜 스냅샷을 사용한다. 이번 모델 평가 JSON은 해당 함수에 전달하지 않는다. 60/25/15 계산, 기능·예산 필터, 단계별 선택과 프롬프트는 유지한다. 과거 공개 투표를 현재 서비스 점수나 글쓰기 능력 점수로 전환하지 않는다.

별도 모델 평가 영역은 **2025년 공개 투표 데이터 재분석 · 현재 모델 순위를 의미하지 않습니다.** 를 표시한다. 데이터에 있는 모델 ID를 그대로 사용한다. 추론 설정·API 날짜 버전이 자료에 없으면 null이다. 플랜 연결이 없어도 독립 평가를 표시하며 이름이 비슷한 모델로 대체하지 않는다.

## 처리 계약 (public-votes-bt-v1)

- 원본: [Arena 공개 140k 데이터](https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k). 고정 commit 참조 `6322995`를 API로 전체 SHA에 해석하고 prefix 일치와 40자리 SHA를 검증한 후 **모든 파일은 그 전체 SHA에서** 읽는다. 가변 main을 다운로드하지 않는다. 결과에는 전체 SHA, 각 파일 SHA256, 실제 행 수와 시간 범위를 저장한다.
- 메타데이터 요청 경로: `https://huggingface.co/api/datasets/lmarena-ai/arena-human-preference-140k/revision/6322995?blobs=true`. 파일은 `https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k/resolve/{전체 SHA}/data/train-00000-of-00007.parquet`부터 `train-00006-of-00007.parquet`까지다. 정확한 일곱 파일과 각 LFS SHA256을 요구한다. 해시 누락·불일치 시 중단한다. 캐시 파일도 원본 해시가 일치할 때만 재사용한다.
- [데이터 카드](https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k/blob/6322995/README.md)는 CC-BY-4.0을 표시한다. 사용자 프롬프트와 모델 응답의 조건은 다르므로 어느 쪽도 산출물·로그에 넣지 않는다. 투표 메타데이터의 파생 통계만 공개하며 저작자 Arena/LMArena, 원본, 라이선스, 변경 사실을 표시한다.
- 최소 입력 열: id, model_a, model_b, winner, evaluation_session_id, evaluation_order, timestamp. 전체 선호도만 처리하므로 대화·분류 열은 읽지 않는다. 원본 Parquet는 로컬 무시 디렉터리에만 보관한다. 파일 전송에는 전체 Parquet가 필요하지만 Arrow의 열 선택으로 대화 열을 메모리에 적재하지 않는다.
- 알려진 winner는 model_a/model_b/tie/both_bad. 동률과 both_bad는 양측 0.5 결과로 처리한다. both_bad가 양측의 우수함을 의미하지는 않는다. 다른 라벨이나 필수 필드 누락·같은 모델 대결은 제외하고 건수만 기록한다.
- 중복 id는 제거한다. 같은 id의 내용이 충돌하면 실패한다. 반복 세션은 evaluation_order, timestamp, id 오름차순의 **첫 유효 표 한 개**만 사용한다. 이후 반복 표는 제외한다. 세션 ID 누락은 임의 독립 표로 만들지 않고 제외한다. 서로 다른 세션의 동일 사용자 여부는 알 수 없으며 잔여 상관은 한계다.
- 시간대 없는 timestamp는 UTC로 해석하고 마이크로초 정밀도로 통일한다. `period`는 유효 중복 ID 제거 후의 시간 범위, `usedPeriod`는 세션·최소 표본 필터 이후의 시간 범위다. 원본 파일 전체 행 수와 무효/중복/반복 세션/표본 필터 제외 건수를 별도로 기록한다. 필수 열이 없어 Parquet를 읽을 수 없으면 실패하며 스키마를 추측해 채우지 않는다.
- 모델별 최소 표본은 100표. 부족 모델과 그 대결을 반복 제거해 남은 비교 집합에서도 각 모델 100표 이상을 보장한다. 제외 모델은 원래 유효 표본 수와 보류 사유를 표시한다. 이 기준은 우리 표시 정책이며 통계적 충분성의 보장이 아니다.
- 무방향 비교 그래프의 연결 성분별로 따로 계산한다. 성분 사이 공통 순위를 만들지 않는다. 각 성분의 승리 방향 그래프도 강하게 연결되어야 유한 최대우도 추정치를 허용한다. 동률은 양방향 간선이다. 완전 분리, 수치 실패, 특이 Hessian이면 해당 집단 점수/CI를 null로 유지한다.

## 계산과 공식 예제의 차이

[공식 Arena-Rank 예제](https://arena.ai/blog/arena-rank)의 기본 Bradley–Terry 모형을 참고했다. 공식 패키지는 JAX 기반이며 현재 로컬에는 설치되지 않았다. 네트워크 제한 때문에 설치·검증할 수 없어, 설치된 NumPy/SciPy로 작은 별도 계산기를 구현한다. **공식 arena-rank 실행 결과나 현재 Arena 평점이 아니라 우리 재분석**이다.

P(a 승리) = sigmoid(βa − βb). 각 표의 y는 1, 0, 0.5이며, 음의 로그우도 합 `Σ(log(1+exp(d)) − y*d)`를 최소화한다. 평균 β=0을 제약해 위치를 고정한다. SciPy L-BFGS-B, 초기값 0, maxiter 2000, ftol 1e-12, gtol 1e-8을 사용한다. 모델/쌍 정렬은 고정하며 난수를 쓰지 않는다. 최적화 성공과 gradient를 검사한다.

점수는 `1000 + 400/log(10)*β`. 각 집단 평균 1000인 상대 척도이며 정답률·성공확률이 아니다. 0~100 정규화도 아니다. 공식 예제와 달리 세션당 첫 표 선택, 최소 표본 제거, 성분별 적합, 명시적인 합계 0 제약을 적용한다. 스타일·길이 보정, 인기 모델 재가중치, 분야별 필터는 적용하지 않는다.

95% CI는 독립 세션을 가정한 sandwich 추정이다. 제약 좌표의 H=`Σ p(1−p)xxᵀ`, J=`Σ(y−p)²xxᵀ`, V=`H⁻¹ J H⁻¹`를 사용하고 전체 β 좌표로 변환한 뒤 `점수 ± 1.959963984540054*표준오차`를 계산한다. 공식 패키지의 Hessian 정규화는 사용하지 않고 특이/불안정 행렬을 보류한다. CI는 주변적 근사 구간이며 순위의 유의차 보장이나 다중비교 보정 구간이 아니다. 데이터 선택 편향·미확인 추론 설정·세션 간 동일 사용자 상관은 제거되지 않는다.

## 실행 상태

2026-10-21: Python 3.13.1, NumPy 2.2.5, SciPy 1.15.3, pandas 2.2.3 확인. PyArrow/arena-rank/huggingface_hub 미설치. HF revision API에 대한 일반 Python HTTPS 요청은 `URLError / WinError 10061`로 실패했다. 프록시/권한/네트워크 제한을 변경하지 않았다. **실제 처리 행 수 0, 실제 모델 수 0, 실제 시간 범위 미확인, 결과 JSON 없음.** 알려진 2025년 4~7월 범위는 실행된 산출물의 검증값으로 쓰지 않는다. 다른 데이터셋 조사로 대체하지 않는다.

`build_snapshot.py` 실행도 PyArrow 미설치로 `PackageNotFoundError`, 종료 코드 1을 확인했다. 실제 원본 스키마와 전체 처리 흐름은 아직 검증하지 못했다. 계산기와 UI 검증에는 **테스트 전용 합성 입력**만 사용했다. 실제 모델명·행 수·평점을 확보했다고 주장하지 않는다.

## 파일과 화면 연결

| 파일 | 역할 |
| --- | --- |
| `tools/arena_votes/build_snapshot.py` | 고정 revision·라이선스·파일 해시 검증, 메타데이터 열만 읽기, 성공 시 원자적으로 JSON 저장 |
| `tools/arena_votes/compute.py` | 세션 처리, 비교 그래프, Bradley–Terry 및 sandwich CI 순수 계산 |
| `tools/arena_votes/requirements.txt` | React와 분리한 NumPy 2.2.5 / SciPy 1.15.3 / PyArrow 19.0.1 |
| `public/data/arena-public-votes.json` | **아직 생성되지 않음**. 실제 계산 성공 후 생성할 작은 공개 집계 산출물 |
| `src/lib/modelEvidence.ts` | 출처·고정 revision·v1 설정·표본·null·집단 일관성 검증, 정확한 ID만 대조 |
| `src/components/ModelEvaluationReference.tsx` | 추천 결과 아래 독립 평가 표, CI·기간·표본·출처·라이선스·변경 사실·플랜 연결 표시 |
| `src/lib/fixtures/modelEvidence.ts` | 합성 테스트 데이터. 제품에서 import하지 않음 |

브라우저는 Vite `BASE_URL` 아래의 로컬 JSON만 요청한다. 누락·404·잘못된 JSON·계약 불일치는 점수 없는 안내로 처리하며 기존 추천을 계속 표시한다. 데이터셋 API 호출과 Python 서버는 제품에 없다. 현재 후보의 모델 ID가 null이면 연결 불가, 정확한 ID가 없으면 평가 데이터에 없음, 일치하지만 플랜 근거가 없으면 플랜 연결 미확인으로 구분한다. 어느 상태도 독립적인 역사적 모델 표를 숨기지 않는다. 현재 플랜에 모델 ID 연결 근거가 생겨도 평가 설정 동일성은 별도로 미확인으로 표시한다.

`.arena-cache/`, `.venv-arena/`, `*.parquet`, Python 캐시는 Git에서 제외한다. 캐시에는 민감한 대화 열이 포함된 원본 Parquet가 있으므로 공유하지 않는다. 공개할 수 있는 것은 검토한 집계 JSON뿐이다. Vite base·GitHub Pages 워크플로·React 의존성과 lockfile·기존 추천 계산은 변경하지 않았다. commit·push·배포하지 않았다.

## 일반 PowerShell에서 실행

Python 3.11~3.13이 필요하며 현재 계산 테스트는 **Python 3.13.1**에서 실행했다(`hashlib.file_digest`는 3.11 이상). Node는 기존 프로젝트 요구대로 22.18 이상이다. 정상 네트워크가 있는 일반 PowerShell에서 아래 명령을 **각각 성공한 뒤 다음 명령으로** 진행한다. 제한 환경의 프록시·권한 설정을 변경하지 않는다.

```powershell
Set-Location 'D:\univ\3-1\contest\2026_KHU_AI_Challenge'
python -m venv .venv-arena
.\.venv-arena\Scripts\python.exe -m pip install -r tools\arena_votes\requirements.txt
.\.venv-arena\Scripts\python.exe -m unittest discover -s tools\arena_votes -p 'test_*.py' -v
.\.venv-arena\Scripts\python.exe tools\arena_votes\build_snapshot.py
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {parseModelEvidence} from './src/lib/modelEvidence.ts'; const d=parseModelEvidence(JSON.parse(readFileSync('public/data/arena-public-votes.json','utf8'))); if(!d) throw new Error('Invalid snapshot'); console.log(JSON.stringify({counts:d.counts,models:d.modelCount,period:d.period,usedPeriod:d.usedPeriod,revision:d.source.revision}));"
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

출력 JSON의 실제 전체 SHA·기간·행 수·모델 수·제외 건수·연결 집단을 검토한다. 기록된 2025년 4~7월 범위와 다르면 원인을 확인하고 임의로 날짜를 바꾸지 않는다. 스크립트는 2025년 외 범위면 중단한다. 성공 후 `http://127.0.0.1:4173/AI...may-I../`에서 입력 → 추천 → **모델 평가 참고**를 확인한다. 모바일에서 표 가로 스크롤과 출처 펼치기, 기존 단계별 선택·복사·재분석도 확인한다. 실행 명령에 commit·push·배포는 없다.

반복 실행도 revision·라이선스·원본 해시를 확인하기 위해 **HF API 연결이 필요**하다. 계산 함수는 오프라인에서 동작하지만 전체 다운로드 스크립트의 오프라인 재실행 옵션은 없다. 모든 원본은 고정 SHA에서 읽으며 검증된 캐시는 재전송하지 않는다. 같은 입력·패키지·설정에서는 결정적으로 계산하지만 다른 OS/BLAS의 마지막 소수 자리까지 비트 단위 동일성을 보장하지 않는다. 산출물에는 실제 Python/패키지 버전과 두 스크립트 SHA256이 기록된다.

오류 시 기존 결과 JSON을 덮어쓰지 않으며 새 결과가 생성된 것으로 해석하지 않는다. 모델 설정·카테고리 열을 추가하려면 먼저 원본을 확인하고 방법 버전을 바꿔야 한다. 이번 버전에는 분야별 비교가 없다.

## 검증 결과 (2026-10-21)

| 항목 | 결과 |
| --- | --- |
| 앱 회귀·렌더링 | `npm.cmd test`: **55/55 통과** |
| 계산·다운로드 무결성 | Python unittest: **11/11 통과**, 실제 원본이 아닌 합성·로컬 입력 |
| 타입 체크 | `npm.cmd run typecheck`: 통과 |
| 프로덕션 빌드 | `npm.cmd run build`: Vite 설정 로딩의 `spawn EPERM`으로 실패. 동일 명령 재시도·제한 우회 없음 |
| 실제 다운로드·스냅샷·끝까지 연결 | 미완료: 네트워크 제한 및 PyArrow 미설치. 결과 파일 없음 |
| PC·모바일 브라우저 | 미수행. 서버 렌더링 테스트가 브라우저 검증을 대신하지 않음 |
| 코드 리뷰 | 설정·revision 검증 누락, 제외 모델 상대 수 오류를 회귀 테스트로 재현 후 수정. 원본 해시 누락도 명시적 실패로 수정 |

추가된 회귀는 미확인 플랜과 독립 표시, 과거 점수의 현재 추천 미반영, 정확한 ID, 누락 파일, 표본 부족, 분리 집단, 유한 MLE 불가능, 세션 중복, 시간 순서, 분석 해가 있는 2모델 CI, 해시/캐시 무결성을 확인한다.

## 남은 근거

현재 추천에 쓰는 근거는 기존 여섯 플랜의 확인된 기능·예산 정보다. 현재 60/25/15 총점 후보는 **0개**다. 위 실행이 성공하면 추가되는 것은 2025년 공개 투표 **참고용** 상대 평가이며 자동으로 현재 추천 점수에 쓰지 않는다. 최신 추천 점수에는 현재 모델의 정확한 ID·모드, 공식 플랜 연결, 작업별 비교 가능한 최신 평가와 공개 사용 근거가 여전히 필요하다.
