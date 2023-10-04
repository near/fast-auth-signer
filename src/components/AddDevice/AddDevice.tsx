import { createKey } from '@near-js/biometric-ed25519/lib';
import BN from 'bn.js';
import { sendSignInLinkToEmail } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { Button } from '../../lib/Button';
import FirestoreController from '../../lib/firestoreController';
import { openToast } from '../../lib/Toast';
import { useAuthState } from '../../lib/useAuthState';
import { decodeIfTruthy, inIframe } from '../../utils';
import { basePath } from '../../utils/config';
import { checkFirestoreReady, firebaseAuth } from '../../utils/firebase';
import { isValidEmail } from '../../utils/form-validation';

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

const InputContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;

  label {
    font-size: 12px;
    font-weight: 500;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    font-size: 14px;
    margin-top: 4px;
    min-height: 50px;
    cursor: text;

    &:focus {
      outline: none;
      border: 1px solid #e5e5e5;
    }
  }

  .subText {
    font-size: 12px;
  }
`;

export const handleCreateAccount = async ({
  accountId, email, isRecovery, success_url, failure_url, public_key, contract_id, methodNames
}) => {
  const keyPair = await createKey(email);
  const publicKeyWebAuthn = keyPair.getPublicKey().toString();
  if (!publicKeyWebAuthn) {
    throw new Error('No public key found');
  }

  const searchParams = new URLSearchParams({
    publicKeyFak: publicKeyWebAuthn,
    ...(accountId ? { accountId } : {}),
    ...(isRecovery ? { isRecovery } : {}),
    ...(success_url ? { success_url } : {}),
    ...(failure_url ? { failure_url } : {}),
    ...(public_key ? { public_key_lak: public_key } : {}),
    ...(contract_id ? { contract_id } : {}),
    ...(methodNames ? { methodNames } : {})
  });

  window.localStorage.setItem(`temp_fastauthflow_${publicKeyWebAuthn}`, keyPair.toString());

  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: encodeURI(
      `${window.location.origin}${basePath ? `/${basePath}` : ''}/auth-callback?${searchParams.toString()}`,
    ),
    handleCodeInApp: true,
  });
  window.localStorage.setItem('emailForSignIn', email);
  return {
    email, publicKey: publicKeyWebAuthn, accountId, privateKey: keyPair.toString()
  };
};

function SignInPage() {
  const { register, handleSubmit, setValue } = useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const skipGetKey = decodeIfTruthy(searchParams.get('skipGetKey'));
  const { authenticated, controllerState } = useAuthState(skipGetKey);
  const [renderRedirectButton, setRenderRedirectButton] = useState('');

  if (!window.firestoreController) {
    (window as any).firestoreController = new FirestoreController();
  }
  const [isFirestoreReady, setIsFirestoreReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (isFirestoreReady === null && controllerState !== 'loading') {
      checkFirestoreReady().then((isReady) => {
        setIsFirestoreReady(isReady);
      });
    }
  }, [controllerState]);

  const addDevice = useCallback(async (data: any) => {
    if (!data.email) return;

    const success_url = searchParams.get('success_url');
    const failure_url = searchParams.get('failure_url');
    const public_key =  searchParams.get('public_key');
    const contract_id = searchParams.get('contract_id');
    const methodNames = searchParams.get('methodNames');

    try {
      const { publicKey: publicKeyFak, email, privateKey } = await handleCreateAccount({
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
        publicKeyFak,
        email,
        isRecovery: 'true',
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      const hashParams = new URLSearchParams({ privateKey });
      navigate(`/verify-email?${newSearchParams.toString()}#${hashParams.toString()}`);
    } catch (error: any) {
      console.log(error);

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
    if (controllerState === 'loading' || isFirestoreReady === null) return;
    const handleAuthCallback = async () => {
      const success_url = decodeIfTruthy(searchParams.get('success_url'));
      const failure_url = decodeIfTruthy(searchParams.get('failure_url'));
      const public_key =  decodeIfTruthy(searchParams.get('public_key'));
      const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
      const methodNames = decodeIfTruthy(searchParams.get('methodNames'));

      const email = decodeIfTruthy(searchParams.get('email'));
      if (controllerState && isFirestoreReady) {
        if (!public_key || !contract_id) {
          window.location.replace(success_url || window.location.origin);
          return;
        }
        const publicKeyFak = await window.fastAuthController.getPublicKey();
        const existingDevice = await window.firestoreController.getDeviceCollection(publicKeyFak);
        const existingDeviceLakKey = existingDevice?.publicKeys?.filter((key) => key !== publicKeyFak)[0];
        // if given lak key is already attached to webAuthN public key, no need to add it again
        const noNeedToAddKey = existingDeviceLakKey === public_key;
        if (noNeedToAddKey) {
          const parsedUrl = new URL(success_url || window.location.origin);
          parsedUrl.searchParams.set('account_id', (window as any).fastAuthController.getAccountId());
          parsedUrl.searchParams.set('public_key', public_key);
          parsedUrl.searchParams.set('all_keys', [public_key, publicKeyFak].join(','));

          if (inIframe()) {
            setRenderRedirectButton(parsedUrl.href);
          } else {
            window.location.replace(parsedUrl.href);
          }
          return;
        }

        (window as any).fastAuthController.signAndSendAddKey({
          contractId: contract_id,
          methodNames,
          allowance:  new BN('250000000000000'),
          publicKey:  public_key,
        }).then((res) => res.json()).then((res) => {
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
          return window.firestoreController.addDeviceCollection({
            fakPublicKey: publicKeyFak,
            lakPublicKey: public_key,
          })
            .then(() => {
              const parsedUrl = new URL(success_url || window.location.origin);
              parsedUrl.searchParams.set('account_id', (window as any).fastAuthController.getAccountId());
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
                  accountId:    (window as any).fastAuthController.getAccountId()
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
          const { message } = error;
          const parsedUrl = new URL(failure_url || success_url || window.location.origin);
          parsedUrl.searchParams.set('code', error.code);
          parsedUrl.searchParams.set('reason', message);
          window.location.replace(parsedUrl.href);
          openToast({
            type:  'ERROR',
            title: message,
          });
        });
      } else if (email && !authenticated) {
        if (controllerState) {
          // once it has email but not authenicated, it means existing passkey is not valid anymore, therefore remove webauthn_username and try to create a new passkey
          window.localStorage.removeItem('webauthn_username');
        }
        setValue('email', email);
        addDevice({ email });
      }
    };

    handleAuthCallback();
  }, [isFirestoreReady, controllerState]);

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

  const onSubmit = handleSubmit(addDevice);

  return (
    <StyledContainer>
      <FormContainer onSubmit={onSubmit}>
        <header>
          <h1>Sign In</h1>
          <p className="desc">Use this account to sign in everywhere on NEAR, no password required.</p>
        </header>

        <InputContainer>
          <label htmlFor="email">
            Email
          </label>
          <input
            {...register('email', {
              required: 'Please enter a valid email address',
            })}
            onChange={(e) => {
              setValue('email', e.target.value);
              if (!isValidEmail(e.target.value)) return;
            }}
            placeholder="user_name@email.com"
            type="email"
            id="email"
            required
          />
        </InputContainer>

        <Button type="submit" size="large" label="Continue" variant="affirmative" onClick={onSubmit} />
      </FormContainer>
    </StyledContainer>
  );
}

export default SignInPage;
