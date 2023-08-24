import { ErrorMessage } from '@hookform/error-message';
import { isPassKeyAvailable } from '@near-js/biometric-ed25519';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import ErrorSvg from './icons/ErrorSvg';
import SuccessSvg from './icons/SuccessSvg';
import FormContainer from './styles/FormContainer';
import InputContainer from './styles/InputContainer';
import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { inIframe } from '../../utils';
import { network } from '../../utils/config';
import {
  accountAddressPatternNoSubaccount, emailPattern, getEmailId, isValidEmail
} from '../../utils/form-validation';
import { handleCreateAccount } from '../AddDevice/AddDevice';

const StyledContainer = styled.div`
  width: 100%;
  height: calc(100vh - 66px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f2f1ea;
  padding: 0 16px;

  header {
    text-align: center;
    margin-top: 1em;
  }
`;

const emailProviders = ['gmail', 'yahoo', 'hotmail'];

function CreateAccount() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields },
    clearErrors,
  } = useForm();
  const [emailProvider, setEmailProvider] = useState(null);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);

  const formValues = watch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const createAccount = async (data: { email: string; username: string; }) => {
    const success_url = searchParams.get('success_url');
    const failure_url = searchParams.get('failure_url');
    const public_key =  searchParams.get('public_key');
    const contract_id = searchParams.get('contract_id');
    const methodNames = searchParams.get('methodNames');
    try {
      const fullAccountId = `${data.username}.${network.fastAuth.accountIdSuffix}`;
      const {
        publicKey: publicKeyFak, email, privateKey, accountId
      } = await handleCreateAccount({
        accountId:   fullAccountId,
        email:       data.email,
        isRecovery:  false,
        success_url,
        failure_url,
        public_key,
        contract_id,
        methodNames,
      });
      const newSearchParams = new URLSearchParams({
        accountId,
        publicKeyFak,
        email,
        isRecovery: 'false',
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      const hashParams = new URLSearchParams({ privateKey });
      navigate(`/verify-email?${newSearchParams.toString()}#${hashParams.toString()}`);
    } catch (error: any) {
      openToast({
        type:  'ERROR',
        title: error.message,
      });
    }
  };

  useEffect(() => {
    const checkPassKey = async (): Promise<void> => {
      const isPasskeyReady = await isPassKeyAvailable();
      if (!isPasskeyReady) {
        openToast({
          title: '',
          type:  'INFO',
          description:
            'Passkey support is required for account creation. Try using an updated version of Chrome or Safari to create an account.',
          duration: 5000,
        });
      }
    };
    checkPassKey();

    const email = searchParams.get('email');
    const username = searchParams.get('accountId');

    if (email) {
      setValue('email', email);
      setValue('username', username);
      createAccount({ email, username });
    }
  }, []);

  const checkIsAccountAvailable = useCallback(async (desiredUsername: string) => {
    try {
      if (!desiredUsername) return;

      const response = await fetch(network.nodeUrl, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id:      'dontcare',
          method:  'query',
          params:  {
            request_type: 'view_account',
            finality:     'final',
            account_id:   `${desiredUsername}.${network.fastAuth.accountIdSuffix}`,
          },
        }),
      });
      const data = await response.json();
      if (data?.error?.cause?.name === 'UNKNOWN_ACCOUNT') {
        // eslint-disable-next-line consistent-return
        return true;
      }

      if (data?.result?.code_hash) {
        // eslint-disable-next-line consistent-return
        return false;
      }
    } catch (error: any) {
      console.log(error);
      openToast({
        title: error.message,
        type:  'ERROR'
      });
    }
  }, []);

  const onSubmit = handleSubmit(async (data) => createAccount(data));

  if (inIframe()) {
    return (
      <Button
        label="Continue on fast auth"
        onClick={() => {
          window.open(window.location.href, '_parent');
        }}
      />
    );
  }

  const selectMailProvider = (provider: string) => {
    if (!formValues.email) {
      formValues.email = '';
    }
    const emailId = getEmailId(formValues.email);
    if (emailProvider === provider) {
      setEmailProvider(null);
      setValue('email', emailId);
    } else {
      setEmailProvider(provider);
      setValue('email', `${emailId}@${provider}.com`);
    }

    if (!formValues?.username || !touchedFields?.username) {
      setValue('username', emailId);
    }
  };

  return (
    <StyledContainer>
      <FormContainer onSubmit={onSubmit}>
        <header>
          <h1>Create account</h1>
          <p className="desc">
            <span>Have an account?</span>
            {' '}
            <Link to="/login">Sign in</Link>
          </p>
        </header>

        <InputContainer>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="email">Email</label>

          <input
            {...register('email', {
              required: 'Email address is required',
              pattern:  {
                value:   emailPattern,
                message: 'Please enter a valid email address',
              },
            })}
            onChange={(e) => {
              clearErrors('email');
              setValue('email', e.target.value);
              if (!isValidEmail(e.target.value)) return;
              if (!formValues?.username || !touchedFields?.username) {
                setValue('username', getEmailId(e.target.value));
              }
            }}
            placeholder="user_name@email.com"
            type="email"
            id="email"
          />
          <div className="select-mail-provider">
            {emailProviders.map((provider) => {
              if (!emailProvider || emailProvider === provider) {
                return (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                  <div className={`mail-provider ${emailProvider === provider ? 'mail-provider-selected' : ''}`} onClick={() => selectMailProvider(provider)}>
                    @
                    {provider}
                  </div>
                );
              }
              return null;
            })}
          </div>
          <div className="subText">
            <div className="error">
              <ErrorMessage
                errors={errors}
                name="email"
                render={({ message }) => <p>{message}</p>}
              />
            </div>
          </div>
        </InputContainer>

        <InputContainer>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="username">Account ID</label>
          <div className={`input-group-custom ${isUsernameAvailable === true && 'input-group-custom-success'} ${isUsernameAvailable === false && 'input-group-custom-failure'}`}>
            <input
              autoComplete="webauthn username"
              {...register('username', {
                required: 'Please enter a valid account ID',
                pattern:  {
                  value:   accountAddressPatternNoSubaccount,
                  message: 'Accounts must be lowercase and may contain - or _, but they may not begin or end with a special character or have two consecutive special characters.',
                },
                validate: async (username) => {
                  const isAccountAvailable = await checkIsAccountAvailable(username);
                  setIsUsernameAvailable(isAccountAvailable);
                  if (!isAccountAvailable) {
                    return `${username}.${network.fastAuth.accountIdSuffix} is taken, try something else.`;
                  }
                  return null;
                },
              })}
              onChange={async (e) => {
                clearErrors('username');
                const isValidPattern = accountAddressPatternNoSubaccount.test(e.target.value);
                if (!isValidPattern) {
                  setIsUsernameAvailable(false);
                  return null;
                }
                const isAccountAvailable = await checkIsAccountAvailable(e.target.value);
                setIsUsernameAvailable(isAccountAvailable);
                return null;
              }}
              placeholder="user_name"
            />
            <div className="input-group-right">
              <span>.near</span>
            </div>
          </div>
          <div className="subText">
            <div>Use a suggested ID or customize your own</div>
            {isUsernameAvailable && (
              <div className="success">
                <SuccessSvg />
                <span>Account ID available</span>
              </div>
            )}
            <ErrorMessage
              errors={errors}
              name="username"
              render={({ message }) => (
                <div className="error">
                  <ErrorSvg />
                  <span>{message}</span>
                </div>
              )}
            />
          </div>
        </InputContainer>

        <Button label="Continue" variant="affirmative" type="submit" size="large" />
      </FormContainer>
    </StyledContainer>
  );
}

export default CreateAccount;
