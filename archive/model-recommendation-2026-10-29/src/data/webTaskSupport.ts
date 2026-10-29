import type { FeatureSupport, Model, RecommendationSnapshot, ServicePlan, Source } from '../recommendationTypes'

// Additive review: the historical snapshots and supplied research stay intact.
// Join independently scoped model/plan, web-route and SERVICE tool evidence.
// None of these public facts establishes a personal account's remaining quota.
const files:Source={url:'https://support.claude.com/en/articles/8241126-upload-files-to-claude',checkedAt:'2026-10-29',scope:'Claude 웹 파일 업로드: CSV·XLSX. XLSX는 코드 실행·파일 생성 활성화 필요.'}
const execution:Source={url:'https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude',checkedAt:'2026-10-29',scope:'Free·Pro·Max·Team·Enterprise 웹의 코드 실행·파일 생성 및 업로드 자료 분석. 계정 설정·한도 별도.'}
const source=(url:string,scope:string):Source=>({url,scope,checkedAt:'2026-10-29'})
const academy=source('https://academy.claude.com/tutorials/choosing-the-right-claude-model','현재 Sonnet 5.5·Opus 5.5 설명. Free의 Sonnet, Pro 이상 Opus 및 추가 모델 제공. 일부 주제 대체 모델 예외.')
const settings=source('https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings','웹 모델 선택기와 Sonnet/Opus 5.5의 Medium effort 선택. 개인 계정 설정 확인과 별개.')
const chatAnalysis=source('https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt','일반 ChatGPT의 XLS/XLSX/CSV 업로드와 Python 계산·통계 분석. Work의 도구 권한으로 전용하지 않음.')
const chatFree=source('https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq','Free 파일 업로드·데이터 분석 지원과 별도 사용량 한도. 잔여 한도 미확인은 미지원이 아님.')
const chatPlus=source('https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus','Plus 웹 앱의 파일 업로드·분석. 정확한 모델은 계정 선택기와 출시 단계에 따라 다름.')
const workModels=source('https://learn.chatgpt.com/docs/models','Work 웹의 Astra·Sol 6.1·Terra 6.1 모델과 추론 설정. 일반 Chat 모델과 구분.')
const workAccess=source('https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex','Plus Work 모델 제공, 웹 클라우드 경로·첨부 파일 사용. 출시 단계·권한·사용량 별도.')
const workFiles=source('https://learn.chatgpt.com/docs/artifacts-viewer','Work 웹의 원본 파일 첨부와 문서·스프레드시트 작업. XLSX 입력 세부 범위는 이 문서만으로 확정하지 않음.')
const workCode=source('https://learn.chatgpt.com/docs/enterprise/chatgpt-work-cloud-security','Work Cloud의 코드·셸 실행과 파일 접근. 네트워크·관리자 권한은 별도이며 사용자 계정 설정은 미검증.')
const geminiFiles=source('https://support.google.com/gemini/answer/14903178?hl=en','Gemini 웹의 파일·시트 업로드·분석·차트. 임의 계산 런타임 지원과 구분.')
const geminiLimits=source('https://support.google.com/gemini/answer/16275805?hl=en','개인 계정의 미가입/유료 기능 범위와 한도. 등록 API 릴리스의 웹 고정 선택 근거 없음.')
const unique=(sources:Source[])=>[...new Map(sources.map(s=>[s.url,s])).values()]
const support=(note:string,sources:Source[],status:FeatureSupport['status']='supported'):FeatureSupport=>({status,note,sources})
const claudeReleases:Record<string,string>={'claude-opus-5-5':'5.5','claude-sonnet-5-5':'5.5'}
const workReleases:Record<string,string>={'gpt-6.1-sol':'6.1','gpt-6.1-terra':'6.1','gpt-6-astra':'6'}
function review(model:Model):NonNullable<Model['webReview']> {
  let status:'confirmed'|'unknown'='unknown',note='등록된 API·설치 근거는 소비자 웹 플랜 연결 근거가 아닙니다. 정확한 웹 모델·필수 도구 연결은 미확인입니다.',sources=model.sources??[]
  if(claudeReleases[model.id]===model.version){status='confirmed';note='현재 모델명·릴리스와 플랜 제공 범위를 Academy, 웹 모델·effort 선택을 도움말로 교차 확인했습니다. 개인 계정 상태와 성능 우위를 확인한 것은 아닙니다.';sources=[academy,settings]}
  else if(workReleases[model.id]===model.version){status='confirmed';note='Work 웹 모델 선택과 Plus 제공을 확인했습니다. 일반 Chat의 도구 지원을 복사하지 않으며 출시·권한 상태는 계정에서 확인합니다.';sources=[workModels,workAccess]}
  else if(model.id==='mistralai/Mistral-Small-3.2-24B-Instruct-2506'&&model.version==='3.2-2506'){status='confirmed';note='DeepInfra의 정확한 2506 모델 페이지와 웹 데모 확인. FP8 제공, 추론 설정·파일·계산 도구는 별도 미확인입니다.';sources=[source('https://deepinfra.com/mistralai/Mistral-Small-3.2-24B-Instruct-2506',note)]}
  else if(model.provider==='Google'){sources=[geminiLimits,geminiFiles];note='Gemini 서비스의 파일 분석 안내는 확인했지만 등록된 정확한 API 릴리스의 웹 선택은 미확인입니다.'}
  else {
    const groups:[RegExp,string,string][]=[
      [/^deepseek-ai\//,'https://www.deepseek.com/','현재 V4.1 안내와 일반 웹 링크는 등록 R1/V3 구버전 선택·파일·계산 기능의 증거가 아닙니다.'],
      [/^moonshotai\//,'https://www.kimi.com/','현재 K3.1 Pro 안내로 등록된 K2 릴리스의 웹 고정 선택을 확인할 수 없습니다.'],
      [/^Qwen\/Qwen3-/,'https://chat.qwen.ai/','앱 안내·현재 시스템 미지원 표시만 확인. 등록 Instruct-2507 고정 선택·도구는 미확인입니다.'],
      [/^zai-org\//,'https://chat.z.ai/','현재 GLM-5.3-Flash 안내는 등록 GLM-4.x 선택 근거가 아닙니다.'],
      [/^meta-llama\//,'https://about.fb.com/news/2026/07/meta-ai-muse-spark-doesnt-just-think-it-acts/','현재 Meta AI의 Muse Spark 안내를 Llama 4 체크포인트 제공으로 연결하지 않습니다.'],
      [/^mistralai\//,'https://help.mistral.ai/en/articles/682992-le-chat-is-now-vibe','Vibe 서비스 안내만으로 과거 체크포인트 선택을 확정하지 않습니다. DeepInfra 2506 전용 웹 경로는 기존 공식 호스팅 근거를 별도 보존합니다.'],
      [/^grok|^Grok/i,'https://x.ai/grok','Grok 웹 서비스는 확인했으나 등록 4.6/4.7 고정 버전과 플랜·도구 연결은 미확인입니다.'],
    ]
    const group=groups.find(([pattern])=>pattern.test(model.id))
    if(group){note=group[2];sources=[source(group[1],note)]}
  }
  return {checkedAt:'2026-10-29',status,note,sources}
}
export function applyWebTaskSupport(data:RecommendationSnapshot):RecommendationSnapshot {
  const models=data.models.map(m=>{const webReview=review(m);return {...m,webReview,...(claudeReleases[m.id]===m.version?{availability:m.id==='claude-sonnet-5-5'?'Claude Free·Pro 웹의 Sonnet 5.5 제공 확인. 개인 계정 상태 별도 확인.':'Claude Pro 이상 웹의 Opus 5.5 제공 확인. 개인 계정 상태 별도 확인.'}:{})}})
  const plans=data.plans.map<ServicePlan>(p=>{
    if(p.billingKind==='usage')return p
    if(['claude-free','claude-pro'].includes(p.id))return {
    ...p,webAccess:{status:'confirmed' as const,url:'https://claude.ai/',routeKind:'chat' as const,sources:[academy,execution]},accountChecks:['확인하지 않은 개인 계정의 코드 실행·파일 생성 활성화, 파일 한도와 남은 사용량을 확인하세요.','Team·Enterprise를 별도로 이용하면 관리자 기능 허용을 확인하세요. 네트워크 차단과 계산 실행 비활성화는 서로 다릅니다.'],features:{...p.features,
      upload:{status:'supported',note:'웹 채팅의 CSV·XLSX 업로드 확인. XLSX는 Code execution and file creation을 켜야 함. 계정별 사용량·파일 한도 적용.',sources:[files,execution]},
      spreadsheet:{status:'supported',note:'XLSX 입력과 업로드 자료 분석·Excel 파일 작업 확인. 계산 기능 활성화·자료 검증 필요. 설문 분석 정확성이나 모든 수식 재계산 보장은 아님.',sources:[files,execution]},
      code:{status:'supported',note:'웹 대화의 코드 실행 환경 지원. 설정·계정 한도 확인 필요. 모델 자체 추론 점수 또는 Claude Code 에이전트 평가와 별개.',sources:[execution]},
    },sources:unique([...p.sources,files,execution,academy]),
    }
    if(['chatgpt-free','chatgpt-plus'].includes(p.id))return {...p,webAccess:{status:'confirmed' as const,url:'https://chatgpt.com/',routeKind:'chat' as const,sources:[chatAnalysis,p.id==='chatgpt-free'?chatFree:chatPlus]},accountChecks:['개인 계정의 선택 모델, 파일 한도와 데이터 분석의 남은 사용량은 확인하지 않았습니다.'],features:{...p.features,
      upload:support('일반 Chat 웹 파일 첨부 지원. 개인 계정의 잔여 한도는 별도 확인.',[chatAnalysis,p.id==='chatgpt-free'?chatFree:chatPlus]),
      spreadsheet:support('일반 Chat 웹 XLS/XLSX/CSV 입력·분석 지원. 전체 시트·수식 처리 및 분석 결과는 직접 검토.',[chatAnalysis]),
      code:support('일반 Chat 데이터 분석의 Python 계산·통계 분석 지원. 계정별 도구 한도 적용.',[chatAnalysis]),
    }}
    if(['gemini-free','gemini-pro'].includes(p.id))return {...p,webAccess:{status:'confirmed' as const,url:'https://gemini.google.com/',routeKind:'chat' as const,sources:[geminiFiles,geminiLimits]},accountChecks:['계정의 파일·컨텍스트·남은 사용량을 확인하세요. 학교·조직 계정은 관리자 권한도 별도 확인합니다.'],features:{...p.features,
      upload:support('Gemini 웹 파일 첨부 지원. 미가입·유료 계정의 한도 차이는 개인 상태와 별도로 관리.',[geminiFiles,geminiLimits]),
      spreadsheet:support('Gemini 웹 시트 분석·차트 지원. 계산 실행 환경 또는 모든 수식 재계산의 보장은 아님.',[geminiFiles]),
      code:support('시트·차트 안내만으로 재현 가능한 코드·통계 계산 실행 환경을 확인할 수 없습니다.',[geminiFiles],'unknown'),
    }}
    return p
  })
  const mappings=data.mappings.map(m=>{
    const freeSonnet=m.planId==='claude-free'&&m.modelId===null&&m.routeKind==='chat'
    const model=models.find(model=>model.id===(freeSonnet?'claude-sonnet-5-5':m.modelId))
    if(model&&claudeReleases[model.id]===model.version&&m.routeKind==='chat'&&['claude-free','claude-pro'].includes(m.planId)&&(freeSonnet||m.modelVersion===model.version)&&(!m.mode||model.modes?.includes(m.mode))&&!(m.planId==='claude-free'&&model.id==='claude-opus-5-5'))return {...m,modelId:model.id,modelVersion:model.version,mode:m.mode??'medium',status:'confirmed' as const,selectable:true,selection:'manual' as const,url:'https://claude.ai/',sources:unique([...m.sources,academy,settings]),note:'Academy의 현재 5.5 모델·플랜 제공과 웹 모델·effort 선택 안내를 교차 확인했습니다. 일부 생물·보안 주제는 대체 모델이 적용될 수 있습니다. 계정 활성화·남은 사용량은 직접 확인하지 않았습니다.'}
    if(model&&workReleases[model.id]===model.version&&m.modelVersion===model.version&&m.planId==='chatgpt-plus'&&m.routeKind==='work')return {...m,sources:unique([...m.sources,workModels,workAccess]),features:{
      upload:support('Work 웹 원본 파일 첨부 확인. 로컬 컴퓨터 파일을 자동 접근하는 기능과 구분.',[workAccess,workFiles]),
      spreadsheet:support('Work 웹 스프레드시트 작성·편집 안내 확인. XLSX 입력의 세부 분석 범위는 추가 확인 필요.',[workFiles],'limited'),
      code:support('Work Cloud의 코드·셸 계산 실행 경로 확인. 사용 가능한 패키지·권한·환경은 계정과 작업에 따라 다름.',[workCode]),
    },accountChecks:['Work Cloud 사용 가능 여부, 도구 권한·패키지와 남은 사용량을 계정에서 확인하세요.']}
    const plan=plans.find(p=>p.id===m.planId)
    return !m.modelId&&m.routeKind==='chat'&&plan?.webAccess?{...m,url:plan.webAccess.url}:m
  })
  return {...data,models,plans,mappings}
}
