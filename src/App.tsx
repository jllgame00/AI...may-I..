import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import ConditionFields from './components/ConditionFields'
import RequestControls from './components/RequestControls'
import AnalysisPanel from './components/AnalysisPanel'
import CandidateComparison from './components/CandidateComparison'
import StageWorkspace from './components/StageWorkspace'
import { buildPromptBundle, fieldLabels, questionsFor, skipQuestions } from './lib/promptEngine'
import { availableScreen, syncDrafts } from './lib/promptSession'
import { buildGuideBundle, compareCandidates, comparisonMatches, DEMO_REQUEST, guideContext, interpretTask, selectForStages, updateGuideRequest } from './lib/aiGuide'
import type { ConditionField, PromptDraft, PromptRequest, Screen, Session, StageSelection } from './types'

const examples = [
  { label:'설문 보고서',text:DEMO_REQUEST },
  { label:'발표 준비',text:'대학생 대상 수업 발표용으로 PDF 논문을 요약해서 5분 발표 대본을 쉽게 작성하고 싶어요.' },
  { label:'이메일 작성',text:'고객에게 보낼 정중한 환영 이메일을 3문장으로 작성하고 싶어요.' },
  { label:'코드 오류 해결',text:'React 코드의 오류 원인과 최소 수정안, 직접 테스트할 방법을 알고 싶어요.' },
]
const allFields=Object.keys(fieldLabels) as ConditionField[]
const emptySession=():Session=>({ request:{ text:'',overrides:{},priority:'quality' },bundle:null,drafts:{},checks:{},comparison:null,selection:{default:null,byStage:{}},reviewed:{},needsReview:[] })
function screenFromHash():Screen { const h=typeof window==='undefined'?'':location.hash.slice(1);return h==='questions'||h==='compare'||h==='result'?h:'start' }
export default function App() {
  const [session,setSession]=useState<Session>(emptySession)
  const [previousSession,setPreviousSession]=useState<Session|null>(null)
  const [screen,setScreen]=useState<Screen>(screenFromHash)
  const [questions,setQuestions]=useState<ConditionField[]>([])
  const [error,setError]=useState('')
  const navigation=useRef(false),restore=useRef(false)
  const request=session.request,comparison=session.comparison,bundle=session.bundle
  const staleComparison=!!comparison&&!comparisonMatches(request,comparison)
  const canResume=!!bundle && !!session.selection?.default&&!staleComparison
  const view:Screen=(screen==='compare'||screen==='result')&&staleComparison?(request.text.trim()?'questions':'start'):screen==='compare'?(comparison?'compare':'start'):screen==='result'&&!canResume?(comparison?'compare':'start'):availableScreen(screen,canResume,!!request.text,questions.length || (screen==='questions'&&!!request.text?1:0))
  const navigate=(next:Screen)=>{
    history.replaceState({scroll:window.scrollY,focus:document.activeElement?.id},'')
    if(location.hash!==`#${next}`){navigation.current=true;location.hash=next}else{setScreen(next);requestAnimationFrame(()=>document.querySelector<HTMLElement>('main h1')?.focus())}
  }
  useEffect(()=>{if(screen!==view){history.replaceState(null,'',`#${view}`);setScreen(view)}},[screen,view])
  useEffect(()=>{const change=()=>{if(location.hash==='#main')return;restore.current=!navigation.current;if(navigation.current)history.replaceState(null,'');navigation.current=false;setScreen(screenFromHash());setError('')};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[])
  useEffect(()=>{const frame=requestAnimationFrame(()=>{const saved=history.state as {scroll?:number;focus?:string}|null;const element=restore.current&&saved?.focus?document.getElementById(saved.focus):null;(element??document.querySelector<HTMLElement>('main h1'))?.focus({preventScroll:true});window.scrollTo({top:restore.current?saved?.scroll??0:0,behavior:'instant'});restore.current=false});return()=>cancelAnimationFrame(frame)},[screen])
  const setRequest=(next:PromptRequest)=>setSession(s=>updateGuideRequest(s,next))
  const changeCondition=(field:ConditionField,value:string)=>setSession(s=>updateGuideRequest(s,{...s.request,overrides:{...s.request.overrides,[field]:value}}))
  const submit=()=>{
    try{buildPromptBundle(request);const a=interpretTask(request);setQuestions(questionsFor(request).slice(0,a.needsInputMode&&a.inputMode==='unknown'?2:3));setError('');navigate('questions')}
    catch(e){setError(e instanceof Error?e.message:'입력을 확인해 주세요.');document.getElementById('request-text')?.focus()}
  }
  const compare=()=>{
    try{
      buildPromptBundle(request)
      const nextRequest=skipQuestions(request,questions),next=compareCandidates(nextRequest)
      setSession(s=>({...s,request:nextRequest,comparison:next,selection:next.recommendations.some(c=>c.id===s.selection?.default)?s.selection:{default:null,byStage:{}},reviewed:{},needsReview:s.bundle?.guideStages?.map(x=>x.id)??[]}))
      setError('');navigate('compare')
    }catch{setError('후보를 정리하지 못했어요. 입력은 그대로 남아 있어요. 조건을 수정한 뒤 다시 시도해 주세요.')}
  }
  const prepare=(selection:StageSelection,activeId?:string,changedStage?:string)=>{
    try{
      if(!comparison||!comparisonMatches(request,comparison)){setError('조건이 바뀌었어요. 후보를 다시 비교한 뒤 선택해 주세요.');navigate('questions');return}
      const nextBundle=buildGuideBundle(request,selection)
      setSession(s=>{
        let drafts=s.drafts
        for(const t of [...nextBundle.steps,...nextBundle.followups])drafts=syncDrafts(drafts,[t],guideContext(t))
        const changedIndex=nextBundle.steps.findIndex(x=>x.id===changedStage)
        const affected=changedStage?nextBundle.steps.slice(changedIndex).map(x=>x.id):nextBundle.steps.map(x=>x.id)
        const reviewed=changedStage?{...s.reviewed}:{} as Record<string,boolean>
        for(const id of affected)reviewed[id]=false
        return {...s,bundle:nextBundle,selection,drafts,activeStageId:activeId??nextBundle.steps[0]?.id,reviewed,needsReview:s.bundle?[...new Set([...(changedStage?s.needsReview??[]:[]),...affected])]:[]}
      })
      setError('');navigate('result')
    }catch{setError('단계별 준비를 만들지 못했어요. 입력과 편집 초안은 그대로 남아 있어요. 조건을 확인한 뒤 다시 시도해 주세요.')}
  }
  const changeDraft=(id:string,draft:PromptDraft)=>setSession(s=>{
    const stages=s.bundle?.guideStages??[],index=stages.findIndex(x=>x.id===id)
    const dependent=index<0?[]:stages.slice(index+1).map(x=>x.id)
    const reviewed={...s.reviewed};for(const key of [id,...dependent])reviewed[key]=false
    return {...s,drafts:{...s.drafts,[id]:draft},reviewed,needsReview:[...new Set([...(s.needsReview??[]),...dependent])]}
  })
  const newTask=()=>{setPreviousSession(session);setSession(emptySession());setError('');navigate('start')}
  const restoreTask=()=>{if(previousSession){setSession(previousSession);setPreviousSession(null);navigate(previousSession.bundle?'result':'start')}}
  const moveStage=(id:string)=>{setSession(s=>({...s,activeStageId:id}));requestAnimationFrame(()=>document.getElementById('stage-title')?.focus())}
  return <div className="app"><a href="#main" className="skip-link">본문으로 건너뛰기</a><header className="header"><button id="home" className="wordmark" onClick={()=>navigate('start')}>AI..may I..?</button><span>어떤 AI를 쓸지부터, 어떻게 쓸지까지.</span>{comparison&&view==='start'&&<button id="resume-comparison" className="text-button" onClick={()=>navigate('compare')}>후보 비교 <ArrowUpRight size={15}/></button>}{canResume&&view!=='result'&&<button id="resume" className="text-button" onClick={()=>navigate('result')}>단계별 준비 이어가기 <ArrowUpRight size={15}/></button>}</header>
    <main id="main" tabIndex={-1}>{previousSession&&<div className="restore-task"><span>이전 작업은 잠시 보관했어요.</span><button id="restore-task" className="text-button" onClick={restoreTask}>이전 작업 복구</button></div>}
      {view==='start'&&<div className="start-layout"><div className="intro"><p className="eyebrow">CHOOSE & CREATE</p><h1 tabIndex={-1}>어떤 일을 하고 싶으세요?</h1><p>작업과 조건에 맞는 AI를 비교하고,<br className="desktop-break"/>단계별 프롬프트로 시작해 보세요.</p></div><form className="request-form" onSubmit={e=>{e.preventDefault();submit()}}><label htmlFor="request-text">하고 싶은 작업</label><textarea id="request-text" maxLength={4000} value={request.text} placeholder={DEMO_REQUEST} aria-invalid={!!error} aria-describedby={error?'request-error':'request-help'} onChange={e=>{setRequest({...request,text:e.target.value});setError('')}}/><div className="input-help"><span id="request-help">원본 자료 대신 목표와 필요한 결과를 적어 주세요.</span><span>{request.text.length.toLocaleString()} / 4,000</span></div>{error&&<p id="request-error" role="alert" className="error">{error}</p>}<div className="examples" aria-label="대표 작업 예시">{examples.map((ex,i)=><button id={`example-${i}`} key={ex.label} type="button" onClick={()=>{setRequest({...request,text:ex.text,...(i===0?{priority:'quality' as const}: {})});setError('')}}>{ex.label}<ArrowUpRight size={14}/></button>)}</div><RequestControls request={request} onChange={setRequest}/><details className="start-conditions"><summary>원하는 결과의 세부 조건 (선택)</summary><ConditionFields request={request} fields={allFields} onChange={changeCondition}/></details><button id="create-prompt" type="submit" className="button primary create-button">요청 분석하고 AI 비교하기 <ArrowRight size={18}/></button></form><p className="scope-note">규칙 기반으로 작업과 조건을 정리해요. 자료 분석·외부 AI 실행은 직접 진행합니다.</p></div>}
      {view==='questions'&&<section className="questions-page"><button id="back-to-request" className="text-button" onClick={()=>navigate('start')}><ArrowLeft size={16}/>입력·작업 수정</button><h1 tabIndex={-1}>이렇게 이해했어요.</h1><blockquote>{request.text}</blockquote><AnalysisPanel request={request} onChange={setRequest}/>{!!questions.length&&<details open className="extra-conditions"><summary>원하는 결과의 부족 조건 · {questions.length}개 (선택)</summary><p>이미 알려준 조건은 다시 묻지 않아요. 모르는 내용은 비워두세요.</p><ConditionFields request={request} fields={questions} onChange={changeCondition}/></details>}<div className="question-actions"><button id="finish-conditions" className="button primary" onClick={compare}>이 조건으로 AI 비교 <ArrowRight size={17}/></button><button id="skip-conditions" className="text-button" onClick={compare}>미정인 조건을 유지하고 보기</button></div>{error&&<p className="error" role="alert">{error}</p>}</section>}
      {view==='compare'&&comparison&&<><CandidateComparison comparison={comparison} request={request} selected={session.selection?.default??null} onSelect={id=>prepare({default:id,byStage:{}})} onEdit={()=>navigate('questions')}/>{error&&<p className="error" role="alert">{error}</p>}</>}
      {view==='result'&&bundle&&<StageWorkspace session={session} onStage={moveStage} onDraft={changeDraft} onCandidate={(stage,id)=>prepare(selectForStages(session.selection??{default:null,byStage:{}},stage,id),stage,stage)} onReviewed={(id,value)=>setSession(s=>({...s,reviewed:{...s.reviewed,[id]:value},needsReview:value?(s.needsReview??[]).filter(x=>x!==id):s.needsReview}))} onCompare={()=>navigate('compare')} onEdit={()=>navigate('start')} onNew={newTask}/>}
    </main><footer><span>AI..may I..? <span className="team">by Ai...Khu</span></span><span>입력과 편집은 현재 탭에서만 유지돼요. 새로고침하면 초기화돼요.</span><details><summary>서비스의 처리 범위</summary><p>저장된 공식 근거로 조건을 비교하고 템플릿으로 프롬프트를 준비해요. 외부 AI 호출·원본 파일 읽기·자동 실행을 하지 않으며, 결과의 정확성이나 통계 오류 감소 효과를 검증한 것은 아니에요.</p></details></footer></div>
}
