import { KeyPairEd25519, KeyPair } from '@near-js/crypto';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import type { MutableRefObject } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { openToast } from '../../lib/Toast';
import { networkId } from '../../utils/config';
import { firebaseAuth } from '../../utils/firebase';

// import { KeyPair } from 'near-api-js';

const decodeIfTruthy = (paramVal) => {
  if (paramVal) {
    return decodeURIComponent(paramVal);
  }

  return paramVal;
};

const StyledStatusMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  width: 100%;
`;

export const signInContractId = networkId === 'testnet' ? 'v1.social08.testnet' : 'social.near';

function AuthCallbackPage({ controller }) {
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
      let email = decodeIfTruthy(searchParams.get('email'));
      const isRecovery = decodeIfTruthy(searchParams.get('isRecovery'));
      const success_url = decodeIfTruthy(searchParams.get('success_url'));
      const failure_url = decodeIfTruthy(searchParams.get('failure_url'));
      const public_key_lak =  decodeIfTruthy(searchParams.get('public_key_lak'));
      const contract_id = decodeIfTruthy(searchParams.get('contract_id')) || signInContractId;
      const methodNames = decodeIfTruthy(searchParams.get('methodNames'));
      const privateKey = window.localStorage.getItem(`temp_fastauthflow_${publicKeyFak}`);

      while (!email) {
        // TODO refactor: review
        // User opened the link on a different device. To prevent session fixation
        // attacks, ask the user to provide the associated email again. For example:

        // TODO: replace window.prompt with regular form with one input
        email = window.prompt('Please provide your email for confirmation');
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

            controller.setAccountId(accountId);
            controller.setOidcToken(user.accessToken);
            controller.setKey(KeyPair.fromString(privateKey));

            const getLak = () => {
              if (public_key_lak) {
                return public_key_lak;
              }

              const limitedAccessKey = KeyPair.fromRandom('ED25519');
              localStorage.setItem('limitedAccessKey', limitedAccessKey.toString());
              controller.setLimitedAccessKey(limitedAccessKey);
              return limitedAccessKey.getPublicKey().toString();
            };

            await controller.createAccount({
              fak: publicKeyFak,
              lak: getLak(),
              contract_id,
              methodNames,
            }).then(
              async (response) => {
                setStatusMessage(isRecovery ? 'Account recovered successfully!' : 'Account created successfully!');
                const accId = response.near_account_id;
                // TODO: Check if account ID matches the one from email
                if (!accId) {
                  throw new Error('Could not find account creation data');
                }

                await window.fastAuthController.setKey(new KeyPairEd25519(privateKey.split(':')[1]));
                window.localStorage.setItem('webauthn_username', email);

                window.localStorage.removeItem(`temp_fastauthflow_${publicKeyFak}`);

                setStatusMessage('Redirecting to app...');

                const parsedUrl = new URL(success_url || window.location.origin);
                parsedUrl.searchParams.set('account_id', accId);
                parsedUrl.searchParams.set('public_key', public_key_lak);
                parsedUrl.searchParams.set('all_keys', public_key_lak);

                window.location.replace(parsedUrl.href);
              },
            );
          }
        })
        .catch((error) => {
          console.log(error);
          const errorMessages: Record<string, string> = {
            'auth/expired-action-code': 'Link expired, please try again.',
            'auth/invalid-action-code': 'Link expired, please try again.',
            'auth/invalid-email':       'Invalid email address.',
            'auth/user-disabled':       'User disabled',
            'auth/missing-email':       'No email found, please try again.',
          };
          const message = errorMessages[error.code] || error.message;
          const parsedUrl = new URL(failure_url || success_url || window.location.origin);
          parsedUrl.searchParams.set('code', error.code);
          parsedUrl.searchParams.set('reason', message);
          window.location.replace(parsedUrl.href);
          openToast({
            type:  'ERROR',
            title: message,
          });
        });
    } else {
      navigate('/signup');
    }
  }, []); // DEC-1294 leaving dependencies empty to ensure the effect runs only once

  return <StyledStatusMessage>{statusMessage}</StyledStatusMessage>;
}

export default AuthCallbackPage;
