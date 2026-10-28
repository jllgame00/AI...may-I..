import { useEffect, useRef, useState } from 'react'
import Shell from './components/Shell'
import RequestForm from './components/RequestForm'
import ConditionPanel from './components/ConditionPanel'
import ServiceCatalog, { initialCatalog } from './components/ServiceCatalog'
import RecommendationDashboard from './components/RecommendationDashboard'
import WorkflowBuilder from './components/WorkflowBuilder'
import PromptPanel from './components/PromptPanel'
import { analyzeRequest, selectCandidate } from './lib/recommend'
import { confirmUnknowns, extractConditions, missingQuestions, resolveConditions } from './lib/taskSession'
import type { PromptDraft, Question } from './lib/taskSession'
import type { Analysis, CatalogService, RequestInput, ServiceId, ServicePlan, View, WorkflowStep } from './types'

const views: View[] = ['input','conditions','catalog','results','workflow','prompts']
function hashView(): View { const value = window.location.hash.slice(1) as View; return views.includes(value) ? value : 'input' }
export default function App() {
  const [view, setView] = useState<View>(hashView)
  const [draft, setDraft] = useState<RequestInput>({ text: '', budget: 'unknown', budgetSource: 'inferred', priority: 'quality' })
  const [questions, setQuestions] = useState<Question[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([])
  const [selected, setSelected] = useState<ServiceId>('chatgpt')
  const [activeStepId, setActiveStepId] = useState('')
  const [catalog, setCatalog] = useState(initialCatalog)
  const [exploration, setExploration] = useState<{ service: CatalogService; plan?: ServicePlan } | null>(null)
  const [promptDrafts, setPromptDrafts] = useState<Record<string,PromptDraft>>({})
  const [detailed, setDetailed] = useState(true)
  const [checks, setChecks] = useState<Record<string,boolean>>({})
  const [followup, setFollowup] = useState('')
  const [error, setError] = useState('')
  const restorePosition = useRef(false)
  const requestedNavigation = useRef(false)
  const navigate = (next: View) => {
    const focusIndex = [...document.querySelectorAll('button,a,input,select,textarea,summary')].indexOf(document.activeElement!)
    history.replaceState({ scroll: window.scrollY, focus: document.activeElement?.id, focusIndex },'')
    if (window.location.hash !== `#${next}`) { requestedNavigation.current = true; window.location.hash = next }
    else { setView(next); document.querySelector<HTMLHeadingElement>('main h1')?.focus() }
  }
  useEffect(() => {
    const sync = () => {
      if (location.hash === '#main-content') return
      restorePosition.current = !requestedNavigation.current
      if (requestedNavigation.current) history.replaceState(null,'')
      requestedNavigation.current = false
      setView(hashView())
    }
    window.addEventListener('hashchange',sync)
    return () => window.removeEventListener('hashchange',sync)
  },[])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = history.state as { scroll?: number; focus?: string; focusIndex?: number } | null
      const element = restorePosition.current && saved ? saved.focus ? document.getElementById(saved.focus) : document.querySelectorAll<HTMLElement>('button,a,input,select,textarea,summary')[saved.focusIndex ?? -1] : null
      ;(element ?? document.querySelector<HTMLHeadingElement>('main h1'))?.focus({ preventScroll: true })
      window.scrollTo({ top: restorePosition.current ? saved?.scroll ?? 0 : 0, behavior: 'instant' })
      restorePosition.current = false
    })
    return () => cancelAnimationFrame(frame)
  },[view])
  const runAnalysis = (input: RequestInput = draft) => {
    try {
      const resolved = resolveConditions(input)
      const next = analyzeRequest(resolved)
      // Keep assignments only if the same plan remains valid in the corresponding stage.
      const steps = next.workflow.map(s => {
        const old = workflow.find(o => o.id === s.id && o.kind === s.kind)
        const choice = s.recommendations.find(r => r.id === old?.candidateId)
        return choice ? { ...s, candidateId: choice.id, serviceId: choice.service.id, needsReview: !!analysis && JSON.stringify(analysis.request) !== JSON.stringify(resolved) } : s
      })
      setAnalysis(next); setWorkflow(steps); setActiveStepId(steps[0]?.id ?? '')
      setSelected(steps[0]?.serviceId ?? 'chatgpt'); setExploration(null); setError('')
      if (draft.experience && draft.experience !== 'unknown') setDetailed(draft.experience === 'detailed')
      navigate('results')
    } catch { setError('후보를 정리하지 못했어요. 입력은 그대로 남아 있어요. 다시 시도하거나 서비스 목록을 둘러보세요.'); requestAnimationFrame(() => document.getElementById('processing-error')?.focus()) }
  }
  const submit = () => {
    const inferred = extractConditions(draft.text)
    const resolved = resolveConditions(draft)
    const missing = missingQuestions({ ...inferred, ...resolved, budget: draft.budgetSource === 'user' || inferred.budget ? resolved.budget : undefined })
    if (missing.length) { setQuestions(missing); navigate('conditions') } else runAnalysis()
  }
  const changeCandidate = (stepId: string, candidateId: string) => {
    const next = selectCandidate(workflow,stepId,candidateId)
    setWorkflow(next)
    if (stepId === activeStepId) setSelected(next.find(s => s.id === stepId)?.serviceId ?? 'chatgpt')
  }
  const changeStep = (id: string) => { setActiveStepId(id); setSelected(workflow.find(s => s.id === id)?.serviceId ?? 'chatgpt') }
  const changeService = (id: ServiceId) => {
    setSelected(id); setExploration(null)
    const step = workflow.find(s => s.id === activeStepId)
    if (step?.serviceId === id) return
    const choice = step?.recommendations.find(r => r.service.id === id)
    if (step && choice) changeCandidate(step.id,choice.id)
  }
  const showPrompt = (stepId: string, candidateId: string) => {
    const next = selectCandidate(workflow,stepId,candidateId)
    setWorkflow(next); setActiveStepId(stepId); setSelected(next.find(s => s.id === stepId)!.serviceId!); setExploration(null); navigate('prompts')
  }
  const available = view === 'catalog' || view === 'input' || (view === 'conditions' && !!draft.text.trim()) || (!!analysis && view !== 'conditions') || (view === 'prompts' && !!exploration)
  const current = available ? view : 'input'
  return <Shell view={current} hasResults={!!analysis} hasPrompt={!!analysis || !!exploration} onNavigate={navigate}>
    {!available && <p role="status">현재 탭에 준비된 작업이 없어요. 입력부터 시작해 주세요.</p>}
    {error && <div id="processing-error" tabIndex={-1} role="alert" className="empty-state"><p>{error}</p><button className="secondary-button" onClick={() => runAnalysis()}>다시 시도</button><button className="secondary-button" onClick={() => navigate('catalog')}>서비스 목록 보기</button></div>}
    {current === 'input' && <RequestForm draft={draft} onChange={setDraft} onSubmit={submit} onExplore={() => navigate('catalog')} />}
    {current === 'conditions' && <ConditionPanel draft={resolveConditions(draft)} rawDraft={draft} questions={questions} onChange={setDraft} onContinue={() => { const confirmed = confirmUnknowns(draft,questions); setDraft(confirmed); runAnalysis(confirmed) }} onBack={() => navigate('input')} />}
    {current === 'catalog' && <ServiceCatalog state={catalog} onChange={setCatalog} onTask={() => navigate('input')} onPrepare={(service,plan) => { setExploration({ service, plan }); navigate('prompts') }} />}
    {current === 'results' && analysis && <RecommendationDashboard analysis={analysis} steps={workflow} activeStepId={activeStepId} onStep={changeStep} onEdit={() => navigate('input')} onPrompt={showPrompt} onWorkflow={() => navigate('workflow')} onExplore={() => navigate('catalog')} />}
    {current === 'workflow' && analysis && <WorkflowBuilder analysis={analysis} steps={workflow} onChange={changeCandidate} onBack={() => navigate('results')} onPrompts={() => { setExploration(null); navigate('prompts') }} onReview={id => setWorkflow(workflow.map(s => s.id === id ? { ...s, needsReview: false } : s))} />}
    {current === 'prompts' && <PromptPanel analysis={analysis} workflow={workflow} selected={selected} onSelect={changeService} activeStepId={activeStepId} onStep={changeStep} onCandidate={changeCandidate} onWorkflow={() => navigate(analysis ? 'workflow' : 'catalog')} onEdit={() => navigate('input')} exploration={exploration ?? undefined} drafts={promptDrafts} onDrafts={setPromptDrafts} detailed={detailed} onDetailed={setDetailed} checks={checks} onChecks={setChecks} followup={followup} onFollowup={setFollowup} />}
  </Shell>
}
