/* eslint-disable import/no-extraneous-dependencies */
import { initializeApp } from 'firebase/app';
import { getAuth, sendSignInLinkToEmail } from 'firebase/auth';

import { basePath, network } from './config';

// Initialize Firebase
export const firebaseApp = initializeApp(network.fastAuth.firebase);
export const firebaseAuth = getAuth(firebaseApp);

export const checkFirestoreReady = async () => firebaseAuth.authStateReady()
  .then(async () => {
    if (firebaseAuth.currentUser) {
      return true;
    }
    return false;
  });

export const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return false;
  }
};

export const sendFirebaseSignInEmail = async ({
  accountId, email, success_url, failure_url, public_key, contract_id, methodNames
}: {
  accountId?: string;
  email: string;
  success_url: string;
  failure_url: string;
  public_key: string;
  contract_id: string;
  methodNames: string;
}) => {
  const searchParams = new URLSearchParams({
    ...(accountId ? { accountId } : {}),
    ...(success_url ? { success_url } : {}),
    ...(failure_url ? { failure_url } : {}),
    ...(public_key ? { public_key_lak: public_key } : {}),
    ...(contract_id ? { contract_id } : {}),
    ...(methodNames ? { methodNames } : {})
  });

  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: encodeURI(
      `${window.location.origin}${basePath ? `/${basePath}` : ''}/auth-callback?${searchParams.toString()}`,
    ),
    handleCodeInApp: true,
  });

  window.localStorage.setItem('emailForSignIn', email);
};
