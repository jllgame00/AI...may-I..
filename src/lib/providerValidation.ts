import { REQUIRED_PROVIDER_IDS, REQUIRED_SERVICE_IDS, REQUIRED_SERVICE_OWNERS } from '../data/providerPolicy.ts'
import type { ProviderCatalog } from '../providerTypes'
export function validEvidenceURL(value:string):boolean {try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password}catch{return false}}
export function validEvidenceDate(value:string,asOf=new Date().toISOString().slice(0,10)):boolean {
  return /^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value.slice(0,10)&&value.slice(0,10)<=asOf
}
export function validateCatalog(data:ProviderCatalog):string[] {
  const errors:string[]=[]
  if(!data||!data.version||![data.providers,data.services,data.plans,data.evidence,data.models].every(Array.isArray))return ['invalid catalog schema']
  for(const [label,rows] of [['provider',data.providers],['service',data.services],['plan',data.plans],['evidence',data.evidence],['model',data.models]] as const)if(new Set(rows.map(r=>r.id)).size!==rows.length)errors.push(`duplicate ${label} id`)
  for(const id of REQUIRED_PROVIDER_IDS)if(!data.providers.some(p=>p.id===id))errors.push(`missing provider ${id}`)
  for(const id of REQUIRED_SERVICE_IDS)if(!data.services.some(p=>p.id===id))errors.push(`missing service ${id}`)
  for(const [id,owner] of Object.entries(REQUIRED_SERVICE_OWNERS))if(data.services.some(s=>s.id===id&&s.providerId!==owner))errors.push(`required service owner ${id}/${owner}`)
  for(const p of data.providers){if(!validEvidenceURL(p.url))errors.push(`provider URL ${p.id}`);for(const id of p.serviceIds)if(!data.services.some(s=>s.id===id&&s.providerId===p.id))errors.push(`provider service relation ${p.id}/${id}`)}
  for(const s of data.services){if(!validEvidenceURL(s.url))errors.push(`service URL ${s.id}`);if(!data.providers.some(p=>p.id===s.providerId&&p.serviceIds.includes(s.id)))errors.push(`orphan service ${s.id}`);if(!data.plans.some(p=>p.serviceId===s.id))errors.push(`service without plan ${s.id}`)}
  const evidenceIds=new Set(data.evidence.map(e=>e.id))
  for(const p of data.plans){
    for(const [id,cap] of Object.entries(p.capabilities))if(!cap||!['supported','limited','unsupported','unknown'].includes(cap.status))errors.push(`invalid capability status ${p.id}/${id}`)
    if(!data.services.some(s=>s.id===p.serviceId))errors.push(`orphan plan ${p.id}`)
    if(!['free','paid','unknown'].includes(p.tier)||!validEvidenceURL(p.url))errors.push(`invalid plan ${p.id}`)
    if(p.price.amount!==null&&(!Number.isFinite(p.price.amount)||p.price.amount<0))errors.push(`invalid price ${p.id}`)
    for(const id of [...p.evidenceIds,...p.price.evidenceIds,...Object.values(p.capabilities).flatMap(c=>c?.evidenceIds??[])])if(!evidenceIds.has(id))errors.push(`missing evidence ${p.id}/${id}`)
  }
  for(const e of data.evidence){
    if(!validEvidenceDate(e.checkedAt))errors.push(`invalid evidence date ${e.id}`)
    if(!validEvidenceURL(e.url)||!e.scope||!['reviewed','unverified'].includes(e.verification)||!data.services.some(s=>s.id===e.serviceId)||e.planIds.some(id=>!data.plans.some(p=>p.id===id&&p.serviceId===e.serviceId)))errors.push(`invalid evidence scope ${e.id}`)
  }
  for(const m of data.models)if(!data.providers.some(p=>p.id===m.providerId)||!data.services.some(s=>s.id===m.serviceId&&s.providerId===m.providerId)||m.planIds.some(id=>!data.plans.some(p=>p.id===id&&p.serviceId===m.serviceId)))errors.push(`invalid model reference ${m.id}`)
  return errors
}
