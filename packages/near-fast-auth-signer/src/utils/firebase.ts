/* eslint-disable import/no-extraneous-dependencies */
import { initializeApp } from 'firebase/app';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';

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

/**
 * Checks if a user exists in the Firebase authentication system.
 * @param {string} email - The email of the user to check.
 * @returns {Promise<boolean>} - A promise that resolves to true if the user exists, false otherwise.
 */
export const userExists = async (email: string): Promise<boolean> => {
  const signInMethods = await fetchSignInMethodsForEmail(firebaseAuth, email);
  return signInMethods.length > 0;
};
