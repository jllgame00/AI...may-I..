import eastern from '../data/research/eastern-access.json' with {type:'json'}
import western from '../data/research/western-access.json' with {type:'json'}
import type { FeatureId, Model, ModelAccessRoute, Recommendation } from '../recommendationTypes'
import { taskReady } from './taskReadiness.ts'

const reviews=[...eastern.entries,...western.entries]
export function accessOptions(model:Model):ModelAccessRoute[] {
  const review=reviews.find(e=>e.modelId===model.id)
  const matches=review?.modelVersion===model.version
  const options:ModelAccessRoute[]=matches?[...review.routes] as ModelAccessRoute[]:[]
  if(model.route?.kind==='self-hosted')options.push({id:'checkpoint-self-hosted',kind:'self-hosted',label:'공식 가중치 · 직접 설치 필요',url:model.route.url,
    exactVersion:matches?'confirmed':'unconfirmed',hostedModelId:null,note:model.route.note,sources:model.sources??[]})
  const pinnedApiReleases:Record<string,string>={'grok-4.7':'4.7','gemini-4-argon':'gemini-4-argon','gemini-3.1-pro-preview':'gemini-3.1-pro-preview','gemini-3-flash-preview':'gemini-3-flash-preview'}
  if(model.route?.kind==='api'&&pinnedApiReleases[model.id]===model.version)options.push({id:'original-api',kind:'api',label:'공식 API · 계정·요금 별도 확인',url:model.route.url,exactVersion:model.route.status==='confirmed'?'confirmed':'unconfirmed',hostedModelId:model.id,note:model.route.note,sources:model.sources??[]})
  return options
}
export type AccessCategory='web'|'api'|'install'|'unknown'
export const accessLabels:Record<AccessCategory,string>={web:'웹에서 바로 사용 · 로그인·이용권한 별도',api:'API 설정 필요',install:'직접 설치 필요 · 고급 선택지',unknown:'정확한 버전 이용 경로 미확인'}
export function accessCategory(c:Recommendation):AccessCategory {
  if(c.mapping.status!=='confirmed' || c.mapping.selection==='automatic' || !c.model || c.mapping.modelVersion!==c.model.version)return 'unknown'
  if(c.mapping.routeKind==='self-hosted')return 'install'
  if(c.mapping.routeKind==='api')return 'api'
  if(c.mapping.routeKind==='chat'||c.mapping.routeKind==='work')return 'web'
  return 'unknown'
}
export function accessOrder(c:Recommendation):number {return ['web','api','install','unknown'].indexOf(accessCategory(c))}
export function primaryAccessCandidates(candidates:Recommendation[],required:FeatureId[]=[],preferredId:string|null=null):Recommendation[] {
  const models=new Map<string,Recommendation>()
  for(const c of [...candidates].filter(c=>!c.configuration&&(c.model||['chat','work'].includes(c.mapping.routeKind??''))).sort((a,b)=>Number(taskReady(b,required))-Number(taskReady(a,required))||Number(b.id===preferredId)-Number(a.id===preferredId)||Number(a.suitability!=='조건 비교 가능')-Number(b.suitability!=='조건 비교 가능')||accessOrder(a)-accessOrder(b)||a.id.localeCompare(b.id,'en'))){
    const key=c.model?`${c.model.id}@${c.model.version}`:`service:${c.plan.id}:${c.mapping.routeKind}`
    if(!models.has(key))models.set(key,c)
  }
  return [...models.values()].sort((a,b)=>(a.model?.name??a.model?.id??`${a.service.name} ${a.plan.name}`).localeCompare(b.model?.name??b.model?.id??`${b.service.name} ${b.plan.name}`,'en',{numeric:true})||a.id.localeCompare(b.id,'en'))
}
