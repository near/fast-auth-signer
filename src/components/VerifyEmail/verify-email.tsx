import { sendSignInLinkToEmail } from 'firebase/auth';
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { firebaseAuth } from '../../utils/firebase';

function VerifyEmailPage() {
  const [query] = useSearchParams();

  const handleResendEmail = async () => {
    const accountRequiredButNotThere = !query.get('accountId') && query.get('isRecovery') !== 'true';
    if (
      accountRequiredButNotThere
      || !query.get('email')
      || !query.get('email').length
      || !query.get('publicKey')
      || !query.get('publicKey').length
    ) return;

    try {
      await sendSignInLinkToEmail(firebaseAuth, query.get('email'), {
        url:             `${window.location.origin}/auth-callback?publicKey=${query.get('publicKey')}&accountId=${query.get('accountId')}`,
        handleCodeInApp: true,
      });
      openToast({
        type:  'SUCCESS',
        title: 'Email resent successfully!',
      });
    } catch (error: any) {
      console.log(error);

      if (typeof error?.message === 'string') {
        openToast({
          type:  'ERROR',
          title: error.message,
        });
        return;
      }
      openToast({
        type:  'ERROR',
        title: 'Something went wrong',
      });
    }
  };

  return (
    <StyledContainer>
      <FormContainer onSubmit={handleResendEmail}>
        <header>
          <a
            href={query.get('isRecovery') === 'true' ? '/signin' : '/signup'}
            style={{ textDecoration: 'underline', color: 'black' }}
          >
            <small>Go back</small>
          </a>
          <h1 style={{ marginTop: '12px' }}>Verify your email</h1>
          <p style={{ fontWeight: 600, marginTop: '12px' }}>{query.get('email')}</p>
        </header>

        <p>Check your inbox to activate your account.</p>

        <Button label="Resend Email" variant="secondary" onClick={handleResendEmail} />
      </FormContainer>
    </StyledContainer>
  );
};

export default VerifyEmailPage;

const StyledContainer = styled.div`
  width: 100%;
  height: calc(100vh - 66px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f2f1ea;
  padding: 0 16px;
`;

const FormContainer = styled.form`
  max-width: 450px;
  width: 100%;
  margin: 16px auto;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
