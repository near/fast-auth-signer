import { KeyPair } from 'near-api-js';

import PageManager from '../pages/PageManager';
import { test } from '../test-options';
import { getRandomEmailAndAccountId } from '../utils/email';
import { rerouteToCustomURL } from '../utils/url';

test.beforeEach(async ({ page, baseURL, relayerURL }) => {
  await page.goto(baseURL);

  // Overwrite relayer URLs to use local instance
  // Add line
  await rerouteToCustomURL(page, relayerURL, '/relay');
  await rerouteToCustomURL(page, relayerURL, '/send_meta_tx_async');
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
