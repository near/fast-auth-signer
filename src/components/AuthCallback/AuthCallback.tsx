import { KeyPairEd25519 } from '@near-js/crypto';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import type { MutableRefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import FastAuthController from '../../lib/controller';
import { openToast } from '../../lib/Toast';
import { network, networkId } from '../../utils/config';
import { firebaseAuth } from '../../utils/firebase';

const decodeIfTruthy = (paramVal) => {
  if (paramVal) {
    return decodeURIComponent(paramVal);
  }

  return paramVal;
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
      let email = decodeIfTruthy(searchParams.get('email'));
      const isRecovery = decodeIfTruthy(searchParams.get('isRecovery'));
      const success_url = decodeIfTruthy(searchParams.get('success_url'));
      const failure_url = decodeIfTruthy(searchParams.get('failure_url'));
      const public_key_lak =  decodeIfTruthy(searchParams.get('public_key_lak'));
      const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
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

            // TODO: Call MPC Service with accountId, publicKey,  and oauthToken to create account
            const data = {
              ...(accountId && accountId.includes('.') ? { near_account_id: accountId } : {}),
              create_account_options: {
                full_access_keys:    [publicKeyFak],
                limited_access_keys: [
                  {
                    public_key:   public_key_lak,
                    receiver_id:  contract_id,
                    allowance:    '250000000000000',
                    method_names: (methodNames && methodNames.split(',')) || '',
                  },
                ],
              },
              oidc_token: user.accessToken,
            };

            const headers = new Headers();
            headers.append('Content-Type', 'application/json');

            const options = {
              method: 'POST',
              mode:   'cors' as const,
              body:   JSON.stringify(data),
              headers,
            };

            await fetch(`${network.fastAuth.mpcRecoveryUrl}/${isRecovery ? 'add_key' : 'new_account'}`, options).then(
              async (response) => {
                if (!response.ok) {
                  console.log(response);
                  throw new Error('Network response was not ok');
                }
                setStatusMessage(isRecovery ? 'Account recovered successfully!' : 'Account created successfully!');
                const res = await response.json();
                const accId = res.near_account_id;
                // TODO: Check if account ID matches the one from email
                if (!accId) {
                  throw new Error('Could not find account creation data');
                }

                (window as any).fastAuthController = new FastAuthController({
                  accountId: accId,
                  networkId
                });

                await window.fastAuthController.setKey(new KeyPairEd25519(privateKey.split(':')[1]));

                window.localStorage.removeItem(`temp_fastauthflow_${publicKeyFak}`);

                setStatusMessage('Redirecting to app...');

                const parsedUrl = new URL(success_url);
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
          const parsedUrl = new URL(failure_url || success_url);
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
};

export default AuthCallbackPage;

const StyledStatusMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  width: 100%;
`;
