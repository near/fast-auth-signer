import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import EmailSvg from './icons/EmailSvg';
import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { redirectWithError } from '../../utils';
import { sendFirebaseSignInEmail } from '../../utils/firebase';

const StyledContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  padding-bottom: 60px;
`;

const FormContainer = styled.form`
  box-shadow: 0px 4px 8px 0px #0000000F;
  box-shadow: 0px 0px 0px 1px #0000000F;
  max-width: 360px;
  width: 100%;
  margin: 16px auto;
  background-color: #ffffff;
  padding: 25px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  svg {
    width: 100px;
  }

  & > p {
    color: #706F6C;
    font-size: 14px;
  }

  header {
    text-align: center;
  }

  header h1 {
    font: var(--text-xl);
    font-weight: bold;
  }

  header p {
    color: #604CC8;
  }

  button {
    width: 100%;
  }
`;
function VerifyEmailPage() {
  const [query] = useSearchParams();

  const isRecovery = query.get('isRecovery');
  const accountId = query.get('accountId');
  const email = query.get('email');
  const success_url = query.get('success_url');
  const failure_url = query.get('failure_url');
  const public_key_lak =  query.get('public_key_lak');
  const contract_id = query.get('contract_id');
  const methodNames = query.get('methodNames');

  const sendEmail = useCallback(async () => {
    try {
      await sendFirebaseSignInEmail({
        accountId,
        email,
        success_url,
        failure_url,
        public_key:           public_key_lak,
        contract_id,
        methodNames,
      });

      openToast({
        type:  'SUCCESS',
        title: 'Email resent successfully!',
      });
    } catch (error: any) {
      console.log(error);
      redirectWithError({ success_url, failure_url, error });
    }
  }, [accountId, contract_id, email, failure_url, methodNames, public_key_lak, success_url]);

  const handleResendEmail = async () => {
    const accountRequiredButNotThere = !accountId && isRecovery !== 'true';
    if (
      accountRequiredButNotThere
      || !query.get('email')
      || !query.get('email').length
    ) return;

    await sendEmail();
  };

  return (
    <StyledContainer>
      <FormContainer onSubmit={handleResendEmail}>
        <EmailSvg />
        <header>
          <h1>Verify Your Email</h1>
          <p data-test-id="verify-email-address">{email}</p>
        </header>
        <p>Check your inbox to activate your account.</p>
        <Button size="large" label="Resend" data-test-id="resend-verify-email-button" onClick={handleResendEmail} />
      </FormContainer>
    </StyledContainer>
  );
}

export default VerifyEmailPage;
