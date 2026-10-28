import type { FeatureSupport, TaskScoreComponent } from '../recommendationTypes'

type Check=NonNullable<TaskScoreComponent['checks']>[number]
export interface TaskFeatureSupport extends FeatureSupport { declaredStatus:FeatureSupport['status']; checks:Check[] }
interface Quantity { value:number; text:string; relation:'exact'|'upper'|'lower'|'over'|'uncertain' }
function quantities(text:string,pattern:RegExp,scale:(m:RegExpMatchArray)=>number=()=>1):Quantity[] {
  return [...text.matchAll(pattern)].map(m=>{
    const before=text.slice(Math.max(0,m.index!-14),m.index!)
    const after=text.slice(m.index!+m[0].length).split(/[,;\n，]|\d[\d,.]*\s*(?:MiB|GiB|MB|GB|행|개)/i)[0]
    const uncertain=/(?:약|대략|추정|예상)\s*$/.test(before)||/[~～-]\s*$/.test(before)||/^\s*[~～-]/.test(after)||/인지|일지|일까|아닐까|모르|미정|미확인|\?/.test(after)
    const relation=uncertain?'uncertain':/^\s*초과/.test(after)?'over':/^\s*이상/.test(after)||/최소\s*$/.test(before)?'lower':/^\s*(?:이하|미만)/.test(after)||/최대\s*$/.test(before)?'upper':'exact'
    return {value:Number(m[1].replaceAll(',',''))*scale(m),text:m[0],relation}
  })
}

// Only explicitly stated facts are compared. A participant count is not a row
// count, and a small file is not proof of an account's remaining quota.
export function featureSupportForTask(support:FeatureSupport|undefined,feature:string,task:string):TaskFeatureSupport {
  const original=support??{status:'unknown' as const,note:'공식 지원 근거 미확인',sources:[]}
  const result=(status:FeatureSupport['status'],checks:Check[],reason?:string):TaskFeatureSupport=>({...original,declaredStatus:original.status,status,checks,note:reason?`${original.note} 이 작업의 판정: ${reason}`:original.note})
  if(!original.sources.some(s=>/^https:\/\//.test(s.url)&&s.checkedAt))return result('unknown',[],'출처 미확인')
  if(original.status!=='limited')return result(original.status,[])
  const checks:Check[]=[],bounds=original.constraints
  if(bounds){
    const maximum=(label:string,limit:number|undefined,values:Quantity[],unit:string,complete=true)=>{
      if(limit===undefined)return
      const valid=Number.isFinite(limit)&&limit>=0
      const verdicts=values.map(v=>v.relation==='uncertain'?'unknown':v.relation==='over'?v.value>=limit?'unmet':'unknown':v.relation==='lower'?v.value>limit?'unmet':'unknown':v.relation==='upper'?v.value<=limit?'met':'unknown':v.value>limit?'unmet':'met')
      checks.push({condition:valid?`${label} ${limit}${unit} 이하`:`${label} 제한값 확인 필요`,requested:values.length?values.map(v=>`${v.text}${v.relation==='exact'?'':` (${v.relation==='uncertain'?'수치 미확정':v.relation==='upper'?'상한':v.relation==='lower'?'하한':'초과'})`}`).join(' · ')+(complete?'':' · 나머지 파일 조건 미확인'):null,result:!valid||!values.length?'unknown':verdicts.includes('unmet')?'unmet':!complete||verdicts.includes('unknown')?'unknown':'met'})
    }
    const sizes=quantities(task,/(\d+(?:\.\d+)?)\s*(MiB|GiB|MB|GB)\b/gi,m=>({mb:1,gb:1000,mib:1.048576,gib:1073.741824}[m[2].toLowerCase()]!))
    const counts=[...quantities(task,/(\d+)\s*개(?:의)?\s*파일/g),...quantities(task,/파일\s*(\d+)\s*개/g)]
    const count=counts.length?Math.max(...counts.map(c=>c.value)):1
    const everyFile=/(?:파일당|각\s*파일|각각|모든\s*파일)/.test(task)
    maximum('파일 크기',bounds.maxFileSizeMB,sizes,'MB',count<=1||everyFile||sizes.length>=count)
    maximum('파일 수',bounds.maxFiles,counts,'개')
    maximum('행 수',bounds.maxRows,quantities(task,/(\d[\d,]*)\s*행/g),'행')
    if(bounds.formats){
      const requestedFormats=task.replace(/\b(?:csv|xlsx|xls|pdf|docx|pptx|txt|json|png|jpg|jpeg)\b\s*(?:는|은|가|이|을|를)?\s*(?:아니고|아니라|말고|제외(?:하고)?|없이)/gi,' ')
      const formats=[...requestedFormats.matchAll(/\b(csv|xlsx|xls|pdf|docx|pptx|txt|json|png|jpg|jpeg)\b/gi)].map(m=>m[1].toLowerCase())
      checks.push({condition:`지원 형식: ${bounds.formats.join(', ')}`,requested:formats.length?[...new Set(formats)].join(', '):null,result:!formats.length||!bounds.formats.length?'unknown':formats.some(f=>!bounds.formats!.map(v=>v.toLowerCase()).includes(f))?'unmet':'met'})
    }
    for(const condition of bounds.unresolved??[])checks.push({condition,requested:null,result:'unknown'})
  }
  if(!checks.length){
    // The stored note explicitly confirms creation/editing but leaves XLSX
    // input unverified. It supports a new-sheet-only task, not arbitrary XLSX
    // analysis. This is a source-content rule, never a model/provider rule.
    const creationConfirmed=feature==='spreadsheet'&&/작성[·ㆍ/]\s*편집.*(?:확인|지원)/.test(original.note)&&/XLSX\s*입력.*(?:확인\s*필요|미확인)/i.test(original.note)
    const newSheet=/새(?:로운)?\s*(?:스프레드시트|시트|표)/.test(task)&&/(?:작성|만들)/.test(task)&&!/(?:작성|만들).{0,8}(?:말|않|마)/.test(task)
    const needsExistingInput=/첨부|업로드|xlsx|csv|엑셀|(?:기존|제공한|받은).*?(?:파일|시트)|(?:자료|파일).*?(?:분석|읽)/i.test(task)
    if(creationConfirmed&&newSheet&&!needsExistingInput)checks.push({condition:'공식적으로 확인된 새 스프레드시트 작성 범위',requested:'기존 파일 입력 없는 새 스프레드시트 작성',result:'met'})
    else checks.push({condition:creationConfirmed?'XLSX 입력·분석 범위 확인 필요':'구체적인 지원 제한과 작업 조건 확인 필요',requested:creationConfirmed&&/엑셀|xlsx/i.test(task)?'엑셀·XLSX 자료 처리 요청':null,result:'unknown'})
  }
  const status=checks.some(c=>c.result==='unmet')?'unsupported':checks.some(c=>c.result==='unknown')?'limited':'supported'
  const reason=checks.filter(c=>c.result!=='met').map(c=>c.condition).join(' · ')||'확인된 제한 범위 안에 들어옵니다.'
  return result(status,checks,reason)
}
