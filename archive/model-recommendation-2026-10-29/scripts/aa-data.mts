import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'
import {collectAA} from './aa-collector.ts'
import {reviewAAResponse,authorizeAAPublication,AA_ENDPOINT,AA_FIELDS} from '../src/lib/aaSnapshot.ts'
import type {AACapture,AAReview} from '../src/lib/aaSnapshot.ts'
import {recommendationSnapshot} from '../src/data/recommendationSnapshot.ts'

// All paths are fixed and private except the explicitly reviewed public snapshot.
const root=resolve(fileURLToPath(new URL('..',import.meta.url)))
const privatePath=(file:string)=>resolve(root,'.aa-cache',file)
const read=async(file:string)=>JSON.parse(await readFile(privatePath(file),'utf8'))
const save=async(file:string,data:unknown)=>{await mkdir(privatePath('.'),{recursive:true});await writeFile(privatePath(file),JSON.stringify(data,null,2)+'\n')}
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
async function main(){
  const command=process.argv[2]??'check'
  if(command==='check'){
    process.stdout.write(JSON.stringify({endpoint:AA_ENDPOINT,keyPresent:!!process.env.ARTIFICIAL_ANALYSIS_API_KEY,networkRequested:false,documentedEvaluationFields:AA_FIELDS,codingAgentIndexDocumented:false,publicDisplay:'AA §2.4(c,d)·§2.5의 구체 사용 범위 검토 필요; API 인증과 별개'},null,2)+'\n');return
  }
  if(command==='collect'){
    const capture=await collectAA(process.env.ARTIFICIAL_ANALYSIS_API_KEY)
    await save('response.json',capture);await save('capture-integrity.json',{sha256:digest(capture)})
    process.stdout.write('AA response saved privately in .aa-cache/response.json. No public snapshot changed.\n');return
  }
  if(command!=='prepare'&&command!=='publish')throw new Error('사용법: node scripts/aa-data.mts check|collect|prepare|publish')
  const capture=await read('response.json') as AACapture,integrity=await read('capture-integrity.json')
  if(integrity.sha256!==digest(capture))throw new Error('수집 응답이 변경되었습니다. 원본·출처를 검토하세요.')
  const review=await read('review.json') as AAReview
  const reviewed=reviewAAResponse(capture,review,recommendationSnapshot.models)
  await save('candidate.json',reviewed)
  if(command==='prepare'){
    process.stdout.write(JSON.stringify({localValidated:reviewed.observations.length,issues:reviewed.issues.length,unmapped:reviewed.unmappedIds.length,publicUpdated:false})+'\n');return
  }
  const rights=await read('rights.json')
  const snapshot=authorizeAAPublication(reviewed,rights)
  if(!snapshot.observations.length)throw new Error('검증된 실응답 관측이 없어 공개 스냅샷을 덮어쓰지 않습니다.')
  await writeFile(resolve(root,'src/data/research/aa-verified.json'),JSON.stringify(snapshot,null,2)+'\n')
  process.stdout.write(`Reviewed public AA snapshot updated: ${snapshot.observations.length}. Run tests/typecheck and review diff before any release.\n`)
}
try{await main()}catch(error){process.stderr.write((error instanceof Error?error.message:'AA 작업 실패. 비공개 본문은 출력하지 않습니다.')+'\n');process.exitCode=1}
