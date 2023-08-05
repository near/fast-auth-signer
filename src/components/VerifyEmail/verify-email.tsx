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
      || !query.get('publicKey')
      || !query.get('publicKey').length
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
      publicKeyFak,
      email,
      ...(accountId ? { accountId } : {}),
      ...(isRecovery ? { isRecovery: 'true' } : {}),
      ...(success_url ? { success_url } : {}),
      ...(failure_url ? { failure_url } : {}),
      ...(public_key_lak ? { public_key_lak } : {}),
      ...(contract_id ? { contract_id } : {}),
      ...(methodNames ? { methodNames } : {})
    });

    window.localStorage.setItem(`temp_fastauthflow_${publicKeyFak}`, privateKey);

    try {
      await sendSignInLinkToEmail(firebaseAuth, query.get('email'), {
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
