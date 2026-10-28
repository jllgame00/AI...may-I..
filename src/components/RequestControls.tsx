import { priorityLabels } from '../data/services'
import type { Priority, UsageRoute } from '../recommendationTypes'
import type { PromptRequest } from '../types'

const routes:Record<UsageRoute,string>={consumer:'소비자 웹서비스 · Chat / Work',chat:'일반 웹 채팅',work:'ChatGPT Work (웹)',api:'개발자 API · 직접 실행'}
export default function RequestControls({ request,onChange }: { request:PromptRequest; onChange:(request:PromptRequest)=>void }) {
  return <div className="request-controls">
    <fieldset><legend>우선순위</legend><div className="radio-options">{(Object.entries(priorityLabels) as [Priority,string][]).map(([value,label])=><label key={value}><input type="radio" name="priority" checked={(request.priority ?? 'quality')===value} onChange={()=>onChange({...request,priority:value})}/>{label}{value==='quality'?' 우선':''}</label>)}</div></fieldset>
    <label className="step-choice" htmlFor="usage-route">이용 경로<select id="usage-route" value={request.usageRoute ?? 'consumer'} onChange={e=>onChange({...request,usageRoute:e.target.value as UsageRoute})}>{Object.entries(routes).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <p className="minor-note">{request.usageRoute==='api'?'API는 월 구독과 별도인 사용량 과금입니다. 개발 환경에서 직접 설정·실행하며 이 사이트는 호출하거나 결제하지 않아요.':'일반 Chat과 Work의 제공 모델·도구 권한은 다를 수 있어요. 선택 경로를 실제 계정에서 확인하세요.'} 품질·속도 선호만으로 성능 순위를 만들지 않아요.</p>
  </div>
}
