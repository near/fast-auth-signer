import os from 'os';

import { defineConfig, devices } from '@playwright/test';

import { TestOptions } from './test-options';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
require('dotenv').config();

const numberOfWorkers = Math.max(1, os.cpus().length - 1);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<TestOptions>({
  testDir:        './tests',
  globalSetup:    require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  fullyParallel:  true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly:     !!process.env.CI,
  retries:        2,
  workers:        numberOfWorkers,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter:       'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use:            {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL:     'http://127.0.0.1:3001/',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
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
    // {
    //   name: 'webkit',
    //   use:  { ...devices['Desktop Safari'] },
    // },
    {
      name: 'Mobile Chrome',
      use:  { ...devices['Pixel 5'] },
    },
    // {
    //   name: 'Mobile Safari',
    //   use:  { ...devices['iPhone 12'] },
    // },
  ],

  /* Run your local dev serve`r` before starting the tests */
  webServer: [
    {
      command:             'cd ../near-fast-auth-signer && NETWORK_ID=testnet yarn run start:test',
      url:                 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command:             'yarn run start:hardhat',
      url:                 'http://127.0.0.1:8545',
      reuseExistingServer: !process.env.CI,
    },
    {
      command:             'yarn run start',
      url:                 'http://127.0.0.1:3001',
      reuseExistingServer: !process.env.CI,
    }
  ],
});
