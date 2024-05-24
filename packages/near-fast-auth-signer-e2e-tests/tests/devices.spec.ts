import {
  KeyPair,
} from '@near-js/crypto';
import { expect, test } from '@playwright/test';

import PageManager from '../pages/PageManager';
import {
  createAccount, deleteAccount, generateKeyPairs, initializeAdmin,
  isServiceAccountAvailable
} from '../utils/createAccount';
import { getRandomEmailAndAccountId } from '../utils/email';
import { setupPasskeysFunctions } from '../utils/passkeys';

let testUserUid: string;

test.beforeAll(async () => {
  if (isServiceAccountAvailable()) {
    initializeAdmin();
  }
});

test('device page delete existing keys and continue sign in', async ({ page, baseURL }) => {
  test.skip(!isServiceAccountAvailable(), 'Skipping test due to missing service account');

  const pm = new PageManager(page);
  test.setTimeout(120000);
  const { email, accountId } = getRandomEmailAndAccountId();

  await page.goto(baseURL);
  const walletSelector = page.locator('#ws-loaded');
  await expect(walletSelector).toBeVisible();

  const oidcKeyPair = KeyPair.fromRandom('ED25519');

  // As of 14 May 2024, creating an account with 5 keypairs will be just enough to redirected to devices page
  const keypairs = generateKeyPairs(5);
  const {
    createAccountResponse,
    userUid
  } = await createAccount({
    email,
    accountId,
    oidcKeyPair,
    keypairs,
  });

  // will be used to delete account
  testUserUid = userUid;

  expect(createAccountResponse.ok).toBe(true);

  await setupPasskeysFunctions(page, 'page', {
    isPassKeyAvailable:  true,
    keyPairForCreation:  oidcKeyPair,
    keyPairForRetrieval: oidcKeyPair,
    shouldCleanStorage:  false
  });

  await pm.getLoginPage().signInWithEmail(email);
  await pm.getEmailPage().hasLoaded();

  await pm.getAuthCallBackPage().handleEmail(email, [], {
    isPassKeyAvailable:  true,
    keyPairForCreation:  oidcKeyPair,
    keyPairForRetrieval: oidcKeyPair,
    shouldCleanStorage:  false
  });

  // Wait for page to render and execute async operations
  await pm.getDevicesPage().isCheckboxLoaded(5);

  // Select all existing keypairs (except recovery keypair) and delete them
  await pm.getDevicesPage().selectAndDelete(5);
  await pm.getAppPage().isLoggedIn();
});

test.afterAll(async () => {
  // Delete test user acc
  if (isServiceAccountAvailable()) {
    await deleteAccount(testUserUid);
  }
});
