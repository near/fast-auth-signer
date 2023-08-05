import { createKey } from '@near-js/biometric-ed25519';
import { sendSignInLinkToEmail } from 'firebase/auth';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { firebaseAuth } from '../../utils/firebase';
import { isValidEmail } from '../../utils/form-validation';

const handleCreateAccount = async ({
  accountId, email, isRecovery, success_url, failure_url, public_key, contract_id, methodNames
}) => {
  const keyPair = await createKey(email);
  const publicKeyWebAuthn = keyPair.getPublicKey().toString();

  if (!publicKeyWebAuthn) {
    throw new Error('No public key found');
  }

  const searchParams = new URLSearchParams({
    publicKeyFak: publicKeyWebAuthn,
    email,
    ...(accountId ? { accountId } : {}),
    ...(isRecovery ? { isRecovery: 'true' } : {}),
    ...(success_url ? { success_url } : {}),
    ...(failure_url ? { failure_url } : {}),
    ...(public_key ? { public_key_lak: public_key } : {}),
    ...(contract_id ? { contract_id } : {}),
    ...(methodNames ? { methodNames } : {})
  });

  window.localStorage.setItem(`temp_fastauthflow_${publicKeyWebAuthn}`, keyPair.toString());

  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: encodeURI(
      `${window.location.origin}/auth-callback?${searchParams.toString()}`,
    ),
    handleCodeInApp: true,
  });
  return {
    email, publicKey: publicKeyWebAuthn, accountId, privateKey: keyPair.toString()
  };
};

function SignInPage({ controller }) {
  const { register, handleSubmit, setValue } = useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    controller.isSignedIn().then((signedIn: boolean) => {
      if (signedIn) {
        navigate('/');
      }
    });
  }, []);

  const onSubmit = handleSubmit(async (data: any) => {
    if (!data.email) return;

    const success_url = searchParams.get('success_url');
    const failure_url = searchParams.get('failure_url');
    const public_key =  searchParams.get('public_key');
    const contract_id = searchParams.get('contract_id');
    const methodNames = searchParams.get('methodNames');

    try {
      const { publicKey: publicKeyFak, email, privateKey } = await handleCreateAccount({
        accountId:   null,
        email:       data.email,
        isRecovery:  true,
        success_url,
        failure_url,
        public_key,
        contract_id,
        methodNames,
      });
      const newSearchParams = new URLSearchParams({
        publicKeyFak,
        email,
        isRecovery: 'true',
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      const hashParams = new URLSearchParams({ privateKey });
      navigate(`/verify-email?${newSearchParams.toString()}#${hashParams.toString()}`);
    } catch (error: any) {
      console.log(error);

      if (typeof error?.message === 'string') {
        openToast({
          type:  'ERROR',
          title: error.message,
        });
      } else {
        openToast({
          type:  'ERROR',
          title: 'Something went wrong',
        });
      }
    }
  });

  return (
    <StyledContainer>
      <FormContainer onSubmit={onSubmit}>
        <header>
          <h1>Sign In</h1>
          <p className="desc">Use this account to sign in everywhere on NEAR, no password required.</p>
        </header>

        <InputContainer>
          <label htmlFor="email">Email</label>

          <input
            {...register('email', {
              required: 'Please enter a valid email address',
            })}
            onChange={(e) => {
              setValue('email', e.target.value);
              if (!isValidEmail(e.target.value)) return;
            }}
            placeholder="user_name@email.com"
            type="email"
            required
          />
        </InputContainer>

        <Button type="submit" label="Continue" variant="affirmative" onClick={onSubmit} />
      </FormContainer>
    </StyledContainer>
  );
};

export default SignInPage;

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

const InputContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  label {
    font-size: 12px;
    font-weight: 500;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    font-size: 14px;
    margin-top: 4px;
    min-height: 50px;
    cursor: text;

    &:focus {
      outline: none;
      border: 1px solid #e5e5e5;
    }
  }

  .subText {
    font-size: 12px;
  }
`;
