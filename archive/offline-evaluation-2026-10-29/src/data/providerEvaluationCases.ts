import manifest from '../../evaluations/fixtures/manifest.json' with {type:'json'}
import registry from '../../evaluations/results/registry.json' with {type:'json'}
import type { EvaluationCase, EvaluationDataset, RubricMetric } from '../evaluationTypes'
const automatic=(metricId:string,description:string):RubricMetric=>({metricId,description,maximumScore:1,gradingMethod:'automatic'})
const manual=(metricId:string,description:string):RubricMetric=>({metricId,description,maximumScore:4,gradingMethod:'manual'})

export const evaluationCases:EvaluationCase[]=[
  {
    caseId:'survey-v1',taskCategory:'survey',description:'대학생 도서관 이용 설문 초안. 실제 폼 생성과 구분.',inputFixture:[],requiredCapabilities:['textEditing','surveyDraft'],promptVersion:'survey-p1',rubricVersion:'survey-r1',
    prompt:`가상 대학 도서관의 이용 경험을 조사하는 한국어 설문 문항 6개를 작성하세요. 개인정보는 묻지 마세요. 목적은 시설 개선 우선순위 파악입니다. 필수 질문 ID: year(학년), frequency(이용 빈도), purpose(주요 이용 목적), satisfaction(만족도 5점 척도), barrier(이용 장벽, 이용하지 않음 포함), improvement(개선 제안, 선택 서술형). 중립적 표현과 겹치지 않는 선택지를 사용하고 해당 없음/응답 거절을 적절히 제공하세요. Google Forms 등 실제 폼을 만들었다고 주장하지 마세요. JSON 객체 {questions:[{id,text,type,options:[]}],formCreated:false}로 답하세요. type은 single, multiple 또는 text입니다.`,
    expectedResult:{questionIds:['year','frequency','purpose','satisfaction','barrier','improvement'],questionCount:6,formCreated:false},
    metrics:[automatic('required-questions','필수 ID와 빈 내용 없는 문항 6개. 의미 적합성은 별도 수동 확인.'),automatic('question-format','중복 ID 없음, 질문 유형과 선택지 형식 충족.'),automatic('no-form-claim','폼 생성 주장을 하지 않음.'),manual('clarity','질문 의미와 응답 대상·기간이 명확함.'),manual('neutrality','중복·유도·이중 질문이 없고 선택지가 중립적임.'),manual('usability','필수 의미, 포괄적 선택지, 5점 척도와 선택 서술형이 실제 사용 가능함.')],
  },
  {
    caseId:'xlsx-v1',taskCategory:'xlsx-analysis',description:'첨부된 기존 XLSX의 12행 매출 분석. 새 파일 생성은 입력 성공 증거가 아님.',inputFixture:['evaluations/fixtures/sales-v1.xlsx'],requiredCapabilities:['xlsxInput','xlsxAnalysis','chartCreation'],promptVersion:'xlsx-p1',rubricVersion:'xlsx-r1',
    prompt:`첨부한 sales-v1.xlsx의 Sales 시트를 직접 읽어 분석하세요. revenue=units*unitPrice입니다. 행 수, 전체 revenue 합계·평균, South이면서 units>=10인 행의 revenue 합계, North/South별 합계를 계산하세요. 월별 revenue 합계의 세로 막대 차트를 생성하고 실제 차트 산출물을 제공하세요. 외삽이나 인과 추정을 하지 마세요. JSON {inputFileName,inputSheet,rowCount,totalRevenue,averageRevenue,filteredRevenue,groupRevenue:{North,South},chart:{type:"bar",labels:[],values:[]},interpretation:""}를 반환하고 차트를 첨부하세요. 수치는 소수점 6자리 이내로 쓰세요. 파일을 읽지 못하면 실패했다고 명시하세요.`,
    expectedResult:{inputFileName:'sales-v1.xlsx',inputSheet:'Sales',inputSha256:manifest.files['sales-v1.xlsx'],rowCount:12,totalRevenue:2000,averageRevenue:2000/12,filteredRevenue:940,groupRevenue:{North:890,South:1110},chart:{type:'bar',labels:['2026-01','2026-02','2026-03'],values:[500,740,760]}},
    metrics:[automatic('input-identity','캡처 작성자가 원본 해시를 기록하고 출력 파일명·시트·행 수 확인. 실제 업로드는 수동 확인.'),automatic('total','합계 일치.'),automatic('average','평균 절대오차 <= 0.000001.'),automatic('filter','South AND units>=10 합계.'),automatic('groups','지역 합계 정확성.'),automatic('chart-data','차트 유형·월 순서·계열 값 일치. 그림 자체는 수동 확인.'),manual('file-and-chart','업로드 로그와 실제 차트 이미지·축·단위·다운로드 확인.'),manual('interpretation','본문의 모든 숫자와 해석이 자료에 부합하고 허위 인과 주장이 없음.')],
  },
  {
    caseId:'pdf-v1',taskCategory:'pdf-script',description:'합성 PDF 분석 → 핵심 정리 → 한국어 5분 발표 대본.',inputFixture:['evaluations/fixtures/library-pilot-v1.pdf'],requiredCapabilities:['pdfInput','pdfAnalysis','textEditing','multiStepWork'],promptVersion:'pdf-p1',rubricVersion:'pdf-r1',
    prompt:`첨부한 library-pilot-v1.pdf만 근거로 분석하고 한국어 핵심 요약과 5분 발표용 대본을 작성하세요. 참가자 수(participants), 완료자 수(completed), 완료율(completionRate), 이전 주당 시간(hoursBefore), 이후 시간(hoursAfter), 사용 예산(pilotSpend)을 실제 PDF 페이지 번호와 함께 기록하세요. 비무작위·단일 캠퍼스·4주·미완료자 편향의 한계와 후속 검증을 설명하세요. 학점 상승이나 전국적 절감 효과를 주장하지 마세요. 대본은 공백으로 구분한 어절 450~650개로 쓰고 도입/결과/한계/마무리를 포함하세요. 이 어절 범위는 형식 기준이며 5분의 증명이 아닙니다. JSON {inputFileName,summaryFacts:[{factId,value,page}],scriptFacts:[{factId,value,page}],script:"...",limitations:[]}로 반환하세요. scriptFacts는 대본에 실제로 포함한 사실만 기록하세요. 읽지 못하면 명시하세요.`,
    expectedResult:{inputFileName:'library-pilot-v1.pdf',inputSha256:manifest.files['library-pilot-v1.pdf'],facts:[{factId:'participants',value:120,page:1},{factId:'completed',value:96,page:1},{factId:'completionRate',value:80,page:1},{factId:'hoursBefore',value:12,page:2},{factId:'hoursAfter',value:9,page:2},{factId:'pilotSpend',value:2400,page:2}],wordBand:[450,650]},
    metrics:[automatic('input-identity','수동 캡처의 원본 해시와 출력 파일명 일치.'),automatic('summary-facts','요약의 6개 지정 사실·숫자·페이지 전부 일치.'),automatic('handoff-facts','대본 사실 필드의 6개 지정 사실·숫자·페이지 전부 일치.'),automatic('script-length','450~650 공백 어절. 발표 시간으로 환산하지 않음.'),manual('grounding','대본 본문·인용 페이지·사실 필드를 대조하고 허위 내용과 누락 확인.'),manual('structure','도입·결과·한계·마무리와 단계 간 일관성.'),manual('delivery','독립 낭독 270~330초, 음성/타이밍 근거 기록. 미측정은 미채점.')],
  },
]

// No external service was invoked. Never populate this with example output.
export const evaluationDataset=registry as EvaluationDataset
export const fixtureManifest=manifest
