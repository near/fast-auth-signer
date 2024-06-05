import { expect } from '@playwright/test';
import admin from 'firebase-admin';
import { sha256 } from 'js-sha256';
import {
  KeyPair,
} from 'near-api-js';
import { NewAccountResponse } from 'near-fast-auth-signer/src/api/types';
import { CLAIM, getUserCredentialsFrpSignature } from 'near-fast-auth-signer/src/utils/mpc-service';

import { serviceAccount } from './serviceAccount';
import PageManager from '../pages/PageManager';

const FIREBASE_API_KEY_TESTNET = 'AIzaSyDAh6lSSkEbpRekkGYdDM5jazV6IQnIZFU';

function getRandomWaitTime(min, max) {
  // Generate a random number between min and max (inclusive)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const performTaskWithRandomDelay = async () => {
  const randomWaitTime = getRandomWaitTime(1000, 5000);

  await new Promise((resolve) => { setTimeout(resolve, randomWaitTime); });
};

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

export const initializeAdmin = () => {
  if (isServiceAccountAvailable() && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
};

export const deleteAccount = async (userUid: string) => {
  if (userUid) {
    const user = await admin.auth().getUser(userUid);
    console.log('deleteAccount', user.uid, user.email);
    if (user.uid) {
      await admin.auth().deleteUser(userUid);
    }
  }
};

const addAccountPublicKeyToFirestore = async (accountId: string, publicKey: string) => {
  const docRef = admin.firestore().collection('publicKeys').doc(publicKey);

  await docRef.set({ accountId });
};

export const deleteUserByEmail = async (email: string) => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('deleteUserByEmail', user.uid, email);
    if (user && user.uid) {
      await deleteAccount(user.uid);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

export const createAccount = async ({
  email, accountId, FAKs, LAKs, oidcKeyPair
}: {
  email: string,
  accountId: string,
  FAKs: KeyPair[],
  LAKs: {
    public_key: string,
    receiver_id: string,
    allowance: string,
    method_names: string
  }[],
  oidcKeyPair: KeyPair
}) => {
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

  // create random delay on creating account, to avoid parallel requests to google endpoint
  await performTaskWithRandomDelay();

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
      full_access_keys:    FAKs.map((keypair) => keypair.getPublicKey().toString()),
      limited_access_keys: LAKs,
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
  const createAccountResponseJson: NewAccountResponse = await createAccountResponse.json();

  if (createAccountResponseJson.type === 'ok') {
    await Promise.all(createAccountResponseJson.create_account_options.full_access_keys
      .map((publicKey) => addAccountPublicKeyToFirestore(createAccountResponseJson.near_account_id, publicKey)));
    return {
      createAccountResponse: createAccountResponseJson,
      userUid:               testUserRecord.uid
    };
  }
  throw new Error(`Failed to create account: ${createAccountResponseJson.type}`);
};

export const generateKeyPairs = (count:number) => Array.from({ length: count }, () => Object.freeze(KeyPair.fromRandom('ED25519')));

export const createAccountAndLandDevicePage = async ({
  pm,
  email,
  accountId,
  testUserUidList,
}: {
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
    FAKs: keypairs,
    LAKs: []
  });

  // will be used to delete account
  testUserUidList.push(userUid);

  expect(createAccountResponse.type).toEqual('ok');

  await pm.getLoginPage().signInWithEmail(email);
  await pm.getEmailPage().hasLoaded();

  await pm.getAuthCallBackPage().handleEmail(email, [], true, {
    creationKeypair:   KeyPair.fromRandom('ED25519'),
    retrievalKeypair:  KeyPair.fromRandom('ED25519'),
  });
};
