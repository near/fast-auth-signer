import React from 'react';
import styled from 'styled-components';

import { Button } from '../../lib/Button';
import { isUrlNotJavascriptProtocol } from '../../utils';
import { basePath } from '../../utils/config';
import {
  getFirebaseErrorMessage, isFirebaseError,
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
  const onClickRedirect = () => {
    const toUrl = new URL(
      redirectUrl && isUrlNotJavascriptProtocol(redirectUrl)
        ? redirectUrl
        : window.location.origin + (basePath ? `/${basePath}` : '')
    );
    window.location.replace(toUrl.href);
  };

  const renderContent = () => {
    if (isFirebaseError(error)) {
      const errorMessage = getFirebaseErrorMessage(error);

      return (
        <>
          <ErrorMessage>{errorMessage}</ErrorMessage>
          <Button size="large" onClick={onClickRedirect}>
            Click here to go home
          </Button>
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
