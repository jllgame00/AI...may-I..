import { serviceById, taskLabels } from '../data/services.ts'
import { recommendationSnapshot } from '../data/recommendationSnapshot.ts'
import { featureLabels, POLICY_VERSION, scoringTaskLabels } from '../data/recommendationPolicy.ts'
import { mappingLabel, relevantEvidence } from './currentEvidence.ts'
import { catalogCandidates, configurationCandidates } from './catalogCandidates.ts'
import { hasSupportSource } from './taskReadiness.ts'
import type { Analysis, FeatureId, FeatureSupport, PlanModelMapping, Recommendation, RecommendationSnapshot, RequestInput, ScoringTask, ServicePlan, TaskKind, WorkflowStep } from '../recommendationTypes'

export function classifyTask(text: string): TaskKind {
  if (/또는|아니면|할까|\bor\b/i.test(text)) return 'unknown'
  if (/코딩|코드|개발|디버|버그|파이썬|python|react|typescript|javascript|프로그래밍/i.test(text)) return 'coding'
  if (/이미지|포스터|그림|일러스트|로고|사진|썸네일/.test(text)) return 'image'
  if (/연구|논문|자료|분석|리서치|수학|수리|추론 문제|논리 문제/.test(text)) return 'research'
  if (/요약|회의록|정리/.test(text)) return 'summary'
  if (/발표|대본|글|이메일|메일|편지|작성|써줘|써 줘|문장|초안/.test(text)) return 'writing'
  return 'unknown'
}
export function interpretRequest(text: string) {
  const kind = classifyTask(text)
  const tasks: ScoringTask[] = []
  if (kind !== 'unknown' && kind !== 'image') {
    if (/연구|논문|자료|분석|리서치|수학|수리|추론 문제|논리 문제|요약|회의록|정리/.test(text)) tasks.push('analysis')
    if (/코딩|코드|개발|디버|버그|파이썬|python|react|typescript|javascript|프로그래밍/i.test(text)) tasks.push('coding')
    if (/발표|대본|글쓰기|이메일|편지|문장|초안|글을|글의/.test(text) || kind === 'writing') tasks.push('writing')
  }
  const requiredFeatures: FeatureId[] = []
  // Suggestions remain editable: keywords cannot reliably resolve negation or optionality.
  if (/pdf/i.test(text) && !/pdf\s*(없이|필요\s*없|제외)/i.test(text)) requiredFeatures.push('pdf')
  if (/웹|검색|최신|인터넷/.test(text) && !/(검색|웹)\s*(없이|필요\s*없|제외)/.test(text)) requiredFeatures.push('web')
  if (/파일\s*(업로드|첨부)/.test(text) && !/첨부\s*없이/.test(text)) requiredFeatures.push('upload')
  if (/이미지\s*(입력|분석)|사진\s*분석/.test(text)) requiredFeatures.push('imageInput')
  if (/스프레드시트|엑셀|시트\s*분석/.test(text)) requiredFeatures.push('spreadsheet')
  if (/코드\s*실행|파이썬\s*실행/.test(text)) requiredFeatures.push('code')
  return { kind, tasks, requiredFeatures }
}

export function featureSupport(plan: ServicePlan, feature: FeatureId): FeatureSupport {
  return plan.features[feature] ?? { status:'unknown',note:'이 플랜·경로의 근거 미확보',sources:[] }
}
function unknownMapping(plan: ServicePlan): PlanModelMapping {
  return {id:`${plan.id}-unconfirmed`,planId:plan.id,modelId:null,status:'unknown',selectable:false,mode:null,note:'정확한 모델·모드 연결 미확인',sources:[]}
}
export function referenceCandidatesForTask(task: ScoringTask | 'image', request: RequestInput, required: FeatureId[], data: RecommendationSnapshot) {
  const excluded:WorkflowStep['excluded']=[], recommendations:Recommendation[]=[]
  for(const plan of data.plans) {
    const mappings=data.mappings.filter(m=>m.planId===plan.id)
    for(const mapping of mappings.length?mappings:[unknownMapping(plan)]) {
      const model=data.models.find(m=>m.id===mapping.modelId) ?? null
      const linked=mapping.status==='confirmed' && mapping.selectable && mapping.selection!=='automatic' && !!model && mapping.modelVersion===model.version && mapping.sources.some(s=>s.url && s.checkedAt)
      const supportForPath=(f:FeatureId):FeatureSupport=>mapping.features?.[f]??(mapping.routeKind==='api' && model?.nativeFeatures?.[f] ? model.nativeFeatures[f]! : mapping.routeKind==='work' ? {status:'unknown',note:'Work 경로 권한 별도 확인',sources:[]} : featureSupport(plan,f))
      const unsupported=required.filter(f=>supportForPath(f).status==='unsupported'&&hasSupportSource(supportForPath(f)))
      if(unsupported.length){
        const reasons=unsupported.map(f=>`${mappingLabel(mapping)} · ${featureLabels[f]} 공식 미지원`)
        const existing=excluded.find(e=>e.plan.id===plan.id)
        if(existing)existing.reasons=[...new Set([...existing.reasons,...reasons])]
        else excluded.push({plan,reasons})
        continue
      }
      const missingFeatures=required.filter(f=>supportForPath(f).status!=='supported' || !supportForPath(f).sources.some(s=>s.url && s.checkedAt))
      const holds=missingFeatures.map(f=>`${featureLabels[f]}: ${supportForPath(f).status==='limited'?'제한적 지원 · 작업이 한도 안에 드는지 확인 필요':'이 경로의 지원 미확인'}`)
      if(!linked)holds.push('정확한 평가 모델·버전·선택 모드와 플랜 연결 미확인')
      const evidence=relevantEvidence(task,request.text,required,model,mapping,data)
      if(!evidence.length)holds.push('현재 작업에 직접 연결할 성능 근거 부족')
      const suitability=missingFeatures.length?'확인 후 선택':'조건 비교 가능'
      const candidatePlan:ServicePlan=mapping.routeKind==='api'?{...plan,features:{...plan.features,...model?.nativeFeatures}}:mapping.routeKind==='work'?{...plan,route:'ChatGPT Work (웹)',webAccess:undefined,accountChecks:mapping.accountChecks,features:{pdf:{status:'unknown',note:'Work 파일 권한 별도 확인',sources:[]},web:{status:'unknown',note:'Work 도구 권한 별도 확인',sources:[]},...mapping.features},freeScope:'Plus의 Work 제공 근거로 연결한 경로입니다. 무료 이용을 보장하지 않습니다.',limits:['계정별 모델·추론 옵션, 사용량·크레딧·도구 권한 확인 필요. 일반 Chat 한도를 Work에 그대로 적용하지 않음.'],upgrade:'선택한 Plus 경로의 이용권한·크레딧을 직접 확인하세요. API 과금은 별도입니다.'}:plan
      const label=task==='image'?'이미지 콘셉트·프롬프트 설계':scoringTaskLabels[task]
      recommendations.push({
        id:mapping.id,service:mapping.routeKind==='api'?{...serviceById[plan.serviceId],name:plan.name,subtitle:'개발자 API · 별도 사용량 과금'}:serviceById[plan.serviceId],plan:candidatePlan,mapping,model,
        score:null,scores:{benchmark:null,features:missingFeatures.length?null:100},benchmarks:[],nearTie:false,status:'conditional',eligibility:missingFeatures.length?'conditional':'confirmed',suitability,
        accessStatus:linked?'연결 근거 확인':'연결 미확인',holds,evidence,
        evidenceNote:evidence.length?`정확한 모델의 작업 관련 원점수 참고입니다. 선택한 ${mapping.mode ?? '설정 미확인'}과 평가 설정·도구·환경이 다를 수 있어 동일 성능을 보장하지 않습니다. 모델 평가 근거와 현재 플랜·경로의 실제 이용권한은 별개입니다.`:'현재 작업의 직접 성능 근거 부족 · 확인된 기능으로 검토할 후보이며 확정 순위를 정하지 않습니다.',
        reason:`${label} 작업입니다. ${missingFeatures.length?'필수 기능의 이 경로 지원을 확인해야 합니다.':required.length?`${required.map(f=>featureLabels[f]).join('·')} 지원 근거가 있습니다.`:'추가 필수 기능이 지정되지 않았습니다.'} ${evidence.length?'관련 평가의 원점수와 실행 조건을 참고하세요.':'작업별 성능 근거가 부족해 기능을 기준으로 검토합니다.'}`,
      })
    }
  }
  recommendations.push(...catalogCandidates(task,request,required,data))
  recommendations.sort((a,b)=>Number(a.suitability!=='조건 비교 가능')-Number(b.suitability!=='조건 비교 가능') || Number(!a.model)-Number(!b.model) || a.service.name.localeCompare(b.service.name,'en') || (a.model?.id ?? '').localeCompare(b.model?.id ?? '', 'en') || a.plan.name.localeCompare(b.plan.name,'en') || a.id.localeCompare(b.id,'en'))
  recommendations.push(...configurationCandidates(recommendations))
  return {recommendations,excluded}
}

// Consumer flow: retain API/installation evidence in the reference catalog,
// while exposing only real web routes. Native API features are never web proof.
export function recommendForTask(task:ScoringTask|'image', request:RequestInput, required:FeatureId[], data:RecommendationSnapshot) {
  const result=referenceCandidatesForTask(task,request,required,data)
  result.recommendations=result.recommendations.filter(c=>!c.configuration && (c.mapping.routeKind==='chat'||c.mapping.routeKind==='work')).map(c=>{
    const exact=c.accessStatus==='연결 근거 확인'
    return exact?c:{...c,suitability:'확인 후 선택' as const,eligibility:'conditional' as const}
  })
  result.excluded=result.excluded.filter(c=>c.plan.billingKind!=='usage')
  return result
}

export function analyzeRequest(input: RequestInput, data: RecommendationSnapshot = recommendationSnapshot): Analysis {
  const {priority:_priority,usageRoute:_route,...current}=input as RequestInput & {priority?:unknown;usageRoute?:unknown}
  input=current
  const text = input.text.trim()
  if (!text) throw new Error('어떤 작업을 하고 싶은지 입력해 주세요.')
  const interpreted = interpretRequest(text)
  const tasks = [...new Set(input.tasks ?? interpreted.tasks)]
  const image = input.tasks === undefined && interpreted.kind === 'image'
  const requiredFeatures = [...new Set(input.requiredFeatures ?? interpreted.requiredFeatures)]
  const request = { ...input, text, tasks: image ? undefined : tasks, requiredFeatures }
  const kind: TaskKind = image ? 'image' : tasks.length > 1 ? 'research' : tasks[0] === 'analysis' ? (interpreted.kind === 'summary' ? 'summary' : 'research') : tasks[0] ?? 'unknown'
  const workflow: WorkflowStep[] = []
  const add = (task: ScoringTask | 'image', title: string, description: string, output: string) => {
    // By default, file/search acquisition belongs to the first preparation stage.
    // Later stages use the user's verified summary. Explicit all-stage overrides remain possible.
    const stageFeatures = request.featureScope === 'all' || workflow.length === 0 ? requiredFeatures : requiredFeatures.filter(f => f === 'code' && task === 'coding')
    const candidates = recommendForTask(task, request, stageFeatures, data)
    const first = candidates.recommendations.find(r => r.suitability === '조건 비교 가능')
    workflow.push({ id: `step-${workflow.length + 1}`, kind: task, title, description, output, ...candidates, candidateId: first?.id ?? null, serviceId: first?.service.id ?? null })
  }
  if (image) add('image', '이미지 콘셉트와 생성 프롬프트 설계', '텍스트 기획만 진행하고 실제 이미지는 사용자가 지원 도구에서 생성합니다.', '콘셉트 · 문구 · 생성용 프롬프트')
  for (const task of tasks) {
    if (task === 'analysis') add(task, '자료 분석 · 핵심 요약 및 논점 추출', '원문의 핵심 주장·수치·출처와 미확인 사실을 구분합니다.', '자료별 요약 · 논점 · 출처 목록')
    else if (task === 'coding') add(task, '코드 작성 및 오류 검토', '요구사항·재현 조건을 정리하고 수정안과 검증 방법을 작성합니다.', '코드 · 실행 방법 · 검증 항목')
    else {
      add(task, /발표|대본/.test(text) ? '발표 구조 설계' : '독자와 글의 구조 정리', '대상 독자와 핵심 메시지, 지시사항을 정리합니다.', '개요 · 핵심 메시지')
      add(task, /발표|대본/.test(text) ? '발표 대본 작성' : '초안 작성과 표현 다듬기', '구조에 따라 초안을 쓰고 논리와 표현을 검토합니다.', '완성 초안 · 검토 항목')
    }
  }
  const recommendations = workflow[0]?.recommendations ?? []
  return {
    request, kind, label: image ? taskLabels.image : tasks.length ? tasks.map(t => scoringTaskLabels[t]).join(' → ') : taskLabels.unknown,
    features: requiredFeatures.map(f => featureLabels[f]), requiredFeatures, recommendations, workflow,
    conclusion: !workflow.length ? '작업을 확인한 뒤 추천을 시작해 주세요' : !recommendations.some(r => r.suitability === '조건 비교 가능') ? '조건 비교 가능한 후보가 없습니다 · 확인 후 선택할 수 있어요' : '입력한 조건으로 후보를 정리했어요',
    detail: !workflow.length ? '요청 수정에서 수행할 작업을 직접 선택하세요.' : !recommendations.length ? '제외 이유를 확인하세요. PDF 대신 텍스트 붙여 넣기, 웹 검색 대신 직접 제공한 출처 활용이 가능한지 검토한 뒤 조건을 수정하세요.' : '조건부 후보는 미확인 항목을 먼저 확인하세요. 표시 순서는 확실한 성능 우위를 의미하지 않습니다.',
    dataVersion: data.version, policyVersion: POLICY_VERSION, checkedAt: data.checkedAt, sources: data.sources,
    interpretationNotes: [input.tasks === undefined ? '키워드 기반 작업 제안입니다. 작업과 순서를 직접 수정할 수 있습니다.' : '사용자가 선택한 작업·순서를 반영했습니다.', ...(input.requiredFeatures === undefined && requiredFeatures.length ? ['기능은 키워드로 제안했습니다. 부정·선택적 표현이 있다면 필수 기능을 수정하세요.'] : [])],
  }
}
export function selectCandidate(steps: WorkflowStep[], stepId: string, candidateId: string): WorkflowStep[] {
  const target = steps.find(s => s.id === stepId)
  const candidate = target?.recommendations.find(r => r.id === candidateId)
  if (!candidate) throw new Error('현재 조건에서 선택할 수 없는 후보입니다.')
  if (target?.candidateId === candidateId) return steps
  const index = steps.findIndex(s => s.id === stepId)
  return steps.map((s, i) => s.id === stepId ? { ...s, candidateId, serviceId: candidate.service.id, needsReview: false } : i > index ? { ...s, needsReview: true } : s)
}
export function selectedCandidate(step: WorkflowStep | undefined): Recommendation | null {
  return step?.recommendations.find(r => r.id === step.candidateId) ?? null
}
export function candidateLabel(candidate: Recommendation): string {
  if(candidate.configuration) return `${candidate.model?.name} · ${candidate.model?.id} v${candidate.model?.version} · 실행 구성: ${candidate.configuration.agentName??'에이전트 이름 미공개'} (${candidate.configuration.effort??'추론 설정 미공개'}) · ${candidate.configuration.benchmark} ${candidate.configuration.benchmarkVersion} · ${candidate.configuration.fallbacks??'fallback 미공개'} · ${mappingLabel(candidate.mapping)}`
  if(candidate.mapping.routeKind) return `${candidate.service.name} · ${candidate.plan.name} · ${candidate.model ? `${candidate.model.name ?? candidate.model.id} ID: ${candidate.model.id} v${candidate.model.version} (${candidate.mapping.mode ?? '모드 미확인'})${candidate.mapping.status!=='confirmed'?' · 플랜 연결 미확인':''}` : candidate.mapping.selection==='automatic'?'자동 라우팅 · 모델·버전 선택 가능 여부 미확인':'모델·버전·모드 미확인'} · ${mappingLabel(candidate.mapping)}`
  return `${candidate.service.name} · ${candidate.plan.name}${candidate.mapping.status === 'confirmed' && candidate.mapping.mode ? ` · ${candidate.model?.id ?? '모델 미확인'} (${candidate.mapping.mode})` : ' · 모델·모드 미확인'}`
}
