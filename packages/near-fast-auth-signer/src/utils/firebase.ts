/* eslint-disable import/no-extraneous-dependencies */
import { initializeApp, FirebaseError } from 'firebase/app';
import { getAuth } from 'firebase/auth';

import { network } from './config';

const errorCodeMessageMap = {
  'auth/invalid-action-code': 'This link is malformed, expired or has already been used. Please request a new one.',
  // Add more error code-message mappings as needed
};

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

export const isFirebaseError = (error: Error) => error instanceof FirebaseError;

export const getFirebaseErrorMessage = (error: FirebaseError) => {
  const errorCode = error.code;

  return errorCodeMessageMap[errorCode] || 'An unknown error occurred. Please try again later.';
};
