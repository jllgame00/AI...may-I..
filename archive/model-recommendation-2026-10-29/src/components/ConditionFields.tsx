import { fieldHints, fieldLabels, resolveConditions } from '../lib/promptEngine'
import type { ConditionField, PromptRequest } from '../types'

export default function ConditionFields({ request, fields, onChange }: { request: PromptRequest; fields: ConditionField[]; onChange: (field: ConditionField, value: string) => void }) {
  const conditions = resolveConditions(request)
  return <div className="condition-fields">{fields.map(field => <label key={field} htmlFor={`condition-${field}`}><span>{fieldLabels[field]} <small>{conditions[field].source === 'input' ? '입력에서 확인' : conditions[field].source === 'user' ? conditions[field].value ? '직접 수정' : '미정' : '선택 입력'}</small></span><input id={`condition-${field}`} value={conditions[field].value} maxLength={field === 'constraints' ? 500 : 200} placeholder={fieldHints[field]} onChange={e => onChange(field,e.target.value)} /></label>)}</div>
}
