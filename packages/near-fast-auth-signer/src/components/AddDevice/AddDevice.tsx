import { captureException } from '@sentry/react';
import BN from 'bn.js';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../lib/Button';
import FirestoreController from '../../lib/firestoreController';
import FlexContainer from '../../lib/FlexContainer/FlexContainer';
import { Spinner } from '../../lib/Spinner';
import { openToast } from '../../lib/Toast';
import { useAuthState } from '../../lib/useAuthState';
import {
  decodeIfTruthy, inIframe, redirectWithError
} from '../../utils';
import { basePath } from '../../utils/config';
import { checkFirestoreReady, firebaseAuth, sendFirebaseInviteEmail } from '../../utils/firebase';

function SignInPage() {
  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  const skipGetKey = decodeIfTruthy(searchParams.get('skipGetKey'));
  const { authenticated } = useAuthState(skipGetKey);
  const [renderRedirectButton, setRenderRedirectButton] = useState('');

  if (!window.firestoreController) {
    window.firestoreController = new FirestoreController();
  }

  const addDevice = useCallback(async (data: any) => {
    if (!data.email) return;

    const success_url = searchParams.get('success_url');
    const failure_url = searchParams.get('failure_url');
    const public_key =  searchParams.get('public_key');
    const contract_id = searchParams.get('contract_id');
    const methodNames = searchParams.get('methodNames');

    try {
      const result = await fetchSignInMethodsForEmail(firebaseAuth, data.email);
      if (!result.length) {
        throw new Error('Account not found, please create an account and try again');
      }

      await sendFirebaseInviteEmail({
        accountId:   null,
        email:       data.email,
        success_url,
        failure_url,
        public_key,
        contract_id,
        methodNames,
      });

      const newSearchParams = new URLSearchParams({
        email:      data.email,
        isRecovery: 'true',
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      navigate(`/verify-email?${newSearchParams.toString()}}`);
    } catch (error: any) {
      console.log(error);
      redirectWithError({ success_url, failure_url, error });

      if (typeof error?.message === 'string') {
        openToast({
          type:  'ERROR',
          title: error.message,
        });
      } else {
        openToast({
          type:  'ERROR',
          title: 'Something went wrong',
        });
      }
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (authenticated === 'loading') return;

    const handleAuthCallback = async () => {
      const isFirestoreReady = await checkFirestoreReady();

      const success_url = decodeIfTruthy(searchParams.get('success_url'));
      const failure_url = decodeIfTruthy(searchParams.get('failure_url'));
      const public_key =  decodeIfTruthy(searchParams.get('public_key'));
      const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
      const methodNames = decodeIfTruthy(searchParams.get('methodNames'));

      const email = decodeIfTruthy(searchParams.get('email'));
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
            setRenderRedirectButton(parsedUrl.href);
          } else {
            window.location.replace(parsedUrl.href);
          }
          return;
        }

        window.fastAuthController.signAndSendAddKey({
          contractId: contract_id,
          methodNames,
          allowance:  new BN('250000000000000'),
          publicKey:  public_key,
        }).then((res) => res && res.json()).then((res) => {
          const failure = res['Receipts Outcome'].find(({ outcome: { status } }) => Object.keys(status).some((k) => k === 'Failure'))?.outcome?.status?.Failure;
          if (failure?.ActionError?.kind?.LackBalanceForState) {
            navigate(`/devices?${searchParams.toString()}`);
            return null;
          }

          // Add device
          const user = firebaseAuth.currentUser;
          window.firestoreController.updateUser({
            userUid:   user.uid,
            // User type is missing accessToken but it exist
            // @ts-ignore
            oidcToken: user.accessToken,
          });

          // Since FAK is already added, we only add LAK
          return window.firestoreController.addDeviceCollection({
            fakPublicKey:  null,
            lakPublicKey: public_key,
            gateway:      success_url,
          })
            .then(() => {
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
                setRenderRedirectButton(parsedUrl.href);
              } else {
                window.location.replace(parsedUrl.href);
              }
            }).catch((err) => {
              console.log('Failed to add device collection', err);
              throw new Error('Failed to add device collection');
            });
        }).catch((error) => {
          console.log('error', error);
          captureException(error);
          redirectWithError({ success_url, failure_url, error });
          openToast({
            type:  'ERROR',
            title: error.message,
          });
        });
      } else if (email && !authenticated) {
        // once it has email but not authenticated, it means existing passkey is not valid anymore, therefore remove webauthn_username and try to create a new passkey
        window.localStorage.removeItem('webauthn_username');
        addDevice({ email });
      }
    };

    handleAuthCallback();
  }, [addDevice, authenticated, navigate, searchParams]);

  if (authenticated === true) {
    return renderRedirectButton ? (
      <Button
        label="Back to app"
        onClick={() => {
          window.open(renderRedirectButton, '_parent');
        }}
      />
    ) : (
      <div>Signing transaction</div>
    );
  }

  if (authenticated instanceof Error) {
    return <div>{authenticated.message}</div>;
  }

  if (inIframe()) {
    return (
      <Button
        label="Continue on fast auth"
        onClick={() => {
          const url = !authenticated ? `${window.location.href}&skipGetKey=true` : window.location.href;
          window.open(url, '_parent');
        }}
      />
    );
  }

  return (
    <FlexContainer
      $height="100vh"
      $alignItems="center"
      $justifyContent="center"
      $backgroundColor="#f2f1ea"
    >
      <Spinner />
    </FlexContainer>
  );
}

export default SignInPage;
