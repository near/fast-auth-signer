import { sendSignInLinkToEmail } from 'firebase/auth';
import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { firebaseAuth } from '../../utils/firebase';

function VerifyEmailPage() {
  const [query] = useSearchParams();
  const { hash = '' } = useLocation();

  const handleResendEmail = async () => {
    const accountRequiredButNotThere = !query.get('accountId') && query.get('isRecovery') !== 'true';
    if (
      accountRequiredButNotThere
      || !query.get('email')
      || !query.get('email').length
      || !query.get('publicKeyFak')
      || !query.get('publicKeyFak').length
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
      publicKeyFak: publicKeyFak as string,
      email:        email as string,
      ...(accountId ? { accountId } : {}),
      ...(isRecovery ? { isRecovery } : {}),
      ...(success_url ? { success_url } : {}),
      ...(failure_url ? { failure_url } : {}),
      ...(public_key_lak ? { public_key_lak } : {}),
      ...(contract_id ? { contract_id } : {}),
      ...(methodNames ? { methodNames } : {})
    });

    window.localStorage.setItem(`temp_fastauthflow_${publicKeyFak}`, privateKey);

    try {
      await sendSignInLinkToEmail(firebaseAuth, email as string, {
        url:             `${window.location.origin}/auth-callback?${searchParams.toString()}`,
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
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path opacity="0.2" d="M35 8.75L20 22.5L5 8.75H35Z" fill="#1B1B18"/>
          <path d="M35 7.5H5C4.66848 7.5 4.35054 7.6317 4.11612 7.86612C3.8817 8.10054 3.75 8.41848 3.75 8.75V30C3.75 30.663 4.01339 31.2989 4.48223 31.7678C4.95107 32.2366 5.58696 32.5 6.25 32.5H33.75C34.413 32.5 35.0489 32.2366 35.5178 31.7678C35.9866 31.2989 36.25 30.663 36.25 30V8.75C36.25 8.41848 36.1183 8.10054 35.8839 7.86612C35.6495 7.6317 35.3315 7.5 35 7.5ZM20 20.8047L8.21406 10H31.7859L20 20.8047ZM15.4234 20L6.25 28.4078V11.5922L15.4234 20ZM17.2734 21.6953L19.1484 23.4219C19.3791 23.6336 19.6807 23.751 19.9937 23.751C20.3068 23.751 20.6084 23.6336 20.8391 23.4219L22.7141 21.6953L31.7766 30H8.21406L17.2734 21.6953ZM24.5766 20L33.75 11.5906V28.4094L24.5766 20Z" fill="#1B1B18"/>
        </svg>
        <header>
          <h1>Verify Your Email</h1>
          <p>{query.get('email')}</p>
        </header>

        <p>Check your inbox to activate your account.</p>

        <Button label="Resend" onClick={handleResendEmail} />
      </FormContainer>
    </StyledContainer>
  );
}

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
  box-shadow: 0px 4px 8px 0px #0000000F;
  box-shadow: 0px 0px 0px 1px #0000000F;
  max-width: 450px;
  width: 100%;
  margin: 16px auto;
  background-color: #ffffff;
  padding: 35px;
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
    font: var(--text-2xl);
    font-weight: bold;
  }

  header p {
    color: #604CC8;
  }

  button {
    width: 100%;
    padding: 25px;
  }
`;
