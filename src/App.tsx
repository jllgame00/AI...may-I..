import { useCallback, useEffect, useState } from 'react'
import Shell from './components/Shell'
import RequestForm from './components/RequestForm'
import AnalysisLoader from './components/AnalysisLoader'
import RecommendationDashboard from './components/RecommendationDashboard'
import WorkflowBuilder from './components/WorkflowBuilder'
import PromptPanel from './components/PromptPanel'
import { DEFAULT_REQUEST } from './data/services'
import { analyzeRequest, selectCandidate } from './lib/recommend'
import type { Analysis, RequestInput, ServiceId, View, WorkflowStep } from './types'
export default function App() {
  const [view, setView] = useState<View>('input')
  const [draft, setDraft] = useState<RequestInput>({ text: DEFAULT_REQUEST, budget: 'prefer-free', priority: 'quality' })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([])
  const [selected, setSelected] = useState<ServiceId>('chatgpt')
  const [activeStepId, setActiveStepId] = useState('')
  useEffect(() => {
    document.querySelector<HTMLHeadingElement>('main h1')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view])
  const submit = () => {
    const next = analyzeRequest(draft)
    setAnalysis(next); setWorkflow(next.workflow)
    setActiveStepId(next.workflow[0]?.id ?? '')
    setSelected(next.workflow[0]?.serviceId ?? 'chatgpt'); setView('analyzing')
  }
  const changeCandidate = (stepId: string, candidateId: string) => {
    const next = selectCandidate(workflow, stepId, candidateId)
    setWorkflow(next)
    if (stepId === activeStepId) setSelected(next.find(s => s.id === stepId)?.serviceId ?? 'chatgpt')
  }
  const changeStep = (stepId: string) => {
    setActiveStepId(stepId); setSelected(workflow.find(s => s.id === stepId)?.serviceId ?? 'chatgpt')
  }
  const changeService = (id: ServiceId) => {
    setSelected(id)
    const step = workflow.find(s => s.id === activeStepId)
    if (step?.serviceId === id) return
    const candidate = step?.recommendations.find(r => r.service.id === id)
    if (step && candidate) setWorkflow(selectCandidate(workflow, step.id, candidate.id))
  }
  const complete = useCallback(() => setView('results'), [])
  const showPrompt = (stepId: string, candidateId: string) => {
    const next = selectCandidate(workflow, stepId, candidateId)
    setWorkflow(next); setActiveStepId(stepId); setSelected(next.find(s => s.id === stepId)!.serviceId!); setView('prompts')
  }
  return <Shell view={view} hasResults={!!analysis} onNavigate={setView}>
    {view === 'input' && <RequestForm draft={draft} onChange={setDraft} onSubmit={submit} />}
    {view === 'analyzing' && <AnalysisLoader request={draft.text} onComplete={complete} onCancel={() => setView('input')} />}
    {view === 'results' && analysis && <RecommendationDashboard analysis={analysis} steps={workflow} activeStepId={activeStepId} onStep={changeStep} onEdit={() => setView('input')} onPrompt={showPrompt} onWorkflow={() => setView('workflow')} />}
    {view === 'workflow' && analysis && <WorkflowBuilder analysis={analysis} steps={workflow} onChange={changeCandidate} onBack={() => setView('results')} onPrompts={() => setView('prompts')} />}
    {view === 'prompts' && analysis && <PromptPanel analysis={analysis} workflow={workflow} selected={selected} onSelect={changeService} activeStepId={activeStepId} onStep={changeStep} onCandidate={changeCandidate} onWorkflow={() => setView('workflow')} onEdit={() => setView('input')} />}
  </Shell>
}
