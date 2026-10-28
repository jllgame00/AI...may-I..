import type { Analysis, ServiceId, WorkflowStep } from '../recommendationTypes'

// Legacy workflow callers share the same task-only contract as the current UI.
export function buildPrompt(analysis:Analysis, _serviceId:ServiceId, workflow:WorkflowStep[], stepId?:string):string {
  const step=workflow.find(s=>s.id===stepId)??workflow[0]
  return [analysis.request.text,step?`${step.title}을 진행하고 ${step.output}을 작성해 주세요.`:'요청한 작업을 진행해 주세요.', analysis.kind==='image'?'실제 이미지가 필요한 경우 지원 도구에서 생성하세요. 이미지를 만들지 않았다면 이미지가 생성되었다고 말하지 마세요.':'', '[필요한 자료 또는 앞 단계 결과를 붙여넣으세요]', '자료가 없으면 먼저 요청하고, 수치·출처를 만들지 마세요.'].join('\n\n')
}
