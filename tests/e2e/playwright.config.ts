import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Playwright configuration for Aphiria.com smoke tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './specs',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* NO global retries - retries handled by assertPageOk() helper only */
  retries: 0,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list']
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.SITE_BASE_URL,

    /* Collect trace only on failure to reduce artifact size */
    trace: 'retain-on-failure',

    /* Screenshot only on failure */
    screenshot: 'only-on-failure',

    /* Ignore HTTPS errors for local development with self-signed certificates */
    ignoreHTTPSErrors: process.env.APP_ENV === 'local',

    /* Maximum time each action can take */
    actionTimeout: 30000,
  },

  /* Configure projects for different browsers if needed */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Test timeout */
  timeout: 30000,
});
