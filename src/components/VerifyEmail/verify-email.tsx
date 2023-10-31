import { sendSignInLinkToEmail } from 'firebase/auth';
import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import EmailSvg from './icons/EmailSvg';
import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { basePath } from '../../utils/config';
import { firebaseAuth } from '../../utils/firebase';
import { redirectWithError } from '../../utils';

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
  const { hash = '' } = useLocation();

  const handleResendEmail = async () => {
    const accountRequiredButNotThere = !query.get('accountId') && query.get('isRecovery') !== 'true';
    if (
      accountRequiredButNotThere
      || !query.get('email')
      || !query.get('email').length
    ) return;

    const hashParams = new URLSearchParams(hash.slice(1));

    const accountId = query.get('accountId');
    const publicKeyFak = query.get('publicKeyFak');
    const email = query.get('email');
    const isRecovery = query.get('isRecovery');
    const success_url = query.get('success_url');
    const failure_url = query.get('failure_url');
    const public_key_lak =  query.get('public_key_lak');
    const contract_id = query.get('contract_id');
    const methodNames = query.get('methodNames');
    const privateKey = hashParams.get('privateKey');

    const searchParams = new URLSearchParams({
      ...(publicKeyFak ? { publicKeyFak } : {}),
      ...(accountId ? { accountId } : {}),
      ...(isRecovery ? { isRecovery } : {}),
      ...(success_url ? { success_url } : {}),
      ...(failure_url ? { failure_url } : {}),
      ...(public_key_lak ? { public_key_lak } : {}),
      ...(contract_id ? { contract_id } : {}),
      ...(methodNames ? { methodNames } : {})
    });

    if (publicKeyFak) {
      window.localStorage.setItem(`temp_fastauthflow_${publicKeyFak}`, privateKey);
    }

    try {
      await sendSignInLinkToEmail(firebaseAuth, email as string, {
        url:             `${window.location.origin}${basePath ? `/${basePath}` : ''}/auth-callback?${searchParams.toString()}`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', email);
      openToast({
        type:  'SUCCESS',
        title: 'Email resent successfully!',
      });
    } catch (error: any) {
      console.log(error);
      redirectWithError({ success_url, failure_url, error });

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
        <EmailSvg />
        <header>
          <h1>Verify Your Email</h1>
          <p>{query.get('email')}</p>
        </header>

        <p>Check your inbox to activate your account.</p>

        <Button size="large" label="Resend" onClick={handleResendEmail} />
      </FormContainer>
    </StyledContainer>
  );
}

export default VerifyEmailPage;
