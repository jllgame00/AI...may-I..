export const POLICY_VERSION = 'task-evidence-ranking-v3.0.0'
export const featureLabels = { pdf: 'PDF 업로드·내용 분석', web: '웹 검색', upload: '일반 파일 업로드', imageInput: '이미지 입력', spreadsheet: '표·스프레드시트 분석', code: '코드 실행 도구', imageGeneration: '실제 이미지 생성 도구' } as const
export const scoringTaskLabels = { analysis: '자료 분석', writing: '발표 대본·글쓰기', coding: '코딩·버그 수정' } as const
