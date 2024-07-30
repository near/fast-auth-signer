import { KeyPair } from 'near-api-js';

import PageManager from '../pages/PageManager';
import { test } from '../test-options';
import { getRandomEmailAndAccountId } from '../utils/email';
import { initializeAdmin } from '../utils/firebase';
import { overridePasskeyFunctions } from '../utils/passkeys';
import { rerouteToCustomURL } from '../utils/url';

test.beforeAll(async () => {
  initializeAdmin();
});

test.beforeEach(async ({ page, baseURL, relayerURL }) => {
  await page.goto(baseURL);

  // Overwrite relayer URLs to use local instance
  if (relayerURL) {
    await rerouteToCustomURL(page, relayerURL, '/relay');
    await rerouteToCustomURL(page, relayerURL, '/send_meta_tx_async');
  }
});

test('should create account and login with e-mail', async ({ page }) => {
  const pm = new PageManager(page);
  test.setTimeout(120000);
  const readUIDLs = [];
  const { email, accountId } = getRandomEmailAndAccountId();
  await overridePasskeyFunctions(page, {
    creationKeypair:  KeyPair.fromRandom('ED25519'),
    retrievalKeypair: KeyPair.fromRandom('ED25519'),
  });
  await pm.getCreateAccountPage().createAccount(email, accountId);
  await pm.getEmailPage().hasLoaded();

  const emailId = await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, false);

  readUIDLs.push(emailId);

  await pm.getAppPage().signOut();

  await overridePasskeyFunctions(page, {
    creationKeypair:  KeyPair.fromRandom('ED25519'),
    retrievalKeypair: KeyPair.fromRandom('ED25519'),
  });
  await pm.getLoginPage().signInWithEmail(email);
  await pm.getEmailPage().hasLoaded();

  await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, true);

  await pm.getAppPage().isLoggedIn();
});

test('should create account and login with passkeys', async ({ page }) => {
  test.setTimeout(120000);
  const readUIDLs = [];
  const { email, accountId } = getRandomEmailAndAccountId();

  const pm = new PageManager(page);
  const keyPair = KeyPair.fromRandom('ED25519');
  await overridePasskeyFunctions(page, {
    creationKeypair:  keyPair,
    retrievalKeypair: keyPair,
  });
  await pm.getCreateAccountPage().createAccount(email, accountId);
  await pm.getEmailPage().hasLoaded();

  const emailId = await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, false);

  readUIDLs.push(emailId);

  await pm.getAppPage().signOut();

  await pm.getLoginPage().signInWithKeyPair(keyPair, keyPair, {
    shouldClickContinue: false
  });

  await pm.getAppPage().isLoggedIn();
});

test('should create account if logged in with an unregistered account details ', async ({ page }) => {
  const pm = new PageManager(page);
  test.setTimeout(240000);
  const readUIDLs = [];
  const { email } = getRandomEmailAndAccountId();

  await overridePasskeyFunctions(page, {
    creationKeypair:  KeyPair.fromRandom('ED25519'),
    retrievalKeypair: KeyPair.fromRandom('ED25519'),
  });
  await pm.getLoginPage().signInWithEmail(email);
  await pm.getEmailPage().hasLoaded();

  await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, true);
  await pm.getAuthCallBackPage().handleInPageAccountCreation(email);
  await pm.getAppPage().isLoggedIn();
});
