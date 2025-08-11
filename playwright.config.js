// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration
 */
module.exports = defineConfig({
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'https://fulfillment-staging.merchize.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  reporter: [ ['html', { open: 'never' }], ['list'] ],
});


