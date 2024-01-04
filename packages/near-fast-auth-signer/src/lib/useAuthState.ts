import { getKeys } from '@near-js/biometric-ed25519/lib';
import { KeyPairEd25519 } from '@near-js/crypto';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom/dist';

import FastAuthController from './controller';
import { fetchAccountIds } from '../api';
import { safeGetLocalStorage } from '../utils';
import { networkId } from '../utils/config';

type AuthState = 'loading' | boolean | Error

export const getAuthState = async (email: string, skipGetKeys = false): Promise<AuthState> => {
  const controllerState = await window.fastAuthController.isSignedIn();
  const webauthnUsername = safeGetLocalStorage('webauthn_username');

  if (webauthnUsername === undefined) {
    return new Error('Please allow third party cookies');
  }

  if (skipGetKeys) {
    return false;
  } if (controllerState === true) {
    return true;
  } if (!webauthnUsername || (email && email !== webauthnUsername)) {
    return false;
  }
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
};

export const useAuthState = (skipGetKeys = false): {authenticated: AuthState} => {
  const [authenticated, setAuthenticated] = useState<AuthState>('loading');
  const [query] = useSearchParams();
  const email = query.get('email');

  useEffect(() => {
    const handleAuthState = async () => {
      setAuthenticated(await getAuthState(email, skipGetKeys));
    };

    handleAuthState();
  }, [email, skipGetKeys]);

  return { authenticated };
};
