export const surveyRequest = `대학교 재학생의 생성형 AI 활용 실태를 조사하기 위한 설문지를 작성해 주세요.

조건:
1. 총 10문항
2. 객관식 7개, 5점 척도 2개, 주관식 1개
3. AI 사용 빈도, 사용 목적, 만족도, 우려 사항 포함
4. 응답 대상은 대학생
5. 응답자의 선택을 유도하는 질문 금지
6. 모든 객관식 문항에 선택지 포함
7. 결과는 설문 도구에 옮기기 쉽게 정리
8. 응답하지 않을 권리를 안내하고 불필요한 개인정보 수집 금지

각 문항의 질문 유형과 선택지를 명확히 표시해 주세요.`

// The text subsequently supplied as the prompt used in the service experiment.
// It contains no company-specific additions or selected-stage information.
export const suppliedServicePrompt = surveyRequest
  .replace('우려 사항 포함', '우려 사항을 포함')
  .replace('불필요한 개인정보 수집 금지', '불필요한 개인정보는 수집하지 말 것')
