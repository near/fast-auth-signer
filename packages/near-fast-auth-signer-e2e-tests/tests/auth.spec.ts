import { KeyPair } from 'near-api-js';

import PageManager from '../pages/PageManager';
import { test } from '../test-options';
import { getRandomEmailAndAccountId } from '../utils/email';
import { addAccountToBeDeleted, initializeAdmin } from '../utils/firebase';
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
  test.slow();
  const readUIDLs = [];
  const { email, accountId } = getRandomEmailAndAccountId();

  await pm.getCreateAccountPage().createAccount(email, accountId);
  await pm.getEmailPage().hasLoaded();

  const emailId = await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, false, {
    creationKeypair:  KeyPair.fromRandom('ED25519'),
    retrievalKeypair: KeyPair.fromRandom('ED25519'),
  });

  readUIDLs.push(emailId);
  await addAccountToBeDeleted({ type: 'email', email });

  await pm.getAppPage().signOut();

  await pm.getLoginPage().signInWithEmail(email);
  await pm.getEmailPage().hasLoaded();

  await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, true, {
    creationKeypair:  KeyPair.fromRandom('ED25519'),
    retrievalKeypair: KeyPair.fromRandom('ED25519'),
  });

  await pm.getAppPage().isLoggedIn();
});

test('should create account and login with passkeys', async ({ page }) => {
  test.slow();
  const readUIDLs = [];
  const { email, accountId } = getRandomEmailAndAccountId();

  const pm = new PageManager(page);
  const keyPair = KeyPair.fromRandom('ED25519');

  await pm.getCreateAccountPage().createAccount(email, accountId);
  await pm.getEmailPage().hasLoaded();

  const emailId = await pm.getAuthCallBackPage().handleEmail(email, readUIDLs, false, {
    creationKeypair:  keyPair,
    retrievalKeypair: keyPair,
  });

  readUIDLs.push(emailId);
  await addAccountToBeDeleted({ type: 'email', email });

  await pm.getAppPage().signOut();

  await pm.getLoginPage().signInWithKeyPair(keyPair, keyPair, {
    shouldClickContinue: false
  });

  await pm.getAppPage().isLoggedIn();
});
