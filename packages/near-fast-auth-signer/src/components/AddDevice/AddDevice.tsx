import { yupResolver } from '@hookform/resolvers/yup';
import { createKey, isPassKeyAvailable } from '@near-js/biometric-ed25519/lib';
import { captureException } from '@sentry/react';
import BN from 'bn.js';
import { fetchSignInMethodsForEmail, sendSignInLinkToEmail } from 'firebase/auth';
import { KeyPair } from 'near-api-js';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import { Button } from '../../lib/Button';
import FirestoreController from '../../lib/firestoreController';
import Input from '../../lib/Input/Input';
import { openToast } from '../../lib/Toast';
import { useAuthState } from '../../lib/useAuthState';
import {
  decodeIfTruthy, inIframe, redirectWithError
} from '../../utils';
import { basePath } from '../../utils/config';
import { checkFirestoreReady, firebaseAuth } from '../../utils/firebase';

const StyledContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f2f1ea;
  padding: 0 16px;
  padding-bottom: 60px;
`;

const FormContainer = styled.form`
  max-width: 360px;
  width: 100%;
  margin: 16px auto;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const handleCreateAccount = async ({
  accountId, email, isRecovery, success_url, failure_url, public_key, contract_id, methodNames
}) => {
  const passkeyAvailable = await isPassKeyAvailable();

  let publicKeyWebAuthn: string;
  let keyPair: KeyPair;

  if (passkeyAvailable) {
    keyPair = await createKey(email);
    publicKeyWebAuthn = keyPair.getPublicKey().toString();
  }

  const searchParams = new URLSearchParams({
    ...(publicKeyWebAuthn ? { publicKeyFak: publicKeyWebAuthn } : {}),
    ...(accountId ? { accountId } : {}),
    ...(isRecovery ? { isRecovery } : {}),
    ...(success_url ? { success_url } : {}),
    ...(failure_url ? { failure_url } : {}),
    ...(public_key ? { public_key_lak: public_key } : {}),
    ...(contract_id ? { contract_id } : {}),
    ...(methodNames ? { methodNames } : {})
  });

  if (publicKeyWebAuthn) {
    window.localStorage.setItem(`temp_fastauthflow_${publicKeyWebAuthn}`, keyPair.toString());
  }

  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: encodeURI(
      `${window.location.origin}${basePath ? `/${basePath}` : ''}/auth-callback?${searchParams.toString()}`,
    ),
    handleCodeInApp: true,
  });
  window.localStorage.setItem('emailForSignIn', email);
  return {
    publicKey: publicKeyWebAuthn, accountId, privateKey: keyPair && keyPair.toString()
  };
};

const schema = yup.object().shape({
  email:    yup
    .string()
    .email('Please enter a valid email address')
    .required('Please enter a valid email address'),
});

function SignInPage() {
  const [searchParams] = useSearchParams();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver:      yupResolver(schema),
    mode:          'all',
    defaultValues: {
      email: searchParams.get('email') ?? '',
    }
  });

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
      const { publicKey: publicKeyFak, privateKey } = await handleCreateAccount({
        accountId:   null,
        email:       data.email,
        isRecovery:  true,
        success_url,
        failure_url,
        public_key,
        contract_id,
        methodNames,
      });
      const newSearchParams = new URLSearchParams({
        email:      data.email,
        isRecovery: 'true',
        ...(publicKeyFak ? { publicKeyFak } : {}),
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      const hashParams = new URLSearchParams({ ...(privateKey ? { privateKey } : {}) });
      navigate(`/verify-email?${newSearchParams.toString()}#${hashParams.toString()}`);
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
        // once it has email but not authenicated, it means existing passkey is not valid anymore, therefore remove webauthn_username and try to create a new passkey
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
    <StyledContainer>
      <FormContainer onSubmit={handleSubmit(addDevice)}>
        <header>
          <h1>Sign In</h1>
          <p className="desc">Use this account to sign in everywhere on NEAR, no password required.</p>
        </header>
        <Input
          {...register('email')}
          label="Email"
          placeholder="user_name@email.com"
          type="email"
          id="email"
          required
          dataTest={{
            input: 'add-device-email',
          }}
          error={errors.email?.message}
        />
        <Button type="submit" size="large" label="Continue" variant="affirmative" data-test-id="add-device-continue-button" />
      </FormContainer>
    </StyledContainer>
  );
}

export default SignInPage;
