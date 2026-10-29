import { createHash } from 'node:crypto'
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Model, ModelEvaluation } from '../src/recommendationTypes.ts'
import { baselineSnapshot } from '../src/data/baselineSnapshot.ts'

export interface SourceState { checkedAt:string; changedAt:string|null; hash:string|null; state:'ok'|'stale'|'disabled'; reason?:string; updates:{id:string;rawScore:number}[]; models?:Model[] }
export interface RefreshSnapshot { schemaVersion:1; sources:Record<string,SourceState> }
export const cardSources=[
  {id:'qwen235',model:'Qwen/Qwen3-235B-A22B-Instruct-2507',headers:['','Deepseek-V3-0324','GPT-4o-0327','Claude Opus 4 Non-thinking','Kimi K2','Qwen3-235B-A22B Non-thinking','Qwen3-235B-A22B-Instruct-2507']},
  {id:'qwen30',model:'Qwen/Qwen3-30B-A3B-Instruct-2507',headers:['','Deepseek-V3-0324','GPT-4o-0327','Gemini-2.5-Flash Non-Thinking','Qwen3-235B-A22B Non-Thinking','Qwen3-30B-A3B Non-Thinking','Qwen3-30B-A3B-Instruct-2507']},
]
const rowLabels:Record<string,string>={'MMLU-Pro':'MMLU-Pro','GPQA':'GPQA','AIME':'AIME25','LiveCodeBench':'LiveCodeBench v6 (25.02-25.05)','Creative Writing':'Creative Writing v3','WritingBench':'WritingBench'}
const columns:Record<string,string>={'deepseek-ai/DeepSeek-V3-0324':'Deepseek-V3-0324','moonshotai/Kimi-K2-Instruct':'Kimi K2'}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
const fingerprint=(s:Pick<SourceState,'updates'|'models'>)=>hash(JSON.stringify({updates:[...s.updates].sort((a,b)=>a.id.localeCompare(b.id)),models:s.models?.map(m=>({...m,sources:m.sources?.map(source=>({...source,checkedAt:''}))})).sort((a,b)=>a.id.localeCompare(b.id))}))
export function parseCard(body:string,config:typeof cardSources[number],evaluations:ModelEvaluation[]):SourceState['updates'] {
  if(!/^license: apache-2.0$/m.test(body))throw new Error('license-changed')
  const table=body.split(/\r?\n/).filter(l=>l.startsWith('|')).map(l=>l.split('|').slice(1,-1).map(v=>v.replaceAll('**','').trim()))
  const header=table.find(r=>JSON.stringify(r)===JSON.stringify(config.headers))
  if(!header)throw new Error('table-schema-changed')
  const url=`https://huggingface.co/${config.model}`
  const expected=evaluations.filter(e=>e.source.url===url&&rowLabels[e.benchmark]&&header.includes(columns[e.modelId]??e.modelId.split('/')[1]))
  if(!expected.length)throw new Error('empty-data')
  return expected.map(e=>{
    const rows=table.filter(r=>r[0]===rowLabels[e.benchmark])
    if(rows.length!==1||rows[0].length!==header.length)throw new Error('table-schema-changed')
    const cell=rows[0][header.indexOf(columns[e.modelId]??e.modelId.split('/')[1])]
    if(!/^\d+(\.\d+)?$/.test(cell))throw new Error('invalid-score')
    const rawScore=Number(cell)
    if(rawScore<0||rawScore>100)throw new Error('out-of-range')
    // Large jumps are quarantined for source/definition review, never silently deployed.
    if(e.rawScore!==null&&Math.abs(rawScore-e.rawScore)>20)throw new Error('score-jump-review')
    return {id:e.id,rawScore}
  })
}
export function parseDiscovery(body:string,now:string):Model[] {
  const rows=JSON.parse(body)
  if(!Array.isArray(rows)||!rows.length||rows.length>10)throw new Error('discovery-schema-changed')
  const valid=rows.filter(r=>typeof r.id==='string'&&/^Qwen\/[A-Za-z0-9._-]+$/.test(r.id)&&r.author==='Qwen'&&r.pipeline_tag==='text-generation'&&/^[a-f0-9]{40}$/.test(r.sha)&&(r.cardData?.license==='apache-2.0'||r.tags?.includes('license:apache-2.0')))
  if(!valid.length)throw new Error('no-verified-models')
  return valid.map(r=>({id:r.id,version:r.sha,name:r.id.split('/')[1],provider:'Qwen',reasoning:'미확인',evaluationMode:'미확인',modes:[],capabilities:[],limits:['자동 발견한 공식 저장소 식별 정보입니다. 기능·평가·웹 제공·플랜은 미검증입니다.'],sources:[{url:`https://huggingface.co/${r.id}`,checkedAt:now,scope:`공식 API의 저장소 ID·commit ${r.sha}·Apache-2.0 메타데이터`}],route:{kind:'self-hosted',url:`https://huggingface.co/${r.id}`,status:'confirmed',note:'공식 가중치 저장소. 설치 환경·기능은 별도 검증 필요.'}}))
}
export async function collectSources(previous:RefreshSnapshot,evaluations:ModelEvaluation[],fetcher:typeof fetch=fetch,now=new Date().toISOString()):Promise<RefreshSnapshot> {
  const next:RefreshSnapshot=structuredClone(previous)
  const definitions=[...cardSources.map(c=>({id:c.id,url:`https://huggingface.co/${c.model}/raw/main/README.md`,parse:(s:string)=>({updates:parseCard(s,c,evaluations)})})),
    {id:'qwen-discovery',url:'https://huggingface.co/api/models?author=Qwen&filter=text-generation&sort=lastModified&direction=-1&limit=5&full=true&config=true',parse:(s:string)=>({updates:[],models:parseDiscovery(s,now)})}]
  await Promise.all(definitions.map(async d=>{
    const old=previous.sources[d.id]
    try {
      const response=await fetcher(d.url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'AI-may-I-data-refresh/1.0','Accept':d.id==='qwen-discovery'?'application/json':'text/plain'}})
      if(!response.ok)throw new Error(`http-${response.status}`)
      const body=await response.text()
      if(!body.trim()||body.length>2_000_000)throw new Error('invalid-response-size')
      const parsed:{updates:SourceState['updates'];models?:Model[]}=d.parse(body)
      if(parsed.models)parsed.models=[...new Map([...(old?.models??[]),...parsed.models].map(m=>[m.id,m])).values()]
      // Checked timestamps and metadata order do not constitute data changes.
      const digest=fingerprint(parsed)
      next.sources[d.id]={...parsed,checkedAt:now,changedAt:old?.hash===digest?old.changedAt:now,hash:digest,state:'ok'}
    }catch(e){
      const message=e instanceof Error?e.message:''
      const reason=/^(license-changed|table-schema-changed|empty-data|invalid-score|out-of-range|score-jump-review|discovery-schema-changed|no-verified-models|invalid-response-size|http-\d+)$/.test(message)?message:'network-or-response-failure'
      next.sources[d.id]={...(old??{updates:[],hash:null,changedAt:null}),checkedAt:now,state:'stale',reason}
    }
  }))
  next.sources.aa={checkedAt:now,changedAt:null,hash:null,state:'disabled',reason:'인증 키·공개 이용 허가 미확인. 기존 AA 전용 검증 도구로 별도 연결.',updates:[]}
  return next
}
export function validateSnapshot(value:unknown):RefreshSnapshot {
  const s=value as RefreshSnapshot
  if(!s||s.schemaVersion!==1||!s.sources||typeof s.sources!=='object'||Array.isArray(s.sources))throw new Error('invalid-snapshot')
  for(const [id,v] of Object.entries(s.sources)) {
    if(!v||!['ok','stale','disabled'].includes(v.state)||!Number.isFinite(Date.parse(v.checkedAt))||!Array.isArray(v.updates)||v.updates.some(u=>!u.id||typeof u.rawScore!=='number'||!Number.isFinite(u.rawScore)||u.rawScore<0||u.rawScore>100)||new Set(v.updates.map(u=>u.id)).size!==v.updates.length)throw new Error('invalid-snapshot')
    if(v.models&&(!Array.isArray(v.models)||v.models.some(m=>!m.id||!m.version||!m.sources?.length)))throw new Error('invalid-models')
    const card=cardSources.find(c=>c.id===id)
    if(!card&&!['qwen-discovery','aa'].includes(id))throw new Error('unknown-source')
    const hasGood=v.hash!==null
    if(v.state==='ok'||hasGood){
      if(!/^[a-f0-9]{64}$/.test(v.hash??'')||!v.changedAt||!Number.isFinite(Date.parse(v.changedAt)))throw new Error('missing-provenance')
      if(card){
        const expected=baselineSnapshot.evaluations!.filter(e=>e.source.url===`https://huggingface.co/${card.model}`&&rowLabels[e.benchmark]&&card.headers.includes(columns[e.modelId]??e.modelId.split('/')[1])).map(e=>e.id).sort()
        if(JSON.stringify(v.updates.map(u=>u.id).sort())!==JSON.stringify(expected))throw new Error('incomplete-source')
      }
      if(id==='qwen-discovery'&&(!v.models?.length||v.models.some(m=>!/^Qwen\/[A-Za-z0-9._-]+$/.test(m.id)||!/^[a-f0-9]{40}$/.test(m.version)||m.capabilities?.length||m.modes?.length||m.route?.kind!=='self-hosted')))throw new Error('invalid-discovery')
      if(v.hash!==fingerprint(v))throw new Error('snapshot-fingerprint-mismatch')
    }else if(v.updates.length||v.models?.length)throw new Error('data-without-provenance')
  }
  return s
}
export async function readRecoverable(primary:string,backup:string):Promise<RefreshSnapshot> {
  const valid:RefreshSnapshot[]=[]
  for(const file of [primary,backup])try{valid.push(validateSnapshot(JSON.parse(await readFile(file,'utf8'))))}catch{}
  valid.sort((a,b)=>Math.max(0,...Object.values(b.sources).map(v=>Date.parse(v.checkedAt)))-Math.max(0,...Object.values(a.sources).map(v=>Date.parse(v.checkedAt))))
  if(valid.length){
    const merged=structuredClone(valid[0])
    for(const fallback of valid.slice(1))for(const [id,source] of Object.entries(fallback.sources)){
      const current=merged.sources[id]
      if(!current)merged.sources[id]=source
      else if(!current.hash&&source.hash)merged.sources[id]={...source,checkedAt:current.checkedAt,state:'stale',reason:current.reason??'recovered-last-good-source'}
    }
    return validateSnapshot(merged)
  }
  throw new Error('No valid snapshot or recovery copy; refusing to overwrite.')
}
export async function saveSnapshot(primary:string,backup:string,next:RefreshSnapshot) {
  validateSnapshot(next)
  const json=JSON.stringify(next,null,2)+'\n'
  for(const file of [backup,primary]){await mkdir(dirname(file),{recursive:true});await writeFile(file+'.tmp',json);await rename(file+'.tmp',file)}
}
