# ChatGPT · Claude · Gemini · Grok 수동 평가 체크리스트

준비일: 2026-10-29. **실제 외부 AI 실험 0건, 등록 점수 0건**. 이 문서는 평가 준비이며 회사 성능 비교 결과가 아닙니다. 기존 [평가 실행·채점 가이드](provider-evaluation-guide.md)의 세 과제·동일 원본·프롬프트·루브릭을 그대로 사용합니다.

빈 기록 파일:

- [서비스별 사전 확인과 24개 예약 칸](../evaluations/preparation/consumer-pilot.json): 4서비스 × 3과제 × 2회. 평가 결과 데이터셋이 아니며 registry에 반입하지 않습니다. 정답 키를 포함하지 않습니다.
- [실행 기록 양식](../evaluations/preparation/execution-record-template.json): 완료 여부·소요 시간·오류·제한을 기록해 기존 `executionEvidence`로 연결합니다. 아직 측정하지 않은 값은 null입니다.
- [고정 입력 해시](../evaluations/fixtures/manifest.json), [실제 평가 registry](../evaluations/results/registry.json): 입력 해시는 유지하고 registry는 비어 있습니다.

## 1. 소비자 서비스와 실제 계정 확인

계정마다 아래 표를 한 장씩 작성합니다. 개인용 웹 경로를 우선하며 API·조직 계정·모바일·별도 에이전트 제품은 동일 조건으로 묶지 않습니다.

| 대상 | 기록할 내용 | 현재 상태 |
| --- | --- | --- |
| 회사 / 서비스 / 웹 주소 | 실제 접속 서비스와 도메인 | 준비 JSON에 대상만 지정 |
| 실제 플랜 | 계정 화면의 플랜명·결제/무료 상태·일회 체험 여부 | 미확인 |
| 내부 planId | 실제 플랜과 일치하는 등록 ID | 미확인, 자동 선택하지 않음 |
| 지역 / 계정 종류 | KR 등 실제 국가, 개인/학교/조직 여부 | 미확인 |
| 모드 / 도구 / 언어 | 실제 선택 상태, 파일/분석 도구 활성화 | 미확인 |
| 입력 한도 | 파일당 크기·개수·PDF 페이지·남은 일일 사용량 | 미확인 |
| 사전 확인 근거 | 계정 표시·한도 화면·공식 문서 URL, 실제 확인일과 확인자 | 미기록 |
| 기능별 판정 | supported / limited / unsupported / unknown 및 제한 | 모두 unknown으로 시작 |

공식 문서에서 소개된 기능과 **해당 계정의 이용 가능 상태**는 분리합니다. 실제로 미지원이라고 명시된 기능은 근거와 함께 `unsupported`, 아직 확인하지 못한 기능은 `unknown`, 제공되지만 제약이 있으면 `limited`입니다. 업로드 오류 한 번이나 남은 사용량 소진만으로 서비스 전체를 미지원 처리하지 않습니다.

### 서비스별 공식 확인 지점

아래는 2026-10-29에 읽은 문서의 확인 지점입니다. 숫자를 계정 보장값으로 입력하지 말고 실제 표시와 재대조합니다. 기존 운영 카탈로그·확인일·추천 판정은 갱신하지 않았습니다.

| 서비스 / 소비자 웹 | 문서에서 확인한 범위 | 계정에서 반드시 확인할 내용 |
| --- | --- | --- |
| ChatGPT / `chatgpt.com` | [업로드 안내](https://help.openai.com/en/articles/8555545-uploading-files-and-audio-to-chatgpt): 문서 512MB, 스프레드시트 약50MB, Free 일3회 업로드 등 플랜 제한. [분석 안내](https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt): XLSX/PDF 분석·차트 | Free/Plus 등 실제 플랜, 네이티브 XLSX 첨부·계산·차트·다운로드, PDF 내용/페이지 처리. Free로 B/C 각2회를 하려면 문서상의 일일 한도를 고려해 날짜를 나눌 수 있음 |
| Claude / `claude.ai` | [파일 안내](https://support.claude.com/en/articles/8241126-upload-files-to-claude): XLSX에는 코드 실행·파일 생성 활성화 필요. 채팅 파일당500MB·20개, PDF1000쪽까지, 시각 분석은100쪽 이하 | Free/Pro 등 실제 플랜, 활성화 스위치·네이티브 XLSX 입력·실제 차트/파일. 프로젝트 파일 제한과 일반 채팅 제한 구분 |
| Gemini / `gemini.google.com` | [파일·차트 안내](https://support.google.com/gemini/answer/14903178?hl=en): 사용 가능 시 프롬프트당10개, 비영상 파일100MB, 업로드 시트 기반 차트 | 개인 계정의 현재 구독, **sales-v1.xlsx를 변환 없이 입력** 가능한지, 계산·차트 실물·다운로드. Google Sheets나 새 시트 생성 성공으로 대체하지 않음 |
| Grok / `grok.com` | [소비자 FAQ](https://docs.x.ai/grok/faq): PDF/XLSX, 일반 파일150MB, 웹 약100개; 플랫폼·구독별 차이 | 실제 구독명과 지역, 기존 XLSX 분석·차트·PDF 단계 작업. Grok Bot/API/X 내 경로와 혼동하지 않음 |

현재 내부 경로는 ChatGPT Free/Plus, Claude Free/Pro, Gemini Free/Google AI Pro와 `grok-unreviewed`입니다. 이는 지금 보유한 계정이나 최신 전체 플랜 목록을 뜻하지 않습니다. 다른 플랜이 보이면 가장 가까운 기존 ID로 대체하지 말고 실제 플랜명·공식 근거·계정 권한을 별도로 기록합니다.

Grok의 `grok-unreviewed`는 실플랜 확인을 마친 ID가 아닙니다. 기존 `evaluation:prepare`는 이 경로와 미확인 과제 경로를 거부할 수 있습니다. 이번 준비표는 Grok을 조사 우선 대상으로 지정했으며 실행 허용 목록이나 지원 상태를 바꾸지 않습니다. 실제 플랜·기능 확인 후 카탈로그의 정확한 경로를 검토하고 기존 검증·준비 명령으로 넘어갑니다. Gemini XLSX도 기존 준비 필터가 아직 제한하므로 문서의 일반 차트 지원만으로 해제하지 않습니다.

## 2. 과제별 실행 전 확인

| 과제 | 사전 확인 | 공통 입력·기준 |
| --- | --- | --- |
| A `survey-v1` | 한국어 문항 작성 가능. 실제 설문 폼 생성 권한은 요구하지 않음 | 고정 프롬프트, 필수6문항·중립성·선택지·실사용 가능성 |
| B `xlsx-v1` | 기존 XLSX 입력·분석·계산·막대 차트, 실제 차트 산출물 확인 | 원본 `sales-v1.xlsx` 하나. 변환·새 파일 생성으로 입력 성공을 대체하지 않음 |
| C `pdf-v1` | 텍스트 PDF 입력·내용 추출·요약에서 대본까지 정보 전달 | 원본 `library-pilot-v1.pdf` 하나. 사실·페이지·누락·450~650어절, 실제 낭독은 별도270~330초 |

지원하지 않는 과제는 실행을 강행하거나 다른 서비스 결과를 채우지 않습니다. 실행할 수 없으면 예약 칸에 사유를 적고 미실행으로 둡니다. 사용량 소진이면 재시도 가능한 시각을 기록합니다.

## 3. 24개 예약 칸과 비교 조건

준비 JSON은 ChatGPT·Claude·Gemini·Grok 각각 A/B/C 두 회차를 예약합니다. **예약은 실행 기록이 아닙니다.** `testedAt`, 실제 planId, 출력, 점수, 소요 시간은 모두 null입니다. 계정 확인이 끝난 과제부터 진행하며 최소2회가 불가능하면 수행한 회차와 사유만 기록합니다. 누락 회차를 복제하지 않습니다.

각 회차는 새 대화·고유 sessionId·고유 실행 증거 파일을 사용합니다. 이전 출력·정답·다른 회사 결과를 넣지 않습니다. 준비 JSON의 과제 prompt와 입력 파일만 서비스에 전달합니다. 가능하면 7일 이내 같은 평가 기간에 진행하고 플랜·모드·도구·UI 변경이나 한도 소진은 기록합니다. 변경된 환경은 동일 비교 집합에 섞지 않습니다.

2회는 파일럿의 최소 반복 기준입니다. 결과 차이가 크면 향후 반복을 늘려야 하며, 두 회차가 있다는 이유로 성능 순위나 통계적 우위를 선언하지 않습니다.

## 4. 실측 실행 기록과 시간 기준

`execution-record-template.json`을 복사해 실제 실행 후 채웁니다. 기존 실행 양식에 다음 필드를 추가해도 기존 타입·파일 검증과 호환됩니다. 이번 작업에서는 운영 타입·엔진을 확장하지 않았습니다.

| 요청한 기록 | 기존 체계에 기록할 위치 |
| --- | --- |
| 회사·서비스·실제 플랜·경로 | EvaluationRun의 providerId/serviceId/planId/channel, 실행 기록의 actualPlanLabel·region |
| 일시·입력·프롬프트 | testedAt, caseId/promptVersion/rubricVersion/fixtureHash, inputFiles의 실제 이름·SHA-256, submittedPromptReference의 **실제로 제출한 전문** |
| 실제 출력 | 원문을 보존한 outputReference, outputSha256, actualResult, 실제 첨부 파일 및 해시 |
| 자동 채점 | 기존 `evaluation:grade`의 항목별 EvaluationScore. registry 자동 저장 없음 |
| 독립 루브릭 | 기존 익명 묶음, 두 독립 평가자의 실제 점수·evidence·verifiedAt·blindPacketId |
| 작업 성공·시간 | executionEvidence JSON의 taskCompleted/completionEvidence, startedAt/finishedAt/elapsedSeconds/clockSource |
| 오류·제한 | 실행 JSON의 errors/limitations/steps, run.notes의 요약 |

시간은 **사전 계정 확인이 끝난 뒤** 측정합니다. A는 고정 프롬프트를 제출하기 직전, B/C는 고정 원본 첨부를 시작하기 직전부터 해당 요청의 최종 결과와 필수 산출물이 준비되거나 실패가 확정될 때까지를 기록합니다. 업로드·생성·다운로드와 도중 대기를 포함하며 같은 과제에서 같은 기준을 사용합니다. 설정 준비·평가자의 검토 시간은 제외합니다. UTC ISO 시각과 실제 타이머를 기록하고 `elapsedSeconds`를 검산합니다. 미측정은 null이며 0초로 만들지 않습니다. 발표 낭독 시간은 이 작업 소요 시간과 별도 근거로 기록합니다.

`executionStatus:completed`는 채점할 실제 응답이 확보되었다는 뜻입니다. 요구 산출물을 모두 완성했는지는 `taskCompleted`로 별도 기록합니다. 응답은 있지만 차트가 빠졌다면 원문을 그대로 보존하고 미완료 근거를 적습니다. 응답을 얻지 못한 네트워크 오류는 failed, 사전 권한 부재는 blocked로 기록하며 품질 점수를 추정하지 않습니다.

빈 양식의 `freshConversation`, `accountRouteConfirmed`, 확인자는 실제 확인 후에만 채웁니다. 실제 시각·원문·근거를 만들지 않은 상태에서 completed로 바꾸지 않습니다.

## 5. 채점·반입 확인

기존 가이드대로 실제 run dataset을 검증한 다음 자동 채점·익명 리뷰를 준비합니다. `evaluation:validate`는 완전한 검증용이며 준비 JSON을 넣는 명령이 아닙니다.

```powershell
node scripts/provider-evaluation.mts validate .qa/evaluation/actual-dataset.json
node scripts/provider-evaluation.mts grade .qa/evaluation/actual-dataset.json 실제-runId
node scripts/provider-evaluation.mts blind .qa/evaluation/actual-dataset.json 실제-runId
```

가린 원문·도표·음성의 잔여 회사 단서를 담당자가 확인하고 수집자와 다른 두 평가자에게 독립적으로 배정합니다. 빈 루브릭은 null 상태를 유지하고 실제 평가 후에만 EvaluationScore를 만듭니다. 기록 양식과 명령은 외부 평가자에게 자동 전송하지 않습니다.

이번에 반입 게이트의 과제·Provider·Service·Plan·channel·지역·환경·입력 해시·프롬프트·루브릭·사용자 접근 조건 불일치와 demo/synthetic 거부를 추가로 검사했습니다. 불일치하면 승인 run ID와 수치 통계가 비고 점수는 null입니다. 유효한 과제 단위 실측이 완성되어도 회사 종합점수는 계속 null입니다.

운영 앱은 이 오프라인 평가 모듈을 import하지 않습니다. 실제 결과를 registry에 저장하는 것만으로 추천 점수나 순위가 켜지지 않습니다. 향후 명시적 연결 작업에서도 **기능/예산/접근 검사 → 같은 과제·조건의 실측 → 충분성 게이트 → 검토한 점수 정책** 순서를 따라야 합니다. 현재는 기존 공식 근거 기반의 조건 검사와 공동 후보만 사용할 수 있습니다.
