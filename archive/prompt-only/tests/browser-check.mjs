// Run against a current build: node tests/browser-check.mjs
// Requires a preview at :4173 and an isolated Chromium debugging session at :9222.
// No browser library or production dependency is installed by this check.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const base = 'http://127.0.0.1:4173/AI...may-I../'
const target = await (await fetch('http://127.0.0.1:9222/json/new?'+encodeURIComponent(base),{ method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve,reject) => { ws.addEventListener('open',resolve,{ once: true }); ws.addEventListener('error',reject,{ once: true }) })
const pending = new Map(); let sequence = 0
const runtimeErrors = []
ws.addEventListener('message',event => { const data = JSON.parse(event.data); if (data.method === 'Runtime.exceptionThrown') runtimeErrors.push(data.params.exceptionDetails.text); if (!data.id) return; const task = pending.get(data.id); pending.delete(data.id); if (data.error) task?.reject(new Error(JSON.stringify(data.error))); else task?.resolve(data.result) })
function send(method,params={}) { const id = ++sequence; return new Promise((resolve,reject) => { pending.set(id,{ resolve,reject }); ws.send(JSON.stringify({ id,method,params })) }) }
async function evaluate(expression) { const result = await send('Runtime.evaluate',{ expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value }
async function until(expression) { for (let i=0;i<100;i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve,50)) }; throw new Error('Browser condition timed out: '+expression) }
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await new Promise(resolve => setTimeout(resolve,90)) }
async function input(selector,value) { await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)}); const prototype=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('input',{bubbles:true})); })()`); await new Promise(resolve => setTimeout(resolve,60)) }
async function key(keyName,code,virtualKey) { await send('Input.dispatchKeyEvent',{ type: 'keyDown',key:keyName,code,windowsVirtualKeyCode:virtualKey,...(keyName==='Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) }); await send('Input.dispatchKeyEvent',{ type:'keyUp',key:keyName,code,windowsVirtualKeyCode:virtualKey }); await new Promise(resolve => setTimeout(resolve,50)) }
async function tabTo(id) { for (let i=0;i<24;i++) { if (await evaluate('document.activeElement.id') === id) return; await key('Tab','Tab',9) }; throw new Error('Keyboard target unreachable: '+id) }
const results = []
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront')
  await until(`!!document.getElementById('request-text')`)
  assert.equal(await evaluate('document.title'),'AI..may I..? — 나의 프롬프트 작성 도구')
  assert.equal(await evaluate('/모델 추천|서비스 탐색|플랜|가격 비교|Arena|Super Agent/.test(document.body.innerText)'),false)
  await click('#create-prompt'); assert.equal(await evaluate('document.activeElement.id'),'request-text')
  assert.equal(await evaluate(`document.getElementById('request-text').getAttribute('aria-invalid')`),'true')
  results.push('Empty input error is announced and focuses the task field; retired product controls absent.')
  await click('#example-1'); assert.equal(await evaluate('location.hash'),'')
  assert.match(await evaluate(`document.getElementById('request-text').value`),/3문장/)
  await click('#create-prompt'); await until(`!!document.getElementById('prompt-main')`)
  assert.equal(await evaluate('location.hash'),'#result')
  assert.equal(await evaluate('document.activeElement.tagName'),'H1')
  assert.match(await evaluate(`document.getElementById('prompt-main').value`),/3문장/)
  results.push('Example fills without submitting; sufficient conditions skip questions and focus the result title.')
  await send('Browser.grantPermissions',{ origin: new URL(base).origin, permissions: ['clipboardReadWrite','clipboardSanitizedWrite'] })
  await click('#copy-main'); await until(`document.querySelector('.primary-editor .copy-feedback').innerText.includes('클립보드에 복사')`)
  assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\r\n','\n'),await evaluate(`document.getElementById('prompt-main').value`))
  results.push('Actual headless-browser clipboard write/read succeeds and success feedback matches the copied text.')
  await input('#prompt-main','사용자가 직접 편집한 프롬프트')
  assert.equal(await evaluate(`document.querySelector('.primary-editor .copy-feedback').innerText`),'')
  await send('Browser.resetPermissions')
  await send('Browser.setPermission',{ origin: new URL(base).origin, permission: { name: 'clipboard-write' }, setting: 'denied' })
  await click('#copy-main'); await until(`document.querySelector('.primary-editor .copy-feedback').innerText.includes('자동 복사가 되지')`)
  assert.equal(await evaluate('document.activeElement.id'),'prompt-main')
  assert.equal(await evaluate(`document.getElementById('prompt-main').selectionEnd-document.getElementById('prompt-main').selectionStart`),'사용자가 직접 편집한 프롬프트'.length)
  results.push('Browser clipboard permission denial shows manual-copy guidance and selects the preserved edit.')
  await click('#edit-conditions'); await input('#condition-length','1문장'); await click('#apply-conditions')
  assert.equal(await evaluate(`document.getElementById('prompt-main').value`),'사용자가 직접 편집한 프롬프트')
  assert.equal(await evaluate(`!!document.querySelector('.primary-editor .draft-notice')`),true)
  await click('.primary-editor .draft-notice button:last-child')
  assert.match(await evaluate(`document.getElementById('prompt-main').value`),/1문장/)
  await evaluate(`Array.from(document.querySelectorAll('.primary-editor button')).find(b=>b.innerText.includes('이전 초안 복구')).click()`)
  await until(`document.getElementById('prompt-main').value==='사용자가 직접 편집한 프롬프트'`)
  results.push('Condition changes preserve edits, explicit regeneration applies the change, and previous draft recovery works.')
  await click('#home'); await input('#request-text','안내문을 작성해줘'); await click('#create-prompt')
  await until(`!!document.getElementById('skip-conditions')`)
  assert.ok((await evaluate(`document.querySelectorAll('.questions-page .condition-fields input').length`))<=3)
  await send('Input.dispatchKeyEvent',{ type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await send('Input.dispatchKeyEvent',{ type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  assert.equal(await evaluate('document.activeElement.id'),'condition-audience')
  await click('#skip-conditions'); await until(`!!document.getElementById('prompt-main')`)
  await evaluate('history.back()'); await until(`location.hash==='#questions'`)
  await evaluate('history.forward()'); await until(`location.hash==='#result'`)
  assert.equal(await evaluate(`document.getElementById('prompt-main').value`),'사용자가 직접 편집한 프롬프트')
  assert.equal(await evaluate('location.search'),'')
  results.push('Missing conditions stay within three, keyboard Tab reaches the first field, skip and browser back/forward preserve edits without URL text.')
  await click('#new-task'); assert.equal(await evaluate(`document.getElementById('request-text').value`),'')
  await click('#restore-task'); await until(`!!document.getElementById('prompt-main')`)
  assert.equal(await evaluate(`document.getElementById('prompt-main').value`),'사용자가 직접 편집한 프롬프트')
  results.push('New task can be undone by restoring the previous in-memory session.')
  await mkdir('.qa',{ recursive: true })
  for (const [name,width,height,scale] of [['desktop',1440,1000,1],['mobile',320,900,1],['zoom-equivalent',720,500,2]]) {
    await send('Emulation.setDeviceMetricsOverride',{ width,height,deviceScaleFactor: scale,mobile:false })
    await evaluate('window.scrollTo(0,0)')
    assert.equal(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),true,name+' must not overflow horizontally')
    if (name==='mobile') assert.equal(await evaluate(`getComputedStyle(document.querySelector('.result-layout')).flexDirection`),'column')
    const screenshot = await send('Page.captureScreenshot',{ format:'png',captureBeyondViewport: false })
    await writeFile(`.qa/prompt-${name}.png`,Buffer.from(screenshot.data,'base64'))
  }
  results.push('Result controls fit 320px and the 720px viewport equivalent of a 1440px desktop at 200%; screenshots captured. Native browser zoom UI is not asserted.')
  await send('Emulation.setDeviceMetricsOverride',{ width:1440,height:1000,deviceScaleFactor:1,mobile:false })
  await click('#new-task'); await click('#example-0'); await click('#create-prompt')
  await until(`!!document.getElementById('prompt-main')`)
  assert.equal(await evaluate(`document.getElementById('copy-main').disabled`),true)
  await click('.primary-editor .missing-fields input')
  assert.equal(await evaluate(`document.getElementById('copy-main').disabled`),false)
  const clean = await send('Page.captureScreenshot',{ format: 'png', captureBeyondViewport: false })
  await writeFile('.qa/prompt-result-clean.png',Buffer.from(clean.data,'base64'))
  results.push('Missing source placeholders disable copy until the user explicitly acknowledges filling them later; a fresh result screenshot is captured.')
  await send('Page.reload',{ ignoreCache: true }); await until(`!!document.getElementById('request-text')`)
  assert.equal(await evaluate(`document.getElementById('request-text').value`),'')
  assert.equal(await evaluate('localStorage.length+sessionStorage.length'),0)
  await input('#request-text','새 작업을 작성해줘')
  assert.equal(await evaluate(`!!document.getElementById('request-text')`),true)
  results.push('Direct result-hash refresh safely returns to input; no source text is persisted in browser storage.')
  await input('#request-text','고객에게 정중한 환영 이메일을 3문장으로 써줘')
  await evaluate(`document.getElementById('request-text').focus()`)
  await tabTo('create-prompt'); await key('Enter','Enter',13)
  await until(`!!document.getElementById('prompt-main')`)
  await send('Browser.grantPermissions',{ origin: new URL(base).origin, permissions: ['clipboardReadWrite','clipboardSanitizedWrite'] })
  await tabTo('copy-main'); await key('Enter','Enter',13)
  await until(`document.querySelector('.primary-editor .copy-feedback').innerText.includes('클립보드에 복사')`)
  assert.deepEqual(runtimeErrors,[])
  results.push('Keyboard Tab/Enter completes request submission and prompt copy; no uncaught page exceptions observed.')
  await writeFile('.qa/prompt-browser-results.json',JSON.stringify({ base,results },null,2))
  results.forEach(result => process.stdout.write('PASS '+result+'\n'))
} finally {
  await new Promise(resolve => { if (ws.readyState === WebSocket.CLOSED) return resolve(); ws.addEventListener('close',resolve,{ once: true }); ws.close() })
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`)
}
