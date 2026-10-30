import {expect,test,type Page} from '@playwright/test'

async function interpret(page:Page,text:string){
  await page.goto('./');await page.locator('#request-text').fill(text);await page.locator('#create-prompt').click()
  await expect(page.locator('#finish-conditions')).toBeVisible()
}
async function noOverflow(page:Page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
}
test('examples explain their purpose and fill the request without submitting',async({page},info)=>{
  await page.goto('./')
  await expect(page.getByRole('group',{name:'예시로 시작하기'})).toContainText('선택하면 입력창에 예시 요청이 채워져요.')
  for(const [id,content] of [[0,'대학생 120명'],[1,'React 장바구니'],[2,'독서 동아리']] as const){
    await page.locator(`#example-${id}`).click()
    await expect(page.locator('#request-text')).toHaveValue(new RegExp(content))
    await expect(page.locator('#finish-conditions')).toHaveCount(0)
    await expect(page.locator('#recommended-options')).toHaveCount(0)
  }
  await noOverflow(page);await page.screenshot({path:info.outputPath('examples.png'),fullPage:true})
})
test('budget intentions preserve explicit limits and support an undecided keyboard flow',async({page},info)=>{
  await interpret(page,'월 2만원 이하로 동아리 홍보 글을 작성해줘')
  await expect(page.locator('#budget-mode input:checked')).toHaveCount(0)
  await expect(page.locator('#budget-amount,#budget-currency,#budget-country')).toHaveCount(0)
  await expect(page.locator('#explicit-budget')).toContainText('20,000원')
  await page.locator('#budget-free').focus();await page.keyboard.press('Space')
  await expect(page.locator('#budget-free')).toBeChecked()
  await page.keyboard.press('ArrowRight');await expect(page.locator('#budget-prefer-free')).toBeChecked()
  await page.locator('#budget-paid-ok').check()
  await expect(page.locator('#explicit-budget')).toContainText('20,000원')
  await page.locator('#budget-undecided').click();await expect(page.locator('#budget-mode input:checked')).toHaveCount(0)
  await page.locator('#budget-prefer-free').check()
  await page.locator('#request-text').fill('월 1만원 이하로 동아리 홍보 글을 작성해줘')
  await expect(page.locator('#explicit-budget')).toContainText('10,000원')
  await expect(page.locator('#budget-prefer-free')).toBeChecked()
  await expect(page.locator('.feature-options')).toHaveJSProperty('open',false)
  for(const box of await page.locator('.choice-card').all())expect((await box.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await noOverflow(page);await page.screenshot({path:info.outputPath('budget-and-tasks.png'),fullPage:true})
  await page.locator('#finish-conditions').click()
  await expect(page.locator('#recommended-options')).toBeVisible()
  // KRW alone must not invent a Korean tax-inclusive paid price.
  await expect(page.locator('#recommended-options')).not.toContainText('이 추천 경로는 유료 이용 필요')
})
test('multiple task cards preserve manual choices through text and budget changes',async({page},info)=>{
  await interpret(page,'동아리 홍보 글을 작성해줘')
  await expect(page.locator('#task-writing')).toBeChecked()
  await page.locator('#task-image').focus();await page.keyboard.press('Space')
  await expect(page.locator('#task-image')).toBeChecked()
  await page.locator('#budget-prefer-free').check()
  await page.locator('#request-text').fill('코드 오류를 수정해줘')
  await expect(page.locator('#task-writing')).toBeChecked();await expect(page.locator('#task-image')).toBeChecked()
  await expect(page.locator('#task-coding')).not.toBeChecked()
  await page.locator('#task-writing').uncheck();await page.locator('#task-image').uncheck()
  await page.locator('#finish-conditions').click();await expect(page.getByRole('alert')).toContainText('작업을 선택')
  await page.locator('#task-image').check()
  await noOverflow(page);await page.screenshot({path:info.outputPath('manual-tasks.png'),fullPage:true})
  await page.locator('#finish-conditions').click();await expect(page.locator('#recommended-options')).toBeVisible()
  await expect(page.locator('#recommended-options')).toContainText('실제 이미지 생성')
})
test('service titles retain provider identity and edited drafts after a budget change',async({page},info)=>{
  await interpret(page,'동아리 신입생 모집 홍보 글을 작성해줘.')
  await page.locator('#finish-conditions').click()
  const card=page.locator('#recommended-options [data-provider-id="anthropic"]')
  await expect(card.getByRole('heading',{name:'Claude',exact:true})).toBeVisible()
  await expect(card.locator('.provider-attribution')).toHaveText('Anthropic 제공')
  await card.locator('button').first().click()
  await expect(page.locator('.selected-model .service-name')).toHaveText('Claude')
  await expect(page.locator('.selected-model .provider-attribution')).toHaveText('Anthropic 제공')
  const editor=page.locator('.primary-editor textarea'),draft='사용자가 직접 편집한 홍보 글 요청\n  줄바꿈 유지'
  await editor.fill(draft);await page.locator('#change-request').click()
  await page.locator('#budget-prefer-free').check();await page.locator('#finish-conditions').click()
  await page.locator('#recommended-options [data-provider-id="anthropic"] button').first().click()
  await expect(editor).toHaveValue(draft)
  await noOverflow(page);await page.screenshot({path:info.outputPath('service-and-draft.png'),fullPage:true})
})
for(const [id,text,service,deliverable] of [
  ['school-image','우리 학교를 배경으로 한 일러스트를 만들어줘.','Adobe Firefly','실제 이미지를 생성'],
  ['promotion','동아리 신입생 모집 홍보 글을 작성해줘.','Claude','실제로 배포할 홍보'],
  ['ppt','인공지능 윤리를 주제로 발표할 PPT 자료를 만들어줘.','Claude','pptx'],
] as const)test(`${id}: task, confirmed feature and final output stay aligned`,async({page},info)=>{
  await interpret(page,text)
  await expect(page.locator(`#task-${id==='school-image'?'image':id==='ppt'?'slides':'writing'}`)).toBeChecked()
  await page.locator('#finish-conditions').click()
  const main=page.locator('#recommended-options .candidate-card')
  expect(await main.count()).toBeGreaterThan(0)
  for(const card of await main.all()){
    await expect(card).toHaveAttribute('data-status','eligible')
    await expect(card).toContainText('필수 기능 사용 확인')
  }
  const ids=await main.evaluateAll(cards=>cards.map(c=>c.getAttribute('data-provider-id')))
  expect(new Set(ids).size).toBe(ids.length);expect(ids.length).toBeLessThanOrEqual(3)
  const chosen=main.filter({has:page.getByRole('heading',{name:service,exact:true})}).first()
  await expect(chosen).toBeVisible();await noOverflow(page)
  await page.screenshot({path:info.outputPath(`${id}-comparison.png`),fullPage:true})
  await chosen.locator('button').first().click()
  const editor=page.locator('.primary-editor textarea')
  if(id==='ppt'){
    await expect(page.locator('.stage-list button')).toHaveCount(1)
    const active=(await editor.inputValue()).split('현재 단계 실행 지시')[1]
    const output=active.match(/^최종 산출물:\s*(.+)$/m)?.[1]
    expect(output).toMatch(/PPTX.*\.pptx.*파일/i)
    expect(active).toMatch(/실제 파일을 생성한 뒤.*(?:첨부|다운로드)/)
    expect(active).toMatch(/생성하지 않은 파일.*가짜 다운로드 링크/)
    expect(active).not.toMatch(/앞 단계/)
    await page.screenshot({path:info.outputPath('ppt-file-workspace.png'),fullPage:true})
    // A supported text service must not inherit another provider's file support.
    await page.locator('#stage-candidate').selectOption('gemini-free')
    await expect(page.locator('.selected-model')).toContainText('필수 기능 사용 여부 추가 확인')
    await expect(page.locator('.draft-notice')).toBeVisible()
    await page.getByRole('button',{name:'초안 다시 만들기',exact:true}).click()
    const pending=(await editor.inputValue()).split('현재 단계 실행 지시')[1]
    expect(pending).toMatch(/최종 산출물:.*지원 확인/)
    expect(pending).toMatch(/지원 여부.*먼저.*확인/)
    expect(pending).not.toMatch(/최종 산출물: 다운로드 가능한/)
    for(const [text,output,body] of [
      ['인공지능 윤리 PPT 기획안만 작성해줘','발표 개요',/요청한 발표 개요/],
      ['인공지능 윤리 슬라이드별 내용만 텍스트로 작성해줘','슬라이드별 내용',/각 슬라이드에 넣을 내용을 완성/],
    ] as const){
      await page.locator('#change-request').click();await page.locator('#request-text').fill(text)
      await expect(page.locator('#task-writing')).toBeChecked();await expect(page.locator('#task-slides')).not.toBeChecked()
      await page.locator('#finish-conditions').click()
      await page.locator('#recommended-options [data-provider-id="anthropic"] button').first().click()
      const inline=(await editor.inputValue()).split('현재 단계 실행 지시')[1]
      expect(inline.match(/^최종 산출물:\s*(.+)$/m)?.[1]).toBe(output)
      expect(inline).toMatch(body)
      expect(inline).not.toMatch(/다운로드 가능한.*PPTX|앞 단계/)
      await expect(page.locator('.stage-list button')).toHaveCount(1)
    }
  }else await expect(editor).toHaveValue(new RegExp(deliverable))
  await expect(page.locator('.selected-model .service-name')).toHaveText(service)
  await noOverflow(page);await page.screenshot({path:info.outputPath(`${id}-workspace.png`),fullPage:true})
})
