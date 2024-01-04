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

export const getDomain = (url) => {
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch {
    return false;
  }
  return urlObj.hostname.replace('www.', '');
};

/**
 * This function handles the creation of a new account.
 * It takes an object as a parameter, which includes accountId, email, success_url, failure_url, public_key, contract_id, and methodNames.
 * It creates a new URLSearchParams object with these parameters and sends a sign-in link to the provided email.
 * The function also stores the email in the local storage for sign-in purposes.
 * It returns an object with the accountId.
 *
 * @param {Object} params - The parameters for creating a new account.
 * @param {string} params.accountId - The account ID.
 * @param {string} params.email - The email address.
 * @param {string} params.success_url - The URL to redirect to upon successful account creation.
 * @param {string} params.failure_url - The URL to redirect to upon failure of account creation.
 * @param {string} params.public_key - The public key.
 * @param {string} params.contract_id - The contract ID.
 * @param {string} params.methodNames - The method names.
 * @returns {Object} Returns an object with the accountId.
 */
export const sendFirebaseInviteEmail = async ({
  accountId, email, success_url, failure_url, public_key, contract_id, methodNames
}: {
  accountId: string;
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
