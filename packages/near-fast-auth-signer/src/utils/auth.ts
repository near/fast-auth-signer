import { captureException } from '@sentry/react';
import BN from 'bn.js';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { inIframe, redirectWithError } from '.';
import { basePath } from './config';
import { checkFirestoreReady, firebaseAuth, sendFirebaseSignInEmail } from './firebase';
import FirestoreController from '../lib/firestoreController';
import { getAuthState } from '../lib/useAuthState';

export const useHandleAuthenticationFlow = ({
  success_url,
  failure_url,
  public_key,
  contract_id,
  methodNames,
  searchParamsString
}: {
  success_url: string;
  failure_url: string;
  public_key: string;
  contract_id: string;
  methodNames: string;
  searchParamsString: string
}) => {
  const navigate = useNavigate();

  return useCallback(async (email: string, skipGetKey = false) => {
    const authenticated = await getAuthState(email, skipGetKey);

    if (!window.firestoreController) {
      window.firestoreController = new FirestoreController();
    }
    const isFirestoreReady = await checkFirestoreReady();

    if (authenticated === true && isFirestoreReady) {
      if (!public_key || !contract_id) {
        window.location.replace(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
        return;
      }
      const publicKeyFak = await window.fastAuthController.getPublicKey();
      const existingDevice = await window.firestoreController.getDeviceCollection(publicKeyFak);
      const existingDeviceLakKey = existingDevice?.publicKeys?.filter((key) => key !== publicKeyFak)[0];
      // if given lak key is already attached to webAuthN public key, no need to add it again
      const noNeedToAddKey = existingDeviceLakKey === public_key;
      if (noNeedToAddKey) {
        const parsedUrl = new URL(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
        parsedUrl.searchParams.set('account_id', window.fastAuthController.getAccountId());
        parsedUrl.searchParams.set('public_key', public_key);
        parsedUrl.searchParams.set('all_keys', [public_key, publicKeyFak].join(','));

        if (inIframe()) {
          window.open(parsedUrl.href, '_parent');
        } else {
          window.location.replace(parsedUrl.href);
        }
        return;
      }

      try {
        const res = await window.fastAuthController.signAndSendAddKey({
          contractId: contract_id,
          methodNames,
          allowance:  new BN('250000000000000'),
          publicKey:  public_key,
        });
        const resJson = res && await res.json();

        const failure = resJson['Receipts Outcome'].find(({ outcome: { status } }) => Object.keys(status).some((k) => k === 'Failure'))?.outcome?.status?.Failure;
        if (failure?.ActionError?.kind?.LackBalanceForState) {
          navigate(`/devices?${searchParamsString}`);
          return;
        }

        const user = firebaseAuth.currentUser;
        window.firestoreController.updateUser({
          userUid:   user.uid,
          oidcToken: await user.getIdToken(),
        });

        // Since FAK is already added, we only add LAK
        try {
          await window.firestoreController.addDeviceCollection({
            fakPublicKey:  null,
            lakPublicKey: public_key,
            gateway:      success_url,
          });

          const parsedUrl = new URL(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
          parsedUrl.searchParams.set('account_id', window.fastAuthController.getAccountId());
          parsedUrl.searchParams.set('public_key', public_key);
          parsedUrl.searchParams.set('all_keys', [public_key, publicKeyFak].join(','));
          window.parent.postMessage({
            type:   'method',
            method: 'query',
            id:     1234,
            params: {
              request_type: 'complete_sign_in',
              publicKey:    public_key,
              allKeys:      [public_key, publicKeyFak].join(','),
              accountId:    window.fastAuthController.getAccountId()
            }
          }, '*');

          if (inIframe()) {
            window.open(parsedUrl.href, '_parent');
          } else {
            window.location.replace(parsedUrl.href);
          }
        } catch (err) {
          console.error('Failed to add device collection', err);
          throw new Error('Failed to add device collection');
        }
      } catch (error) {
        console.error('error', error);
        captureException(error);
        redirectWithError({ success_url, failure_url, error });
      }
    } else if (email && !authenticated) {
      // Once it has email but not authenticated, it means existing passkey is not valid anymore, therefore remove webauthn_username and try to create a new passkey
      window.localStorage.removeItem('webauthn_username');

      try {
        const newSearchParams = new URLSearchParams({
          email,
          isRecovery: 'true',
          ...(success_url ? { success_url } : {}),
          ...(failure_url ? { failure_url } : {}),
          ...(public_key ? { public_key_lak: public_key } : {}),
          ...(contract_id ? { contract_id } : {}),
          ...(methodNames ? { methodNames } : {})
        });

        await sendFirebaseSignInEmail({
          email,
          success_url,
          failure_url,
          public_key,
          contract_id,
          methodNames,
        });

        navigate(`/verify-email?${newSearchParams.toString()}`);
      } catch (error: any) {
        console.error(error);
        redirectWithError({ success_url, failure_url, error });
      }
    }
  }, [contract_id, failure_url, methodNames, navigate, public_key, searchParamsString, success_url]);
};
