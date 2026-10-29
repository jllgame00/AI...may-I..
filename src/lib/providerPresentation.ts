import { capabilityLabels } from '../data/providerPolicy.ts'
import { stageOptions } from './aiGuide.ts'
import type { CapabilityCheck, PlanAssessment } from '../providerTypes'
import type { Comparison, GuideStage } from '../types'
export function accessSummary(option:PlanAssessment,alternatives:PlanAssessment[]=[]):{selected:string;free:string} {
  const verifiedFree=(o:PlanAssessment)=>o.plan.tier==='free'&&o.plan.price.amount===0&&o.plan.price.evidenceIds.some(id=>o.evidence.some(e=>e.id===id&&e.verification==='reviewed'&&e.planIds.includes(o.id)&&e.serviceId===o.service.id))
  const free=[option,...alternatives].filter(verifiedFree)
  return {selected:verifiedFree(option)?'무료로 사용 가능 · 사용량 제한 확인':option.plan.tier==='paid'?'이 추천 경로는 유료 이용 필요':'무료·유료 조건 확인 필요',free:free.some(o=>o.status==='eligible')?'이 작업의 무료 경로 확인':free.length?'무료 범위의 필수 기능·한도 확인 필요':'이 작업의 무료 경로 미확인'}
}
export const featureStatus=(o:PlanAssessment)=>o.checks.some(c=>c.status==='unsupported')?'필수 기능 조건 불일치':o.checks.length&&o.checks.every(c=>c.status==='supported')?'필수 기능 사용 확인':'필수 기능 사용 여부 추가 확인'
export const supportStatus=(c:CapabilityCheck)=>c.status==='supported'?'사용 가능 확인':c.status==='unsupported'?'현재 조건과 불일치':c.status==='limited'?'제한 범위 확인 필요':'사용 가능 여부 미확인'
export function conditionNotes(o:PlanAssessment):string[] {
  return [...o.checks.filter(c=>c.status!=='supported').map(c=>`${capabilityLabels[c.id]}: ${supportStatus(c)}`),...(o.budgetStatus==='unknown'?['무료 제공 또는 입력한 예산 조건을 추가로 확인하세요.']:o.budgetStatus==='unmet'?['입력한 무료·예산 조건과 맞지 않습니다.']:[])]
}
export function usageSteps(o:PlanAssessment):string[] {
  const files=o.checks.some(c=>['fileUpload','pdfUpload','pdfAnalysis','spreadsheetAnalysis'].includes(c.id))
  const image=o.checks.some(c=>c.id==='imageGeneration'),code=o.checks.some(c=>c.id==='codeExecution')
  return [`${o.service.name}을 열고 필요한 기능을 사용할 수 있는지 확인하세요.`,files?'파일 형식·크기·개수와 남은 사용량을 확인한 뒤 자료를 첨부하세요.':image?'이미지 생성 기능에서 원하는 구도·문구·비율과 남은 생성량을 확인하세요.':code?'계산 실행 기능의 활성화와 필요한 언어·환경을 확인하세요.':'작업에 필요한 자료와 원하는 결과물의 형식을 준비하세요.','맞춤 프롬프트를 편집·복사해 붙여넣고, 결과를 원자료·요구사항과 대조하세요.']
}
export function providerStageOptions(comparison:Comparison,stage:GuideStage,selectedId?:string):PlanAssessment[] {
  const options=stageOptions(comparison,stage)
  return [...new Set(options.map(o=>o.provider.id))].map(id=>{
    const own=options.filter(o=>o.provider.id===id)
    return own.find(o=>o.id===selectedId)??own[0]
  }).sort((a,b)=>Number(a.status!=='eligible')-Number(b.status!=='eligible')||a.provider.name.localeCompare(b.provider.name,'en'))
}
