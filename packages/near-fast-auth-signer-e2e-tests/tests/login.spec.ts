import { expect, test } from '@playwright/test';
import { KeyPair } from 'near-api-js';

import PageManager from '../pages/PageManager';
import { getRandomEmailAndAccountId } from '../utils/email';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
});

test('should create account and login with e-mail', async ({ page }) => {
  const pm = new PageManager(page);
  test.slow();
  const readUIDLs = [];
  const { email, accountId } = getRandomEmailAndAccountId();

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await pm.getCreateAccountPage().createAccount(email, accountId);

  const emailId = await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, {
    isPassKeyAvailable:  true,
    keyPairForCreation:  KeyPair.fromRandom('ED25519'),
    keyPairForRetrieval: KeyPair.fromRandom('ED25519')
  });

  readUIDLs.push(emailId);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await pm.getLoginPage().signInWithEmail(email);

  await pm.getEmailPage().hasLoaded();

  await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, {
    isPassKeyAvailable:  true,
    keyPairForCreation:  KeyPair.fromRandom('ED25519'),
    keyPairForRetrieval: KeyPair.fromRandom('ED25519')
  });

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });
});

test('should login with passkeys', async ({ page }) => {
  test.slow();
  const readUIDLs = [];
  const { email, accountId } = getRandomEmailAndAccountId();
  const pm = new PageManager(page);
  const keyPair = KeyPair.fromRandom('ED25519');

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await pm.getCreateAccountPage().createAccount(email, accountId);

  const emailId = await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, {
    isPassKeyAvailable:  true,
    keyPairForCreation:  keyPair,
    keyPairForRetrieval: keyPair
  });

  readUIDLs.push(emailId);

  await page.getByRole('button', { name: 'Sign Out' }).click();

  await pm.getLoginPage().signInWithKeyPair(keyPair, keyPair, {
    shouldClickContinue: false
  });

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });
});

test('should login with passkey', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');
});

test('should not be able to login without account', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');
});
