/* eslint-disable import/prefer-default-export */
import { getKeys } from '@near-js/biometric-ed25519/lib';
import { KeyPairEd25519 } from '@near-js/crypto';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom/dist';

import FastAuthController from './controller';
import { network, networkId } from '../utils/config';

type AuthState = {
  authenticated: boolean | Error
  controllerState: 'loading' | boolean
}

export const useAuthState = (skipGetKeys = false): AuthState => {
  const [authenticated, setAuthenticated] = useState(undefined);
  const webauthnUsername = useMemo(() => {
    try {
      return window.localStorage.getItem('webauthn_username');
    } catch (error) {
      return null;
    }
  }, []);

  const [controllerState, setControllerState] = useState<'loading' | boolean>('loading');
  const [query] = useSearchParams();

  useEffect(() => {
    if (controllerState !== false) {
      if (controllerState === true) {
        setAuthenticated(true);
      }
    } else if (!webauthnUsername) {
      setAuthenticated(false);
    } else if (query.get('email') && query.get('email') !== webauthnUsername) {
      setAuthenticated(false);
    } else {
      if (skipGetKeys) {
        setAuthenticated(false);
        setControllerState(false);
        return;
      }
      getKeys(webauthnUsername)
        .then((keypairs) => Promise.allSettled(
          keypairs.map((k) => fetch(`${network.fastAuth.authHelperUrl}/publicKey/${k.getPublicKey().toString()}/accounts`)
            .then((res) => res.json())
            .then((accIds) => accIds.map((accId) => { return { accId, keyPair: k }; })))
        ))
        .then(async (accounts) => {
          const accountsList = accounts.reduce((acc, curr) => (
            // eslint-disable-next-line no-undef
            curr && (curr as PromiseFulfilledResult<any>).value
              // eslint-disable-next-line no-undef
              ? acc.concat(...(curr as PromiseFulfilledResult<any>).value)
              : acc
          ), []);
          if (accountsList.length === 0) {
            setAuthenticated(false);
          } else {
            (window as any).fastAuthController = new FastAuthController({
              accountId: accountsList[0].accId,
              networkId
            });

            await window.fastAuthController.setKey(new KeyPairEd25519(accountsList[0].keyPair.toString().split(':')[1]));
            setAuthenticated(true);
          }
        }).catch(() => setAuthenticated(false));
    }
  }, [webauthnUsername, controllerState, query]);

  useEffect(() => {
    if (window.fastAuthController) {
      window.fastAuthController.isSignedIn().then((isReady) => {
        setControllerState(isReady);
      });
    } else {
      setControllerState(false);
    }
  }, [controllerState, authenticated]);

  try {
    window.localStorage.getItem('webauthn_username');
    return { controllerState, authenticated };
  } catch (error) {
    return { controllerState, authenticated: new Error('Please allow third party cookies') };
  }
};
