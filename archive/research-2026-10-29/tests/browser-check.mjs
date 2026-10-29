// Manual integration runner. Requires preview :4173 and an isolated Chromium
// debugging session :9222. Never targets a production service or sends prompts.
import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
const base=process.env.QA_BASE_URL??'http://127.0.0.1:4173/AI...may-I../'
assert.equal(new URL(base).hostname,'127.0.0.1')
const survey='전공 수업에서 대학생 120명의 설문 결과를 분석해서 A4 4장짜리 보고서를 써야 해. 데이터는 엑셀에 있고, 학년별 만족도 차이와 공부 시간·성적의 관계를 보고 싶어. 통계를 잘 몰라서 분석 방법과 결과 해석도 쉽게 설명받고 싶어.'
const target=await(await fetch('http://127.0.0.1:9222/json/new?'+encodeURIComponent(base),{method:'PUT'})).json()
const ws=new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
const pending=new Map(),errors=[];let sequence=0
ws.addEventListener('message',event=>{const d=JSON.parse(event.data);if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p?.reject(new Error(JSON.stringify(d.error))):p?.resolve(d.result)}})
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value}
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50))}throw new Error('Timed out: '+expression)}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await new Promise(r=>setTimeout(r,80))}
async function input(selector,text){await evaluate(`(()=>{let e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);await new Promise(r=>setTimeout(r,50))}
async function key(name,code,vk){await send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code,windowsVirtualKeyCode:vk,...(name==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code,windowsVirtualKeyCode:vk})}
async function tabTo(id){for(let i=0;i<100;i++){if(await evaluate('document.activeElement.id')===id)return;await key('Tab','Tab',9)}throw new Error('Keyboard target unreachable: '+id)}
async function screenshot(name,width){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===320});assert.equal(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),true);await writeFile(`.qa/${name}-${width}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))}
async function start(text){await input('#request-text',text);await click('#create-prompt');await until(`!!document.getElementById('finish-conditions')`);assert.equal(await evaluate(`document.getElementById('request-text').value`),text);await click('#finish-conditions');await until(`!!document.getElementById('recommended-options')`)}
async function choose(){await click('#recommended-options .candidate-card button');await until(`!!document.querySelector('.primary-editor textarea')`)}
async function copyCurrent(){const text=await evaluate(`document.querySelector('.primary-editor textarea').value`);if(await evaluate(`!!document.querySelector('.primary-editor .missing-fields input')`))await click('.primary-editor .missing-fields input');await click('.primary-editor .editor-heading button');await until(`document.querySelector('.copy-feedback').innerText.includes('클립보드에 복사')`);assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\r\n','\n'),text);return text}
// Updated provider E2E runner for a separately prepared local QA browser.
// It is intentionally NOT part of npm test and was not run in the managed host.
const results=[]
try{
  await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');await mkdir('.qa',{recursive:true})
  await until(`!!document.getElementById('request-text')`)
  for(const text of ['설문 문항을 작성해줘','기존 XLSX 설문 결과를 분석해줘','PDF 논문을 분석해줘','5분 발표 대본을 작성해줘','React 코드 오류를 수정해줘','포스터 이미지를 생성해줘','XLSX 자료를 분석하고 발표자료와 발표 대본을 작성해줘']){
    await start(text)
    const companyIds=await evaluate(`Array.from(document.querySelectorAll('#recommended-options [data-provider-id]')).map(e=>e.dataset.providerId)`)
    assert.ok(companyIds.length<=3);assert.equal(new Set(companyIds).size,companyIds.length)
    assert.equal(await evaluate(`document.getElementById('needs-check-candidates').open`),false)
    const chooseMain=await evaluate(`!!document.querySelector('#recommended-options button[id^="choose-"]')`)
    if(!chooseMain)await click('#needs-check-summary')
    await click(chooseMain?'#recommended-options button[id^="choose-"]':'#needs-check-options button[id^="choose-"]')
    await until(`!!document.querySelector('.primary-editor textarea')`)
    const stageIds=await evaluate(`Array.from(document.querySelectorAll('.stage-list button')).map(b=>b.id)`)
    for(const id of stageIds){await click('#'+id);assert.ok((await evaluate(`document.querySelector('.primary-editor textarea').value`)).includes(text))}
    const edited='사용자 편집 본문\n  공백 유지'
    await input('.primary-editor textarea',edited)
    await click('#change-ai');await evaluate('history.back()');await until(`!!document.querySelector('.primary-editor textarea')`)
    assert.equal(await evaluate(`document.querySelector('.primary-editor textarea').value`),edited)
    await screenshot(`provider-${results.length}`,1440);await screenshot(`provider-${results.length}`,320)
    results.push({text,companies:companyIds,stageIds,draftPreserved:true})
    await click('#new-task')
  }
  assert.deepEqual(errors,[])
  await writeFile('.qa/provider-browser-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length}))
}finally{await send('Page.close').catch(()=>{});ws.close()}
