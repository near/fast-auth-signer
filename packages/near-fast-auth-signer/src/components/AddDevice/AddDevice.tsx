import { yupResolver } from '@hookform/resolvers/yup';
import { isPassKeyAvailable } from '@near-js/biometric-ed25519';
import { captureException } from '@sentry/react';
import BN from 'bn.js';
import { sendSignInLinkToEmail } from 'firebase/auth';
import React, {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import WalletSvg from '../../Images/WalletSvg';
import { Button } from '../../lib/Button';
import FirestoreController from '../../lib/firestoreController';
import Input from '../../lib/Input/Input';
import { openToast } from '../../lib/Toast';
import { useAuthState } from '../../lib/useAuthState';
import {
  decodeIfTruthy, inIframe, isUrlNotJavascriptProtocol
} from '../../utils';
import { basePath } from '../../utils/config';
import { setCookie } from '../../utils/cookie';
import { checkFirestoreReady, firebaseAuth } from '../../utils/firebase';
import { FormContainer, StyledContainer } from '../Layout';
import { Separator, SeparatorWrapper } from '../Login/Login.style';

export const handleCreateAccount = async ({
  accountId, email, isRecovery, success_url, failure_url, public_key, contract_id, methodNames
}) => {
  const searchParams = new URLSearchParams({
    ...(accountId ? { accountId } : {}),
    ...(isRecovery ? { isRecovery } : {}),
    ...(success_url ? { success_url } : {}),
    ...(failure_url ? { failure_url } : {}),
    ...(public_key ? { public_key_lak: public_key } : {}),
    ...(contract_id ? { contract_id } : {}),
    ...(methodNames ? { methodNames } : {})
  });

  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: encodeURI(
      `${window.location.origin}${basePath ? `/${basePath}` : ''}/auth-callback?${searchParams.toString()}`,
    ),
    handleCodeInApp: true,
  });

  setCookie('emailForSignIn', email, 1);

  return {
    accountId,
  };
};

const schema = yup.object().shape({
  email:    yup
    .string()
    .email('Please enter a valid email address')
    .required('Please enter a valid email address'),
});

const AddDeviceForm = styled(FormContainer)`
  height: 420px;
  gap: 18px;
  justify-content: center;
`;

function AddDevicePage() {
  const addDeviceFormRef = useRef(null);
  // Send form height to modal if in iframe
  useIframeDialogConfig({ element: addDeviceFormRef.current });

  const [searchParams] = useSearchParams();
  const user = firebaseAuth.currentUser;
  const userEmail = useMemo(() => user?.email, [user?.email]);

  const {
    register, handleSubmit, setValue, formState: { errors }
  } = useForm({
    resolver:      yupResolver(schema),
    mode:          'all',
    defaultValues: {
      email: user?.email ?? '',
    }
  });

  const navigate = useNavigate();

  const skipGetKey = decodeIfTruthy(searchParams.get('skipGetKey'));
  const { authenticated } = useAuthState(skipGetKey);

  const [inFlight, setInFlight] = useState(false);
  if (!window.firestoreController) {
    window.firestoreController = new FirestoreController();
  }

  useEffect(() => {
    setValue('email', userEmail);
  }, [setValue, userEmail]);

  const addDevice = useCallback(async (data: any) => {
    if (!data.email) return;
    setInFlight(true);

    // if different user is logged in, sign out
    await firebaseAuth.signOut();
    // once it has email but not authenicated, it means existing passkey is not valid anymore, therefore remove webauthn_username and try to create a new passkey
    window.localStorage.removeItem('webauthn_username');

    const success_url = searchParams.get('success_url');
    const failure_url = searchParams.get('failure_url');
    const public_key =  searchParams.get('public_key');
    const contract_id = searchParams.get('contract_id');
    const methodNames = searchParams.get('methodNames');

    try {
      await handleCreateAccount({
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
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      navigate(`/verify-email?${newSearchParams.toString()}}`);
    } catch (error: any) {
      console.log(error);
      window.parent.postMessage({
        type:    'AddDeviceError',
        message: typeof error?.message === 'string' ? error.message : 'Something went wrong'
      }, '*');

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
    } finally {
      setInFlight(false);
    }
  }, [searchParams, navigate]);

  const handleAuthCallback = useCallback(async () => {
    setInFlight(true);
    const success_url = isUrlNotJavascriptProtocol(searchParams.get('success_url')) && decodeIfTruthy(searchParams.get('success_url'));
    // const failure_url = isUrlNotJavascriptProtocol(searchParams.get('failure_url')) && decodeIfTruthy(searchParams.get('failure_url'));
    const public_key =  decodeIfTruthy(searchParams.get('public_key'));
    const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
    const methodNames = decodeIfTruthy(searchParams.get('methodNames'));

    const isPasskeySupported = await isPassKeyAvailable();
    if (!public_key || !contract_id) {
      window.location.replace(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
      return;
    }
    const publicKeyFak = isPasskeySupported ? await window.fastAuthController.getPublicKey() : '';
    const existingDevice = isPasskeySupported
      ? await window.firestoreController.getDeviceCollection(publicKeyFak)
      : null;
    const existingDeviceLakKey = existingDevice?.publicKeys?.filter((key) => key !== publicKeyFak)[0];

    // @ts-ignore
    const oidcToken = user.accessToken;
    const recoveryPK = await window.fastAuthController.getUserCredential(oidcToken);
    // if given lak key is already attached to webAuthN public key, no need to add it again
    const noNeedToAddKey = existingDeviceLakKey === public_key;
    const parsedUrl = new URL(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
    parsedUrl.searchParams.set('account_id', (window as any).fastAuthController.getAccountId());
    parsedUrl.searchParams.set('public_key', public_key);
    parsedUrl.searchParams.set('all_keys', [public_key, publicKeyFak, recoveryPK].join(','));

    if (noNeedToAddKey) {
      window.parent.postMessage({
        type:   'method',
        method: 'query',
        id:     1234,
        params: {
          request_type: 'complete_authentication',
          publicKey:    public_key,
          allKeys:      [public_key, publicKeyFak, recoveryPK].join(','),
          accountId:    (window as any).fastAuthController.getAccountId()
        }
      }, '*');
      setInFlight(false);
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
      window.firestoreController.updateUser({
        userUid:   user.uid,
        // User type is missing accessToken but it exist
        oidcToken,
      });

      // Since FAK is already added, we only add LAK
      return window.firestoreController.addDeviceCollection({
        fakPublicKey:  null,
        lakPublicKey: public_key,
        gateway:      success_url,
      })
        .then(() => {
          window.parent.postMessage({
            type:   'method',
            method: 'query',
            id:     1234,
            params: {
              request_type: 'complete_authentication',
              publicKey:    public_key,
              allKeys:      [public_key, publicKeyFak, recoveryPK].join(','),
              accountId:    (window as any).fastAuthController.getAccountId()
            }
          }, '*');
        }).catch((err) => {
          console.log('Failed to add device collection', err);
          throw new Error('Failed to add device collection');
        });
    }).catch((error) => {
      console.log('error', error);
      captureException(error);

      window.parent.postMessage({
        type:    'AddDeviceError',
        message: typeof error?.message === 'string' ? error.message : 'Something went wrong'
      }, '*');

      openToast({
        type:  'ERROR',
        title: error.message,
      });
    })
      .finally(() => setInFlight(false)); // @ts-ignore
  }, [navigate, searchParams, user]);

  const onSubmit = async (data) => {
    if (!data.email) return;
    const isFirestoreReady = await checkFirestoreReady();
    const isPasskeySupported = await isPassKeyAvailable();
    // @ts-ignore
    const firebaseAuthInvalid = authenticated === true && !isPasskeySupported && user?.email !== data.email;

    // @ts-ignore
    const shouldUseCurrentUser = authenticated === true
      && (isPasskeySupported || !firebaseAuthInvalid)
      && isFirestoreReady;

    if (shouldUseCurrentUser) {
      await handleAuthCallback();
    } else {
      await addDevice({ email: data.email });
    }
  };

  const handleConnectWallet = () => {
    if (!inIframe()) return;
    window.parent.postMessage({
      showWalletSelector:    true,
    }, '*');
    window.parent.postMessage({
      closeIframe: true
    }, '*');
  };

  return (
    <StyledContainer inIframe={inIframe()}>
      <AddDeviceForm ref={addDeviceFormRef} inIframe={inIframe()} onSubmit={handleSubmit(onSubmit)}>
        <header>
          <h1>Sign In</h1>
          <p className="desc">Use this account to sign in everywhere on NEAR, no password required.</p>
        </header>
        <Input
          {...register('email')}
          label="Email"
          placeholder="your@email.com"
          type="email"
          id="email"
          required
          dataTest={{
            input: 'add-device-email',
          }}
          error={errors.email?.message}
        />
        <Button
          type="submit"
          size="large"
          // @ts-ignore
          label={inFlight ? 'Signing...' : 'Continue'}
          variant="affirmative"
          data-test-id="add-device-continue-button"
          disabled={inFlight}
        />
        <SeparatorWrapper>
          <Separator />
          Or
          <Separator />
        </SeparatorWrapper>
        <Button
          disabled={inFlight}
          size="large"
          label={(
            <>
              <WalletSvg />
              {' '}
              Connect Wallet
            </>
          )}
          variant="secondary"
          data-test-id="connect_wallet_button"
          iconLeft="bi bi-wallet"
          onClick={handleConnectWallet}
        />

      </AddDeviceForm>
    </StyledContainer>
  );
}

export default AddDevicePage;
