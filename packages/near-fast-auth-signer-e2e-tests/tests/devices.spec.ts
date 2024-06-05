import { expect, test } from '@playwright/test';

import PageManager from '../pages/PageManager';
import { TIMEOUT } from '../utils/constants';
import { getRandomEmailAndAccountId } from '../utils/email';
import {
  createAccountAndLandDevicePage, deleteAccount, initializeAdmin,
  isServiceAccountAvailable
} from '../utils/firebase';

const deviceTestEmailList: string[] = [];

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
    testUserUidList: deviceTestEmailList,
  });

  // Wait for page to render and execute async operations
  await pm.getDevicesPage().isCheckboxLoaded(5);

  // Select all existing keypairs (except recovery keypair) and delete them
  await pm.getDevicesPage().selectAndDelete(5);
  await pm.getAppPage().isLoggedIn();
});

test.only('device page delete one key and return to device page again', async ({ page, baseURL }) => {
  test.skip(!isServiceAccountAvailable(), 'Skipping test due to missing service account');

  const pm = new PageManager(page);
  test.setTimeout(300000);
  const { email, accountId } = getRandomEmailAndAccountId();
  console.log('testing email:', email);
  await page.goto(baseURL);
  const walletSelector = page.locator('#ws-loaded');
  await expect(walletSelector).toBeVisible();

  await createAccountAndLandDevicePage({
    pm,
    email,
    accountId,
    testUserUidList: deviceTestEmailList,
  });

  await pm.getDevicesPage().isCheckboxLoaded(5);
  await pm.getDevicesPage().selectAndDelete(1);
  await expect(page.getByRole('button', { name: 'Signing In...' })).toBeVisible({ timeout: TIMEOUT });
  await expect(page.getByRole('button', { name: 'Signing In...' })).not.toBeVisible({ timeout: TIMEOUT });
  await pm.getDevicesPage().isCheckboxLoaded(4);
  await pm.getDevicesPage().selectAndDelete(2);

  await pm.getAppPage().isLoggedIn();
});

test.afterAll(async () => {
  // Delete test user acc
  if (isServiceAccountAvailable()) {
    // eslint-disable-next-line no-return-await
    await Promise.all(deviceTestEmailList.map(async (uid) => await deleteAccount(uid)));
  }
});
