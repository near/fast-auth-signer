/* eslint-disable import/prefer-default-export */
import { getKeys, isPassKeyAvailable } from '@near-js/biometric-ed25519/lib';
import { KeyPairEd25519 } from '@near-js/crypto';
import { captureException } from '@sentry/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom/dist';

import FastAuthController from './controller';
import { fetchAccountIds } from '../api';
import { redirectWithError, safeGetLocalStorage } from '../utils';
import { networkId } from '../utils/config';
import { checkFirestoreReady, firebaseAuth } from '../utils/firebase';

type AuthState = 'loading' | boolean | Error

export const getAuthState = async (email: string, skipGetKeys = false): Promise<AuthState> => {
  const controllerState = await window.fastAuthController.isSignedIn();
  const isFirestoreReady = await checkFirestoreReady();
  const isPasskeySupported = await isPassKeyAvailable();

  const webauthnUsername = safeGetLocalStorage('webauthn_username');
  if (webauthnUsername === undefined || webauthnUsername === null) {
    return new Error('Please allow third party cookies');
  }

  if (skipGetKeys) {
    return false;
  } if (controllerState === true) {
    return true;
  } if (isPasskeySupported && (!webauthnUsername || (email && email !== webauthnUsername))) {
    return false;
  } if (isPasskeySupported) {
    try {
      const keypairs = await getKeys(webauthnUsername);
      const accounts = await Promise.allSettled(
        keypairs.map(async (k) => {
          const accIds = await fetchAccountIds(k.getPublicKey().toString());
          return accIds.map((accId) => { return { accId, keyPair: k }; });
        })
      );

      const accountsList = accounts
        .flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

      if (accountsList.length === 0) {
        return false;
      }

      window.fastAuthController = new FastAuthController({
        accountId: accountsList[0].accId,
        networkId
      });

      await window.fastAuthController.setKey(new KeyPairEd25519(accountsList[0].keyPair.toString().split(':')[1]));
      return true;
    } catch {
      return false;
    }
  } else if (isFirestoreReady) {
    const oidcToken = await firebaseAuth.currentUser.getIdToken();
    const localStoreKey = await window.fastAuthController.getLocalStoreKey(`oidc_keypair_${oidcToken}`);
    if (localStoreKey) {
      const recoveryPK = await window.fastAuthController.getUserCredential(oidcToken);
      const accountIds = await fetchAccountIds(recoveryPK);
      (window as any).fastAuthController = new FastAuthController({
        accountId: accountIds[0],
        networkId
      });
      return true;
    }
    return false;
  }

  return false;
};

export const useAuthState = (skipGetKeys = false): {authenticated: AuthState} => {
  const [authenticated, setAuthenticated] = useState<AuthState>('loading');
  const [query] = useSearchParams();
  const email = query.get('email');
  const successUrl = query.get('success_url');
  const failureUrl = query.get('failure_url');

  useEffect(() => {
    const handleAuthState = async () => {
      try {
        if (!email) {
          throw new Error('Email is required');
        }

        setAuthenticated(await getAuthState(email, skipGetKeys));
      } catch (e) {
        captureException(e);
        redirectWithError({
          failure_url: failureUrl,
          success_url: successUrl,
          error:       e.message,
        });
      }
    };

    handleAuthState();
  }, [email, failureUrl, skipGetKeys, successUrl]);

  return { authenticated };
};
