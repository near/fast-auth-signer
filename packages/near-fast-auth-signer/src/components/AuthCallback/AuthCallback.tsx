import { createKey, isPassKeyAvailable } from '@near-js/biometric-ed25519';
import { captureException } from '@sentry/react';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { onSignIn, onCreateAccount } from './auth';
import AuthCallbackError from './AuthCallbackError';
import { setAccountIdToController } from '../../lib/controller';
import FirestoreController from '../../lib/firestoreController';
import {
  decodeIfTruthy,
} from '../../utils';
import { networkId } from '../../utils/config';
import {
  firebaseAuth,
} from '../../utils/firebase';

const StyledStatusMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  width: 100%;
`;

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
