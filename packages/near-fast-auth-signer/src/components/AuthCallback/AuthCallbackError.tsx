import React from 'react';
import styled from 'styled-components';

import { Button } from '../../lib/Button';
import { getFirebaseErrorMessage, isFirebaseError } from '../../utils/firebase';

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

const CTALink = styled.button`
  padding: 10px 20px;
  border: none;
  background-color: #007bff;
  color: #fff;
  cursor: pointer;
  font-size: 15px;
  border-radius: 5px;
`;

type AuthCallbackErrorProps = {
	error: any;
	failureUrl?: string;
	onCTAClick?: () => void;
};

function AuthCallbackError(props: AuthCallbackErrorProps) {
  const {
    error, onCTAClick
  } = props;

  const renderContent = () => {
    if (isFirebaseError(error) && error.code === 'auth/invalid-action-code') {
      // Firebase error: require resending an email
      return (
        <>
          <ErrorMessage>{getFirebaseErrorMessage(error)}</ErrorMessage>
          <Button onClick={onCTAClick}>
            Resend Email Verification
          </Button>
          <CTALink disabled>
            Click here to go home
          </CTALink>
        </>
      );
    }
    // Other error
    return (
      <>
        <ErrorMessage>An unexpected error occurred</ErrorMessage>
        <CTALink disabled>
          Click here to go home
        </CTALink>
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
