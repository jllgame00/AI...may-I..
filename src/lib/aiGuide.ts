import { compareProviders } from './providerRecommendation.ts'
import { analyzeRequirements } from './providerRequirements.ts'
import { providerCatalog } from '../data/providerCatalog.ts'
import { normalizeRequest } from './request.ts'
import { buildPromptBundle } from './promptEngine.ts'
import { structureSurveyTask, surveyContext } from './surveyTask.ts'
import { workStages } from './workStages.ts'
import type { Comparison, GuideStage, PromptBundle, PromptRequest, PromptTemplate, Session, StageSelection, TaskAnalysis } from '../types'
import type { PlanAssessment, ProviderCatalog } from '../providerTypes'

export const DEMO_REQUEST='전공 수업에서 대학생 120명의 설문 결과를 분석해서 A4 4장짜리 보고서를 써야 해. 데이터는 엑셀에 있고, 학년별 만족도 차이와 공부 시간·성적의 관계를 보고 싶어. 통계를 잘 몰라서 분석 방법과 결과 해석도 쉽게 설명받고 싶어.'
export function interpretTask(request:PromptRequest):TaskAnalysis {
 const r=analyzeRequirements(request),tasks=r.works.map(w=>w.category)
 return {tasks,requiredFeatures:r.required,inputMode:request.inputMode??(r.required.includes('fileUpload')?'file':'summary'),needsInputMode:tasks.includes('analysis'),survey:tasks.includes('analysis')&&/설문|통계|상관|만족도/.test(request.text),notes:r.notes,codingIntent:tasks.includes('coding')?request.codingIntent??'unspecified':null}
}
export function compareCandidates(request:PromptRequest,data:ProviderCatalog=providerCatalog):Comparison {return compareProviders(request,data)}
export function comparisonMatches(request:PromptRequest,comparison:Comparison):boolean {return JSON.stringify(normalizeRequest(request))===comparison.context}
export function updateGuideRequest(session:Session,request:PromptRequest):Session {
 request=normalizeRequest(request)
 if(JSON.stringify(session.request)===JSON.stringify(request))return session
 return {...session,request,reviewed:Object.fromEntries(Object.keys(session.reviewed??{}).map(id=>[id,false])),needsReview:session.bundle?.guideStages?.map(s=>s.id)??session.needsReview}
}
export function selectForStages(selection:StageSelection,stageId:string,id:string):StageSelection {return {...selection,byStage:{...selection.byStage,[stageId]:id}}}
export function selectForWork(selection:StageSelection,steps:GuideStage[],workId:string,id:string):StageSelection {return {...selection,byStage:{...selection.byStage,...Object.fromEntries(steps.filter(s=>s.workId===workId).map(s=>[s.id,id]))}}}
export function stageOptions(comparison:Comparison,stage:GuideStage):PlanAssessment[] {
 const work=comparison.requirements.works.find(w=>w.id===stage.workId)
 if(!work)return []
 return (comparison.byWork[work.id]??[]).flatMap(o=>[o,...o.alternatives]).filter(o=>o.status!=='excluded')
}
export function stageCandidate(selection:StageSelection,stage:GuideStage,comparison:Comparison):PlanAssessment|null {
 const id=selection.byStage[stage.id]??selection.default
 return stageOptions(comparison,stage).find(o=>o.id===id&&(selection.byStage[stage.id]!==undefined||o.status==='eligible'))??null
}
export function guideContext(template:PromptTemplate,bundleContext?:string):string {return JSON.stringify([template.id,template.text,bundleContext])}
export function executionRoutes(candidate:PlanAssessment) {return [{kind:'official',label:`${candidate.service.name} 공식 웹 서비스`,url:candidate.plan.url}]}
function stagesForRequest(request:PromptRequest):GuideStage[] {
 const r=analyzeRequirements(request),base=buildPromptBundle(request)
 return r.works.flatMap(work=>{
  const make=(id:string,title:string,action:string):GuideStage=>({id,title,workId:work.id,purpose:action,inputs:['관련 자료·앞 단계에서 직접 확인한 결과'],output:work.label,checks:base.checklist,handoff:['직접 검토한 결과·출처·미확인 항목'],text:`작업 원문\n${request.text}\n\n단계 목표: ${action}\n\n${base.main.text}\n\n제공된 자료만 사용하고 실제로 실행하거나 파일을 만들지 않았다면 수행했다고 말하지 마세요.`})
  let stages:GuideStage[]
  if(work.category==='coding')stages=workStages(request,true)
  else if(work.category==='writing'&&work.required.includes('surveyDraft'))stages=[make('survey-outline','설문 설계','조사 목적·대상·측정할 개념을 정리하고 문항 형식과 응답 척도를 설계하세요. 실제 설문 폼 생성과 문항 초안을 구분하세요.'),make('survey-compose','설문 문항 초안','중립적인 문항과 선택지·응답 척도·분기 안내를 작성하세요. 조사 목적을 모르면 먼저 확인하세요.'),make('survey-review','문항 검토','유도·이중 질문·중복·모호한 척도와 불필요한 개인정보 수집을 점검하고 수정안을 제시하세요.')]
  else if(work.category==='writing')stages=workStages(request,false).map(s=>({...s,title:s.id==='compose'&&!/홍보|모집|광고/.test(request.text)?'글·대본 초안':s.title}))
  else if(work.category==='analysis')stages=[make('analyze','자료 분석','자료를 읽고 요청한 질문에 답하며 수치·출처·분석 한계를 정리하세요.'),make('verify','결과 검토','원자료와 분석 결과를 대조해 오류·추론 한계·추가 확인 사항을 정리하세요.')]
  else if(work.category==='image')stages=[make('generate-image','이미지 생성','선택한 서비스의 이미지 생성 기능에서 실제 이미지를 생성하고 구도·문구·비율을 검토하세요.')]
  else if(work.category==='slides')stages=[make('create-slides','발표자료 만들기','앞 단계의 확인한 자료로 발표자료를 만들고 요구한 파일 형식으로 제공하세요. 대본만 작성하는 작업과 구분하세요.')]
  else stages=[make('generate-video','영상 생성','선택한 서비스에서 영상의 길이·비율·크레딧을 확인한 뒤 생성하세요.')]
  return stages.map(s=>({...s,id:r.composite?`${work.id}-${s.id}`:s.id,workId:work.id}))
 })
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
export function buildGuideBundle(request: PromptRequest, selection: StageSelection): Omit<PromptBundle,'steps'> & { steps: GuideStage[] } {
  request = normalizeRequest(request)
  const base = buildPromptBundle(request), analysis = interpretTask(request)
  const isSurvey = analysis.survey && analysis.tasks.includes('analysis')
  const surveyReport=isSurvey&&analysis.tasks.includes('writing')&&/보고서/.test(request.text)
  let stages:GuideStage[]=isSurvey?[...surveyStages(request).filter(s=>surveyReport||!['report','review'].includes(s.id)).map(s=>({...s,workId:['report','review'].includes(s.id)?'writing':'analysis'})),...stagesForRequest(request).filter(s=>s.workId!=='analysis'&&(!surveyReport||s.workId!=='writing'))]:stagesForRequest(request)
  if(isSurvey)stages.sort((a,b)=>analysis.tasks.indexOf(a.workId as typeof analysis.tasks[number])-analysis.tasks.indexOf(b.workId as typeof analysis.tasks[number]))
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
  return { ...base,context:JSON.stringify([base.context,analysis,selection]),steps:stages,guideStages:stages,improvements:['요청한 작업과 산출물을 단계별로 준비했어요.','회사·서비스 이용 안내는 복사 본문과 별도로 확인할 수 있어요.'] }
}
