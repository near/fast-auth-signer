import {
  KeyPair,
} from '@near-js/crypto';
import { expect, test } from '@playwright/test';
import admin from 'firebase-admin';
import { sha256 } from 'js-sha256';
// import serviceAccount from '../../pagoda-oboarding-dev-firebase-adminsdk-bygsj-f4275171e2.json';

import { CLAIM, getUserCredentialsFrpSignature } from 'near-fast-auth-signer/src/utils/mpc-service';

import { generateRandomString } from '../utils';

test('device page flow', async ({ page }) => {
  // await page.exposeFunction('myMock', () => console.log('This function runs on the node side'));
  // await page.evaluate(() => {
  //   window.myVar = myMock();
  // });

  await page.goto('http://localhost:3030/');

  const walletSelector = page.locator('#ws-loaded');
  await walletSelector.waitFor();

  const id = `testaccount${generateRandomString(10).toLocaleLowerCase()}`;
  const accountId = `${id}.testnet`;
  const testEmail = `${id}@gmail.com`;
  const testPassword = generateRandomString(10);

  const serviceAccount = require('../../pagoda-oboarding-dev-firebase-adminsdk-bygsj-f4275171e2.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  await admin.auth().createUser({
    email:         testEmail,
    emailVerified: true,
    password:      testPassword,
    displayName:   accountId,
  });

  const firebaseTestnetApiKey = 'AIzaSyDAh6lSSkEbpRekkGYdDM5jazV6IQnIZFU';
  const tokenPayload = {
    email: testEmail,
    password: testPassword,
    returnSecureToken: true,
  };
  const tokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseTestnetApiKey}`, {
    method:  'POST',
    mode:    'cors' as const,
    body:    JSON.stringify(tokenPayload),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });

  expect(tokenResponse.ok).toBe(true);
  const tokenResponseJson = await tokenResponse.json();

  // @ts-ignore
  const customToken = tokenResponseJson.idToken;
  // TODO: randomize these

  const accessToken = customToken;
  const odicKeyPair = KeyPair.fromRandom('ED25519');
  const fakKeyPair1 = KeyPair.fromRandom('ED25519');
  const fakKeyPair2 = KeyPair.fromRandom('ED25519');
  const fakKeyPair3 = KeyPair.fromRandom('ED25519');

  const signature = getUserCredentialsFrpSignature({
    salt:            CLAIM + 0,
    oidcToken:       accessToken,
    shouldHashToken: true,
    keypair:         odicKeyPair,
  });

  const claimOidcData = {
    oidc_token_hash: sha256(accessToken),
    frp_signature:   signature,
    frp_public_key:  odicKeyPair.getPublicKey().toString(),
  };

  const claimOidcResponse = await fetch('https://mpc-recovery-leader-testnet.api.pagoda.co/claim_oidc', {
    method:  'POST',
    mode:    'cors' as const,
    body:    JSON.stringify(claimOidcData),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
  console.log('claimOidcResponse', claimOidcResponse);
  expect(claimOidcResponse.ok).toBe(true);

  const userCredentialsFrpSignature = getUserCredentialsFrpSignature({
    salt:            CLAIM + 2,
    oidcToken:       accessToken,
    shouldHashToken: false,
    keypair:         odicKeyPair,
  });
  console.log('accountId', accountId);
  console.log('fakKeyPair1.getPublicKey().toString()', fakKeyPair1.getPublicKey().toString());

  const data = {
    near_account_id:        accountId,
    create_account_options: {
      full_access_keys:    [
        fakKeyPair1.getPublicKey().toString(),
        fakKeyPair2.getPublicKey().toString(),
        fakKeyPair3.getPublicKey().toString()
      ],
    },
    oidc_token:                     accessToken,
    user_credentials_frp_signature: userCredentialsFrpSignature,
    frp_public_key:                 odicKeyPair.getPublicKey().toString(),
  };

  const options = {
    method:  'POST',
    mode:    'cors' as const,
    body:    JSON.stringify(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  };

  const createAccountResponse = await fetch('https://mpc-recovery-leader-testnet.api.pagoda.co/new_account', options);
  console.log('createAccountResponse', createAccountResponse);
  expect(createAccountResponse.ok).toBe(true);

  await page.getByTestId('signIn').click();

  await expect(page).toHaveURL(/http:\/\/localhost:3000\/add-device/);
  // fill data

  // NOW attempt to create a test

  // 1. visit sign page
  // 2.

  // walletSelector
  //   // @ts-ignore
  //   .wallet('fast-auth-wallet')
  //   .then((fastAuthWallet: any) => fastAuthWallet.signIn({
  //     accountId:  'test',
  //     isRecovery: true,
  //   }));
  // // @ts-ignore
  // console.log('walletSelector', walletSelector.store, walletSelector.options);
  // @ts-ignore

  // // Expect a title "to contain" a substring.
  // // await expect(page).toHaveTitle(/Fast Auth Test App/);

  // console.log('page', page);
  // // randomize string?

  // // @ts-ignore
  // const { fastAuthController } = window;
  // fastAuthController.setAccountId(accountId);

  // // create random keypair
  // const fakKeypair = KeyPair.fromRandom('ED25519');
  // // const odicKeyPair = KeyPair.fromRandom('ED25519');

  // await fastAuthController.setKey(fakKeypair);
  // await fastAuthController.claimOidcToken(accessToken);
  // const oidcKeypair = await fastAuthController.getKey(`oidc_keypair_${accessToken}`);
  // console.log('oidcKeypair', oidcKeypair);

  // // setup oidc keypair?

  // // create random access token

  // // run createNEARAccount function

  // console.log('res', res);

  // then attempt to sign in
});
