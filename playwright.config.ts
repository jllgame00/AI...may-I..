import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173/AI...may-I../'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/archive/**', '**/src/**', '**/*.test.*'],
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  outputDir: '.qa/playwright-results',
  reporter: [
    ['list'],
    ['json', { outputFile: '.qa/provider-product-playwright.json' }],
  ],
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'chromium-mobile', use: { viewport: { width: 320, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
