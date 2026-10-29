import type { GuideStage, PromptRequest } from '../types'
import { resolveConditions } from './promptEngine.ts'

export function workStages(request:PromptRequest,coding:boolean):GuideStage[] {
  const c=resolveConditions(request)
  const conditions=Object.entries(c).filter(([,v])=>v.value).map(([k,v])=>`${({purpose:'목적',audience:'독자',format:'최종 형식',length:'최종 분량',tone:'말투',constraints:'필수 조건'} as Record<string,string>)[k]}: ${v.value}`).join('\n')
  const cleared=Object.entries(request.overrides).filter(([,value])=>!value?.trim()).map(([key])=>`${({purpose:'목적',audience:'독자',format:'형식',length:'분량',tone:'말투',constraints:'필수 조건'} as Record<string,string>)[key]}: 미정 (원문의 값을 확정하지 마세요)`)
  const context=[`작업 원문\n${request.text}`,conditions,...cleared,Object.keys(request.overrides).length?'위의 별도 수정 조건을 원문보다 우선 적용해 주세요.':''].filter(Boolean).join('\n\n')
  const make=(id:string,title:string,purpose:string,input:string,action:string,output:string,checks:string[],handoff:string[]):GuideStage=>({
    id,title,purpose,inputs:[input],output,checks,handoff,text:`${context}\n\n단계 목표: ${purpose}\n\n[${input}]\n\n${action}\n\n결과 형식: ${output}\n검토 기준: ${checks.join(' / ')}`})
  if(coding)return [
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
  return [
    make('outline','메시지 구성','독자에게 전달할 핵심 내용과 글의 흐름을 설계합니다.',/홍보|모집|광고/.test(request.text)?'행사·상품·단체 정보, 전달할 사실, 필수 문구를 붙여넣으세요':'글·대본의 주제·목적·독자·사용할 사실과 필수 문구를 붙여넣으세요',
      '독자와 글의 목적을 정리하고 핵심 메시지·근거·행동 유도를 구성해 주세요. 홍보 글이면 이름·대상·일정·참여 방법이 부족할 때 필요한 내용만 요청해 주세요. 없는 혜택·성과·출처를 만들지 마세요.',
      '핵심 메시지·문단별 개요·추가로 필요한 정보',['주장과 제공 사실 일치','독자와 목적에 맞는 흐름'],['확인한 사실·메시지·개요']),
    make('compose','홍보 글 초안','확인한 개요에 따라 바로 사용할 글을 작성합니다.','앞 단계의 확인한 사실·메시지·개요를 여기에 붙여넣으세요',
      '원래 요청과 수정 조건에 맞는 완성 초안을 작성해 주세요. 도입에서 핵심 매력을 전달하고 필요한 정보를 자연스럽게 연결해 주세요. 홍보 목적이면 참여 방법을 명확히 제시하고 확인되지 않은 내용은 빈칸으로 표시해 주세요.',
      `${c.length.value||'요청한 분량'} 분량의 ${c.format.value||'글'} 초안 및 확인할 빈칸`,['분량·말투·독자 조건 반영','근거 없는 과장 금지'],['완성 초안·확인한 사실·남은 빈칸']),
    make('polish','검토·다듬기','초안의 조건·사실·가독성을 대조하고 최종본을 만듭니다.','앞 단계의 초안·확인한 사실·원래 작성 기준을 여기에 붙여넣으세요',
      '요구사항 누락, 모호한 표현, 사실 불일치와 과장을 찾아 수정 이유를 적고 최종본을 작성해 주세요. 새 사실이나 출처는 추가하지 마세요.',
      `수정 이유와 ${c.length.value||'요청한 분량'} 최종본`,['원래 사실·일정·참여 방법 대조','분량·말투·오탈자 확인'],['직접 검토한 최종 글']),
  ]
}
