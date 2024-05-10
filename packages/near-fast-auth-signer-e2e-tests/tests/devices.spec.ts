import {
  KeyPair,
} from '@near-js/crypto';
import { expect, test } from '@playwright/test';
import admin from 'firebase-admin';
import { sha256 } from 'js-sha256';
import { CLAIM, getUserCredentialsFrpSignature } from 'near-fast-auth-signer/src/utils/mpc-service';

import { serviceAccount } from '../utils/serviceAccount';
import { generateRandomString } from '../utils/utils';

let testUserUid;
const FIREBASE_API_KEY_TESTNET = 'AIzaSyDAh6lSSkEbpRekkGYdDM5jazV6IQnIZFU';

test.beforeAll(async () => {
  if (!serviceAccount) {
    throw new Error('Fail to retrieve serviceAccount.js');
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
});

test('device page flow', async ({ page }) => {
  await page.goto('http://localhost:3030/');
  const walletSelector = page.locator('#ws-loaded');
  await walletSelector.waitFor();

  const id = `testaccount${generateRandomString(10).toLocaleLowerCase()}`;
  const accountId = `${id}.testnet`;
  const testEmail = `${id}@gmail.com`;
  const testPassword = generateRandomString(10);

  const testUserRecord = await admin.auth().createUser({
    email:         testEmail,
    emailVerified: true,
    password:      testPassword,
    displayName:   accountId,
  });

  testUserUid = testUserRecord.uid;
  console.log('testUserUid', testUserUid);
  console.log('accountId', accountId);

  const tokenPayload = {
    email:             testEmail,
    password:          testPassword,
    returnSecureToken: true,
  };
  const tokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY_TESTNET}`, {
    method:  'POST',
    mode:    'cors' as const,
    body:    JSON.stringify(tokenPayload),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });

  expect(tokenResponse.ok).toBe(true);
  const tokenResponseJson = await tokenResponse.json();

  const accessToken = tokenResponseJson.idToken;
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
  expect(claimOidcResponse.ok).toBe(true);

  const userCredentialsFrpSignature = getUserCredentialsFrpSignature({
    salt:            CLAIM + 2,
    oidcToken:       accessToken,
    shouldHashToken: false,
    keypair:         odicKeyPair,
  });

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
  expect(createAccountResponse.ok).toBe(true);

  // await page.getByTestId('signIn').click();
  // await expect(page).toHaveURL(/http:\/\/localhost:3000\/add-device/);
  // then attempt to sign in
});

test.afterAll(async () => {
  // Delete test user acc
  await admin.auth().deleteUser(testUserUid);
  console.log('deleted user');
});
