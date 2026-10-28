import { budgetLabels, priorityLabels } from '../data/services'
import type { Budget, Priority } from '../recommendationTypes'
import type { PromptRequest } from '../types'

export default function RequestControls({ request,onChange }: { request:PromptRequest; onChange:(request:PromptRequest)=>void }) {
  return <div className="request-controls"><fieldset><legend>예산</legend><div className="radio-options">{(Object.entries(budgetLabels) as [Budget,string][]).map(([value,label]) => <label key={value}><input type="radio" name="budget" checked={(request.budget ?? 'free')===value} onChange={() => onChange({ ...request,budget:value })} />{label}</label>)}</div></fieldset><fieldset><legend>우선순위</legend><div className="radio-options">{(Object.entries(priorityLabels) as [Priority,string][]).map(([value,label]) => <label key={value}><input type="radio" name="priority" checked={(request.priority ?? 'quality')===value} onChange={() => onChange({ ...request,priority:value })} />{label}{value==='quality' ? ' 우선' : ''}</label>)}</div></fieldset><p className="minor-note">품질·속도 선호를 측정된 성능 순위로 해석하지 않아요.</p></div>
}
