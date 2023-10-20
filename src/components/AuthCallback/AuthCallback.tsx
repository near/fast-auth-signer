import { KeyPairEd25519 } from '@near-js/crypto';
import BN from 'bn.js';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import type { MutableRefObject } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import FastAuthController from '../../lib/controller';
import FirestoreController from '../../lib/firestoreController';
import { openToast } from '../../lib/Toast';
import { decodeIfTruthy, inIframe } from '../../utils';
import { basePath, network, networkId } from '../../utils/config';
import { checkFirestoreReady, firebaseAuth } from '../../utils/firebase';
import {
  CLAIM, getAddKeyAction, getUserCredentialsFrpSignature, getAddLAKAction
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
  keypair,
  accessToken,
  accountId,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  success_url,
  setStatusMessage,
  email,
  gateway,
}) => {
  const CLAIM_SALT = CLAIM + 2;
  const signature = getUserCredentialsFrpSignature({
    salt:            CLAIM_SALT,
    oidcToken:       accessToken,
    shouldHashToken: false,
    keypair,
  });
  const data = {
    near_account_id:        accountId,
    create_account_options: {
      full_access_keys:    [publicKeyFak],
      limited_access_keys: public_key_lak ? [
        {
          public_key:   public_key_lak,
          receiver_id:  contract_id,
          allowance:    '250000000000000',
          method_names: (methodNames && methodNames.split(',')) || '',
        },
      ] : [],
    },
    oidc_token:                     accessToken,
    user_credentials_frp_signature: signature,
    frp_public_key:                 keypair.getPublicKey().toString(),
  };

  const headers = new Headers();
  headers.append('Content-Type', 'application/json');

  const options = {
    method: 'POST',
    mode:   'cors' as const,
    body:   JSON.stringify(data),
    headers,
  };

  return fetch(`${network.fastAuth.mpcRecoveryUrl}/new_account`, options)
    .then(
      async (response) => {
        if (!response?.ok) {
          throw new Error('Network response was not ok');
        }
        if (!window.firestoreController) {
          (window as any).firestoreController = new FirestoreController();
        }
        // Add device
        await window.firestoreController.addDeviceCollection({
          fakPublicKey: publicKeyFak,
          lakPublicKey: public_key_lak,
          gateway,
        });

        setStatusMessage('Account created successfully!');
        const res = await response.json();
        const accId = res.near_account_id;
        // TODO: Check if account ID matches the one from email
        if (!accId) {
          throw new Error('Could not find account creation data');
        }

        window.localStorage.setItem('webauthn_username', email);
        window.localStorage.removeItem(`temp_fastauthflow_${publicKeyFak}`);

        setStatusMessage('Redirecting to app...');

        const parsedUrl = new URL(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
        parsedUrl.searchParams.set('account_id', accId);
        parsedUrl.searchParams.set('public_key', public_key_lak);
        parsedUrl.searchParams.set('all_keys', [public_key_lak, publicKeyFak].join(','));

        window.location.replace(parsedUrl.href);
      },
    );
};

export const onSignIn = async ({
  accessToken,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  setStatusMessage,
  success_url,
  email,
  searchParams,
  navigate,
  onlyAddLak = false,
  gateway,
}) => {
  const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);
  const accountIds = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${recoveryPK}/accounts`)
    .then((res) => res.json())
    .catch((err) => {
      console.log(err);
      throw new Error('Unable to retrieve account Id');
    });

  // TODO: If we want to remove old LAK automatically, use below code and add deleteKeyActions to signAndSendActionsWithRecoveryKey
  // const existingDevice = await window.firestoreController.getDeviceCollection(publicKeyFak);
  // // delete old lak key attached to webAuthN public Key
  // const deleteKeyActions = existingDevice
  //   ? getDeleteKeysAction(existingDevice.publicKeys.filter((key) => key !== publicKeyFak)) : [];

  // onlyAddLak will be true if current browser already has a FAK with passkey
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
      if (failure?.ActionError?.kind?.LackBalanceForState) {
        navigate(`/devices?${searchParams.toString()}`);
      } else {
        await checkFirestoreReady();
        if (!window.firestoreController) {
          (window as any).firestoreController = new FirestoreController();
        }
        await window.firestoreController.addDeviceCollection({
          fakPublicKey: onlyAddLak ? null : publicKeyFak,
          lakPublicKey: public_key_lak,
          gateway,
        });

        setStatusMessage('Account recovered successfully!');

        window.localStorage.setItem('webauthn_username', email);
        window.localStorage.removeItem(`temp_fastauthflow_${publicKeyFak}`);

        setStatusMessage('Redirecting to app...');

        const parsedUrl = new URL(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
        parsedUrl.searchParams.set('account_id', accountIds[0]);
        parsedUrl.searchParams.set('public_key', public_key_lak);
        parsedUrl.searchParams.set('all_keys', [public_key_lak, publicKeyFak].join(','));

        if (inIframe()) {
          window.open(parsedUrl.href, '_parent');
        } else {
          window.location.replace(parsedUrl.href);
        }
      }
    });
};

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('Loading...');
  const pendingSignInRef: MutableRefObject<null | Promise<void>> = useRef(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (pendingSignInRef.current) {
      return;
    }
    const locationUrl = window.location.href;

    if (isSignInWithEmailLink(firebaseAuth, locationUrl)) {
      const accountId = decodeIfTruthy(searchParams.get('accountId'));
      const publicKeyFak = decodeIfTruthy(searchParams.get('publicKeyFak'));
      const email = window.localStorage.getItem('emailForSignIn');
      const isRecovery = decodeIfTruthy(searchParams.get('isRecovery'));
      const success_url = decodeIfTruthy(searchParams.get('success_url'));
      const failure_url = decodeIfTruthy(searchParams.get('failure_url'));
      const public_key_lak = decodeIfTruthy(searchParams.get('public_key_lak'));
      const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
      const methodNames = decodeIfTruthy(searchParams.get('methodNames'));
      const privateKey = window.localStorage.getItem(`temp_fastauthflow_${publicKeyFak}`);

      while (!email) {
        const parsedUrl = new URL(failure_url || window.location.origin + (basePath ? `/${basePath}` : ''));
        parsedUrl.searchParams.set('code', '500');
        parsedUrl.searchParams.set('reason', 'Please use the same device and browser to verify your email');
        window.location.replace(parsedUrl.href);
      }

      setStatusMessage('Verifying email...');

      // TODO: refactor this function, introduce early return pattern and cleanup async/await
      pendingSignInRef.current = signInWithEmailLink(firebaseAuth, email, window.location.href)
        .then(async (result: any) => {
          // TODO refactor: remove weird typing here, it is a temporary hack to get around
          // a TypeScript error where the defined type does not match the actual
          // type returned by the function
          const { user } = result;
          if (user.emailVerified) {
            setStatusMessage(isRecovery ? 'Recovering account...' : 'Creating account...');
            const keypair = new KeyPairEd25519(privateKey.split(':')[1]);

            // claim the oidc token
            (window as any).fastAuthController = new FastAuthController({
              accountId,
              networkId
            });

            try {
              await window.fastAuthController.setKey(keypair);
              await window.fastAuthController.claimOidcToken(user.accessToken);
              (window as any).firestoreController = new FirestoreController();
              window.firestoreController.updateUser({
                userUid:   user.uid,
                oidcToken: user.accessToken,
              });

              const callback = isRecovery ? onSignIn : onCreateAccount;
              await callback({
                keypair,
                accessToken: user.accessToken,
                accountId,
                publicKeyFak,
                public_key_lak,
                contract_id,
                methodNames,
                success_url,
                setStatusMessage,
                email,
                navigate,
                searchParams,
                gateway:      success_url,
              });
            } catch (e) {
              console.log('error:', e);
              const { message } = e;
              const parsedUrl = new URL(failure_url || success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
              parsedUrl.searchParams.set('code', e.code);
              parsedUrl.searchParams.set('reason', message);
              window.location.replace(parsedUrl.href);
              openToast({
                type:  'ERROR',
                title: message,
              });
            }
          }
        });
    } else {
      navigate('/signup');
    }
  }, []); // DEC-1294 leaving dependencies empty to ensure the effect runs only once

  return <StyledStatusMessage>{statusMessage}</StyledStatusMessage>;
}

export default AuthCallbackPage;
