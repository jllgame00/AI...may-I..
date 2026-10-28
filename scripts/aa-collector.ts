import {AA_ENDPOINT} from '../src/lib/aaSnapshot.ts'
import type {AACapture} from '../src/lib/aaSnapshot.ts'

export async function collectAA(key:string|undefined,fetcher:typeof fetch=fetch):Promise<AACapture>{
  if(!key?.trim())throw new Error('ARTIFICIAL_ANALYSIS_API_KEY 환경변수가 없습니다. 요청하지 않았습니다.')
  let response:Response
  try{response=await fetcher(AA_ENDPOINT,{headers:{'x-api-key':key},redirect:'error',signal:AbortSignal.timeout(20000)})}
  catch{throw new Error('AA 요청 실패. 자동 재시도하지 않았습니다. 키나 응답 본문은 출력하지 않습니다.')}
  if(!response.ok)throw new Error(`AA HTTP ${response.status}. 자동 재시도하지 않았습니다.`)
  let payload:unknown
  try{payload=await response.json()}catch{throw new Error('AA 응답이 유효한 JSON이 아닙니다. 본문은 출력하지 않습니다.')}
  if(JSON.stringify(payload).includes(key))throw new Error('응답에 인증 문자열이 포함되어 저장하지 않습니다.')
  return {endpoint:AA_ENDPOINT,fetchedAt:new Date().toISOString(),payload}
}
