import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import ConditionFields from './components/ConditionFields'
import AnalysisPanel from './components/AnalysisPanel'
import CandidateComparison from './components/CandidateComparison'
import StageWorkspace from './components/StageWorkspace'
import { buildPromptBundle, fieldLabels } from './lib/promptEngine'
import { syncDrafts, updateSessionDraft } from './lib/promptSession'
import { buildGuideBundle, compareCandidates, comparisonMatches, DEMO_REQUEST, guideContext, selectForStages, selectForWork, stageOptions, updateGuideRequest } from './lib/aiGuide'
import type { ConditionField, PromptDraft, Screen, Session, StageSelection } from './types'

const examples=[{label:'설문 보고서',text:DEMO_REQUEST},{label:'코드 오류 수정',text:'React 장바구니에서 수량을 바꾸면 총액이 갱신되지 않아. 기존 코드의 원인을 찾아 수정하고 테스트 방법을 알려줘.'},{label:'홍보 글쓰기',text:'신입생 대상 독서 동아리 모집 홍보 글을 친근하게 500자로 작성해줘. 매주 수요일에 책을 함께 읽고 토론하는 모임이야.'}]
const emptySession=():Session=>({request:{text:'',overrides:{}},bundle:null,drafts:{},checks:{},comparison:null,selection:{default:null,byStage:{}},reviewed:{},needsReview:[]})
const readScreen=():Screen=>{const h=typeof location==='undefined'?'':location.hash.slice(1);return h==='compare'||h==='result'||h==='questions'?h:'start'}
export default function App(){
  const [session,setSession]=useState<Session>(emptySession)
  const [screen,setScreen]=useState<Screen>(readScreen)
  const [error,setError]=useState('')
  const [needsCheckDisclosure,setNeedsCheckDisclosure]=useState<{context:string;open:boolean}|null>(null)
  const request=session.request,comparison=session.comparison
  const stale=!!comparison&&!comparisonMatches(request,comparison)
  const view:Screen=screen==='result'&&(!session.bundle||stale)?request.text?'questions':'start':screen==='compare'&&(!comparison||stale)?request.text?'questions':'start':screen==='questions'&&!request.text?'start':screen
  const navigate=(s:Screen)=>{if(location.hash!==`#${s}`)location.hash=s;setScreen(s);setError('')}
  useEffect(()=>{const fn=()=>{if(location.hash!=='#main')setScreen(readScreen())};window.addEventListener('hashchange',fn);return()=>window.removeEventListener('hashchange',fn)},[])
  useEffect(()=>{requestAnimationFrame(()=>{document.querySelector<HTMLElement>('main h1')?.focus();window.scrollTo(0,0)})},[view])
  const analyze=()=>{try{buildPromptBundle(request);navigate('questions')}catch(e){setError((e as Error).message);document.getElementById('request-text')?.focus()}}
  const compare=()=>{try{buildPromptBundle(request);const next=compareCandidates(request);if(!next.requirements.works.length){setError('수행할 작업을 선택해 주세요.');return}setSession(s=>({...s,comparison:next}));navigate('compare')}catch(e){setError((e as Error).message)}}
  const prepare=(selection:StageSelection,active?:string)=>{
    if(!comparison||stale){navigate('questions');return}
    const bundle=buildGuideBundle(request,selection)
    const target=bundle.steps.find(s=>s.id===active)??bundle.steps[0]
    const id=active?selection.byStage[active]:selection.default
    if(!target||!stageOptions(comparison,target).some(c=>c.id===id)){setError('이 단계에서 선택 가능한 서비스·플랜을 확인해 주세요.');return}
    setSession(s=>{
      let drafts=s.drafts
      for(const t of [...bundle.steps,...bundle.followups])drafts=syncDrafts(drafts,[t],guideContext(t,bundle.context))
      return {...s,bundle,selection,drafts,activeStageId:active??bundle.steps[0]?.id,reviewed:{},needsReview:s.bundle?bundle.steps.map(t=>t.id):[]}
    });navigate('result')
  }
  const changeDraft=(id:string,draft:PromptDraft)=>setSession(s=>updateSessionDraft(s,id,draft))
  const choose=(id:string,workId?:string)=>{
    const bundle=buildGuideBundle(request,{default:id,byStage:{}}),target=bundle.steps.find(s=>!workId||s.workId===workId)
    const previous=session.selection??{default:null,byStage:{}}
    if(target)prepare(workId?selectForWork(previous,bundle.steps,workId,id):{default:id,byStage:{...previous.byStage,[target.id]:id}},target.id)
  }
  const step=view==='compare'?2:view==='result'?3:1
  return <div className="app"><a className="skip-link" href="#main">본문으로 건너뛰기</a>
    <header className="header"><button className="wordmark" id="home" onClick={()=>navigate('start')}>AI..may I..?</button><span>by Ai...Khu</span><p>어떤 AI로, 어떻게 시작할까요?</p></header>
    <nav className="flow-nav" aria-label="작업 흐름">{['작업 입력·해석','회사·서비스 선택','프롬프트·활용'].map((label,i)=><span key={label} aria-current={step===i+1?'step':undefined}><b>{i+1}</b>{label}</span>)}</nav>
    <main id="main" tabIndex={-1}>
      {(view==='start'||view==='questions')&&<section className="input-page"><div className="page-heading"><p className="eyebrow">작업부터 시작하세요</p><h1 tabIndex={-1}>어떤 일을 하고 싶으세요?</h1><p>작업을 정리하고 AI를 비교한 뒤, 바로 쓸 프롬프트를 준비해요.</p></div>
        <form onSubmit={e=>{e.preventDefault();analyze()}}><label htmlFor="request-text">하고 싶은 작업</label><textarea id="request-text" maxLength={4000} value={request.text} placeholder="자료와 궁금한 점, 원하는 결과를 편하게 적어 주세요." onChange={e=>setSession(s=>updateGuideRequest(s,{...s.request,text:e.target.value}))}/><div className="input-help"><span>규칙·템플릿으로 정리해요. 원본 파일은 받지 않아요.</span><span>{request.text.length} / 4,000</span></div>
          <div className="example-start" role="group" aria-labelledby="example-label" aria-describedby="example-help"><p id="example-label">예시로 시작하기</p><p id="example-help" className="minor-note">선택하면 입력창에 예시 요청이 채워져요.</p><div className="examples">{examples.map((e,i)=><button id={`example-${i}`} key={e.label} type="button" onClick={()=>{setSession(s=>updateGuideRequest(s,{text:e.text,overrides:{}}));navigate('start')}}>{e.label} ↗</button>)}</div></div>
          <button id="create-prompt" className="button primary" type="submit">요청 해석 확인 <ArrowRight size={17}/></button>
        </form>
        {view==='questions'&&<div className="interpretation"><h2>이렇게 이해했어요</h2><AnalysisPanel request={request} onChange={r=>setSession(s=>updateGuideRequest(s,r))}/><details className="extra-conditions"><summary>독자·분량·말투 등 조건 수정</summary><ConditionFields request={request} fields={Object.keys(fieldLabels) as ConditionField[]} onChange={(field,value)=>setSession(s=>updateGuideRequest(s,{...s.request,overrides:{...s.request.overrides,[field]:value}}))}/></details><button id="finish-conditions" className="button primary" onClick={compare}>이 조건으로 회사 비교 <ArrowRight size={17}/></button></div>}
        {error&&<p className="error" role="alert">{error}</p>}
        {!!comparison&&<button id="resume-comparison" className="text-button" disabled={stale} onClick={()=>navigate('compare')}>기존 비교로 돌아가기</button>}
      </section>}
      {view==='compare'&&comparison&&<CandidateComparison comparison={comparison} request={request} selected={session.selection?.default??null} onSelect={choose} onEdit={()=>navigate('questions')} needsCheckOpen={needsCheckDisclosure?.context===comparison.context&&needsCheckDisclosure.open} onNeedsCheckToggle={open=>setNeedsCheckDisclosure({context:comparison.context,open})}/>}
      {view==='result'&&session.bundle&&<StageWorkspace session={session} onStage={id=>setSession(s=>({...s,activeStageId:id}))} onDraft={changeDraft} onCandidate={(stage,id)=>prepare(selectForStages(session.selection??{default:null,byStage:{}},stage,id),stage)} onReviewed={(id,value)=>setSession(s=>({...s,reviewed:{...s.reviewed,[id]:value}}))} onCompare={()=>navigate('compare')} onEdit={()=>navigate('questions')} onNew={()=>{setSession(emptySession());setNeedsCheckDisclosure(null);navigate('start')}}/>}
    </main>
    <footer><span>AI..may I..? · Ai...Khu</span><details><summary>처리 범위·공식 안내</summary><p>입력·선택·편집은 현재 세션 메모리에만 보존해요. 새로고침하면 초기화됩니다. 외부 AI 호출·자동 실행·로그인·결제·원본 파일 업로드는 제공하지 않아요.</p><p>무료·유료 여부와 필수 기능은 확인된 범위만 안내합니다. 실제 계정의 사용량과 필요한 기능의 활성화 여부를 확인하세요.</p><p>공식 이용 안내와 확인일은 회사 상세보기에서 제공합니다.</p></details></footer>
  </div>
}
