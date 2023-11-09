/* eslint-disable import/no-extraneous-dependencies */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

import { network } from './config';

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
