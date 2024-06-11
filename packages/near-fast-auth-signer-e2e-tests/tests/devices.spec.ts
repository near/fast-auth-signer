import { expect, test } from '@playwright/test';

import PageManager from '../pages/PageManager';
import { getRandomEmailAndAccountId } from '../utils/email';
import {
  createAccountAndLandDevicePage, initializeAdmin,
  isServiceAccountAvailable
} from '../utils/firebase';
import { isWalletSelectorLoaded } from '../utils/walletSelector';

test.beforeAll(async () => {
  initializeAdmin();
});

test('device page delete existing keys and continue sign in', async ({ page, baseURL }) => {
  test.skip(!isServiceAccountAvailable(), 'Skipping test due to missing service account');

  const pm = new PageManager(page);
  test.setTimeout(120000);
  const { email, accountId } = getRandomEmailAndAccountId();

  await page.goto(baseURL);
  await isWalletSelectorLoaded(page);

  await createAccountAndLandDevicePage({
    pm,
    email,
    accountId,
    numberOfKeyPairs: 5,
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
  await isWalletSelectorLoaded(page);

  await createAccountAndLandDevicePage({
    pm,
    email,
    accountId,
    numberOfKeyPairs: 6,
  });

  await pm.getDevicesPage().isCheckboxLoaded(6);
  await pm.getDevicesPage().selectAndDelete(1);
  // Wait for the button label to change back to "Delete Key"
  await expect(page.getByTestId('devices-delete-key')).toHaveText('Deleting...');

  await page.waitForFunction(
    ({ selector, expectedText }) => {
      const element = document.querySelector(selector);
      return element && element.textContent === expectedText;
    },
    { selector: 'button[data-testid="devices-delete-key"]', expectedText: 'Delete key' }
  );
  await pm.getDevicesPage().isCheckboxLoaded(5);
  await pm.getDevicesPage().selectAndDelete(3);

  await pm.getAppPage().isLoggedIn();
});
