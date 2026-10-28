import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { officialRoutes } from '../data/serviceRoutes.ts'
import { budgetLabels, priorityLabels } from '../data/services.ts'
import { featureLabels } from '../data/recommendationPolicy.ts'
import { candidateLabel, interpretRequest, recommendForTask } from './recommend.ts'
import { mappingLabel } from './currentEvidence.ts'
import { buildPromptBundle } from './promptEngine.ts'
import type { Recommendation, RecommendationSnapshot, ScoringTask, FeatureId, Source } from '../recommendationTypes'
import type { Comparison, GuideStage, PromptBundle, PromptRequest, PromptTemplate, Session, StageSelection, TaskAnalysis } from '../types'

export const DEMO_REQUEST = '설문 통계값으로 결과를 분석하고 A4 4장 보고서를 써야 해. 과제라 비용은 쓰고 싶지 않아.'
export function interpretTask(request: PromptRequest): TaskAnalysis {
  const detected = interpretRequest(request.text)
  const survey = /설문|통계|평균|표준편차|상관|빈도|응답률/.test(request.text)
  const inferredTasks: ScoringTask[] = [...detected.tasks]
  if (survey && !inferredTasks.includes('analysis')) inferredTasks.unshift('analysis')
  if (/보고서/.test(request.text) && !inferredTasks.includes('writing')) inferredTasks.push('writing')
  const tasks = [...new Set(request.tasks ?? inferredTasks)]
  const needsInputMode = request.inputMode==='file' || /파일|pdf|엑셀|xlsx|csv|첨부/i.test(request.text) || (tasks.includes('analysis') && /설문|통계|자료|논문|문서/i.test(request.text))
  const inferredMode = /직접\s*입력|요약\s*통계|붙여\s*넣|붙여넣/.test(request.text) ? 'summary' : /파일|엑셀|xlsx|csv|pdf/i.test(request.text) ? 'file' : 'unknown'
  const inputMode = request.inputMode ?? (needsInputMode ? inferredMode : 'summary')
  let features = detected.requiredFeatures
  if (inputMode === 'summary' && (request.inputMode === 'summary' || inferredMode === 'summary')) features = features.filter(f => !['upload','pdf','spreadsheet','imageInput'].includes(f))
  if (inputMode === 'file') features = [...features,'upload']
  const requiredFeatures: FeatureId[] = [...new Set([...(request.requiredFeatures ?? features),...(inputMode==='file'?['upload' as const]:[])])]
  return { tasks, survey, requiredFeatures, inputMode, needsInputMode,
    notes: ['입력의 표현을 바탕으로 정리한 규칙 기반 해석입니다. 작업과 필수 기능을 직접 수정할 수 있어요.', requiredFeatures.includes('imageInput') ? '이미지 이해가 필요한 요청입니다. 해당 경로의 이미지 입력 방식·권한·한도를 확인하세요. 이미지 생성과는 별개예요.' : inputMode === 'summary' ? '요약 통계값·텍스트를 직접 넣는 경로입니다. 파일 첨부·코드 실행을 필수로 가정하지 않아요.' : inputMode === 'file' ? '파일은 사용자가 외부 서비스에서 직접 제공해요. 해당 플랜의 파일 형식·용량·분석 한도를 확인해야 해요.' : '자료를 넣을 형태가 미정이에요. 기능 적합성을 확정하기 전에 확인해 주세요.'] }
}
export function compareCandidates(request: PromptRequest, data: RecommendationSnapshot = recommendationSnapshot): Comparison {
  const analysis = interpretTask(request)
  const context=JSON.stringify(request)
  if (!analysis.tasks.length) return { analysis, recommendations: [], excluded: [],context }
  const input = { text: request.text, budget: request.budget ?? 'prefer-free', priority: request.priority ?? 'quality',usageRoute:request.usageRoute }
  const result = recommendForTask(analysis.tasks[0],input,analysis.requiredFeatures,data)
  if (analysis.needsInputMode && analysis.inputMode === 'unknown') result.recommendations = result.recommendations.map(c => ({ ...c,suitability:'확인 후 선택',eligibility:'conditional',holds:['입력 자료 형태 미정 · 요약 통계 직접 입력인지 파일인지 확인 필요',...c.holds] }))
  // This view compares conditions. Valid benchmark calculations are retained in
  // the engine but neither historical votes nor quality preference reorder cards.
  result.recommendations.sort((a,b) => Number(a.suitability !== '조건 비교 가능')-Number(b.suitability !== '조건 비교 가능') || (request.budget === 'prefer-free' ? Number(a.plan.tier==='paid')-Number(b.plan.tier==='paid') : 0) || a.service.name.localeCompare(b.service.name,'en') || a.plan.name.localeCompare(b.plan.name,'en'))
  return { ...result,analysis,context }
}
export function comparisonMatches(request:PromptRequest,comparison:Comparison):boolean { return JSON.stringify(request)===comparison.context }
export function updateGuideRequest(session:Session,request:PromptRequest):Session {
  if(JSON.stringify(session.request)===JSON.stringify(request))return session
  return {...session,request,reviewed:Object.fromEntries(Object.keys(session.reviewed??{}).map(id=>[id,false])),needsReview:session.bundle?.guideStages?.map(s=>s.id)??session.needsReview}
}
export function selectForStages(selection: StageSelection, stageId: string, candidateId: string): StageSelection { return { ...selection,byStage:{ ...selection.byStage,[stageId]:candidateId } } }
export function stageCandidate(selection: StageSelection, id: string, candidates: Recommendation[]): Recommendation | null { return candidates.find(c => c.id === (selection.byStage[id] ?? selection.default)) ?? null }
export function guideContext(template:PromptTemplate):string { return JSON.stringify([template.id,template.text]) }
export interface AlternateRoute { kind:'chatkhu'; url:string; planId:string; modelId:string; version:string; mode:string; sources:Source[] }
export function executionRoutes(candidate: Recommendation, alternatives: AlternateRoute[] = []) {
  const confirmed = alternatives.filter(r => candidate.mapping.status === 'confirmed' && candidate.mapping.selectable && candidate.model?.id === r.modelId && candidate.model.version === r.version && candidate.mapping.mode === r.mode && candidate.plan.id === r.planId && r.sources.some(s => s.url && s.checkedAt) && /^https:\/\//.test(r.url))
  return [{ kind:'official' as const,label:`${candidate.service.name} ${mappingLabel(candidate.mapping)} 공식 경로 (새 창)`,url:candidate.mapping.url ?? officialRoutes[candidate.service.id] },...confirmed.map(r => ({ kind:r.kind,label:'확인된 ChatKHU 경로 (새 창)',url:r.url }))]
}
function surveyStages(request: PromptRequest): GuideStage[] {
  const outputLength = buildPromptBundle(request).conditions.length.value
  const stages:GuideStage[] = [
    { id:'statistics',title:'통계 분석',purpose:'제공된 요약 통계와 가능한 분석 범위를 정리합니다.',inputs:['변수 정의·단위·문항·집단 구분','직접 준비한 요약 통계값과 제공 가능한 표본 수'],output:'주어진 값 정리표·계산 가능한 항목·분석 불가능/미확인 항목',checks:['수치·단위·분모를 원자료와 대조','표본 수·결측·집계 방식을 알고 있는지 확인','제공되지 않은 값이나 검정 결과를 만들지 않았는지 확인'],handoff:['확인한 통계표·변수 정의·계산 방법','확인된 사실·해석 한계·추가 자료 필요 항목'],text:'[설문 문항·변수 정의·요약 통계값과 알고 있는 표본 수를 붙여넣으세요]\n제공한 값만 정리하고 계산 가능한 항목과 불가능한 항목을 나눠 주세요. 표본 수·평균·분산·상관·유의확률을 추측하지 마세요. 요약 통계만으로 불가능한 검정이나 원자료가 필요한 분석은 필요한 자료를 물어봐 주세요.' },
    { id:'interpretation',title:'결과 해석',purpose:'검토한 통계가 말해 주는 범위 안에서 의미와 한계를 정리합니다.',inputs:['앞 단계에서 직접 확인한 통계표·변수·계산 방법','조사 목적과 알고 있는 표본·설문 한계'],output:'관찰 사실·가능한 해석·추론할 수 없는 내용·한계 목록',checks:['기술 통계와 추론을 구분','상관을 인과 관계로 단정하지 않았는지 확인','표본·질문 방식·결측 한계를 빠뜨리지 않았는지 확인'],handoff:['사용자가 확인한 해석과 근거 수치','보고서에 적을 한계·추가 확인 사항'],text:'[앞 단계에서 확인한 통계표·변수 정의·계산 방법·남은 한계를 붙여넣으세요]\n관찰된 결과와 가능한 해석을 구분해 주세요. 제공되지 않은 집단 차이·유의성·인과 관계를 단정하지 마세요. 해석의 근거 수치를 짚고 추가로 필요한 자료를 알려 주세요.' },
    { id:'report',title:'보고서 초안',purpose:'확인한 통계와 해석을 과제 보고서로 구성합니다.',inputs:['직접 검토한 통계표·해석·출처','과제 평가 기준·허용된 인용·서식 조건'],output:`${outputLength || '[요구 분량]'} 보고서 초안과 인용·표·미확인 항목`,checks:['분량·구조·과제 지시 준수','통계표·해석·본문 수치 일치','인용·출처·개인정보와 과장 확인'],handoff:['초안·사용한 통계표·출처','검토가 필요한 문장과 과제 평가 기준'],text:`[앞 단계에서 확인한 통계표·결과 해석·한계·출처와 과제 지시를 붙여넣으세요]\n${outputLength ? `분량은 ${outputLength}입니다. ` : ''}조사 목적 → 자료·방법 → 결과 → 해석·한계 → 결론 흐름의 보고서 초안을 작성해 주세요. 제공한 내용만 사용하고 모르는 표본 수·방법·출처는 빈칸으로 남기세요. A4 페이지 수는 글꼴·여백 등 서식에 따라 달라지므로 임의의 글자 수로 보장하지 말고 서식이 없으면 확인해 주세요.` },
    { id:'review',title:'검토',purpose:'보고서의 요구사항·수치·논리·출처를 사용자가 대조할 수 있게 정리합니다.',inputs:['보고서 초안과 원래 통계표·해석·출처','과제 지시·분량·서식 기준'],output:'위치·문제·원자료 근거·수정 제안·직접 확인할 항목 표',checks:['모든 수치를 원래 자료와 직접 대조','수정 제안이 새 사실을 만들어 넣지 않았는지 확인','최종 분량·인용·허용 범위 직접 확인'],handoff:['사용자가 검토하고 수정한 최종 보고서','해결하지 못한 한계와 추가 확인 기록'],text:'[보고서 초안·원래 통계표·확인한 해석·출처·과제 기준을 붙여넣으세요]\n수치 불일치·근거 없는 주장·논리 비약·요구사항 누락을 찾아 위치와 수정 제안을 표로 제시해 주세요. 자료에 없는 사실을 보완하지 마세요. 자동 검토로 정확성이 인증됐다고 말하지 말고, 사용자가 원자료와 직접 확인할 항목을 남겨 주세요.' },
  ]
  if(interpretTask(request).inputMode==='file')stages[0]={...stages[0],purpose:'선택한 경로의 파일 권한과 자료 구조를 확인하고 가능한 분석 범위를 정리합니다.',inputs:['제공할 설문 파일의 형식·변수·단위·집계 구조','선택한 플랜의 해당 파일 형식·분석 권한 확인'],text:'[외부 서비스에서 제공할 파일 이름·형식·변수 설명·분석 범위를 적으세요]\n선택한 플랜에서 해당 파일 업로드·분석 권한과 한도를 확인한 경우에만 허용된 자료를 직접 제공하겠습니다. 파일이 제공되지 않았거나 읽을 수 없으면 내용을 추측하지 말고 필요한 자료나 직접 확인한 요약 통계를 요청해 주세요. 제공되지 않은 통계값·표본 수·검정 결과를 만들지 마세요.'}
  return stages
}
export function buildGuideBundle(request: PromptRequest, selection: StageSelection): PromptBundle & { steps: GuideStage[] } {
  const base = buildPromptBundle(request), comparison = compareCandidates(request)
  let stages: GuideStage[] = comparison.analysis.survey && comparison.analysis.tasks.includes('analysis') && comparison.analysis.tasks.includes('writing') ? surveyStages(request) : (base.steps.length ? base.steps : [base.main]).map(p => ({ ...p,purpose:'요청한 작업을 이 단계에서 직접 진행합니다.',inputs:['작업 조건과 허용된 자료 또는 직접 확인한 앞 단계 결과'],output:base.conditions.format.value || '요청한 결과',checks:base.checklist,handoff:['직접 확인한 결과·근거·남은 수정 사항'] }))
  stages = stages.map(s => {
    const c = stageCandidate(selection,s.id,comparison.recommendations)
    const features = comparison.analysis.requiredFeatures.map(f => featureLabels[f]).join(', ')
    const route = c?.mapping.routeKind
    const usage = c ? route==='api' ? `개발자 API를 직접 설정·실행하는 경로입니다. 모델 ID ${c.model?.id}, effort ${c.mapping.mode}를 설정하세요. 사용량 과금이며 월 구독료가 아닙니다. 도구는 별도 구현·과금 확인이 필요합니다. 이 사이트는 키를 받거나 API를 호출하지 않습니다.` : route==='work' ? `일반 Chat과 구분되는 ChatGPT Work 웹 경로입니다. Work를 연 뒤 Advanced에서 ${c.model?.name} / ${c.mapping.mode}를 직접 확인하세요. 계정에 옵션이 없으면 같은 모델로 실행됐다고 가정하지 마세요.` : c.model ? `${c.model.name} / ${c.mapping.mode}를 모델 메뉴에서 확인하세요. ${c.mapping.status==='confirmed'?'':'이 플랜의 정확한 모델 제공은 미확인입니다. 선택할 수 없으면 제공된다고 가정하지 말고 다시 비교하세요.'}` : '자동 선택 또는 정확한 모델·버전 선택 여부가 미확인인 웹 채팅 경로입니다. 특정 평가 모델과 동일하다고 가정하지 마세요.' : ''
    const tools = c ? `${c.mapping.toolsNote ?? ''}\n${comparison.analysis.inputMode==='file' ? route==='work'||route==='api'?'이 경로의 파일·분석 권한과 형식·크기 제한을 별도로 확인하기 전에는 파일 제공을 가정하지 마세요.':'선택한 플랜의 업로드·해당 파일 형식 권한을 확인한 뒤 자료를 직접 제공하세요.' : comparison.analysis.requiredFeatures.includes('imageInput')?'이미지 이해가 필요한 작업입니다. 선택한 경로의 네이티브 이미지 입력 방식·권한·한도를 확인하고 이미지 생성과 구분하세요.':'텍스트 입력 경로이므로 파일 첨부·코드 실행을 필수로 가정하지 마세요.'}\n이미지 이해와 이미지 생성은 다릅니다. 생성 도구 권한을 확인하지 않았다면 이미지가 생성된다고 말하지 마세요.\n이 안내는 확인된 입력·도구·경로에 따른 조정이며 모델별 프롬프트 최적화가 검증됐다는 뜻은 아닙니다.` : ''
    const target = c ? `${candidateLabel(c)}\n이용 경로: ${mappingLabel(c.mapping)} · ${executionRoutes(c)[0].url}\n${usage}\n${tools}\n확인된 제한: ${c.plan.limits.join(' ')} ${(c.model?.limits ?? []).join(' ')}\n필수 정보 확인: ${c.suitability}` : '서비스·모델·플랜 미선택. 작업 조건에 맞는 후보를 직접 선택해 주세요.'
    const shared=Object.entries(base.conditions).filter(([key,v])=>!['format','length'].includes(key)&&v.value).map(([key,v])=>`${key==='purpose'?'사용 목적':key==='audience'?'대상 독자':key==='tone'?'말투':'지킬 조건'}: ${v.value}`).join('\n')
    const overrides=Object.entries(request.overrides).map(([key,value])=>`${key==='purpose'?'사용 목적':key==='audience'?'대상 독자':key==='format'?'결과 형식':key==='length'?'분량':key==='tone'?'말투':'지킬 조건'}: ${value||'미정 (원래 요청의 값을 확정하지 말고 필요하면 확인)'}`).join('\n')
    const finalFormat=s.id==='report'&&base.conditions.format.value?`\n최종 결과 형식: ${base.conditions.format.value}`:''
    return { ...s,text:`전체 작업 목표: ${request.text}\n현재 단계만 진행하고, 전체 최종 산출물을 이 단계의 형식으로 강제하지 마세요.\n\n현재 단계: ${s.title}\n목적: ${s.purpose}\n원하는 산출물: ${s.output}${finalFormat}\n${shared ? `공통 작성 조건\n${shared}\n` : ''}${overrides?`사용자가 직접 수정한 조건 (원래 요청보다 우선)\n${overrides}\n결과 형식·분량 수정은 최종 산출물에 적용하고, 이 단계의 중간 산출물 형식은 유지해 주세요.\n`:''}\n선택한 AI·플랜·이용 경로\n${target}\n예산: ${budgetLabels[request.budget ?? 'prefer-free']} · 우선순위: ${priorityLabels[request.priority ?? 'quality']}\n${features ? `필수 기능: ${features}\n` : ''}\n사용자가 제공할 입력\n${s.text}\n\n다음 단계로 전달할 내용\n${s.handoff.join('\n')}\n자료가 없으면 먼저 물어봐 주세요. 다른 AI를 자동 호출하거나 아직 실행하지 않은 일을 완료했다고 말하지 마세요.` }
  })
  return { ...base,context:JSON.stringify([base.context,request.budget,request.priority,comparison.analysis,selection]),steps:stages,guideStages:stages,improvements:['필수 기능·예산에 맞춰 후보를 직접 선택할 수 있게 정리했어요.','확인할 입력·산출물·검토·인계를 단계별로 준비했어요.'] }
}
