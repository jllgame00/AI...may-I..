import { featureLabels } from '../data/recommendationPolicy.ts'
import type { FeatureId, Recommendation, Source } from '../recommendationTypes'
import { assessCandidate, exactWebModel, hasSupportSource } from './taskReadiness.ts'

const shortFeatures: Record<FeatureId,string> = {pdf:'PDF 분석',web:'웹 검색',upload:'파일 첨부',imageInput:'이미지 입력',spreadsheet:'엑셀 분석',code:'코드 실행',imageGeneration:'이미지 생성'}
export function candidateSummary(c:Recommendation, required:FeatureId[]) {
  const assessment=c.assessment??assessCandidate(c,required)
  const requirements=[`웹 모델 제공: ${exactWebModel(c)?'정확한 모델·버전 지원 확인':'정확한 모델·버전 미확인'}`,...required.map(f=>{
    const support=c.plan.features[f]
    const label=f==='spreadsheet'?'엑셀 입력·분석':f==='code'?'계산 실행':shortFeatures[f]
    const status=!hasSupportSource(support)?'미확인':support?.status==='supported'?'지원 확인':support?.status==='unsupported'?'미지원 확인':support?.status==='limited'?'제한적 지원 확인 · 작업 한도 확인 필요':'미확인'
    return `${label}: ${status}`
  })]
  // Holds reflect this specific route, including Work's unconfirmed tools.
  const pending = required.filter(f=>c.holds.some(h=>h.startsWith(featureLabels[f]+':')))
  const supported = required.filter(f=>!pending.includes(f) && c.plan.features[f]?.status==='supported' && c.plan.features[f]?.sources.some(s=>s.url&&s.checkedAt))
  const facts = supported.length?[`${supported.map(f=>shortFeatures[f]).join('·')} 지원 근거 확인`]:[]
  // A benchmark is a fact, never an invented claim of superiority. Agent
  // execution results are available in details, not web-chat fit claims.
  const evaluation = c.evidence?.find(e=>e.evaluationType==='model'&&e.rawScore!==null&&e.domain!=='writing')
  if(evaluation)facts.push(`${evaluation.benchmark}${evaluation.subset?` · ${evaluation.subset}`:''}: ${evaluation.rawScore}${evaluation.unit} (해당 평가 기준)`)
  const limits = pending.length?[`${pending.map(f=>`${shortFeatures[f]}${c.holds.some(h=>h.startsWith(featureLabels[f]+':')&&h.includes('제한적'))?' 한도':' 지원'}`).join('·')} 확인 필요`]:[]
  if(c.accessStatus==='연결 미확인')limits.push('이 모델의 선택 가능 여부 확인 필요')
  if(!limits.length && /FP8/.test(c.mapping.note))limits.push('FP8 제공 경로로, 평가 당시 실행 조건과 차이가 있어요')
  const confirmed=assessment.features.status==='confirmed'
  const reason=assessment.input.status==='unknown'?'원자료 파일인지 요약 통계 직접 입력인지 정하면 필요한 도구를 확인할 수 있습니다.':confirmed&&required.includes('spreadsheet')&&required.includes('code')?'엑셀 파일을 첨부해 계산·분석하고 결과표를 만들 수 있습니다.':
    supported.length?`${supported.map(f=>shortFeatures[f]).join('·')} 지원 근거를 확인했습니다.`:
    required.length?'분석 방법과 코드를 준비할 텍스트 작업 후보입니다. 파일 분석 도구는 확인이 필요합니다.':'텍스트로 요청한 작업을 시작하고 결과를 검토할 후보입니다.'
  const importantLimit=assessment.input.status==='unknown'?'입력 자료 형태를 먼저 선택하세요. 기능 요구사항이 아직 확정되지 않았습니다.':assessment.start==='ready'?'개인 계정의 도구 활성화·파일 한도·남은 사용량은 확인하지 않았습니다.':
    !c.model?`${assessment.features.pending.length?`${assessment.features.pending.map(f=>shortFeatures[f]).join('·')} 지원과 `:''}사용할 모델을 서비스에서 확인하세요. 계정의 잔여 한도는 미확인입니다.`:
    [!exactWebModel(c)?'이 버전의 웹 선택 가능 여부':null,...assessment.features.pending.map(f=>`${shortFeatures[f]}${c.plan.features[f]?.status==='limited'?' 처리 범위':' 지원'}`)].filter(Boolean).join('·')+' 확인 필요'
  const routeLimit=/FP8/.test(c.mapping.note)?' FP8 제공으로 평가 실행 조건과 차이가 있습니다.':''
  const cardLimit=(assessment.start==='ready'?'':importantLimit.replace(' 계정의 잔여 한도는 미확인입니다.',''))+routeLimit
  return {facts:facts.slice(0,2),requirements,reason,limit:importantLimit+routeLimit,cardLimit}
}
export function accountCheck(c:Recommendation, required:FeatureId[]):string {
  return `사용할 계정에서 ${c.model?.name??c.service.name}${c.mapping.mode?` (${c.mapping.mode})`:''} 선택${required.length?`과 ${required.map(f=>shortFeatures[f]).join('·')} 사용 가능 여부 및 한도`:'과 사용 한도'}를 확인하세요.`
}
export function userFacingLimit(limit:string):string {
  if(/(?:Chat.*Work|Work.*Chat|권한.*확장|일반 Chat)/.test(limit))return '사용할 화면의 모델 선택과 도구 권한을 계정에서 확인하세요.'
  if(/API.*(?:구독|플랜|도구)|일반 Chat 한도/.test(limit))return '선택한 서비스에서 필요한 도구와 사용 한도를 확인하세요.'
  return limit
}
export function sourceLabel(source:Source):string {
  const url=new URL(source.url)
  const path=decodeURIComponent(url.pathname)
  if(url.hostname==='learn.chatgpt.com'&&path.includes('/models'))return 'ChatGPT Work 모델·추론 설정 안내'
  if(path.includes('introducing-gpt-6-1-sol'))return 'OpenAI GPT-6.1 Sol 발표·평가'
  if(path.includes('introducing-gpt-6-1-terra'))return 'OpenAI GPT-6.1 Terra 발표·평가'
  if(path.includes('gpt-6-astra'))return 'OpenAI GPT-6 Astra 발표'
  if(path.includes('/api/docs/models'))return 'OpenAI 모델별 기능·설정 문서'
  if(path.includes('claude-opus-5-5'))return 'Claude Opus 5.5 발표·평가'
  if(path.includes('claude-sonnet-5-5'))return 'Claude Sonnet 5.5 발표·평가'
  if(path.includes('choosing-the-right-claude-model'))return 'Claude Academy 모델·플랜 제공 안내'
  if(path.includes('create-and-edit-files-with-claude'))return 'Claude 웹 코드 실행·파일 생성 안내'
  if(path.includes('upload'))return `${url.hostname} 파일 업로드 안내`
  if(path.includes('pricing')||path.includes('subscriptions'))return `${url.hostname} 요금·플랜 안내`
  if(path.includes('release-notes'))return `${url.hostname} 모델·기능 출시 안내`
  if(source.scope)return `${url.hostname} · ${source.scope}`
  // Human-readable document identity even for evidence without a saved title.
  return `${url.hostname} · ${path.split('/').filter(Boolean).at(-1)?.replace(/[-_]/g,' ')||'서비스 안내'}`
}
