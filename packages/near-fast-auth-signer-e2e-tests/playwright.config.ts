import { defineConfig, devices } from '@playwright/test';

import { TestOptions } from './test-options';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<TestOptions>({
  testDir:       './tests',
  /* Run tests in files in parallel */
  // Can't run in parallel due to e-mail issues. Tests will have conflicts on fetching the last e-mails
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly:    !!process.env.CI,
  /* Retry on CI only */
  retries:       process.env.CI ? 2 : 2,
  /* Opt out of parallel tests on CI. */
  workers:       6,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter:      'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use:           {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL:    'http://127.0.0.1:3001/',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use:  { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use:  { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev serve`r` before starting the tests */
  webServer: [{
    command:             'cd ../near-fast-auth-signer && NETWORK_ID=testnet yarn run start:test',
    url:                 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  {
    command:             'yarn run start',
    url:                 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
  }
  ],
});
