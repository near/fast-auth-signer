import { test } from '@playwright/test';
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

  await pm.getAppPage().isNotLoggedIn();

  await pm.getCreateAccountPage().createAccount(email, accountId);

  const emailId = await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, {
    isPassKeyAvailable:  true,
    keyPairForCreation:  KeyPair.fromRandom('ED25519'),
    keyPairForRetrieval: KeyPair.fromRandom('ED25519')
  });

  readUIDLs.push(emailId);

  await pm.getAppPage().signOut();

  await pm.getLoginPage().signInWithEmail(email);
  await pm.getEmailPage().hasLoaded();

  await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, {
    isPassKeyAvailable:  true,
    keyPairForCreation:  KeyPair.fromRandom('ED25519'),
    keyPairForRetrieval: KeyPair.fromRandom('ED25519')
  });

  await pm.getAppPage().isLoggedIn();
});

test('should create account and login with passkeys', async ({ page }) => {
  test.slow();
  const readUIDLs = [];
  const { email, accountId } = getRandomEmailAndAccountId();
  const pm = new PageManager(page);
  const keyPair = KeyPair.fromRandom('ED25519');

  await pm.getAppPage().isNotLoggedIn();

  await pm.getCreateAccountPage().createAccount(email, accountId);

  const emailId = await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, {
    isPassKeyAvailable:  true,
    keyPairForCreation:  keyPair,
    keyPairForRetrieval: keyPair
  });

  readUIDLs.push(emailId);

  await pm.getAppPage().signOut();

  await pm.getLoginPage().signInWithKeyPair(keyPair, keyPair, {
    shouldClickContinue: false
  });

  await pm.getAppPage().isLoggedIn();
});

// test('should not be able to login without account', async ({ page }) => {
//   test.slow();

//   await page.goto('http://localhost:3002/');
// });
