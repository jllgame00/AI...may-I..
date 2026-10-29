# Provider 작업 평가 실행·채점 가이드

2026-10-29. 현재 실제 외부 AI 실행 **0건**, 등록 점수 **0건**. 이 문서는 향후 권한 있는 사용자가 직접 실행할 절차입니다. 계정 로그인·구독·API 호출·유료 사용을 자동화하지 않습니다.

실제 실행 준비 단계의 [Windows 빌드·Playwright 명령과 재검증 결과](provider-local-execution-report.md), [ChatGPT·Claude·Gemini·Grok 체크리스트](provider-consumer-pilot-checklist.md), [빈 실행 기록 양식](../evaluations/preparation/execution-record-template.json)을 함께 사용합니다. 기존 과제·프롬프트·루브릭·입력 해시는 유지합니다.

## 1. 파일과 명령

| 위치 | 역할 |
| --- | --- |
| `src/evaluationTypes.ts` | EvaluationCase / EvaluationRun / EvaluationScore, 근거 타입 |
| `src/data/providerEvaluationCases.ts` | 과제 3개, 동일 입력 프롬프트, 버전별 정답·루브릭 |
| `evaluations/fixtures/sales-v1.xlsx` | 12행 합성 원본. 정답 시트 없음 |
| `evaluations/fixtures/library-pilot-v1.pdf` | 3쪽 합성 자료. 개인정보·외부 저작물 없음 |
| `evaluations/fixtures/manifest.json` | 실제 파일 SHA-256 및 묶음 해시 |
| `evaluations/results/registry.json` | 검토 후 수동 반입할 기록. 현재 빈 배열 |
| `src/lib/providerEvaluation.ts` | 자동 채점, 기록 검증, 익명 묶음, 미래 반입 게이트 |
| `scripts/provider-evaluation-core.ts` | 파일 해시·실행 기록 검증과 작업별 사전 확인 대상 |

```powershell
npm run evaluation:validate
npm run evaluation:typecheck
npm run evaluation:audit
npm run evaluation:prepare -- xlsx-v1 claude-free --write-template
```

마지막 명령은 `.qa/evaluation/xlsx-v1-claude-free-template.json`에 두 회차의 `planned` 기록과 빈 입력 양식을 UTF-8로 씁니다. 기존 파일은 덮어쓰지 않습니다. `--write-template` 없이 실행하면 JSON을 출력합니다. PowerShell의 `>` 기본 인코딩과 npm 로그를 JSON 파일로 섞지 않도록 파일 저장 옵션을 권장합니다. 생성물의 `dataset`만 검증기의 데이터셋 입력입니다. 과제·캡처 양식까지 감싼 전체 세션 파일을 registry로 반입하지 않습니다.

`survey-v1`, `xlsx-v1`, `pdf-v1`을 사용할 수 있습니다. 사전 대상은 자동 감사 JSON의 `candidates`에 있습니다. 설문은 기존 기능 검사상 가능했던 ChatGPT/Claude/Gemini 경로, XLSX는 ChatGPT Plus·Claude Free/Pro, PDF는 해당 세 서비스의 PDF 기능 조사 근거가 있는 경로부터 사전 확인합니다. 모든 항목은 `preflight-required`이며 실제 실행 성공 또는 현재 계정 이용 가능 판정이 아닙니다. 전문 이미지·영상 서비스에는 세 과제를 일괄 배정하지 않습니다. 다른 회사는 필요한 근거·실제 계정 경로를 확인한 뒤 대상을 넓힙니다. 명목상 무료 경로나 미확인 경로에 유료 플랜 결과를 대입하지 않습니다.

## 2. 계정·환경 사전 확인

1. 본인이 사용할 수 있는 정확한 Provider → Service → Plan → 웹 경로를 확인합니다. 현재 등록 경로는 웹이며 API를 웹 플랜으로 기록하면 검증이 거부됩니다.
2. 국가·개인/학교/조직 계정, 표시된 플랜, 사용할 도구, 대화 모드, 출력 언어를 기록합니다. `settings`에는 최소 `mode`, `tools`, `accountKind`, `language`를 실제 값으로 채웁니다. `environmentKey`는 비교 환경 규약의 버전이며, 비밀 키나 계정 개인정보를 넣지 않습니다.
3. XLSX 첨부, 코드 실행 활성화, PDF 이미지 처리, 차트·다운로드 등 과제 필수 기능이 이 계정에서 제공되는지 확인합니다. 공식 소개나 새 파일 생성 화면만으로 기존 파일 입력 성공을 기록하지 않습니다.
4. 원본 SHA-256을 검증합니다. 새로 생성하면 XLSX 컨테이너의 메타데이터 때문에 해시가 달라질 수 있으므로, 비교 중에는 배포된 동일 파일을 고정합니다. 변경 시 새 fixture·과제·프롬프트 버전과 새 실험 집합을 만듭니다.
5. 권한이나 기능이 없으면 `blocked`, `testedAt:null`, 결과·점수 없음으로 기록합니다. 실제 요청 후 실패했다면 `failed`, 실제 시각과 이유를 기록하고 품질 점수를 만들지 않습니다. 실패율·지원 가능성 분석은 별도 지표입니다.

## 3. 서비스·과제당 최소 두 회차

두 회차는 각각 새 대화와 서로 다른 `sessionId`, 실행 기록 파일을 사용합니다. 과거 회차 출력, 정답, 다른 회사 응답을 컨텍스트에 넣지 않습니다. 동일 원본 파일과 `case.prompt`만 전달합니다. `expectedResult`, 감사 JSON, 채점 코드, 리뷰 묶음은 서비스에 전달하지 않습니다. 준비 양식에는 정답 키가 포함되지 않습니다.

모드·도구·언어·사용자 요구·실행 기간을 비교 가능하게 유지합니다. 임의로 유리한 응답만 고르거나 추가 프롬프트로 고친 결과를 원 회차로 대체하지 않습니다. 재시도·추가 대화는 별도 버전/회차에 기록합니다. 개별 모델 정보는 재현에 필요한 경우 `internalModel`로만 기록하며 사용자 제품 화면에 연결하지 않습니다.

### 실행 기록 JSON (`executionEvidence`)

준비 양식의 `executionTemplate`을 회차마다 복사해 다음을 기록합니다.

```json
{
  "runId": "실제 해당 회차 ID",
  "sessionId": "회차별 고유 ID",
  "testedAt": "실제 UTC ISO 시각",
  "fixtureHash": "manifest.json의 bundleSha256",
  "freshConversation": true,
  "accountRouteConfirmed": true,
  "preflightVerifiedBy": "사전 확인자 ID",
  "steps": ["실제 첨부 파일명·입력 성공 여부·실패 조건·진행 단계·증거 위치"]
}
```

위 내용은 입력 형식을 설명하는 양식이며 실행 기록 예시로 등록하지 않습니다. `true`는 실제 확인한 경우에만 입력합니다. 실행 화면·첨부 파일 표시·단계별 결과·소요 시간·오류를 함께 보관합니다. 이 도구는 계정·실행의 진실성을 원격 인증하지 않으므로 담당자의 증거 검토가 필요합니다.

### 결과 캡처 JSON (`outputReference`)

`rawOutput`에는 원문 응답 전체를 변경 없이 보관하고, `actualResult`에는 해당 과제의 JSON을 추출합니다. 과제 출력 형식을 지키지 못했다면 이를 숨기지 말고 미준수 필드를 누락 상태로 둡니다. 원문에 없는 정답을 보충하지 않습니다. `inputSha256`만 수집자가 실제 첨부 파일에서 계산하여 추가하고 그 작업을 실행 기록에 명시합니다. 이를 AI가 파일을 읽었다는 증거로 단독 사용하지 않습니다.

```json
{
  "rawOutput": "실제 원문 응답",
  "actualResult": {},
  "attachments": [{"path": ".qa/evaluation/실제-차트.png", "sha256": "실제 파일 해시"}]
}
```

첨부가 없다면 `attachments:[]`입니다. 가짜 파일 경로를 채우지 않습니다. 차트·다운로드 파일·낭독 음성은 실제 파일과 해시를 보관합니다. 캡처 JSON의 SHA-256을 `outputSha256`에 기록합니다. 경로는 작업 폴더 내부의 상대 경로만 허용하며 외부 경로·경로 이탈·외부로 향하는 심볼릭 링크는 거부합니다. 캡처의 구조화 결과와 run의 `actualResult`가 일치해야 합니다.

run에는 실제 수집자 `evaluatorId`, `testedAt`, `executionStatus:completed`, 결과 및 실행 기록 경로, `sessionId`, 설정을 넣습니다. 구조가 아닌 실제 수행 완료를 뜻합니다. 실험용 응답을 사용하는 경우 `provenance:synthetic` 또는 `demo`로 명시합니다. 합성 **입력**으로 외부 서비스에 실제 요청한 경우에만 run은 `real`이 될 수 있습니다.

## 4. 자동 채점

```powershell
node scripts/provider-evaluation.mts validate .qa/evaluation/session-dataset.json
node scripts/provider-evaluation.mts grade .qa/evaluation/session-dataset.json 실제-runId
```

검증기가 원본 해시, 타입·참조, 과제·버전, 실행 기록, 캡처·첨부 해시를 확인합니다. 채점 명령은 채점 JSON을 출력하며 registry에 자동 저장하지 않습니다. `planned`/`failed`/`blocked` 또는 미캡처 결과는 채점하지 않습니다. 자동 점수는 실제 비교한 항목별 0/1이며 회사 종합점수가 아닙니다. `synthetic`/`demo` 출력에 대한 채점 결과에는 해당 provenance가 붙고 향후 실측 게이트에서 거부됩니다.

| 과제 | 자동 확인 | 자동 확인의 한계 |
| --- | --- | --- |
| A 설문 | 필수 6 ID·비어 있지 않은 문항·중복 ID·유형/선택지 형식·폼 미생성 선언 | ID와 문장 의미가 일치하는지, 중립성·적절한 5점 척도는 수동 |
| B XLSX | 입력 식별·12행·합계 2000·평균 166.666666…·조건 합계 940·지역 합계 890/1110·월별 차트 500/740/760 | 실제 업로드 성공, 그려진 차트의 축·단위·본문 해석은 수동 |
| C PDF | 파일 식별·요약과 대본 사실 필드 각각의 6개 숫자·페이지·450~650 공백 어절 | 원문 대본과 사실 필드 일치, 임의 추가 사실, 누락·구성·실제 시간은 수동 |

숫자는 유한한 number만 인정하며 절대오차는 `0.000001`입니다. 숫자 문자열이나 잘못된 월 순서도 실패합니다. 원본을 읽지 않고 새 XLSX를 만든 결과는 입력 성공으로 인정하지 않습니다.

## 5. 익명 독립 수동 평가

```powershell
node scripts/provider-evaluation.mts blind .qa/evaluation/session-dataset.json 실제-runId
```

UUID 기반 리뷰 JSON과 별도 `.private.json` 대응표를 `.qa/evaluation/`에 저장합니다. 원문·구조화 결과의 회사·서비스명은 가리고 첨부 파일명은 중립 이름으로 복사합니다. 리뷰 묶음에는 원본 입력·정답·수동 지표별 빈 점수 양식이 포함됩니다. 원 run ID·플랜·수집자·내부 모델·설정·메모는 넣지 않습니다.

담당자가 원문 서명, URL, 이미지 로고, 음성 소개, 파일 메타데이터의 잔여 단서를 확인·가린 뒤 `anonymizationVerifiedBy`를 채웁니다. 이 확인은 텍스트 치환만으로 보장되지 않습니다. 가림 사본과 원본을 별도로 보존하고 가림 작업을 기록합니다. 원문 내용 평가에 필요한 숫자·문장·도표는 삭제하지 않습니다. 비공개 대응표는 평가자에게 보내지 않습니다. 도구가 외부 평가자에게 전송하는 기능은 없습니다.

각 수동 지표는 수집자와 다른 **최소 두 명**이 동일한 익명 묶음을 독립 평가합니다. 다른 평가자의 점수를 보기 전에 기록합니다. 값은 실제 평가 후 입력하며 미평가는 `null`로 양식에 남기고 EvaluationScore에 등록하지 않습니다.

| 점수 | 공통 기준 |
| --- | --- |
| 0 | 요구의 핵심을 충족하지 못하거나 중대한 허위·사용 불가 |
| 1 | 핵심 오류·편향·누락이 여러 개 있어 큰 수정 필요 |
| 2 | 일부 요구 충족, 주요 수정 또는 여러 경미한 수정 필요 |
| 3 | 핵심 요구 충족, 제한적인 경미한 수정 필요 |
| 4 | 해당 지표의 요구를 모두 충족하며 근거로 확인 가능 |

지표별로 문항 ID·원문 위치·PDF 페이지·차트 축·타임스탬프 등의 근거를 반드시 적습니다. A의 명확성·중립성·실사용 가능성, B의 파일/차트 실물과 허위 해석, C의 사실 충실성·구성·실제 낭독을 각각 평가합니다. `delivery`는 독립 낭독이 270~330초이고 실제 음성/타이밍 기록이 있을 때만 만점을 줄 수 있습니다. 범위 밖이면 수정 필요 정도에 따라 위 기준을 적용하고 초 수를 기록합니다. 미측정은 점수를 만들지 않습니다. 어절 수를 초로 환산해서 채점하지 않습니다.

회수 후 담당자가 비공개 대응표로 runId를 결합하고, `metricId`, 점수/최대값, evidence, manual, 실제 verifiedAt, evaluatorId, blindPacketId, independent를 EvaluationScore에 기록합니다. 원 평가와 불일치를 보존하고 합의 평가로 덮지 않습니다.

## 6. 향후 추천 반입 전 조건

`assessSufficiency()`는 **정확히 한 과제·경로의 파일럿 근거 완결성**만 검사합니다. 실제 파일 검증 콜백을 생략하면 거부합니다. 회사 점수나 순위는 항상 null입니다.

필수 조건은 접근 가능한 동일 Provider/Service/Plan/웹 경로·지역·환경·fixture·prompt/rubric, 90일 이내 실측, 동일 모드·도구·계정 조건, 서로 다른 세션/실행 기록/캡처를 가진 최소 두 회차, 모든 자동 지표와 지표마다 두 독립 익명 평가입니다. 동일 원문 응답이 나와도 회차 고유 캡처와 실행 증거를 따로 남깁니다. 과제나 버전이 다른 결과는 섞지 않습니다. 수집자의 비익명 점수는 통계에서 제외합니다.

통계는 회차별 평가 평균을 관측치로 하여 범위·표본 표준편차를 기록합니다. 각 회차 내 평가자 수와 평가자 점수 범위는 따로 보존합니다. 2회로 유의미한 순위·신뢰구간을 주장하지 않습니다. 반입 조건 미달이면 수치 통계를 공개하지 않습니다.

회사별 작업 점수는 이 게이트 통과만으로 도입하지 않습니다. 최소 작업 유형당 서로 다른 대표 과제 3개 × 경로당 과제별 2회, 공통 과제 집합, 완전한 채점, 독립 평가 불일치 검토, 사전 고정한 지표·정규화·가중치·오차/동률 규칙, 권한·비용·기능의 재검증이 추가로 필요합니다. 변동이 크면 반복을 늘립니다. 비교 대상의 과제 범위가 다르면 점수를 비교하지 않습니다. 평가가 없는 회사는 미평가이며 0점이 아닙니다. 서비스 수나 최고 모델/서비스 점수로 회사 보너스를 만들지 않습니다.

향후 연결 순서는 사용자 작업 분석 → 기능/예산 검사 → 접근 가능한 실제 경로 → 동등한 과제 실측 조회 → 충분성 확인 → 사전 합의한 점수/동률 정책 → 회사 중복 없는 최대3개 또는 공동 후보 → 근거와 한계입니다. 비용·편의 실측이 없는 현재 총점 가중치를 활성화하지 않습니다.
