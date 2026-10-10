import { useCallback, useEffect, useState } from 'react'
import Shell from './components/Shell'
import RequestForm from './components/RequestForm'
import AnalysisLoader from './components/AnalysisLoader'
import RecommendationDashboard from './components/RecommendationDashboard'
import WorkflowBuilder from './components/WorkflowBuilder'
import PromptPanel from './components/PromptPanel'
import { DEFAULT_REQUEST } from './data/services'
import { analyzeRequest } from './lib/recommend'
import type { Analysis, RequestInput, ServiceId, View, WorkflowStep } from './types'

export default function App() {
  const [view, setView] = useState<View>('input')
  const [draft, setDraft] = useState<RequestInput>({ text: DEFAULT_REQUEST, budget: 'prefer-free', priority: 'quality' })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([])
  const [selected, setSelected] = useState<ServiceId>('chatgpt')
  useEffect(() => {
    const heading = document.querySelector<HTMLHeadingElement>('main h1')
    heading?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view])
  const submit = () => {
    const next = analyzeRequest(draft)
    setAnalysis(next)
    setWorkflow(next.workflow)
    setSelected(next.recommendations[0].service.id)
    setView('analyzing')
  }
  const complete = useCallback(() => setView('results'), [])
  const showPrompt = (id: ServiceId) => { setSelected(id); setView('prompts') }
  return <Shell view={view} hasResults={!!analysis} onNavigate={setView}>
    {view === 'input' && <RequestForm draft={draft} onChange={setDraft} onSubmit={submit} />}
    {view === 'analyzing' && <AnalysisLoader request={draft.text} onComplete={complete} onCancel={() => setView('input')} />}
    {view === 'results' && analysis && <RecommendationDashboard analysis={analysis} onEdit={() => setView('input')} onPrompt={showPrompt} onWorkflow={() => setView('workflow')} />}
    {view === 'workflow' && analysis && <WorkflowBuilder analysis={analysis} steps={workflow} onChange={(id, serviceId) => setWorkflow(current => current.map(step => step.id === id ? { ...step, serviceId } : step))} onBack={() => setView('results')} onPrompts={() => setView('prompts')} />}
    {view === 'prompts' && analysis && <PromptPanel analysis={analysis} workflow={workflow} selected={selected} onSelect={setSelected} onWorkflow={() => setView('workflow')} onEdit={() => setView('input')} />}
  </Shell>
}
