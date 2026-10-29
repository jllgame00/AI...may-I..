import { expect, test } from '@playwright/test'

// The original eight library-runner scenarios, registered once per viewport.
const scenarios = [
  ['survey', '설문 문항을 작성해줘'],
  ['xlsx', '기존 XLSX 설문 결과를 분석해줘'],
  ['pdf', 'PDF 논문을 분석해줘'],
  ['script', '5분 발표 대본을 작성해줘'],
  ['code', 'React 코드 오류를 수정해줘'],
  ['image', '포스터 이미지를 생성해줘'],
  ['free-image', '무료로 포스터 이미지를 생성해줘'],
  ['composite', '기존 XLSX 설문 결과를 분석하고 발표자료를 만들고 발표 대본을 작성해줘'],
] as const

const internalDetails = /벤치마크|제안 비중|\b(?:Plus|Pro|Standard)\b|JPY|USD|\bGPT-\d|Claude\s+(?:Opus|Sonnet|Haiku)|Gemini\s+\d|Grok\s+\d/i
const paidRoute = /이 추천 경로는 유료 이용 필요/

for (const [id, text] of scenarios) {
  test(`${id}: Provider comparison, stages, clipboard and draft preservation`, async ({ page }, testInfo) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    try {
      await page.goto('./')
      await page.locator('#request-text').fill(text)
      await page.locator('#create-prompt').click()
      await expect(page.locator('#finish-conditions')).toBeVisible()
      await expect(page.locator('#request-text')).toHaveValue(text)
      if (id === 'free-image') await expect(page.locator('#budget-mode')).toHaveValue('free')
      await page.locator('#finish-conditions').click()
      await expect(page.locator('#recommended-options')).toBeVisible()
      const main = page.locator('#recommended-options .candidate-card')

      if (id === 'free-image') {
        await expect(page.locator('#recommended-options')).not.toContainText(paidRoute)
        await page.locator('#back-to-conditions').click()
        await page.locator('#budget-mode').selectOption('paid-ok')
        await page.locator('#finish-conditions').click()
        await expect(page.locator('#recommended-options')).toContainText(paidRoute)
        await page.locator('#back-to-conditions').click()
        await page.locator('#budget-mode').selectOption('free')
        await page.locator('#finish-conditions').click()
        await expect(page.locator('#recommended-options')).not.toContainText(paidRoute)
      }

      const providerIds = await main.evaluateAll(cards => cards.map(card => card.getAttribute('data-provider-id')))
      expect(providerIds.length).toBeLessThanOrEqual(3)
      expect(new Set(providerIds).size).toBe(providerIds.length)
      await expect(page.locator('#needs-check-candidates')).toHaveJSProperty('open', false)
      await expect(page.locator('[data-model-id]')).toHaveCount(0)

      let card = main.first()
      if (!providerIds.length) {
        await page.locator('#needs-check-summary').click()
        card = page.locator('#needs-check-options .candidate-card').first()
      }
      await expect(card).toBeVisible()
      await expect(card).not.toContainText(internalDetails)
      if (id === 'free-image') await expect(card).not.toContainText(paidRoute)
      await card.locator('.provider-details > summary').click()
      await expect(card).toContainText('실제 사용 방법')
      await expect(card).not.toContainText(internalDetails)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath('comparison.png'), fullPage: true })

      await card.locator('button').first().click()
      const editor = page.locator('.primary-editor textarea')
      await expect(editor).toBeVisible()
      const options = await page.locator('#stage-candidate option:not([disabled])').allTextContents()
      expect(options.length).toBeGreaterThan(0)
      const companies = options.map(option => option.split(' · ')[0])
      expect(new Set(companies).size).toBe(companies.length)
      const stageIds = await page.locator('.stage-list button').evaluateAll(buttons => buttons.map(button => button.id))
      expect(stageIds.length).toBeGreaterThan(0)
      for (const stageId of stageIds) {
        await page.locator(`[id="${stageId}"]`).click()
        await expect(editor).toHaveValue(new RegExp(text))
      }

      const edited = '직접 편집한 요청\n  공백과 줄바꿈 유지'
      await editor.fill(edited)
      await page.getByRole('button', { name: '프롬프트 복사', exact: true }).click()
      await expect(page.getByText('클립보드에 복사했어요. 직접 붙여넣어 사용해 주세요.')).toBeVisible()
      expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(edited)
      await page.getByRole('button', { name: '초안 다시 만들기', exact: true }).click()
      await expect(editor).not.toHaveValue(edited)
      await page.getByRole('button', { name: '이전 초안 복구', exact: true }).click()
      await expect(editor).toHaveValue(edited)

      if (id === 'composite') {
        const current = await page.locator('#stage-candidate').inputValue()
        const choices = await page.locator('#stage-candidate option:not([disabled])').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))
        const other = choices.find(value => value !== current)
        expect(other, 'the composite workflow must offer another company').toBeDefined()
        await page.locator('#stage-candidate').selectOption(other!)
        await expect(editor).toHaveValue(edited)
        await expect(page.locator('#stage-candidate')).toHaveValue(other!)
      }

      await page.locator('#change-ai').click()
      await expect(page.locator('#recommended-options')).toBeVisible()
      await page.goBack()
      await expect(editor).toHaveValue(edited)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath('workspace.png'), fullPage: true })
      expect(pageErrors).toEqual([])
      expect(consoleErrors).toEqual([])
    } finally {
      await testInfo.attach('browser-errors', {
        body: JSON.stringify({ pageErrors, consoleErrors }),
        contentType: 'application/json',
      })
    }
  })
}
