import type { Model, RecommendationSnapshot } from '../recommendationTypes'

export interface PublicRefresh { sources:Record<string,{checkedAt:string;changedAt:string|null;state:string;updates:{id:string;rawScore:number}[];models?:Model[]}> }
export function mergeRefreshSnapshot(base:RecommendationSnapshot,refresh:PublicRefresh):RecommendationSnapshot {
  const patches=new Map(Object.values(refresh.sources).flatMap(s=>s.updates).map(u=>[u.id,u.rawScore]))
  const discoveries=Object.values(refresh.sources).flatMap(s=>s.models??[]).filter(m=>!base.models.some(b=>b.id===m.id))
  return {...base,models:[...base.models,...discoveries],evaluations:base.evaluations?.map(e=>patches.has(e.id)?{...e,rawScore:patches.get(e.id)!}:e)}
}
