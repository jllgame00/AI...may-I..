import type { Recommendation } from '../recommendationTypes'

export function unassignedExecution(c:Recommendation):string {
  const model=c.model!
  const mode=c.mapping.mode?`확인할 추론 설정: ${c.mapping.mode}.`:'공식 선택 가능한 추론 모드는 미확인입니다. 설정 값을 임의로 만들지 마세요.'
  const target=`정확한 모델 ${model.name} / 버전 ${model.version} / 식별자 ${model.id}. ${mode}`
  if(c.mapping.routeKind==='chat')return `${target} 이 고정 모델의 호스팅 전용 웹 데모입니다. 로그인·크레딧·이용 한도를 확인한 뒤 직접 사용하세요. ${c.mapping.note} 모델·양자화·도구·추론 설정이 평가와 같은지 별도로 확인하세요.`
  if(c.mapping.routeKind==='self-hosted')return `${target} 이 ID는 공식 가중치 체크포인트입니다. API 모델 ID로 간주하지 마세요. 공식 카드의 라이선스·장비·메모리·추론 서버 설정을 확인한 뒤 직접 호스팅해야 합니다. 실제 실행과 소비자 구독 서비스 제공은 미확인입니다.`
  if(c.mapping.routeKind==='api'){
    const apiId=c.mapping.hostedModelId??(!c.mapping.accessRouteId&&model.route?.kind==='api'?model.id:null)
    return `${target} 확인한 호스팅 API 경로입니다. ${apiId?`이 경로의 API용 모델 ID: ${apiId}. 등록 체크포인트 ID와 구분해 설정하세요.`:'호스팅 사업자의 API용 모델 ID는 미확인입니다. 등록 체크포인트 ID를 임의 API 인자로 넣지 말고 공식 연결 안내에서 확인하세요.'} 고정 버전·계정 권한·호출 방식·요금·사용 한도를 확인하고 직접 설정하세요. ${c.mapping.note} 소비자 채팅 구독에서의 선택 가능 여부는 미확인입니다. 이 사이트는 키를 받거나 API를 호출하지 않습니다.`
  }
  return `${target} 현재 정확한 버전을 실행할 경로가 미확인입니다. 링크는 공식 발표·모델 근거이며 실행 가능한 채팅 서비스가 아닐 수 있습니다. 다른 버전으로 자동 대체됐다고 가정하지 마세요.`
}
export function configurationExecution(c:Recommendation):string {
  const e=c.configuration
  if(!e)return ''
  return `\n선택한 평가 실행 구성: ${e.benchmark} ${e.benchmarkVersion} / ${e.subset??'하위집합 미공개'}.\n에이전트: ${e.agentName??'이름 미공개'} / 버전: ${e.agentVersion??'미공개'}.\n평가 추론 설정: ${e.effort??'미공개'}. 도구: ${e.tools??'미공개'}. 하네스: ${e.harness??'미공개'}. 환경: ${e.environment??'미공개'}. 시도 횟수: ${e.trials??'미공개'}. fallback: ${e.fallbacks??'미공개 (없음으로 가정하지 않음)'}.\n이 결과는 모델·도구 실행 구성 평가이며 일반 채팅의 모델 단독 성능이 아닙니다. 미공개 설정을 추측하거나 같은 결과가 재현된다고 말하지 마세요. 실제 환경에서 필요한 도구와 권한을 직접 확인하세요.`
}
