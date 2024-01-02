/* eslint-disable import/prefer-default-export */
import { getKeys, isPassKeyAvailable } from '@near-js/biometric-ed25519/lib';
import { KeyPairEd25519 } from '@near-js/crypto';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom/dist';

import FastAuthController from './controller';
import { fetchAccountIds } from '../api';
import { safeGetLocalStorage } from '../utils';
import { networkId } from '../utils/config';
import { checkFirestoreReady, firebaseAuth } from '../utils/firebase';

type AuthState = {
  authenticated: 'loading' | boolean | Error
}

export const useAuthState = (skipGetKeys = false): AuthState => {
  const [authenticated, setAuthenticated] = useState<AuthState['authenticated']>('loading');
  const webauthnUsername = useMemo(() => safeGetLocalStorage('webauthn_username'), []);
  const [query] = useSearchParams();
  const email = query.get('email');

  if (webauthnUsername === undefined) {
    return { authenticated: new Error('Please allow third party cookies') };
  }

  useEffect(() => {
    const handleAuthState = async () => {
      const controllerState = await window.fastAuthController.isSignedIn();
      const isPasskeySupported = await isPassKeyAvailable();

      if (skipGetKeys) {
        setAuthenticated(false);
      } else if (controllerState === true) {
        setAuthenticated(true);
      } else if ((!webauthnUsername && isPasskeySupported) || (email && email !== webauthnUsername)) {
        setAuthenticated(false);
      } else if (isPasskeySupported) {
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
            setAuthenticated(false);
          }

          window.fastAuthController = new FastAuthController({
            accountId: accountsList[0].accId,
            networkId
          });

          await window.fastAuthController.setKey(new KeyPairEd25519(accountsList[0].keyPair.toString().split(':')[1]));
          setAuthenticated(true);
        } catch {
          setAuthenticated(false);
        }
      } else {
        checkFirestoreReady().then(async (isReady) => {
          if (isReady) {
            const oidcToken = await firebaseAuth.currentUser.getIdToken();
            if (window.fastAuthController.getLocalStoreKey(`oidc_keypair_${oidcToken}`)) {
              const recoveryPK = await window.fastAuthController.getUserCredential(oidcToken);
              const accountIds = await fetchAccountIds(recoveryPK);
              (window as any).fastAuthController = new FastAuthController({
                accountId: accountIds[0],
                networkId
              });
              setAuthenticated(true);
            } else {
              setAuthenticated(false);
            }
          }
        });
      }
    };

    handleAuthState();
  }, [email, skipGetKeys, webauthnUsername]);

  return { authenticated };
};
