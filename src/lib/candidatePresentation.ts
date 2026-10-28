import { featureLabels } from '../data/recommendationPolicy.ts'
import type { FeatureId, Recommendation, Source } from '../recommendationTypes'

const shortFeatures: Record<FeatureId,string> = {pdf:'PDF 분석',web:'웹 검색',upload:'파일 첨부',imageInput:'이미지 입력',spreadsheet:'엑셀 분석',code:'코드 실행',imageGeneration:'이미지 생성'}
export function candidateSummary(c:Recommendation, required:FeatureId[]) {
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
  if(!limits.length)limits.push('계정의 모델 선택·사용 한도 확인 필요')
  return {facts:facts.slice(0,2),limit:limits.join('; ')}
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
  if(path.includes('upload'))return `${url.hostname} 파일 업로드 안내`
  if(path.includes('pricing')||path.includes('subscriptions'))return `${url.hostname} 요금·플랜 안내`
  if(path.includes('release-notes'))return `${url.hostname} 모델·기능 출시 안내`
  if(source.scope)return `${url.hostname} · ${source.scope}`
  // Human-readable document identity even for evidence without a saved title.
  return `${url.hostname} · ${path.split('/').filter(Boolean).at(-1)?.replace(/[-_]/g,' ')||'서비스 안내'}`
}
