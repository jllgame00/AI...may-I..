import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { officialRoutes } from '../data/serviceRoutes.ts'
import { mappingLabel } from './currentEvidence.ts'
import { interpretRequest, recommendForTask, referenceCandidatesForTask } from './recommend.ts'
import { normalizeRequest } from './request.ts'
import { buildPromptBundle } from './promptEngine.ts'
import { structureSurveyTask, surveyContext } from './surveyTask.ts'
import { taskRecommendations } from './taskRanking.ts'
import { inferCodingIntent } from './codingIntent.ts'
import { workStages } from './workStages.ts'
import type { Recommendation, RecommendationSnapshot, ScoringTask, FeatureId, Source } from '../recommendationTypes'
import type { Comparison, GuideStage, PromptBundle, PromptRequest, PromptTemplate, Session, StageSelection, TaskAnalysis } from '../types'

export const DEMO_REQUEST = '전공 수업에서 대학생 120명의 설문 결과를 분석해서 A4 4장짜리 보고서를 써야 해. 데이터는 엑셀에 있고, 학년별 만족도 차이와 공부 시간·성적의 관계를 보고 싶어. 통계를 잘 몰라서 분석 방법과 결과 해석도 쉽게 설명받고 싶어.'
export function interpretTask(request: PromptRequest): TaskAnalysis {
  const detected = interpretRequest(request.text)
  const comparisonTarget = /ChatGPT|Claude|Gemini|(?:모델|서비스)(?:의)?\s*(?:기능|성능|요금|가격|플랜)/i.test(request.text)
  const hasDataset = /CSV|xlsx|엑셀|원자료|설문\s*(?:파일|자료|결과)|응답\s*(?:파일|자료|결과)/i.test(request.text)
  const serviceComparison = comparisonTarget && /비교|차이/.test(request.text) && !hasDataset
  const conceptQuestion = /(?:개념|원리|기초).*(?:설명|알려|배우)|(?:설명|알려).*(?:개념|원리|기초)/.test(request.text)
  const survey = /설문|통계|평균|표준편차|상관|빈도|응답률/.test(request.text) && !serviceComparison && !conceptQuestion
  const inferredTasks: ScoringTask[] = [...detected.tasks]
  if (/알고리즘|문제\s*풀이|코딩\s*테스트|장바구니.*구현|앱.*구현|웹.*개발/i.test(request.text) && !inferredTasks.includes('coding')) inferredTasks.unshift('coding')
  if (survey && !inferredTasks.includes('analysis')) inferredTasks.unshift('analysis')
  if (/보고서/.test(request.text) && !inferredTasks.includes('writing')) inferredTasks.push('writing')
  const tasks = [...new Set(request.tasks ?? inferredTasks)]
  const needsInputMode = request.inputMode==='file' || /파일|pdf|엑셀|xlsx|csv|첨부/i.test(request.text) || (tasks.includes('analysis') && /설문|통계|자료|논문|문서/i.test(request.text))
  const inferredMode = /직접\s*입력|요약\s*통계|붙여\s*넣|붙여넣/.test(request.text) ? 'summary' : /파일|엑셀|xlsx|csv|pdf/i.test(request.text) ? 'file' : 'unknown'
  const inputMode = request.inputMode ?? (needsInputMode ? inferredMode : 'summary')
  let features = detected.requiredFeatures
  if (inputMode === 'summary' && (request.inputMode === 'summary' || inferredMode === 'summary')) features = features.filter(f => !['upload','pdf','spreadsheet','imageInput'].includes(f))
  if (inputMode === 'file') features = [...features,'upload']
  const requiredFeatures: FeatureId[] = [...new Set(request.requiredFeatures ?? features)]
  return { tasks, survey, requiredFeatures, inputMode, needsInputMode, codingIntent:tasks.includes('coding') ? request.codingIntent ?? inferCodingIntent(request.text) : null,
    notes: ['입력의 표현을 바탕으로 정리한 규칙 기반 해석입니다. 작업과 필수 기능을 직접 수정할 수 있어요.', requiredFeatures.includes('imageInput') ? '이미지 이해가 필요한 요청입니다. 해당 경로의 이미지 입력 방식·권한·한도를 확인하세요. 이미지 생성과는 별개예요.' : inputMode === 'summary' ? '요약 통계값·텍스트를 직접 넣는 경로입니다. 파일 첨부·코드 실행을 필수로 가정하지 않아요.' : inputMode === 'file' ? '파일은 사용자가 외부 서비스에서 직접 제공해요. 해당 플랜의 파일 형식·용량·분석 한도를 확인해야 해요.' : '자료를 넣을 형태가 미정이에요. 기능 적합성을 확정하기 전에 확인해 주세요.'] }
}
export function compareCandidates(request: PromptRequest, data: RecommendationSnapshot = recommendationSnapshot): Comparison {
  request = normalizeRequest(request)
  const analysis = interpretTask(request)
  const context=JSON.stringify(request)
  if (!analysis.tasks.length) return { analysis, recommendations: [], excluded: [],context }
  const input = { text: request.text }
  const result = recommendForTask(analysis.tasks[0],input,analysis.requiredFeatures,data)
  if (analysis.needsInputMode && analysis.inputMode === 'unknown') result.recommendations = result.recommendations.map(c => ({ ...c,suitability:'확인 후 선택',eligibility:'conditional',holds:['입력 자료 형태 미정 · 요약 통계 직접 입력인지 파일인지 확인 필요',...c.holds] }))
  const references=referenceCandidatesForTask(analysis.tasks[0],input,[],data).recommendations
  const decision=taskRecommendations(analysis.tasks[0],request.text,analysis.requiredFeatures,result.recommendations,data,references,analysis.codingIntent)
  const preferred=new Map(decision.entries.map((e,i)=>[e.candidate.id,i]))
  result.recommendations.sort((a,b)=>(preferred.get(a.id)??Infinity)-(preferred.get(b.id)??Infinity))
  return { ...result,analysis,context,decision,references }
}
export function comparisonMatches(request:PromptRequest,comparison:Comparison):boolean { return JSON.stringify(normalizeRequest(request))===comparison.context }
export function updateGuideRequest(session:Session,request:PromptRequest):Session {
  request = normalizeRequest(request)
  if(JSON.stringify(session.request)===JSON.stringify(request))return session
  return {...session,request,reviewed:Object.fromEntries(Object.keys(session.reviewed??{}).map(id=>[id,false])),needsReview:session.bundle?.guideStages?.map(s=>s.id)??session.needsReview}
}
export function selectForStages(selection: StageSelection, stageId: string, candidateId: string): StageSelection { return { ...selection,byStage:{ ...selection.byStage,[stageId]:candidateId } } }
export function stageCandidate(selection: StageSelection, id: string, candidates: Recommendation[]): Recommendation | null { return candidates.find(c => c.id === (selection.byStage[id] ?? selection.default)) ?? null }
export function guideContext(template:PromptTemplate,bundleContext?:string):string { return JSON.stringify([template.id,template.text,bundleContext]) }
export interface AlternateRoute { kind:'chatkhu'; url:string; planId:string; modelId:string; version:string; mode:string; sources:Source[] }
export function executionRoutes(candidate: Recommendation, alternatives: AlternateRoute[] = []) {
  const confirmed = alternatives.filter(r => candidate.mapping.status === 'confirmed' && candidate.mapping.selectable && candidate.model?.id === r.modelId && candidate.model.version === r.version && candidate.mapping.mode === r.mode && candidate.plan.id === r.planId && r.sources.some(s => s.url && s.checkedAt) && /^https:\/\//.test(r.url))
  return [{ kind:'official' as const,label:`${candidate.service.name} ${mappingLabel(candidate.mapping)} 공식 경로 (새 창)`,url:candidate.mapping.url ?? officialRoutes[candidate.service.id] },...confirmed.map(r => ({ kind:r.kind,label:'확인된 ChatKHU 경로 (새 창)',url:r.url }))]
}
function surveyStages(request: PromptRequest): GuideStage[] {
  const outputLength = buildPromptBundle(request).conditions.length.value
  const stages:GuideStage[] = [
    { id:'statistics',title:'통계 분석',purpose:'설문 자료에 맞는 통계 분석을 수행하고 결과표를 작성합니다.',inputs:['변수 정의·단위·문항·집단 구분','직접 준비한 요약 통계값과 제공 가능한 표본 수'],output:'기술 통계·가능한 집단 비교 결과표와 분석 방법·한계',checks:['수치·단위·분모를 원자료와 대조','표본 수·결측·집계 방식을 알고 있는지 확인','제공되지 않은 값이나 검정 결과를 만들지 않았는지 확인'],handoff:['확인한 통계표·변수 정의·계산 방법','확인된 사실·해석 한계·추가 자료 필요 항목'],text:'[설문 문항·변수 정의·집단 구분과 원자료 또는 요약 통계값을 붙여넣으세요]\n먼저 변수 유형·표본 수·결측을 확인하고, 질문에 맞는 통계 분석을 수행해 주세요. 빈도·비율, 평균·표준편차 등 적절한 기술 통계를 계산해 결과표로 작성하고, 집단 차이·상관 분석은 자료와 가정이 충족될 때 수행해 주세요. 집단 비교는 척도·집단 수·독립성·분포를 확인해 검정과 사후 비교를 선택하고 이유를 쉽게 설명해 주세요. 변수 간 관계는 산점도·이상치·선형성을 살펴 적절한 상관 분석을 선택해 주세요. 계산 가능한 검정통계량·유의확률·효과크기·신뢰구간과 분석별 표본 수·단위를 결과표에 적고, 계산 근거와 가정 위반의 한계를 밝혀 주세요. 자료가 없으면 먼저 요청하고 수치나 유의확률을 만들지 마세요. 요약 통계만으로 계산할 수 없는 항목은 필요한 원자료를 알려 주세요.' },
    { id:'interpretation',title:'결과 해석',purpose:'검토한 통계가 말해 주는 범위 안에서 의미와 한계를 정리합니다.',inputs:['앞 단계에서 직접 확인한 통계표·변수·계산 방법','조사 목적과 알고 있는 표본·설문 한계'],output:'관찰 사실·가능한 해석·추론할 수 없는 내용·한계 목록',checks:['기술 통계와 추론을 구분','상관을 인과 관계로 단정하지 않았는지 확인','표본·질문 방식·결측 한계를 빠뜨리지 않았는지 확인'],handoff:['사용자가 확인한 해석과 근거 수치','보고서에 적을 한계·추가 확인 사항'],text:'[앞 단계에서 확인한 통계표·변수 정의·계산 방법·남은 한계를 붙여넣으세요]\n관찰된 결과와 가능한 해석을 구분해 주세요. 제공되지 않은 집단 차이·유의성·인과 관계를 단정하지 마세요. 해석의 근거 수치를 짚고 추가로 필요한 자료를 알려 주세요.' },
    { id:'report',title:'보고서 초안',purpose:'확인한 통계와 해석을 과제 보고서로 구성합니다.',inputs:['직접 검토한 통계표·해석·출처','과제 평가 기준·허용된 인용·서식 조건'],output:`${outputLength || '[요구 분량]'} 보고서 초안과 인용·표·미확인 항목`,checks:['분량·구조·과제 지시 준수','통계표·해석·본문 수치 일치','인용·출처·개인정보와 과장 확인'],handoff:['초안·사용한 통계표·출처','검토가 필요한 문장과 과제 평가 기준'],text:'[앞 단계에서 확인한 통계표·결과 해석·한계·출처와 과제 지시를 붙여넣으세요]\n조사 목적 → 자료·방법 → 결과 → 해석·한계 → 결론 흐름의 보고서 초안을 작성해 주세요. 제공한 내용만 사용하고 모르는 표본 수·방법·출처는 빈칸으로 남기세요. A4 페이지 수는 글꼴·여백 등 서식에 따라 달라지므로 임의의 글자 수로 보장하지 말고 서식이 없으면 확인해 주세요.' },
    { id:'review',title:'검토',purpose:'보고서의 요구사항·수치·논리·출처를 사용자가 대조할 수 있게 정리합니다.',inputs:['보고서 초안과 원래 통계표·해석·출처','과제 지시·분량·서식 기준'],output:'위치·문제·원자료 근거·수정 제안·직접 확인할 항목 표',checks:['모든 수치를 원래 자료와 직접 대조','수정 제안이 새 사실을 만들어 넣지 않았는지 확인','최종 분량·인용·허용 범위 직접 확인'],handoff:['사용자가 검토하고 수정한 최종 보고서','해결하지 못한 한계와 추가 확인 기록'],text:'[보고서 초안·원래 통계표·확인한 해석·출처·과제 기준을 붙여넣으세요]\n수치 불일치·근거 없는 주장·논리 비약·요구사항 누락을 찾아 위치와 수정 제안을 표로 제시해 주세요. 자료에 없는 사실을 보완하지 마세요. 자동 검토로 정확성이 인증됐다고 말하지 말고, 사용자가 원자료와 직접 확인할 항목을 남겨 주세요.' },
  ]
  if(interpretTask(request).inputMode==='file')stages[0]={...stages[0],inputs:['설문 파일·문항·변수 정의·단위·집단 구분'],text:stages[0].text.replace('[설문 문항·변수 정의·집단 구분과 원자료 또는 요약 통계값을 붙여넣으세요]','[문항·변수 정의·집단 구분과 설문 자료를 제공하세요. 첨부가 가능한 경우 CSV·엑셀 파일을 제공하거나 표·요약 통계를 여기에 붙여넣으세요]')+'\n파일을 읽거나 계산을 실행할 수 없으면 그 한계를 밝히고, 텍스트·요약 통계 입력 또는 재현 가능한 분석 코드로 진행할 방법을 제안해 주세요.'}
  return stages
}
// User-facing task text is independent of model selection and entitlement metadata.
export function buildGuideBundle(request: PromptRequest, selection: StageSelection): PromptBundle & { steps: GuideStage[] } {
  request = normalizeRequest(request)
  const base = buildPromptBundle(request), analysis = interpretTask(request)
  const isSurvey = analysis.survey && analysis.tasks.includes('analysis')
  let stages: GuideStage[] = isSurvey ? surveyStages(request).filter(s => analysis.tasks.includes('writing') || !['report','review'].includes(s.id)) : analysis.tasks.includes('coding') ? workStages(request,true) : analysis.tasks.includes('writing')&&!base.steps.length ? workStages(request,false).map(s=>/홍보|모집|광고/.test(request.text)?s:{...s,title:s.id==='compose'?'글 초안':s.title}) : (base.steps.length ? base.steps : [base.main]).map(p => ({ ...p,purpose:'요청한 작업을 이 단계에서 직접 진행합니다.',inputs:['작업 조건과 필요한 자료 또는 앞 단계 결과'],output:base.conditions.format.value || '요청한 결과',checks:base.checklist,handoff:['확인한 결과·근거·남은 수정 사항'] }))
  if (isSurvey) {
    const task = structureSurveyTask(request,base.conditions)
    const audience = base.conditions.audience.value, tone = base.conditions.tone.value
    stages = stages.map(s => {
      const presentation = s.id==='report'
        ? [audience ? `대상 독자는 ${audience}입니다.` : '',task.finalOutput.length ? `최종 분량은 ${task.finalOutput.length}입니다.` : '분량은 미정입니다. 필요하면 물어봐 주세요.',task.finalOutput.format ? `결과 형식: ${task.finalOutput.format}.` : ''].filter(Boolean).join(' ')
        : ''
      const context = surveyContext(task)
      const constraints = [base.conditions.purpose.value ? `사용 목적: ${base.conditions.purpose.value}.` : '',base.conditions.constraints.value].filter(Boolean).join(' ')
      let text = s.text
      if(s.id==='review')text += `\n보고서의 검토 기준: ${[audience&&`독자 ${audience}`,base.conditions.length.value&&`분량 ${base.conditions.length.value}`,tone&&`말투 ${tone}`,base.conditions.format.value&&`형식 ${base.conditions.format.value}`].filter(Boolean).join(' · ') || '제공한 과제 기준'}.`
      const edited=Object.entries(request.overrides).filter(([key])=>!['length','format'].includes(key)||['report','review'].includes(s.id)).map(([key,value])=>`${({purpose:'사용 목적',audience:'대상 독자',format:'최종 형식',length:'최종 분량',tone:'말투',constraints:'필수 조건'} as Record<string,string>)[key]}: ${value?.trim()||'미정 (원문 값으로 확정하지 마세요)'}`).join('\n')
      return {...s,text:[context,`단계 목표: ${s.purpose}`,text,`이 단계의 결과 형식: ${s.output}`,presentation,constraints,edited?`직접 수정한 조건 (원문보다 우선)\n${edited}`:''].filter(Boolean).join('\n\n')}
    })
  }
  return { ...base,context:JSON.stringify([base.context,analysis,selection]),steps:stages,guideStages:stages,improvements:['요청한 작업과 산출물을 단계별로 준비했어요.','모델 이용 안내는 복사 본문과 별도로 확인할 수 있어요.'] }
}
