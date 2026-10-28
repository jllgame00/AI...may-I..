import eastern from './research/eastern-models.json' with { type:'json' }
import western from './research/western-models.json' with { type:'json' }
import type { Model, ModelEvaluation, ResearchSource } from '../recommendationTypes'

// Fixed official release/checkpoint identifiers. No floating aliases or plan joins.
export const researchedModels:Model[]=[...eastern.models,...western.models].map(m=>({
  ...m,evaluationMode:m.reasoning,speed:'공통 조건 실측 미확인',
  setup:m.route.note,
})) as Model[]
export const researchedEvaluations:ModelEvaluation[]=[...eastern.observations,...western.observations] as ModelEvaluation[]
export const researchLogs=[...eastern.researchLog,...western.researchLog]
export const expandedResearchSources:ResearchSource[]=researchedModels.flatMap(m=>(m.sources??[]).map(s=>({...s,name:`${m.provider} · ${m.name}`,status:'공식 원문 확인',note:m.availability??''})))
