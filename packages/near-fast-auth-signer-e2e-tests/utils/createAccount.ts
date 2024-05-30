import { randomUUID } from 'crypto';

import { expect, Page } from '@playwright/test';
import admin from 'firebase-admin';
import { sha256 } from 'js-sha256';
import {
  KeyPair,
} from 'near-api-js';
import { CLAIM, getUserCredentialsFrpSignature } from 'near-fast-auth-signer/src/utils/mpc-service';

import { overridePasskeyFunctions } from './passkeys';
import { serviceAccount } from './serviceAccount';
import PageManager from '../pages/PageManager';

const FIREBASE_API_KEY_TESTNET = 'AIzaSyDAh6lSSkEbpRekkGYdDM5jazV6IQnIZFU';

export const initializeAdmin = () => {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

  }, randomUUID());
};

export const deleteAccount = async (userUid: string) => {
  await admin.auth().deleteUser(userUid);
};

export const createAccount = async ({
  email, accountId, keypairs, oidcKeyPair
}: { email: string, accountId: string, keypairs: KeyPair[], oidcKeyPair: KeyPair}) => {
  const testPassword = 'z#CNZKa5Cwkp';

  const testUserRecord = await admin.auth().createUser({
    email,
    emailVerified: true,
    password:      testPassword,
    displayName:   accountId,
  });

  const tokenPayload = {
    email,
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
  const signature = getUserCredentialsFrpSignature({
    salt:            CLAIM + 0,
    oidcToken:       accessToken,
    shouldHashToken: true,
    keypair:         oidcKeyPair,
  });

  const claimOidcData = {
    oidc_token_hash: sha256(accessToken),
    frp_signature:   signature,
    frp_public_key:  oidcKeyPair.getPublicKey().toString(),
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
    keypair:         oidcKeyPair,
  });

  const data = {
    near_account_id:        `${accountId}.testnet`,
    create_account_options: {
      full_access_keys:    keypairs.map((keypair) => keypair.getPublicKey().toString()),
    },
    oidc_token:                     accessToken,
    user_credentials_frp_signature: userCredentialsFrpSignature,
    frp_public_key:                 oidcKeyPair.getPublicKey().toString(),
  };

  const options = {
    method:  'POST',
    mode:    'cors' as const,
    body:    JSON.stringify(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  };

  const createAccountResponse = await fetch('https://mpc-recovery-leader-testnet.api.pagoda.co/new_account', options);
  return {
    createAccountResponse,
    userUid: testUserRecord.uid
  };
};

export const generateKeyPairs = (count:number) => Array.from({ length: count }, () => Object.freeze(KeyPair.fromRandom('ED25519')));

export const isServiceAccountAvailable = () => {
  if (
    !serviceAccount.private_key_id
    || !serviceAccount.private_key
    || !serviceAccount.client_email
    || !serviceAccount.client_id
    || !serviceAccount.client_x509_cert_url
  ) {
    return false;
  }
  return true;
};

export const createAccountAndLandDevicePage = async ({
  page,
  pm,
  email,
  accountId,
  testUserUidList,
}: {
  page: Page;
  pm: PageManager;
  email: string;
  accountId: string;
  testUserUidList: string[];
}) => {
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
  // eslint-disable-next-line no-unused-vars
  testUserUidList.push(userUid);

  expect(createAccountResponse.ok).toBe(true);

  await overridePasskeyFunctions(page, {
    creationKeypair:  oidcKeyPair,
    retrievalKeypair: oidcKeyPair
  });

  await pm.getLoginPage().signInWithEmail(email);
  await pm.getEmailPage().hasLoaded();

  await pm.getAuthCallBackPage().handleEmail(email, [], {
    creationKeypair:  oidcKeyPair,
    retrievalKeypair: oidcKeyPair,
  });
};
