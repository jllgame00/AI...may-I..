import { expect, test } from '@playwright/test'
import { suppliedServicePrompt } from '../fixtures/survey-request.ts'

for(const provider of ['openai','anthropic','google']) {
  test(`${provider}: complete survey prompt retains the requested output and exact clipboard`,async({page})=>{
    await page.goto('./')
    await page.locator('#request-text').fill(suppliedServicePrompt)
    await page.locator('#create-prompt').click()
    await page.locator('#finish-conditions').click()
    await expect(page.locator('#recommended-options')).toBeVisible()
    for(const selector of ['.remaining-models > summary','#needs-check-summary']){
      const summary=page.locator(selector)
      if(await summary.count())await summary.click()
    }
    const card=page.locator(`.candidate-card[data-provider-id="${provider}"]:not([data-status="excluded"])`).first()
    await expect(card).toBeVisible()
    await card.locator('button').first().click()
    const editor=page.locator('.primary-editor textarea')
    await expect(editor).toBeVisible()
    await expect(page.locator('.stage-list button')).toHaveCount(1)
    const generated=await editor.inputValue()
    expect(generated).toContain(suppliedServicePrompt)
    const active=generated.split('현재 단계 실행 지시')[1]
    expect(active).toContain('Q1부터 Q10')
    expect(active).toContain('객관식 7문항')
    expect(active).toContain('5점 척도 2문항')
    expect(active).toContain('주관식 1문항')
    expect(active).not.toMatch(/홍보.*작성해|대본.*작성해|핵심 메시지.*작성해/)
    await page.getByRole('button',{name:'프롬프트 복사',exact:true}).click()
    await expect(page.getByText('클립보드에 복사했어요. 직접 붙여넣어 사용해 주세요.')).toBeVisible()
    expect((await page.evaluate(()=>navigator.clipboard.readText())).replaceAll('\r\n','\n')).toBe(generated)
  })
}
