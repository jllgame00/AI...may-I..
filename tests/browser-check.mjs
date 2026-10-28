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
async function choose(){await click('[data-group="recommended"] .candidate-card button');await until(`!!document.querySelector('.primary-editor textarea')`)}
async function copyCurrent(){const text=await evaluate(`document.querySelector('.primary-editor textarea').value`);if(await evaluate(`!!document.querySelector('.primary-editor .missing-fields input')`))await click('.primary-editor .missing-fields input');await click('.primary-editor .editor-heading button');await until(`document.querySelector('.copy-feedback').innerText.includes('클립보드에 복사')`);assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\r\n','\n'),text);return text}
const results=[],prompts={}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');await mkdir('.qa',{recursive:true})
  await until(`!!document.getElementById('request-text')`)
  await click('#create-prompt');assert.equal(await evaluate('document.activeElement.id'),'request-text')
  assert.equal(await evaluate(`!!document.querySelector('input[name=priority],input[name=budget],#usage-route,input[type=file]')`),false)
  await screenshot('input',1440);await screenshot('input',320)
  await start(survey)
  await screenshot('survey-comparison',1440)
  assert.ok(await evaluate(`getComputedStyle(document.querySelector('[data-group="recommended"] .candidate-grid')).gridTemplateColumns.split(' ').length>=2`))
  await screenshot('survey-comparison',320)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-group="recommended"] .candidate-grid')).gridTemplateColumns.split(' ').length`),1)
  const models=await evaluate(`Array.from(document.querySelectorAll('[data-group="recommended"] .candidate-card')).map(c=>({id:c.dataset.modelId,name:c.querySelector('h2').textContent,hidden:!!c.closest('details:not([open])'),visible:c.innerText}))`)
  assert.equal(models.length,2)
  assert.equal(models.length,new Set(models.map(c=>c.id)).size)
  assert.ok(models.every(c=>!c.hidden))
  assert.deepEqual(models.map(c=>c.name),models.map(c=>c.name).sort((a,b)=>a.localeCompare(b,'en',{numeric:true})))
  for(const name of ['Claude Opus 5.5','Claude Sonnet 5.5'])assert.ok(models.some(c=>c.name===name))
  for(const model of models){
    assert.match(model.visible,/필수 기능 3개 확인/)
    assert.match(model.visible,/웹 모델 제공:/)
    assert.match(model.visible,/필수 웹 도구:/)
    assert.match(model.visible,/개인 계정:.*미확인/)
    assert.match(model.visible,/공동 추천/)
  }
  assert.equal(await evaluate(`document.getElementById('needs-check-candidates').open`),false)
  assert.equal(await evaluate(`document.getElementById('needs-check-summary').getAttribute('aria-expanded')`),'false')
  assert.equal(await evaluate(`document.getElementById('needs-check-summary').getAttribute('aria-controls')`),'needs-check-options')
  assert.equal(await evaluate(`document.querySelectorAll('#needs-check-options .candidate-card').length`),26)
  await tabTo('needs-check-summary');await key('Enter','Enter',13)
  await until(`document.getElementById('needs-check-candidates').open&&document.getElementById('needs-check-summary').getAttribute('aria-expanded')==='true'`)
  const conditional=await evaluate(`Array.from(document.querySelectorAll('#needs-check-options [data-judgment="conditional"]')).map(c=>({name:c.querySelector('h2').textContent,text:c.innerText}))`)
  assert.deepEqual(conditional.map(c=>c.name),['GPT-6 Astra','GPT-6.1 Sol','GPT-6.1 Terra'])
  for(const c of conditional){assert.match(c.text,/조건부 추천/);assert.match(c.text,/XLSX 입력·분석 범위 확인 필요/);assert.doesNotMatch(c.text,/문서 근거 충족 점수:/)}
  await key(' ','Space',32)
  await until(`!document.getElementById('needs-check-candidates').open&&document.getElementById('needs-check-summary').getAttribute('aria-expanded')==='false'`)
  await key('Enter','Enter',13)
  await until(`document.getElementById('needs-check-candidates').open`)
  await click('#needs-check-options .candidate-card button')
  await until(`!!document.querySelector('.primary-editor textarea')`)
  await click('#change-ai')
  await until(`!!document.getElementById('needs-check-candidates')`)
  assert.equal(await evaluate(`document.getElementById('needs-check-candidates').open`),true)
  assert.equal(await evaluate(`document.getElementById('needs-check-summary').getAttribute('aria-expanded')`),'true')
  await tabTo('needs-check-summary');await key(' ','Space',32)
  await until(`!document.getElementById('needs-check-candidates').open`)
  await evaluate('history.back()');await until(`!!document.querySelector('.primary-editor textarea')`)
  await evaluate('history.forward()');await until(`!!document.getElementById('needs-check-candidates')`)
  assert.equal(await evaluate(`document.getElementById('needs-check-candidates').open`),false)
  assert.equal(await evaluate(`document.getElementById('needs-check-summary').getAttribute('aria-expanded')`),'false')
  await choose();await click('#change-ai');await until(`!!document.getElementById('needs-check-candidates')`)
  assert.equal(await evaluate(`document.getElementById('needs-check-candidates').open`),false)
  assert.equal(await evaluate(`document.getElementById('needs-check-summary').getAttribute('aria-expanded')`),'false')
  results.push('Survey: two documented joint recommendations; three conditional Work candidates folded with 26 additional models; keyboard expand/collapse and open/closed state preserved across selection and return; 1440/320 layout.')
  assert.equal(await evaluate(`document.querySelectorAll('[data-group="model-check"] .candidate-card').length`),4)
  assert.equal(await evaluate(`document.getElementById('other-services').parentElement.open`),false)
  await tabTo('other-services');await key('Enter','Enter',13)
  assert.equal(await evaluate(`document.getElementById('other-services').parentElement.open`),true)
  await key(' ','Space',32)
  assert.equal(await evaluate(`document.getElementById('other-services').parentElement.open`),false)
  const cards=await evaluate(`Array.from(document.querySelectorAll('#recommended-options .candidate-card')).map(c=>({height:c.getBoundingClientRect().height,font:getComputedStyle(c.querySelector('.candidate-limit')??c.querySelector('h2')).fontSize,open:c.querySelector('details').open}))`)
  assert.ok(cards.length>20);assert.ok(cards.every(c=>!c.open&&parseFloat(c.font)>=16))
  assert.equal(await evaluate(`!!document.querySelector('.other-candidates')`),false)
  assert.ok(await evaluate(`document.querySelectorAll('[data-candidate-kind="weighted"]').length>0`))
  assert.ok(await evaluate(`document.querySelectorAll('[data-candidate-kind="model-check"]').length>0`))
  await choose();assert.equal(await evaluate(`document.querySelectorAll('.stage-list li').length`),4)
  await send('Browser.grantPermissions',{origin:new URL(base).origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']})
  for(const id of ['statistics','interpretation','report','review']){
    await click('#stage-'+id);prompts[id]=await copyCurrent()
    assert.match(prompts[id],/대학생 120명/);assert.match(prompts[id],/학년별 만족도 차이/);assert.match(prompts[id],/공부 시간과 성적의 관계/)
    assert.doesNotMatch(prompts[id],/모델 ID|플랜|크레딧|https:/)
  }
  assert.match(prompts.statistics,/최종 보고서 분량을 강제하지/);assert.match(prompts.report,/최종 분량은 A4 4장/)
  await screenshot('survey-workspace',1440);await screenshot('survey-workspace',320)
  await click('#stage-statistics')
  const edited='직접 편집한 통계 분석 요청\n  공백과 줄바꿈 유지'
  await input('#prompt-statistics',edited);await copyCurrent()
  await click('#change-ai');await evaluate('history.back()');await until(`!!document.getElementById('prompt-statistics')`)
  assert.equal(await evaluate(`document.getElementById('prompt-statistics').value`),edited)
  await click('#change-ai');await evaluate(`document.querySelectorAll('#recommended-options button[id^="choose-"]')[1].click()`);await until(`!!document.getElementById('prompt-statistics')`)
  assert.equal(await evaluate(`document.getElementById('prompt-statistics').value`),edited)
  assert.equal(await evaluate(`!!document.querySelector('.draft-notice')`),true)
  await click('#change-request');await click('.extra-conditions summary');await input('#condition-length','2쪽');await click('#finish-conditions');await choose();await click('#stage-report')
  assert.equal(await evaluate(`!!document.querySelector('.draft-notice')`),true)
  await click('.draft-notice button:last-child');assert.match(await evaluate(`document.getElementById('prompt-report').value`),/2쪽/)
  await click('.editor-actions button:first-child');assert.match(await evaluate(`document.getElementById('prompt-report').value`),/최종 분량은 A4 4장/)
  await click('#stage-statistics');assert.equal(await evaluate(`document.getElementById('prompt-statistics').value`),edited)
  await send('Browser.resetPermissions');await send('Browser.setPermission',{origin:new URL(base).origin,permission:{name:'clipboard-write'},setting:'denied'})
  await click('#copy-statistics');await until(`document.querySelector('.copy-feedback').innerText.includes('자동 복사가 되지')`);assert.equal(await evaluate('document.activeElement.id'),'prompt-statistics')
  await send('Browser.resetPermissions');await send('Browser.grantPermissions',{origin:new URL(base).origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']})
  assert.ok(!(await evaluate('location.href')).includes(encodeURIComponent(survey)))
  results.push('Survey: all four prompts; exact edited clipboard; denied-copy feedback; model/condition/back draft preservation; regeneration and recovery; 1440/320 overflow checks.')
  for(const [text,stages,name] of [
    ['React 저장소의 수량 변경 버그를 수정하고 테스트 방법을 알려줘',['diagnose','implement','test'],'coding'],
    ['신입생 대상 독서 동아리 모집 홍보 글을 친근하게 500자로 작성해줘',['outline','compose','polish'],'writing'],
  ]){
    await click('#new-task');await start(text)
    assert.ok(await evaluate(`document.querySelectorAll('[data-group="recommended"] .candidate-card').length<=3`))
    if(name==='coding'){
      const coding=await evaluate(`Array.from(document.querySelectorAll('[data-group="recommended"] .candidate-card')).map(c=>({name:c.querySelector('h2').textContent,text:c.innerText,selectable:!!c.querySelector('button')}))`)
      assert.equal(coding[0].name,'Grok 4.7');assert.match(coding[0].text,/벤치마크 원점수: 71/);assert.match(coding[0].text,/집합 내 1위/)
      assert.ok(coding.some(c=>c.selectable));assert.ok(coding.every(c=>!c.text.includes('서비스의 추천 점수: 미산정')))
    }else{
      assert.equal(await evaluate(`document.querySelectorAll('[data-group="recommended"] .candidate-card').length`),3)
      assert.equal(await evaluate(`document.querySelector('.remaining-models summary').textContent`),'나머지 공동 추천 (17)')
      assert.match(await evaluate(`document.querySelector('[data-group="recommended"]').innerText`),/공동 추천/)
    }
    await choose()
    for(const id of stages){await click('#stage-'+id);assert.ok((await copyCurrent()).length>150)}
    await screenshot(name+'-workspace',1440);await screenshot(name+'-workspace',320)
    results.push(`${name}: input, interpretation, web selection, every stage and edited-text clipboard.`)
  }
  await click('#new-task');await send('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});await tabTo('request-text');await tabTo('example-0');await key('Enter','Enter',13);assert.equal(await evaluate(`document.getElementById('request-text').value`),survey)
  assert.deepEqual(errors,[])
  await writeFile('.qa/survey-prompts-browser.json',JSON.stringify(prompts,null,2));await writeFile('.qa/browser-results.json',JSON.stringify({results,runtimeErrors:errors},null,2));console.log(results.join('\n'))
}finally{await send('Page.close').catch(()=>{});ws.close()}
