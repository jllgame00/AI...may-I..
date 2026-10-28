# Artificial Analysis: 실제 접근 상태와 갱신 절차

확인일 **2026-10-28**. 기존 **25개 모델·107건 관측을 보존**했다. 이번 앱에 실제 추가한 AA 관측은 **0건**이다. 수집기·검증기·빈 공개 스냅샷 구현을 데이터 확보 완료로 보고하지 않는다.

## 서로 다른 세 가지 상태

| 항목 | 실제 확인 결과 | 남은 작업 |
|---|---|---|
| 인증 | `ARTIFICIAL_ANALYSIS_API_KEY` 미설정. `check`와 `collect` 명령 실행 시 키 부재를 확인했고 HTTP 요청0회 | 계정에서 발급한 키를 현재 터미널 환경변수에만 설정 |
| 데이터 접근 | 공식 모델 비교 원문에서 Sol6.1/Terra6.1의 medium 지수 결과2개와 v5.0 표기를 직접 열람. 실제 API 응답0건 | 인증 API 응답과 정확 모델·설정·지수 버전을 대조 |
| 공개 활용 범위 | 일반적인 개별 짧은 인용과 이번 앱의 구조화 점수 저장·선택 안내를 구분. 후자 허용 근거는 아직 미확보 | 아래 적용 조항과 대상 행위의 허용 범위 확인 |

모든 공개 활용을 금지한다고 판단하지 않았다. 현재의 공개 약관이 허용하는 일반 인용과, 별도 조건이 적용되는 제품용 데이터 사용을 구분한다. 공식 공개 라이선스가 해당 제품용 사용을 허용한다면 그 근거도 검토 대상이며 별도 계약만 유일한 근거라고 가정하지 않는다.

## 필요한 API와 문서화된 필드

[공식 API 원문](https://artificialanalysis.ai/api-reference)의 LLM endpoint는 `GET https://artificialanalysis.ai/api/v2/data/llms/models`, 인증은 `x-api-key` 헤더다. 무료 API는 하루1,000회 제한이며 클라이언트에 키를 넣지 않고 응답을 캐시하도록 안내한다.

| 문서화된 응답 범위 | 필드 |
|---|---|
| 안정적 모델/제공사 식별자 | `id`, `model_creator.id`; 표시명/slug와 구분 |
| 모델 지수 예시 필드 | `artificial_analysis_intelligence_index`, `artificial_analysis_coding_index`, `artificial_analysis_math_index` |
| 개별 평가 예시 필드 | `mmlu_pro`, `gpqa`, `hle`, `livecodebench`, `scicode`, `math_500`, `aime` |
| 이용 정보 | `pricing`, `median_output_tokens_per_second`, `median_time_to_first_token_seconds` 등 |

이는 **공식 문서의 필드 확인**이며 실제 인증 응답을 검증했다는 뜻은 아니다. 문서 예제 숫자·o3-mini 예시를 현재25개 모델의 관측으로 등록하지 않는다. 실제 응답의 제공 필드·지수 버전·단위·설정은 키가 제공된 뒤 다시 확인한다. 가격은 선택 후 이용 정보이며 순위 가중치가 아니다.

**모델 Coding Index와 Coding Agent Index는 별개**다. 이 LLM API에 `artificial_analysis_coding_agent_index`가 포함된다는 문서는 확인하지 못했다. 수집·검증 코드는 그 이름을 지원 필드로 만들거나 모델 Coding Index를 에이전트 지수로 이름 변경하지 않는다. 별도 상용 API의 Coding Agent Index 제공 여부는 **미확인**이다.

## 직접 확인한 원문과 아직 확보하지 못한 결과

- [Sol6.1 / Terra6.1 medium 비교 원문](https://artificialanalysis.ai/models/comparisons/gpt-6-1-terra-medium-vs-gpt-6-1-sol-medium): 직접 연 본문에서 두 모델의 실제 Intelligence Index 값과 **v5.0·9개 구성 평가**를 확인했다. 검색 캐시의 이전 버전·값과 달라 캐시 숫자는 채택하지 않았다. 원문의 정수 표시를 더 정밀한 소수 값으로 바꾸지 않았다. 상세 열람 기록은 무시되는 `.qa/aa-original-review.md`에만 두었고 공개 점수 데이터/추천에 편입하지 않았다.
- [Coding Agents 원문](https://artificialanalysis.ai/agents/coding-agents): 지수 v2.0·3개 구성 평가·설명은 확인했으나 접근 가능한 본문에는 구성별 수치 행이 없다. 내부 차트 데이터 추출이나 인증 우회는 하지 않았다.
- AA GLM4.7 모델 페이지는 한 번 열람 시 응답 크기 제한으로 실패했다. 재시도·우회하지 않았고 검색 요약 숫자를 대신 쓰지 않았다.
- **미확보:** 실제 인증 API 결과, Coding Agent Index 구성별 원점수, 키 계정의 계약 범위·상용 데이터 제공 범위. 접근 가능한 공개 원문이 전혀 없다는 설명은 사용하지 않는다.

## 공개 표시 조건: 조항·대상·제한 행위

근거는 [Data Platform Terms v1.1, 2026-08-19](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf)이다.

- **§2.3:** 내부 이용과 출처 있는 개별 수치의 짧은 공개 인용을 허용하되 그 인용은 구조화 표·기계 판독 데이터 재현과 구분한다.
- **§2.4(c,d):** 고객용 제품에 원데이터를 넣거나 타 출처 데이터와 결합해 제3자에게 제공하는 행위를 제한한다. 이번 앱의 JSON 원점수 저장·화면 카드 제공은 이 범위로 판단했다.
- **§2.5:** 모델/제공사 비교·선택 안내가 주목적인 제3자용 서비스에서의 데이터 사용에 사전 서면 동의를 요구한다. AI..may I..?의 AA 점수 기반 비교·추천 연결에 적용된다고 판단했다. 무료 API 키나 Pro 가입만으로 이 조항의 예외가 생긴다고 추정하지 않는다.
- **§5:** 허용된 외부 사용에도 AA 출처 링크와 비보증 표시가 필요하다. 출처 표시만으로 §2.4/2.5가 해소된다고 간주하지 않는다.

웹 원문은 [Website Terms §2.2(c,d)](https://artificialanalysis.ai/docs/legal/Terms-of-Use.pdf)의 유사/경쟁 서비스 목적 접근과 콘텐츠 재현 제한도 별도로 확인했다. 이 앱의 구체적인 공개 원점수 사용 범위가 확인되지 않았으므로 현재 AA 원점수 편입만 보류한다. 일반적인 블로그 인용 등 다른 공개 사용까지 금지하는 결론은 내리지 않는다. 다른107건과 이용 경로 작업은 계속 반영했다.

## 구현한 로컬 수집·검증·스냅샷 갱신

Node22.18 이상에서 실행한다. 의존성·Pages 설정은 변경하지 않았다.

```powershell
node scripts/aa-data.mts check
```

이 명령은 키 **존재 여부만** 출력하고 네트워크를 요청하지 않는다. `collect`는 환경변수에서만 키를 읽는다. 키 값을 명령 인자·소스·프런트엔드·Git·출력에 넣지 않는다.

```powershell
$aaSecureKey = Read-Host "AA API key" -AsSecureString
$env:ARTIFICIAL_ANALYSIS_API_KEY = [System.Net.NetworkCredential]::new('', $aaSecureKey).Password
try { node scripts/aa-data.mts collect }
finally { Remove-Item Env:ARTIFICIAL_ANALYSIS_API_KEY -ErrorAction SilentlyContinue }
```

공식 HTTPS endpoint로 한 번만 요청하고 리디렉션·20초 초과·401/429 등 실패는 자동 재시도하지 않는다. 응답 본문·헤더·키를 로그로 출력하지 않는다. 원본은 Git에서 제외한 `.aa-cache/response.json`, 무결성 해시는 `.aa-cache/capture-integrity.json`에 저장한다. 키가 응답에 반사되면 저장도 거부한다.

키가 준비된 뒤 필요한 리뷰:

1. [리뷰 템플릿](examples/aa-review.example.json)을 `.aa-cache/review.json`으로 복사한다. 응답의 **AA stable ID·creator ID**와 카탈로그의 **정확한 ID·버전·모드**를 원문으로 대조한다. 이름 유사도·최신 서비스명·floating alias로 자동 매핑하지 않는다. 템플릿 v5.0은 현재 문서 설명이며 API 응답도 같은 버전이라는 보장이 아니다.
2. 각 지표의 평가명·버전·범위·구성·단위·방향을 확인한다. 미공개 조건은 null, 점수 누락은 누락으로 남긴다. null·문자열·NaN을0점으로 바꾸지 않는다. 원점수의 비율을 임의 백분율이나 자체100점으로 바꾸지 않는다.
3. `node scripts/aa-data.mts prepare`로 로컬 검증한다. `.aa-cache/candidate.json`에 검증 통과 관측·격리 문제·매핑되지 않은 ID를 기록한다. 이 단계는 공개 허가와 독립적으로 가능하다. 실응답·리뷰 파일이 없으면 예제로 대신하지 않고 실패한다.
4. 공개 사용 범위가 확인된 경우에만 [권한 검토 템플릿](examples/aa-rights.example.json)을 `.aa-cache/rights.json`으로 준비한다. `reference`에는 공유 가능한 근거 코드만 넣고 키·비공개 계약 원문을 넣지 않는다. 범위 두 항목과 확인일·허가 만료/재검토 기한을 검토한다. 확인 없이 true로 바꾸는 것은 허가가 아니다.
5. `node scripts/aa-data.mts publish`는 원본 해시·정확한 매핑·권한 범위를 다시 검사한 뒤 검증된 관측만 `src/data/research/aa-verified.json`에 쓴다. 한 행의 정보 부족은 해당 행만 격리하며 AA 전체 순위를 대표한다고 표현하지 않는다. 유효 관측0건이면 기존 공개 파일을 덮어쓰지 않는다.
6. 앱은 공개 파일의 허가 메타데이터·만료일·모델/모드·평가 버전·수집일을 다시 검사한다. 잘못된 행·중복은 제외하고 다른 출처를 보류하지 않는다. 종합지수와 구성 평가를 합산하지 않으며 Coding Agent Index로 전용하지 않는다.
7. 테스트·타입 검사·원점수 diff·문서 개수를 갱신한다. 이 절차에는 commit·push·배포가 없다.

**사용자의 최소 작업:** 내부 수집을 원하면 계정의 키를 로컬 환경변수로만 제공한다. 이 앱에 점수를 공개하려면 위 두 제품용 사용 범위를 허용하는 근거도 확인한다. stable ID 매핑·수치 검증·스냅샷 갱신은 그 이후 작업이며 키를 대화에 보낼 필요가 없다.

## 실제 검증과 미실행

- 실제 키 없음 상태에서 `check`, `collect` 실행: HTTP 요청0, 공개파일 변경0.
- 헤더 인증·리디렉션 거부·실패 무재시도·키 비저장, 정확 ID/버전·모드·지표 구분, 날짜/허가 메타데이터, 부분 격리는 **합성 transport fixture 테스트**다. 실응답 수집 성공으로 보고하지 않는다.
- 현재 앱의 AA 관측0건, 전체25모델·107관측 유지. 실제 AA 인증 수집·공개 publish는 미실행이다.
