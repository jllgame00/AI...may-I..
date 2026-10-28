// Editorial use-case preference, not a performance score. Only exact releases
// with the cited capability documentation may enter the unranked shortlist.
export const functionalProfiles=[
  {modelId:'Qwen/Qwen3-235B-A22B-Instruct-2507',version:'Qwen3-235B-A22B-Instruct-2507',source:QWEN_TABLE,
    analysis:'표의 변수 설명·문서 이해와 수학·논리 검토를 함께 시작할 수 있는 텍스트 이해 기능을 우선 검토합니다.',
    coding:'코드 생성과 지시 이행 기능으로 요구사항·패치 초안을 먼저 준비할 후보입니다.',
    writing:'지시 이행·개방형 텍스트 생성 기능으로 독자·분량·어조가 있는 초안을 먼저 준비합니다.'},
  {modelId:'moonshotai/Kimi-K2-Thinking',version:'Kimi-K2-Thinking',source:'https://huggingface.co/moonshotai/Kimi-K2-Thinking',
    analysis:'thinking과 긴 문맥 처리 기능으로 분석 가정·해석 한계를 단계별로 검토할 대안입니다.',
    coding:'thinking과 코드 작성 기능으로 버그 원인·수정 가정·검증 절차를 검토할 대안입니다.',
    writing:'긴 문맥 처리와 장문 생성 기능으로 긴 초안·논리 전개를 검토할 대안입니다.'},
  {modelId:'Qwen/Qwen3-30B-A3B-Instruct-2507',version:'Qwen3-30B-A3B-Instruct-2507',source:'https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507',
    analysis:'텍스트 이해·수학·논리 기능이 명시된 다른 생성 모델로 요약 통계 설명을 교차 검토합니다.',
    coding:'코드 생성 기능이 명시된 다른 모델로 패치 설명·테스트 조건을 교차 검토할 대안입니다.',
    writing:'지시 이행·텍스트 생성 기능이 확인된 대안으로 같은 초안 조건을 다시 시도할 수 있습니다.'},
]
