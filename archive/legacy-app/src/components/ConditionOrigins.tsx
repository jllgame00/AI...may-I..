import type { ConditionField, RequestInput } from '../types'
const labels: Record<ConditionField,string> = { budget: '예산', tasks: '작업 종류', requiredFeatures: '필수 기능', pdfType: 'PDF 형태', volume: '파일 분량', duration: '결과 분량', output: '결과 형태' }
export default function ConditionOrigins({ request }: { request: RequestInput }) {
  return <details className="condition-origins"><summary>조건 해석의 출처 확인</summary><p>직접 수정한 값은 자동 추정보다 우선합니다. ‘잘 모르겠어요’는 미정으로 유지합니다.</p><dl>{(Object.entries(labels) as [ConditionField,string][]).map(([key,label]) => <div key={key}><dt>{label}</dt><dd>{request.conditionSources?.[key] === 'user' ? '사용자 직접 선택·수정 (미정 선택 포함)' : request.conditionSources?.[key] === 'inferred' ? '입력 문장에서 추정' : '미정 · 근거 없음'}</dd></div>)}</dl></details>
}
