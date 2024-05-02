import { sendSignInLinkToEmail } from 'firebase/auth';
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { extractQueryParams, isUrlNotJavascriptProtocol } from '../../utils';
import { basePath } from '../../utils/config';
import {
  getFirebaseErrorMessage, isFirebaseError, firebaseAuth,
} from '../../utils/firebase';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
`;

const InnerWrapper = styled.div`
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const ErrorMessage = styled.div`
  text-align: center;
  margin-bottom: 20px;
`;

type AuthCallbackErrorProps = {
  error: any;
  redirectUrl?: string;
};

function AuthCallbackError({
  error,
  redirectUrl,
}: AuthCallbackErrorProps) {
  const [searchParams] = useSearchParams();
  const [inFlight, setInFlight] = useState(false);

  const onClickRedirect = () => {
    const toUrl = new URL(
      redirectUrl && isUrlNotJavascriptProtocol(redirectUrl)
        ? redirectUrl
        : window.location.origin + (basePath ? `/${basePath}` : '')
    );
    window.location.replace(toUrl.href);
  };

  const resendEmail = async () => {
    setInFlight(true);
    const email = window.localStorage.getItem('emailForSignIn');
    const queryParams = extractQueryParams(searchParams, ['accountId', 'isRecovery', 'success_url', 'failure_url', 'public_key_lak', 'contract_id', 'methodNames']);
    const newSearchParams = new URLSearchParams(queryParams);
    try {
      await sendSignInLinkToEmail(firebaseAuth, email as string, {
        url:             `${window.location.origin}${basePath ? `/${basePath}` : ''}/auth-callback?${newSearchParams.toString()}`,
        handleCodeInApp: true,
      });
    } catch (e: any) {
      console.log(e);

      openToast({
        type:  'ERROR',
        title: error?.message ?? 'Something went wrong',
      });
    } finally {
      setInFlight(false);
    }
  };

  const renderContent = () => {
    if (isFirebaseError(error)) {
      const errorMessage = getFirebaseErrorMessage(error);

      return (
        <>
          <ErrorMessage>{errorMessage}</ErrorMessage>
          {error.code === 'auth/invalid-action-code' ? (
            <Button size="large" onClick={resendEmail} disabled={inFlight} label={inFlight ? 'Sending Email Verification...' : 'Resend Email Verification'} />
          ) : (
            <Button size="large" onClick={onClickRedirect}>
              Click here to go home
            </Button>
          )}
        </>
      );
    }
    // Other error
    const errorMessage = error.message ?? 'An unexpected error occurred';
    return (
      <>
        <ErrorMessage>{errorMessage}</ErrorMessage>
        <Button onClick={onClickRedirect}>
          Click here to go home
        </Button>
      </>
    );
  };

  return (
    <Wrapper>
      <InnerWrapper>
        {renderContent()}
      </InnerWrapper>
    </Wrapper>
  );
}

export default AuthCallbackError;
