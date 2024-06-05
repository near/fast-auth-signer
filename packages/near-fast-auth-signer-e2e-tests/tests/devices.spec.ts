import { expect, test } from '@playwright/test';

import PageManager from '../pages/PageManager';
import { TIMEOUT } from '../utils/constants';
import { getRandomEmailAndAccountId } from '../utils/email';
import {
  createAccountAndLandDevicePage, initializeAdmin,
  isServiceAccountAvailable
} from '../utils/firebase';

test.beforeAll(async () => {
  initializeAdmin();
});

test('device page delete existing keys and continue sign in', async ({ page, baseURL }) => {
  test.skip(!isServiceAccountAvailable(), 'Skipping test due to missing service account');

  const pm = new PageManager(page);
  test.setTimeout(120000);
  const { email, accountId } = getRandomEmailAndAccountId();

  await page.goto(baseURL);
  const walletSelector = page.locator('#ws-loaded');
  await expect(walletSelector).toBeVisible();

  await createAccountAndLandDevicePage({
    pm,
    email,
    accountId,
  });

  // Wait for page to render and execute async operations
  await pm.getDevicesPage().isCheckboxLoaded(5);

  // Select all existing keypairs (except recovery keypair) and delete them
  await pm.getDevicesPage().selectAndDelete(5);
  await pm.getAppPage().isLoggedIn();
});

test('device page delete one key and return to device page again', async ({ page, baseURL }) => {
  test.skip(!isServiceAccountAvailable(), 'Skipping test due to missing service account');

  const pm = new PageManager(page);
  test.setTimeout(300000);
  const { email, accountId } = getRandomEmailAndAccountId();
  await page.goto(baseURL);
  const walletSelector = page.locator('#ws-loaded');
  await expect(walletSelector).toBeVisible();

  await createAccountAndLandDevicePage({
    pm,
    email,
    accountId,
  });

  await pm.getDevicesPage().isCheckboxLoaded(5);
  await pm.getDevicesPage().selectAndDelete(1);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('text="Delete key"', { state: 'visible', timeout: 60000 });
  await pm.getDevicesPage().isCheckboxLoaded(4);
  await pm.getDevicesPage().selectAndDelete(2);

  await pm.getAppPage().isLoggedIn();
});
