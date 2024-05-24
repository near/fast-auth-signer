import {
  KeyPair,
} from '@near-js/crypto';
import { expect } from '@playwright/test';
import admin from 'firebase-admin';
import { sha256 } from 'js-sha256';
import { CLAIM, getUserCredentialsFrpSignature } from 'near-fast-auth-signer/src/utils/mpc-service';

import { serviceAccount } from './serviceAccount';

const FIREBASE_API_KEY_TESTNET = 'AIzaSyDAh6lSSkEbpRekkGYdDM5jazV6IQnIZFU';

export const initializeAdmin = () => {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
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
