import type { DeliverableContract, GuideStage, PromptRequest } from '../types'
import { resolveConditions } from './promptEngine.ts'
import { deliverableIntent, resolveDeliverables } from './deliverables.ts'
import { renderDeliverable } from './deliverablePrompts.ts'

export function workStages(request:PromptRequest,coding:boolean,priorWork?:DeliverableContract):GuideStage[] {
  const c=resolveConditions(request)
  if(!coding){
    const intents=resolveDeliverables(request).filter(intent=>intent.category==='writing')
    if(!intents.length)intents.push(deliverableIntent('general_writing'))
    const ids={survey_final:'survey-compose',survey_plan:'survey-outline',report_outline:'outline',presentation_outline:'outline'} as Record<string,string>
    return intents.map((intent,index)=>{
      const previous=index>0?renderDeliverable(request,intents[index-1],c).contract:priorWork
      const {text,contract}=renderDeliverable(request,intent,c,{previous})
      const baseId=ids[intent.kind]??'compose'
      const id=intents.filter(other=>(ids[other.kind]??'compose')===baseId).length>1?`${intent.kind}-${baseId}`:baseId
      return {id,title:intent.label,purpose:`${intent.label}을 작성합니다.`,inputs:contract.inputs,output:intent.label,checks:['요청한 산출물과 모든 필수 조건 확인','제공되지 않은 사실·수치·개인정보가 없는지 확인'],handoff:[`직접 검토한 ${intent.label}·확인된 사실·남은 빈칸`],text,deliverable:contract}
    })
  }
  const conditions=Object.entries(c).filter(([,v])=>v.value).map(([k,v])=>`${({purpose:'목적',audience:'독자',format:'최종 형식',length:'최종 분량',tone:'말투',constraints:'필수 조건'} as Record<string,string>)[k]}: ${v.value}`).join('\n')
  const cleared=Object.entries(request.overrides).filter(([,value])=>!value?.trim()).map(([key])=>`${({purpose:'목적',audience:'독자',format:'형식',length:'분량',tone:'말투',constraints:'필수 조건'} as Record<string,string>)[key]}: 미정 (원문의 값을 확정하지 마세요)`)
  const context=[`작업 원문 (참고용)\n<원문>\n${request.text}\n</원문>`,conditions,...cleared,Object.keys(request.overrides).length?'위의 별도 수정 조건을 원문보다 우선 적용해 주세요.':''].filter(Boolean).join('\n\n')
  const make=(id:string,title:string,purpose:string,input:string,action:string,output:string,checks:string[],handoff:string[]):GuideStage=>{
    const intent=resolveDeliverables(request).find(intent=>intent.category==='coding')??deliverableIntent('code_fix')
    const {contract}=renderDeliverable(request,intent,c,{instruction:action})
    return {id,title,purpose,inputs:[input],output,checks,handoff,deliverable:{...contract,inputs:[input]},text:`${context}\n\n현재 단계 실행 지시\n단계 목표: ${purpose}\n\n[${input}]\n\n${action}\n\n결과 형식: ${output}\n이 단계의 결과만 제공하고 다른 단계 산출물은 함께 생성하지 마세요.\n검토 기준: ${checks.join(' / ')}`}
  }
  return [
    make('diagnose','원인 분석','요구사항·기대 동작과 재현 조건을 분석합니다.','관련 코드·오류 메시지·실행 환경·기대 동작을 붙여넣으세요',
      '코드의 데이터 흐름과 실패 지점을 추적하고, 확인된 원인과 가설을 구분해 주세요. 새 기능이면 요구사항과 기존 구조를 대조해 구현 위치와 영향을 설계해 주세요. 자료가 없으면 필요한 코드와 재현 입력을 요청해 주세요.',
      '재현 절차·원인 근거·구현/수정 계획', ['추측과 코드로 확인한 사실 구분','기존 동작과 변경 영향 확인'],['재현 입력·확인한 원인·수정 계획']),
    make('implement','코드 수정','원인과 요구사항에 맞는 실행 가능한 코드를 작성합니다.','앞 단계의 원인 분석·수정 계획과 원래 코드를 여기에 붙여넣으세요',
      '합의한 범위의 코드 또는 패치를 작성해 주세요. 관련 파일과 수정 이유, 필요한 의존성 및 실행 방법을 설명해 주세요. 전체 코드가 없으면 적용할 위치를 명확히 하고 존재하지 않는 함수·파일을 사실처럼 말하지 마세요.',
      '파일별 코드/패치·수정 이유·실행 방법',['기존 기능 보존','누락된 예외 처리·보안·의존성 확인'],['변경 코드·변경 이유·재현 입력']),
    make('test','테스트·검토','변경 코드의 동작과 회귀 위험을 검증합니다.','앞 단계의 변경 코드·재현 입력·원래 요구사항을 여기에 붙여넣으세요',
      '정상·경계·오류 입력과 원래 버그 재현 조건을 다루는 테스트를 작성하고 실행 명령 및 기대 결과를 알려 주세요. 실행할 수 있으면 실제 결과를 기록하고, 실행하지 않았다면 미실행으로 명시해 주세요. 실패 시 원인과 수정안을 제시해 주세요.',
      '테스트 코드·명령·실행 결과 또는 미실행 항목·남은 위험',['실행하지 않은 테스트를 통과했다고 하지 않기','회귀·경계·오류 입력 확인'],['검증한 최종 코드·테스트 결과·남은 문제']),
  ]
}
