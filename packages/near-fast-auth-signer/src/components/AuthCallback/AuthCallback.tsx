import { captureException } from '@sentry/react';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import React, {
  useEffect, useState, useRef, useMemo
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { onSignIn, onCreateAccount, onSocialLogin } from './auth';
import AuthCallbackError from './AuthCallbackError';
import { CreateAccountFormValues } from '../../hooks/useCreateAccount';
import { Button } from '../../lib/Button';
import { setAccountIdToController } from '../../lib/controller';
import FirestoreController from '../../lib/firestoreController';
import { decodeIfTruthy, extractQueryParams } from '../../utils';
import { network, networkId } from '../../utils/config';
import { deleteUserAccount, firebaseAuth } from '../../utils/firebase';
// eslint-disable-next-line import/no-cycle
import { storePassKeyAsFAK } from '../../utils/passkey';
import CreateAccountForm from '../CreateAccount/CreateAccountForm';

// Styled components
const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
`;

const AccountInfo = styled.div<{ textCentered?: boolean }>`
  width: 375px;
  display: flex;
  padding: 8px 12px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 4px;
  border: 1px solid #FBD38D;
  background: #FEEBC8;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  @media (min-width: 768px) {
    max-width: 380px;
  }
  margin-bottom: 12px;
`;

const StatusMessage = styled.p`
  color: #2D3748;
  margin: 0;
`;

const SocialLoginButton = styled(Button)`
  margin-top: 20px;
`;

const onSocialSignIn = async ({
  params, setStatusMessage, setCallbackError, searchParams, navigate
}) => {
  setStatusMessage('Verifying social login...');
  const {
    accountId: socialAccountId,
    email: socialEmail,
    isNewUser,
  } = await onSocialLogin({ socialLoginName: params.socialLoginName });

  const email = socialEmail;
  const accountId = socialAccountId;

  if (!window.firestoreController) {
    window.firestoreController = new FirestoreController();
  }

  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user || !user.emailVerified) return;

    const accessToken = await user.getIdToken();

    setStatusMessage(!isNewUser ? 'Recovering account...' : 'Creating account...');
    setAccountIdToController({ accountId, networkId });

    const publicKeyFak = await storePassKeyAsFAK(email);

    if (!window.fastAuthController.getAccountId()) {
      window.fastAuthController.setAccountId(accountId);
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

    const callback = !isNewUser ? onSignIn : onCreateAccount;
    const callbackParams = {
      oidcKeypair,
      accessToken,
      accountId,
      publicKeyFak,
      public_key_lak:    params.public_key_lak,
      contract_id:       params.contract_id,
      methodNames:       params.methodNames,
      success_url:       params.success_url,
      setStatusMessage,
      navigate,
      searchParams,
      gateway:           params.success_url,
    };

    await callback(callbackParams);
  } catch (e) {
    captureException(e);
    setCallbackError(e);
    if (isNewUser) {
      await deleteUserAccount();
    }
  }
};

const onEmailSignIn = async ({
  params, setStatusMessage, setCallbackError, searchParams, navigate, setAccountAsExisting, onSubmitRef
}) => {
  const email = window.localStorage.getItem('emailForSignIn');
  if (!email) {
    setCallbackError(new Error('Please use the same device and browser to verify your email'));
    return;
  }
  const { accountId } = params;

  setStatusMessage('Verifying email...');

  if (!window.firestoreController) {
    window.firestoreController = new FirestoreController();
  }

  try {
    const credential = await signInWithEmailLink(firebaseAuth, email, window.location.href);
    const { user } = credential;
    if (!user || !user.emailVerified) return;

    const accessToken = await user.getIdToken();

    setStatusMessage(params.isRecovery ? 'Recovering account...' : 'Creating account...');
    setAccountIdToController({ accountId, networkId });

    const publicKeyFak = await storePassKeyAsFAK(email);

    if (!window.fastAuthController.getAccountId()) {
      window.fastAuthController.setAccountId(accountId);
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

    const callback = params.isRecovery ? onSignIn : onCreateAccount;
    const callbackParams = {
      oidcKeypair,
      accessToken,
      accountId,
      publicKeyFak,
      public_key_lak:    params.public_key_lak,
      contract_id:       params.contract_id,
      methodNames:       params.methodNames,
      success_url:       params.success_url,
      setStatusMessage,
      navigate,
      searchParams,
      gateway:           params.success_url,
      onAccountNotFound: () => {
        setAccountAsExisting(false);
        setStatusMessage('Oops! This account doesn\'t seem to exist. Please create one below.');
      },
    };

    onSubmitRef.current = async (extraParams: { accountId: string }) => {
      await onCreateAccount({ ...callbackParams, ...extraParams });
    };

    await callback(callbackParams);
  } catch (e) {
    captureException(e);
    setCallbackError(e);
  }
};

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('Loading...');
  const [callbackError, setCallbackError] = useState<Error | null>(null);
  const [isAccountExisting, setAccountAsExisting] = useState(true);
  const onSubmitRef = useRef(null);
  const [inFlight, setInFlight] = useState(false);
  const [onClickSocialLogin, setOnClickSocialLogin] = useState(false);

  const [searchParams] = useSearchParams();
  const paramNames = ['accountId', 'isRecovery', 'success_url', 'public_key_lak', 'methodNames', 'contract_id', 'socialLoginName'];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const params = useMemo(() => extractQueryParams(searchParams, paramNames), [searchParams]);

  useEffect(() => {
    const signInProcess = async () => {
      if (!isSignInWithEmailLink(firebaseAuth, window.location.href) && !params.socialLoginName) {
        navigate('/signup');
        return;
      }

      if (params.socialLoginName) {
        if (onClickSocialLogin) {
          setInFlight(true);
          await onSocialSignIn({
            params, setStatusMessage, setCallbackError, searchParams, navigate
          });
          setInFlight(false);
        } else {
          setStatusMessage('Click to proceed with fastauth social login');
        }
      } else {
        await onEmailSignIn({
          params, setStatusMessage, setCallbackError, searchParams, navigate, setAccountAsExisting, onSubmitRef
        });
      }
    };

    signInProcess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, searchParams, onClickSocialLogin]);

  const handleFormSubmit = async (values: CreateAccountFormValues) => {
    setInFlight(true);
    setStatusMessage('Loading...');
    try {
      const accountId = `${values.username}.${network.fastAuth.accountIdSuffix}`;
      await onSubmitRef.current({ accountId });
    } catch (error) {
      captureException(error);
      setCallbackError(error);
    } finally {
      setInFlight(false);
    }
  };

  if (!isAccountExisting) {
    return (
      <PageWrap>
        <AccountInfo>
          <StatusMessage data-test-id="callback-status-message">{statusMessage}</StatusMessage>
        </AccountInfo>
        <CreateAccountForm
          onSubmit={handleFormSubmit}
          loading={inFlight}
          initialValues={{
            email:    window.localStorage.getItem('emailForSignIn'),
            username: decodeIfTruthy(searchParams.get('accountId')),
          }}
        />
      </PageWrap>
    );
  }

  if (callbackError) {
    return <AuthCallbackError error={callbackError} redirectUrl={decodeIfTruthy(searchParams.get('failure_url'))} />;
  }

  return (
    <PageWrap>
      <StatusMessage data-test-id="callback-status-message">{statusMessage}</StatusMessage>
      {
        params.socialLoginName && (
          <SocialLoginButton
            type="button"
            size="large"
            label={inFlight ? 'Loading...' : 'Continue'}
            variant="affirmative"
            onClick={() => setOnClickSocialLogin(true)}
            disabled={inFlight}
          />
        )
      }
    </PageWrap>
  );
}

export default AuthCallbackPage;
