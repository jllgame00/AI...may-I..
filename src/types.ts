export type ServiceId = 'chatgpt' | 'gemini' | 'claude'
export type Budget = 'free' | 'prefer-free' | 'paid'
export type Priority = 'quality' | 'cost' | 'ease' | 'speed'
export type TaskKind = 'research' | 'summary' | 'writing' | 'coding' | 'image'
export type View = 'input' | 'analyzing' | 'results' | 'workflow' | 'prompts'

export interface RequestInput {
  text: string
  budget: Budget
  priority: Priority
}

export interface Scores {
  fit: number
  cost: number
  features: number
  ease: number
}

export interface Service {
  id: ServiceId
  name: string
  subtitle: string
  letter: string
  free: string
  paid: string
  strengths: Record<TaskKind, number>
  scores: Omit<Scores, 'fit'>
}

export interface Recommendation {
  service: Service
  score: number
  scores: Scores
  reason: string
}

export interface WorkflowStep {
  id: string
  title: string
  description: string
  output: string
  serviceId: ServiceId
}

export interface Analysis {
  request: RequestInput
  kind: TaskKind
  label: string
  features: string[]
  conclusion: string
  detail: string
  recommendations: Recommendation[]
  workflow: WorkflowStep[]
}
