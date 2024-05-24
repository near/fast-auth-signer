import { createKey, isPassKeyAvailable } from '@near-js/biometric-ed25519';
import { captureException } from '@sentry/react';
import BN from 'bn.js';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { NavigateFunction, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import AuthCallbackError from './AuthCallbackError';
import { createNEARAccount, fetchAccountIds } from '../../api';
import { setAccountIdToController } from '../../lib/controller';
import FirestoreController from '../../lib/firestoreController';
import {
  decodeIfTruthy, inIframe, isUrlNotJavascriptProtocol
} from '../../utils';
import { basePath, networkId } from '../../utils/config';
import {
  checkFirestoreReady, firebaseAuth,
} from '../../utils/firebase';
import {
  getAddKeyAction, getAddLAKAction
} from '../../utils/mpc-service';

const StyledStatusMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  width: 100%;
`;

const onCreateAccount = async ({
  oidcKeypair,
  accessToken,
  accountId,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  success_url,
  setStatusMessage,
  gateway,
}) => {
  const res = await createNEARAccount({
    accountId,
    fullAccessKeys:    publicKeyFak ? [publicKeyFak] : [],
    limitedAccessKeys: public_key_lak ? [{
      public_key:   public_key_lak,
      receiver_id:  contract_id,
      allowance:    '250000000000000',
      method_names: methodNames ?? '',
    }] : [],
    accessToken,
    oidcKeypair,
  });

  if (res.type === 'err') return;

  // Add device
  await window.firestoreController.addDeviceCollection({
    fakPublicKey: publicKeyFak,
    lakPublicKey: public_key_lak,
    gateway,
    accountId
  });

  setStatusMessage('Account created successfully!');

  setStatusMessage('Redirecting to app...');

  const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);
  await window.firestoreController.addAccountIdPublicKey(recoveryPK, accountId);

  const parsedUrl = new URL(
    success_url && isUrlNotJavascriptProtocol(success_url)
      ? success_url
      : window.location.origin + (basePath ? `/${basePath}` : '')
  );
  parsedUrl.searchParams.set('account_id', res.near_account_id);
  parsedUrl.searchParams.set('public_key', public_key_lak);
  parsedUrl.searchParams.set('all_keys', (publicKeyFak ? [public_key_lak, publicKeyFak, recoveryPK] : [public_key_lak, recoveryPK]).join(','));

  window.location.replace(parsedUrl.href);
};

export const onSignIn = async ({
  accessToken,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  setStatusMessage,
  success_url,
  searchParams,
  navigate,
  gateway,
  devicePageCallback,
}: {
  accessToken: string;
  publicKeyFak?: string;
  public_key_lak: string;
  contract_id: string,
  methodNames: string[],
  // eslint-disable-next-line no-unused-vars
  setStatusMessage: (arg: string) => void,
  success_url?: string,
  searchParams: URLSearchParams,
  navigate: NavigateFunction,
  gateway: string,
  devicePageCallback?: () => void,
}) => {
  // Stop from LAK with multi-chain contract
  const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);
  const accountIds = await fetchAccountIds(recoveryPK);
  // TODO: If we want to remove old LAK automatically, use below code and add deleteKeyActions to signAndSendActionsWithRecoveryKey
  // const existingDevice = await window.firestoreController.getDeviceCollection(publicKeyFak);
  // // delete old lak key attached to webAuthN public Key
  // const deleteKeyActions = existingDevice
  //   ? getDeleteKeysAction(existingDevice.publicKeys.filter((key) => key !== publicKeyFak)) : [];

  // onlyAddLak will be true if current browser already has a FAK with passkey
  const onlyAddLak = !publicKeyFak || publicKeyFak === 'null';
  const addKeyActions = onlyAddLak
    ? getAddLAKAction({
      publicKeyLak: public_key_lak,
      contractId:   contract_id,
      methodNames,
      allowance:    new BN('250000000000000'),
    }) : getAddKeyAction({
      publicKeyLak:      public_key_lak,
      webAuthNPublicKey: publicKeyFak,
      contractId:        contract_id,
      methodNames,
      allowance:         new BN('250000000000000'),
    });

  return (window as any).fastAuthController.signAndSendActionsWithRecoveryKey({
    oidcToken: accessToken,
    accountId: accountIds[0],
    recoveryPK,
    actions:   addKeyActions
  })
    .then((res) => res.json())
    .then(async (res) => {
      const failure = res['Receipts Outcome']
        .find(({ outcome: { status } }) => Object.keys(status).some((k) => k === 'Failure'))?.outcome?.status?.Failure;
      if (devicePageCallback) {
        devicePageCallback();
      }
      if (failure?.ActionError?.kind?.LackBalanceForState) {
        navigate(`/devices?${searchParams.toString()}`);
      } else {
        await checkFirestoreReady();
        await window.firestoreController.addDeviceCollection({
          fakPublicKey: onlyAddLak ? null : publicKeyFak,
          lakPublicKey: public_key_lak,
          gateway,
          accountId:    accountIds[0],
        });

        setStatusMessage('Account recovered successfully!');

        setStatusMessage('Redirecting to app...');

        const parsedUrl = new URL(
          success_url && isUrlNotJavascriptProtocol(success_url)
            ? success_url
            : window.location.origin + (basePath ? `/${basePath}` : '')
        );
        parsedUrl.searchParams.set('account_id', accountIds[0]);
        parsedUrl.searchParams.set('public_key', public_key_lak);
        parsedUrl.searchParams.set('all_keys', (publicKeyFak ? [public_key_lak, publicKeyFak, recoveryPK] : [public_key_lak, recoveryPK]).join(','));

        if (inIframe()) {
          window.parent.postMessage({
            type:   'method',
            method: 'query',
            id:     1234,
            params: {
              request_type: 'complete_authentication',
              publicKey:    public_key_lak,
              allKeys:      (publicKeyFak ? [public_key_lak, publicKeyFak, recoveryPK] : [public_key_lak, recoveryPK]).join(','),
              accountId:    accountIds[0]
            }
          }, '*');
        } else {
          window.location.replace(parsedUrl.href);
        }
      }
    });
};

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('Loading...');
  const [callbackError, setCallbackError] = useState<Error | null>(null);

  const [searchParams] = useSearchParams();

  // The signIn should run only once
  useEffect(() => {
    const signInProcess = async () => {
      if (isSignInWithEmailLink(firebaseAuth, window.location.href)) {
        const accountId = decodeIfTruthy(searchParams.get('accountId'));
        const isRecovery = decodeIfTruthy(searchParams.get('isRecovery'));
        const success_url = decodeIfTruthy(searchParams.get('success_url'));
        const public_key_lak = decodeIfTruthy(searchParams.get('public_key_lak'));
        const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
        const methodNames = decodeIfTruthy(searchParams.get('methodNames'));

        // eslint-disable-next-line no-alert
        const email = window.localStorage.getItem('emailForSignIn');

        if (!email) {
          const error = new Error('Please use the same device and browser to verify your email');
          setCallbackError(error);
          return;
        }

        if (!window.firestoreController) {
          window.firestoreController = new FirestoreController();
        }

        setStatusMessage('Verifying email...');

        try {
          const { user } = await signInWithEmailLink(firebaseAuth, email, window.location.href);
          if (!user || !user.emailVerified) return;

          const accessToken = await user.getIdToken();

          setStatusMessage(isRecovery ? 'Recovering account...' : 'Creating account...');
          setAccountIdToController({ accountId, networkId });

          let publicKeyFak: string;

          if (await isPassKeyAvailable()) {
            const keyPair = await createKey(email);
            publicKeyFak = keyPair.getPublicKey().toString();
            await window.fastAuthController.setKey(keyPair);
          }

          if (!window.fastAuthController.getAccountId()) {
            await window.fastAuthController.setAccountId(accountId);
          }

          await window.fastAuthController.claimOidcToken(accessToken);
          const oidcKeypair = await window.fastAuthController.getKey(`oidc_keypair_${accessToken}`);
          if (!window.firestoreController) {
            window.firestoreController = new FirestoreController();
          }
          window.firestoreController.updateUser({
            userUid:   user.uid,
            oidcToken: accessToken,
          });

          const callback = isRecovery ? onSignIn : onCreateAccount;
          await callback({
            oidcKeypair,
            accessToken,
            accountId,
            publicKeyFak,
            public_key_lak,
            contract_id,
            methodNames,
            success_url,
            setStatusMessage,
            navigate,
            searchParams,
            gateway:      success_url,
          });
        } catch (e) {
          captureException(e);
          setCallbackError(e);
        }
      } else {
        navigate('/signup');
      }
    };

    signInProcess();
  }, [navigate, searchParams]);

  if (callbackError) return <AuthCallbackError error={callbackError} redirectUrl={decodeIfTruthy(searchParams.get('failure_url'))} />;

  return <StyledStatusMessage data-test-id="callback-status-message">{statusMessage}</StyledStatusMessage>;
}

export default AuthCallbackPage;
