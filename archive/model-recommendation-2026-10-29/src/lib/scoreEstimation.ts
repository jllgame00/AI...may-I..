import { taskSourceGroups } from '../data/taskEvidence.ts'
import { declaredGroups } from './evaluationGroups.ts'
import { compareEvaluationResults } from './currentEvidence.ts'
import type { ModelEvaluation, RecommendationSnapshot } from '../recommendationTypes'

export const ESTIMATION_VERSION='ordinal-bt-v1'
export const SCALE_VERSION='sigmoid-centered-v1'
export const PROTOCOL_VERSION='protocol-v1'
export const THRESHOLDS={configs:3,tables:3,folds:6,coverage:.8,brierImprovement:.1,accuracy:.65,leaveOutAgreement:.8,leaveOutConnected:.8,perturbAgreement:.9,minModelTables:3} as const
export interface EstimationRow { measurementId:string; configId:string; evaluation:ModelEvaluation }
export interface EstimationTable { id:string; domain:string; type:'model'|'agent'; rows:EstimationRow[] }
export interface EstimatedScore {
  configId:string; modelId:string; modelVersion:string; effort:string|null; type:'model'|'agent'
  theta:number; score:number|null; rank:number|null; nearTie:boolean; sensitivity:[number,number]
  observations:number; tables:number; evaluators:string[]; sourceConcentrated:boolean; uncertain:boolean
  execution:Pick<ModelEvaluation,'agentName'|'agentVersion'|'tools'|'harness'|'environment'|'fallbacks'>
}
export interface EstimationResult {
  id:string; scope:string; type:'model'|'agent'; configIds:string[]; tableIds:string[]
  sources:{url:string;checkedAt:string}[]
  passed:boolean; reasons:string[]; scores:EstimatedScore[]; stale?:boolean
  validation:{totalFolds:number;evaluableFolds:number;disconnectedFolds:number;predictions:number;brier:number|null;baselineBrier:number|null;winRateBrier:number|null;accuracy:number|null;leaveOutAgreement:number|null;leaveOutConnected:number;perturbAgreement:number|null}
}
export interface EstimationAudit {
  modelCount:number; observationCount:number; measurements:{id:string;aliases:string[];evaluation:ModelEvaluation;conflict:boolean}[]
  duplicates:{ids:string[];conflict:boolean}[]; tables:EstimationTable[]; excluded:{id:string;reason:string}[]
  isolatedModelIds:string[]
}
const known=(v:unknown)=>v!==null&&v!==undefined&&v!==''&&!/미공개|미확인|unknown/i.test(String(v))
// No score, publisher, URL or publication date: syndicated results are not new trials.
function measurementKey(e:ModelEvaluation):string {
  return JSON.stringify([e.modelId,e.modelVersion,e.benchmark,e.benchmarkVersion,e.subset,e.evaluatedAt,e.unit,e.higherIsBetter,e.evaluationType,e.effort,e.tools,e.harness,e.environment,e.trials,e.fallbacks,e.agentName,e.agentVersion,e.evaluator,e.index??null,e.aa?.apiModelId??null])
}
function configuration(e:ModelEvaluation,sourceTable:string):string {
  const missingAgent=e.evaluationType==='agent'&&(!known(e.agentName)||!known(e.agentVersion))
  const missingMode=!known(e.effort)
  const incomplete=[e.tools,e.harness,e.environment,e.fallbacks].some(v=>!known(v))
  // Unknown settings are local to a reviewed source table, not globally equal.
  // An unknown mode or unknown agent cannot bridge different evaluations.
  return JSON.stringify([e.modelId,e.modelVersion,e.evaluationType,e.effort,e.tools,e.harness,e.environment,e.fallbacks,e.agentName,e.agentVersion,incomplete||missingAgent||missingMode?sourceTable:null,missingAgent||missingMode?[e.benchmark,e.benchmarkVersion,e.subset]:null])
}
export function auditSnapshot(data:RecommendationSnapshot):EstimationAudit {
  const raw=data.evaluations??[],buckets=new Map<string,ModelEvaluation[]>()
  for(const e of raw){const key=measurementKey(e);buckets.set(key,[...(buckets.get(key)??[]),e])}
  const reviewed=(e:ModelEvaluation)=>taskSourceGroups.some(g=>e.source.url===g.source&&g.expected.some(row=>row.id===e.id))||declaredGroups.some(g=>e.comparisonGroup===g.id&&e.source.url===g.source&&e.publisher===g.evaluator)
  const measurements=[...buckets.values()].map(rows=>{
    const ordered=[...rows].sort((a,b)=>Number(reviewed(b))-Number(reviewed(a))||a.id.localeCompare(b.id,'en'))
    return {id:ordered[0].id,aliases:rows.map(r=>r.id),evaluation:ordered[0],conflict:new Set(rows.map(r=>r.rawScore)).size>1}
  })
  const valid=measurements.filter(m=>!m.conflict&&m.evaluation.rawScore!==null&&Number.isFinite(m.evaluation.rawScore)&&known(m.evaluation.source.url)&&known(m.evaluation.source.checkedAt)&&data.models.some(model=>model.id===m.evaluation.modelId&&model.version===m.evaluation.modelVersion))
  const tables:EstimationTable[]=[],used=new Set<string>()
  const add=(id:string,rows:typeof valid,sourceTable=id)=>{
    const unique=[...new Map(rows.map(m=>[m.id,m])).values()]
    if(unique.length<2)return
    if(unique.some(m=>used.has(m.id)))return
    const entries=unique.map(m=>({measurementId:m.id,configId:configuration(m.evaluation,sourceTable),evaluation:m.evaluation}))
    // Multiple results for one configuration inside one table are ambiguous.
    if(new Set(entries.map(r=>r.configId)).size!==entries.length)return
    const first=entries[0].evaluation
    if(entries.some(r=>r.evaluation.domain!==first.domain||r.evaluation.unit!==first.unit||r.evaluation.higherIsBetter!==first.higherIsBetter||r.evaluation.evaluationType!==first.evaluationType))return
    const key=unique.map(m=>m.id).sort().join('|')
    if(tables.some(t=>t.rows.map(r=>r.measurementId).sort().join('|')===key))return
    tables.push({id,domain:first.domain,type:first.evaluationType??'model',rows:entries});unique.forEach(m=>used.add(m.id))
  }
  // Use previously reviewed metadata contracts, never a benchmark-name join.
  // These reviewed benchmark rows are columns of ONE original Performance table.
  // The source URL is its explicitly reviewed table identity, not a generic URL join.
  for(const group of taskSourceGroups)add(group.id,valid.filter(m=>group.expected.some(expected=>m.aliases.includes(expected.id)&&Object.entries(expected).every(([k,v])=>k==='id'||JSON.stringify(m.evaluation[k as keyof ModelEvaluation])===JSON.stringify(v)))&&m.evaluation.source.url===group.source),group.source)
  for(const group of declaredGroups)add(group.id,valid.filter(({evaluation:e})=>e.comparisonGroup===group.id&&e.benchmark===group.benchmark&&e.benchmarkVersion===group.version&&e.subset===group.subset&&e.source.url===group.source&&e.evaluator===group.evaluator&&e.publisher===group.evaluator&&e.kind===group.kind&&e.unit===group.unit&&e.higherIsBetter===group.higherIsBetter&&e.evaluationType==='agent'))
  for(const m of valid){
    const rows=valid.filter(other=>other.id===m.id||compareEvaluationResults(m.evaluation,other.evaluation).comparable)
    add(`strict:${rows.map(r=>r.id).sort().join('|')}`,rows)
  }
  const excluded=measurements.filter(m=>!used.has(m.id)).map(m=>({id:m.id,reason:m.conflict?'동일 측정 식별자의 원점수 충돌':!valid.includes(m)?'유효 수치·출처·정확한 릴리스 연결 부족':'공통 비교 표 또는 공개 실행 조건 연결 부족'}))
  return {modelCount:data.models.length,observationCount:raw.length,measurements,duplicates:measurements.filter(m=>m.aliases.length>1).map(m=>({ids:m.aliases,conflict:m.conflict})),tables,excluded,isolatedModelIds:data.models.filter(m=>!tables.some(t=>t.rows.some(r=>r.evaluation.modelId===m.id))).map(m=>m.id)}
}
interface Pair { a:string;b:string;y:number;weight:number;measurements:[string,string] }
const sigmoid=(x:number)=>1/(1+Math.exp(-x))
export const recommendationIndex=(theta:number)=>Math.round(100*sigmoid(theta))
function pairs(tables:EstimationTable[]):Pair[] {
  return tables.flatMap(table=>{
    const rows=table.rows,weight=2/(rows.length*(rows.length-1)),result:Pair[]=[]
    for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
      const a=rows[i],b=rows[j],delta=(a.evaluation.rawScore!-b.evaluation.rawScore!)*(a.evaluation.higherIsBetter?1:-1)
      result.push({a:a.configId,b:b.configId,y:delta===0?.5:delta>0?1:0,weight,measurements:[a.measurementId,b.measurementId]})
    }
    return result
  })
}
function reachable(edges:Pair[],start:string):Set<string> {
  const visited=new Set<string>(),queue=[start]
  while(queue.length){const id=queue.pop()!;if(visited.has(id))continue;visited.add(id);for(const p of edges){if(p.a===id&&!visited.has(p.b))queue.push(p.b);if(p.b===id&&!visited.has(p.a))queue.push(p.a)}}
  return visited
}
function fit(edges:Pair[]):Map<string,number> {
  const ids=[...new Set(edges.flatMap(p=>[p.a,p.b]))].sort(),theta=new Map(ids.map(id=>[id,0]))
  const degree=Math.max(1,...ids.map(id=>edges.filter(p=>p.a===id||p.b===id).reduce((n,p)=>n+p.weight,0)))
  const step=1/(.25+.5*degree)
  for(let k=0;k<1500;k++){
    const gradient=new Map(ids.map(id=>[id,.25*theta.get(id)!]))
    for(const p of edges){const error=p.weight*(sigmoid(theta.get(p.a)!-theta.get(p.b)!)-p.y);gradient.set(p.a,gradient.get(p.a)!+error);gradient.set(p.b,gradient.get(p.b)!-error)}
    if(Math.max(...[...gradient.values()].map(v=>Math.abs(v)))<1e-9)break
    for(const id of ids)theta.set(id,theta.get(id)!-step*gradient.get(id)!)
  }
  const mean=ids.reduce((n,id)=>n+theta.get(id)!,0)/(ids.length||1)
  return new Map(ids.map(id=>[id,theta.get(id)!-mean]))
}
const average=(x:number[])=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null
function agreement(base:Map<string,number>,other:Map<string,number>,edges:Pair[]):number|null {
  const ids=[...base.keys()],values:number[]=[]
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
    const a=ids[i],b=ids[j];if(!other.has(a)||!other.has(b)||!reachable(edges,a).has(b))continue
    const d=base.get(a)!-base.get(b)!,e=other.get(a)!-other.get(b)!
    values.push(Math.abs(d)<1e-8&&Math.abs(e)<1e-8?1:Math.abs(d)<1e-8||Math.abs(e)<1e-8?.5:Math.sign(d)===Math.sign(e)?1:0)
  }
  return average(values)
}
function estimateComponent(tables:EstimationTable[],scope:string):EstimationResult {
  const edges=pairs(tables),theta=fit(edges),ids=[...theta.keys()],measurements=[...new Set(tables.flatMap(t=>t.rows.map(r=>r.measurementId)))]
  const errors:number[]=[],baseline:number[]=[],winErrors:number[]=[],correct:number[]=[]
  let evaluable=0,disconnected=0
  for(const hidden of measurements){
    const train=edges.filter(p=>!p.measurements.includes(hidden)),test=edges.filter(p=>p.measurements.includes(hidden)),estimated=fit(train)
    const possible=test.filter(p=>estimated.has(p.a)&&estimated.has(p.b)&&reachable(train,p.a).has(p.b))
    if(!possible.length){disconnected++;continue}evaluable++
    const win=(id:string)=>{const own=train.filter(p=>p.a===id||p.b===id);return (1+own.reduce((n,p)=>n+(p.a===id?p.y:1-p.y),0))/(2+own.length)}
    for(const p of possible){const probability=sigmoid(estimated.get(p.a)!-estimated.get(p.b)!);errors.push((probability-p.y)**2);baseline.push((.5-p.y)**2);winErrors.push((sigmoid(Math.log(win(p.a)/(1-win(p.a)))-Math.log(win(p.b)/(1-win(p.b))))-p.y)**2);if(p.y!==.5)correct.push(Math.abs(probability-.5)<1e-8?.5:(probability>.5)===(p.y===1)?1:0)}
  }
  const leaveAgreements:number[]=[],perturbAgreements:number[]=[],sensitivity=new Map(ids.map(id=>[id,[recommendationIndex(theta.get(id)!)]]))
  let connected=0
  for(const table of tables){
    const reduced=pairs(tables.filter(t=>t.id!==table.id)),other=fit(reduced)
    const all=ids.every(id=>other.has(id))&&reachable(reduced,ids[0]).size===ids.length
    if(all){connected++;for(const id of ids)sensitivity.get(id)!.push(recommendationIndex(other.get(id)!))}
    const a=agreement(theta,other,reduced);if(a!==null)leaveAgreements.push(a)
  }
  for(let run=0;run<20;run++){
    const changed=tables.map((table,b)=>{
      const values=table.rows.map(r=>r.evaluation.rawScore!),span=Math.max(...values)-Math.min(...values)
      return {...table,rows:table.rows.map((row,i)=>({...row,evaluation:{...row.evaluation,rawScore:row.evaluation.rawScore!+span*.01*Math.sin((run+1)*(i+1)*17+(b+1)*31)}}))}
    })
    const changedEdges=pairs(changed),other=fit(changedEdges),a=agreement(theta,other,changedEdges)
    if(a!==null)perturbAgreements.push(a)
    for(const id of ids)sensitivity.get(id)!.push(recommendationIndex(other.get(id)!))
  }
  const validation={totalFolds:measurements.length,evaluableFolds:evaluable,disconnectedFolds:disconnected,predictions:errors.length,brier:average(errors),baselineBrier:average(baseline),winRateBrier:average(winErrors),accuracy:average(correct),leaveOutAgreement:average(leaveAgreements),leaveOutConnected:connected/tables.length,perturbAgreement:average(perturbAgreements)}
  const reasons:string[]=[]
  if(ids.length<THRESHOLDS.configs)reasons.push('구성 3개 미만')
  if(tables.length<THRESHOLDS.tables)reasons.push('서로 다른 평가 노드 3개 미만')
  if(evaluable<THRESHOLDS.folds||evaluable/measurements.length<THRESHOLDS.coverage)reasons.push('검증 가능한 관측 부족 또는 연결 단절')
  if(validation.brier===null||validation.baselineBrier===null||validation.baselineBrier===0||validation.brier>validation.baselineBrier*(1-THRESHOLDS.brierImprovement))reasons.push('기준선 대비 Brier 10% 개선 미달')
  if(validation.accuracy===null||validation.accuracy<THRESHOLDS.accuracy)reasons.push('순서 정확도 65% 미달')
  if(validation.leaveOutAgreement===null||validation.leaveOutAgreement<THRESHOLDS.leaveOutAgreement||validation.leaveOutConnected<THRESHOLDS.leaveOutConnected)reasons.push('평가 제거 시 연결·순위 안정성 부족')
  if(validation.perturbAgreement===null||validation.perturbAgreement<THRESHOLDS.perturbAgreement)reasons.push('작은 점수 교란 안정성 부족')
  const passed=!reasons.length
  const scores=ids.map(configId=>{
    const rows=tables.flatMap(t=>t.rows.filter(r=>r.configId===configId)),e=rows[0].evaluation,modelTables=new Set(tables.filter(t=>t.rows.some(r=>r.configId===configId)).map(t=>t.id)).size
    const evaluators=[...new Set(rows.map(r=>r.evaluation.evaluator))],concentration=Math.max(...evaluators.map(ev=>rows.filter(r=>r.evaluation.evaluator===ev).length))/rows.length
    const values=sensitivity.get(configId)!,range:[number,number]=[Math.min(...values),Math.max(...values)],enough=modelTables>=THRESHOLDS.minModelTables
    return {configId,modelId:e.modelId,modelVersion:e.modelVersion,effort:e.effort,type:e.evaluationType??'model',theta:theta.get(configId)!,score:passed&&enough?recommendationIndex(theta.get(configId)!):null,rank:null as number|null,nearTie:false,sensitivity:range,observations:new Set(rows.map(r=>r.measurementId)).size,tables:modelTables,evaluators,sourceConcentrated:concentration>.75,uncertain:!enough||concentration>.75||range[1]-range[0]>10,execution:{agentName:e.agentName??null,agentVersion:e.agentVersion??null,tools:e.tools,harness:e.harness,environment:e.environment,fallbacks:e.fallbacks}}
  })
  const publicScores=scores.filter(s=>s.score!==null)
  for(const s of publicScores){s.rank=1+publicScores.filter(other=>other.theta>s.theta+1e-8).length;s.nearTie=publicScores.some(other=>other!==s&&(Math.abs(other.score!-s.score!)<=3||Math.max(other.sensitivity[0],s.sensitivity[0])<=Math.min(other.sensitivity[1],s.sensitivity[1])))}
  // Membership is part of the identity: a new disconnected component never inherits.
  return {id:JSON.stringify([scope,tables[0].type,[...ids].sort()]),scope,type:tables[0].type,configIds:ids,tableIds:tables.map(t=>t.id),sources:[...new Map(tables.flatMap(t=>t.rows.map(r=>r.evaluation.source)).map(s=>[s.url,{url:s.url,checkedAt:s.checkedAt}])).values()],passed,reasons,scores,validation}
}
export function estimateTables(tables:EstimationTable[]):EstimationResult[] {
  const results:EstimationResult[]=[]
  for(const scope of new Set([...tables.map(t=>t.domain),'general']))for(const type of ['model','agent'] as const){
    if(scope==='general'&&type==='agent')continue
    const eligible=tables.filter(t=>t.type===type&&(scope==='general'||t.domain===scope)),edges=pairs(eligible),pending=new Set(edges.flatMap(p=>[p.a,p.b]))
    while(pending.size){const ids=reachable(edges,pending.values().next().value!);ids.forEach(id=>pending.delete(id));const component=eligible.filter(t=>t.rows.some(r=>ids.has(r.configId)));if(component.length)results.push(estimateComponent(component,scope))}
  }
  return results
}
export function selectPublished(attempts:EstimationResult[],previous:EstimationResult[]):EstimationResult[] {
  const next=attempts.filter(r=>r.passed&&r.scores.some(s=>s.score!==null)).map(r=>({...r,stale:false}))
  for(const old of previous)if(old.passed&&!next.some(r=>r.id===old.id))next.push({...old,stale:true})
  return next
}
