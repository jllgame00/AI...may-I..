import type { Model, ModelEvaluation, PlanModelMapping, ResearchSource, ServicePlan, Source } from '../recommendationTypes'

export const MODEL_CHECKED_AT = '2026-10-28'
const src = (url: string, scope: string): Source => ({url,scope,checkedAt:MODEL_CHECKED_AT,access:'이번 작업에서 공식 원문 열람'})
const catalog = src('https://developers.openai.com/api/docs/models','정확한 ID·추론 설정·API 도구·토큰 가격')
const apiPricing = src('https://developers.openai.com/api/docs/pricing','OpenAI 표준 API 요금. Fast·Batch·지역별 가산과 별개')
const apiCurrency = src('https://help.openai.com/en/articles/10421635-multicurrency-billing','API 크레딧 구매 통화 USD. 소비자 구독 통화와 구분')
const claudeApiPricing = src('https://platform.claude.com/docs/en/about-claude/pricing','API 가격 USD 명시. 표준 토큰·캐시 입력 가격')
const work = src('https://learn.chatgpt.com/docs/models','Work 웹 모델·추론 선택. 계정·플랜·출시 단계에 따라 옵션 차이')
const sol = src('https://openai.com/index/introducing-gpt-6-1-sol/','Sol 6.1 발표·평가·Plus Work 제공. 일반 Chat 미제공 명시')
const terra = src('https://openai.com/index/introducing-gpt-6-1-terra/','Terra 6.1 발표·평가·Plus Work 제공')
const astra = src('https://openai.com/index/gpt-6-astra/','Astra 6 발표·Plus 제공')
const sonnet = src('https://www.anthropic.com/claude-sonnet-5-5','Sonnet 5.5 발표·API ID·가격·공개 평가 표와 각주')
const opus = src('https://www.anthropic.com/claude-opus-5-5','Opus 5.5 발표·API ID·가격·평가 설정과 대체 모델')
const claudeSettings = src('https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings','모델·effort 선택 방법. 5.5의 thinking 제한. 플랜별 권한표 아님')
const claudePricing = src('https://claude.com/pricing','Free/Pro 가격·기능. 정확한 플랜별 5.5 모델 권한은 미기재')
const zapier = src('https://zapier.com/benchmarks','AutomationBench 1.0.6 공개 전체 결과. default fallbacks와 Max 설정 구분')
const reasoning = ['low','medium','high','xhigh','max']
const openaiModels: Model[] = [
  {id:'gpt-6.1-sol',name:'GPT-6.1 Sol',version:'6.1',provider:'OpenAI',reasoning:'medium',evaluationMode:'medium',modes:reasoning,capabilities:['텍스트·이미지 입력 / 텍스트 출력','API: 함수·웹 검색·파일 검색·컴퓨터 사용'],limits:['일반 Chat 제공은 확인되지 않음. Work와 구분.','이미지 이해가 이미지 생성 모델 지원을 뜻하지 않음.'],availability:'API / ChatGPT Plus 이상 Work·Codex',speed:'공통 조건의 지연시간 측정값 미확보',setup:'Work의 Advanced에서 모델·추론 설정을 직접 확인',sources:[catalog,sol,work],apiPrice:{input:2,output:10,cachedInput:0.1,currency:'USD',perTokens:1000000,source:catalog}},
  {id:'gpt-6.1-terra',name:'GPT-6.1 Terra',version:'6.1',provider:'OpenAI',reasoning:'medium',evaluationMode:'medium',modes:['none',...reasoning],capabilities:['텍스트·이미지 입력 / 텍스트 출력','API: 함수·웹 검색·파일 검색·컴퓨터 사용'],limits:['Work·Codex 제공을 일반 Chat 권한으로 확장하지 않음.','API 도구 지원이 구독 플랜의 도구 한도를 보장하지 않음.'],availability:'API / ChatGPT Plus 이상 Work·Codex',speed:'빠른 모델이라는 제공사 설명. 동일 조건 지연시간 미측정',setup:'Work의 Advanced에서 모델·추론 설정을 직접 확인',sources:[catalog,terra,work],apiPrice:{input:1,output:5,cachedInput:0.05,currency:'USD',perTokens:1000000,source:catalog}},
  {id:'gpt-6-astra',name:'GPT-6 Astra',version:'6',provider:'OpenAI',reasoning:'medium',evaluationMode:'medium',modes:reasoning,capabilities:['텍스트·이미지 입력 / 텍스트 출력','API: 함수·웹 검색·파일 검색·컴퓨터 사용'],limits:['none 추론 미지원.','플랜·클라이언트별 추론·속도 옵션이 다름.'],availability:'API / ChatGPT Plus 이상. 이 앱은 확인된 Work 선택 경로 사용',speed:'동일 조건 지연시간 미확보. 높은 effort는 시간·토큰 증가 가능',setup:'Work 모델 선택과 계정의 추론 옵션 확인',sources:[catalog,astra,work],apiPrice:{input:10,output:50,cachedInput:1,currency:'USD',perTokens:1000000,source:catalog}},
]
const claudeModels: Model[] = [
  {id:'claude-sonnet-5-5',name:'Claude Sonnet 5.5',version:'5.5',provider:'Anthropic',reasoning:'medium',evaluationMode:'medium',modes:reasoning,capabilities:['텍스트 작업·이미지 이해','Claude 앱과 API의 기본 effort가 다름'],limits:['앱 thinking 끄기 불가. API에서는 disabled 대신 between_tools 필요.','일부 사이버 요청에 Sonnet 5 대체 실행 가능.'],availability:'Claude Platform API 확인 / Free·Pro별 정확한 모델 권한은 별도 미확인',speed:'Sonnet 5 대비 출력 30% 이상 빠름은 제공사 주장. 타사와 같은 조건 비교 아님',setup:'앱 기본 Medium, API 기본 High. 이 앱의 API 준비 설정은 medium',sources:[sonnet,claudeSettings],apiPrice:{input:2,output:10,cachedInput:0.1,currency:'USD',perTokens:1000000,source:sonnet}},
  {id:'claude-opus-5-5',name:'Claude Opus 5.5',version:'5.5',provider:'Anthropic',reasoning:'medium',evaluationMode:'medium',modes:reasoning,capabilities:['텍스트 작업·이미지 이해','도구를 사용하는 작업 평가 공개'],limits:['앱·API 모두 thinking 끄기 불가.','안전장치에 따라 Opus 4.8/Opus 5 대체 실행이 평가에 포함될 수 있음.'],availability:'Claude Platform API 확인 / Pro의 정확한 모델 권한은 별도 미확인',speed:'Opus 5 대비 출력 30% 이상 빠름은 제공사 주장. 동일 조건 타사 측정 없음',setup:'선택한 effort를 직접 지정하고 대체 실행 여부 확인',sources:[opus,claudeSettings],apiPrice:{input:4,output:20,cachedInput:0.2,currency:'USD',perTokens:1000000,source:opus}},
]
export const currentModels = [...openaiModels.map(model=>({...model,sources:[...model.sources!,apiPricing,apiCurrency],apiPrice:{...model.apiPrice!,source:apiPricing},nativeFeatures:{imageInput:{status:'supported' as const,note:'공식 API 모델 목록의 이미지 입력 지원. 파일 업로드·이미지 생성 권한과 별개.',sources:[catalog]}}})),...claudeModels.map(model=>({...model,sources:[...model.sources!,claudeApiPricing],apiPrice:{...model.apiPrice!,source:claudeApiPricing}}))]

const publicFacts = '공식 공개 자료의 소수 사실 수치만 요약·출처 연결. 원문·평가 데이터셋의 별도 재배포 허가는 확인하지 않았으며 오픈 라이선스를 주장하지 않음.'
// Immutable evaluated releases, independent of future catalog edits.
const evaluatedReleases:Record<string,string>={'gpt-6.1-sol':'6.1','gpt-6.1-terra':'6.1','gpt-6-astra':'6','claude-sonnet-5-5':'5.5','claude-opus-5-5':'5.5'}
function result(id: string, modelId: string, source: Source, values: Partial<ModelEvaluation> & Pick<ModelEvaluation,'benchmark'|'benchmarkVersion'|'domain'|'rawScore'>): ModelEvaluation {
  return {id,modelId,modelVersion:evaluatedReleases[modelId],subset:null,unit:'%',higherIsBetter:true,effort:null,tools:null,harness:null,environment:null,trials:null,fallbacks:null,evaluator:'미확인',publisher:modelId.startsWith('gpt')?'OpenAI':'Anthropic',kind:'provider',publishedAt:null,evaluatedAt:null,source,terms:publicFacts,limitations:'하네스·환경·시도 횟수 미확인. 소비자 웹서비스에서의 성공률이나 한국어 품질을 뜻하지 않음.',...values}
}
export const currentEvaluations: ModelEvaluation[] = [
  result('sol-factual-low','gpt-6.1-sol',sol,{benchmark:'오류 유발 대화 사실성 평가',benchmarkVersion:'미공개',domain:'factuality',evaluator:'OpenAI',rawScore:7.7,higherIsBetter:false,effort:'low',subset:'비식별 ChatGPT 오류 신고 대화',publishedAt:'2026-09-29',limitations:'오류가 하나 이상 있는 응답 비율. 일반 사용의 오류율·한국어 정확도가 아니며 평가 버전·하네스 미공개.'}),
  result('terra-terminal-max','gpt-6.1-terra',terra,{benchmark:'Terminal-Bench',benchmarkVersion:'4.0',domain:'coding',rawScore:50.3,effort:'max',tools:'터미널·코드',limitations:'코딩 에이전트 과제 해결 비율. 글쓰기·설문 통계의 직접 점수 아님. 하네스·시도 횟수 미확인.'}),
  result('terra-factual-low','gpt-6.1-terra',terra,{benchmark:'오류 유발 프롬프트 사실성 평가',benchmarkVersion:'미공개',domain:'factuality',evaluator:'OpenAI',rawScore:16.7,higherIsBetter:false,effort:'low',subset:'제공사 내부 오류 유발 프롬프트',limitations:'내부 평가이며 일반 오류율이 아님. Sol 사실성 평가와 동일 표본인지 미확인.'}),
  result('terra-factual-max','gpt-6.1-terra',terra,{benchmark:'오류 유발 프롬프트 사실성 평가',benchmarkVersion:'미공개',domain:'factuality',evaluator:'OpenAI',rawScore:4.3,higherIsBetter:false,effort:'max',subset:'제공사 내부 오류 유발 프롬프트',limitations:'내부 평가. 낮은 effort 결과와 같은 설정으로 순위화하지 않음.'}),
  result('astra-science-sol-report','gpt-6-astra',sol,{benchmark:'Terminal-Bench Science',benchmarkVersion:'0.1',domain:'science',evaluator:'OpenAI',rawScore:68.1,tools:'터미널·코드',publishedAt:'2026-09-29',limitations:'Sol 발표 본문에서 Astra 최고값 확인. 이 수치의 정확한 Astra effort·하네스·시도 횟수 미확인. 설문 통계 성공률 아님.'}),
  result('sonnet-terminal','claude-sonnet-5-5',sonnet,{benchmark:'Terminal-Bench',benchmarkVersion:'4.0',domain:'coding',rawScore:70.6,tools:'터미널·코드',publishedAt:'2026-09-28',limitations:'발표 표에 이 값의 effort 미표기. 시스템 카드 접근 실패로 추정하지 않음. 안전장치 대체 모델·하네스·시도 조건 미확인.'}),
  result('sonnet-frontier-max','claude-sonnet-5-5',sonnet,{benchmark:'FrontierCode',benchmarkVersion:'1.1',domain:'coding',rawScore:46.2,effort:'max',subset:'Main',publishedAt:'2026-09-28',limitations:'수정 없이 병합 가능한 변경 평가. Max의 서브에이전트 검토에 따른 시간 초과·범위 밖 수정이 점수에 영향. 전체 실행 조건 미확인.'}),
  result('sonnet-frontier-xhigh','claude-sonnet-5-5',sonnet,{benchmark:'FrontierCode',benchmarkVersion:'1.1',domain:'coding',rawScore:52.1,effort:'xhigh',subset:'Main',publishedAt:'2026-09-28',limitations:'같은 모델 Max 46.2%와 effort가 다름. 높은 effort의 무조건적인 성능 상승을 가정하지 않음. 전체 실행 조건 미확인.'}),
  result('opus-terminal-xhigh','claude-opus-5-5',opus,{benchmark:'Terminal-Bench',benchmarkVersion:'4.0',domain:'coding',rawScore:66.4,evaluator:'Anthropic',effort:'xhigh',tools:'터미널·코드',fallbacks:'안전장치 개입 시 사이버 Opus 4.8, 생물·프런티어 LLM Opus 5',publishedAt:'2026-09-22',limitations:'표준오차 ±2.6%p. 공개 리더보드의 5 trials/task를 이 발표 실행의 시도 횟수로 대입하지 않음. 대체 모델을 포함한 결과.'}),
  result('opus-frontier-max','claude-opus-5-5',opus,{benchmark:'FrontierCode',benchmarkVersion:'1.1',domain:'coding',rawScore:54.4,effort:'max',subset:'Main',fallbacks:'안전장치 개입 시 사이버 Opus 4.8, 생물·프런티어 LLM Opus 5',publishedAt:'2026-09-22',limitations:'Adaptive thinking. 대체 모델 포함 가능. 발표의 medium 54.6%와 설정을 구분. 하네스·시도 횟수 미확인.'}),
  ...[
    ['sonnet-automation-max','claude-sonnet-5-5',44.75,'제공사 기본 fallback 라우팅'],
    ['opus-automation-max','claude-opus-5-5',42.47,'제공사 기본 fallback 라우팅'],
    ['astra-automation-max','gpt-6-astra',41.40,null],
  ].map(([id,modelId,rawScore,fallbacks])=>result(id as string,modelId as string,zapier,{benchmark:'AutomationBench',benchmarkVersion:'1.0.6',domain:'workflow',rawScore:rawScore as number,effort:'max',subset:'전체',tools:'47개 업무 도구 / 6개 업무 영역',environment:'격리된 모의 회사 상태',fallbacks:fallbacks as string|null,evaluator:'Zapier',publisher:'Zapier',kind:'independent',limitations:'최종 환경 상태를 채점하며 답변 문장 품질은 채점하지 않음. 발표/평가일·정확한 하네스·시도 횟수 미기재. Claude는 거절된 작업을 기본 fallback으로 재실행. Astra fallback 여부 미확인. 하네스 미확인으로 쌍별 우열 판정 보류.'})),
]

export function currentMappings(previous: PlanModelMapping[]): PlanModelMapping[] {
  const retained = previous.filter(m=>m.planId!=='claude-pro').map(m=>({...m,routeKind:'chat' as const,routeLabel:'개인 웹 채팅',selection:(m.planId==='gemini-free'?'automatic':'unknown') as 'automatic'|'unknown',note:m.planId==='gemini-free'?'자동 라우팅 · 정확한 모델·버전·설정 선택 미확인':m.note}))
  const mapping = (model:Model,planId:string,routeKind:'work'|'chat'|'api',confirmed:boolean):PlanModelMapping => ({
    id:`${planId}-${model.id}-${routeKind}-medium`,planId,modelId:model.id,modelVersion:model.version,status:confirmed?'confirmed':'unknown',selectable:confirmed,mode:'medium',selection:confirmed?'manual':'unknown',routeKind,routeLabel:routeKind==='work'?'ChatGPT Work (웹)':routeKind==='api'?'개발자 API · 직접 실행':'개인 웹 채팅',url:routeKind==='api'?(model.provider==='OpenAI'?'https://platform.openai.com/':'https://platform.claude.com/'):model.provider==='OpenAI'?'https://chatgpt.com/':'https://claude.ai/',sources:routeKind==='work'?[work,...model.sources!]:model.sources!,
    note:routeKind==='work'?'Plus의 Work 제공과 모델 선택 안내 확인. Advanced 옵션은 계정·출시 단계에 따라 다름. 이 링크는 Work/모델을 자동 선택하지 않음.':routeKind==='api'?'API 모델 ID·지원 설정 확인. 사용자가 별도 개발 환경에서 직접 설정·실행. 구독료에 포함된다고 가정하지 않음.':'모델 출시·선택 방법은 확인했으나 Pro에서 이 정확한 모델을 선택할 수 있는지 미확인. API 제공을 Pro 권한 근거로 쓰지 않음.',
    toolsNote:routeKind==='api'?'도구는 별도 구성·과금·구현 필요. 이 앱은 API 요청을 전송하지 않음.':routeKind==='work'?'Work의 모델 선택과 도구 권한을 계정에서 확인. Chat의 업로드·분석 권한을 그대로 적용하지 않음.':'플랜의 파일·도구 권한과 모델 권한은 각각 확인.',
  })
  return [...retained,...openaiModels.map(m=>mapping(m,'chatgpt-plus','work',true)),...claudeModels.map(m=>mapping(m,'claude-pro','chat',false)),...currentModels.map(m=>mapping(m,m.provider==='OpenAI'?'openai-api':'anthropic-api','api',true))]
}

export function apiPlans(): ServicePlan[] {
  return (['OpenAI','Anthropic'] as const).map(provider=>({id:provider==='OpenAI'?'openai-api':'anthropic-api',serviceId:provider==='OpenAI'?'chatgpt':'claude',name:`${provider} API`,tier:'paid',billingKind:'usage',price:{amount:null,currency:'USD',period:null,region:'사용량 과금 · 한국 결제 총액·세금 미확인'},features:{pdf:{status:'unknown',note:'API별 파일 처리 구현·제한 별도 확인',sources:[]},web:{status:'unknown',note:'도구 구성·추가 과금 별도 확인',sources:[]}},route:'개발자 API · 직접 실행',limits:['토큰·도구별 과금. 계정 rate limit·총예산·세금 확인 필요.','구독 플랜의 파일 업로드·코드 실행 한도를 적용하지 않음.'],freeScope:'이 앱에서 확인한 무료 API 사용 범위 없음. 구독 상품과 별도로 과금.',upgrade:'구독 업그레이드와 별개로 사용량·도구 비용을 직접 확인하세요.',sources:provider==='OpenAI'?[catalog]:[sonnet,opus]}))
}
export function reviewedPlans(plans:ServicePlan[]):ServicePlan[] {
  return plans.map(p=>p.serviceId==='claude'?{...p,billingKind:'subscription',sources:[claudePricing,...p.sources],billing:p.billing?{...p.billing,note:`${p.billing.note} 2026-10-28 가격표 재열람: 월 $20 / 연 $200 선결제·월 $17 표기, 세금 별도.`}:p.billing}: {...p,billingKind:'subscription'})
}
export const currentResearchSources:ResearchSource[] = [catalog,apiPricing,apiCurrency,claudeApiPricing,work,sol,terra,astra,sonnet,opus,claudeSettings,claudePricing,zapier].map(s=>({...s,name:s.scope!,status:'원문 확인',note:'수동 검토 스냅샷. 모델·플랜·평가의 확인 범위를 구분.'}))
currentResearchSources.push({...src('https://www.anthropic.com/claude-sonnet-5-5-system-card','시스템 카드'),access:'접근 실패 1회',name:'Sonnet 5.5 시스템 카드',status:'크기 제한으로 미열람',note:'도구가 약 13 MB 응답 크기 제한 오류를 반환. 재시도·우회하지 않음. 발표 페이지에서 확인한 수치만 수록.'})
