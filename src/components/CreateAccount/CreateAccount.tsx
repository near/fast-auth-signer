import { ErrorMessage } from '@hookform/error-message';
import { isPassKeyAvailable } from '@near-js/biometric-ed25519';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
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

const FormContainer = styled.form`
  max-width: 450px;
  width: 100%;
  margin: 16px auto;
  background-color: #ffffff;
  padding: 30px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  header h1 {
    font: var(--text-2xl);
    font-weight: bold;
  }

  header .desc span {
    color: #706F6C;
  }

  .select-mail-provider {
    display: flex;
    margin-top: 7px;
  }

  .select-mail-provider .mail-provider {
    border: 1px solid #E3E3E0;
    border-radius: 50px;
    padding: 3px 8px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0px 1px 2px 0px #0000000F;
  }

  .select-mail-provider .mail-provider:hover {
    background-color: #F3F3F2;
  }

  .select-mail-provider .mail-provider + .mail-provider {
    margin-left: 5px;
  }

  .select-mail-provider .mail-provider-selected {
    background-color: #E3E1F9;
    border-color: #928BE4;
  }
`;

const InputContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  label {
    font-size: 14px;
    font-weight: 500;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #E3E3E0;
    border-radius: 10px;
    min-height: 50px;
    cursor: text;

   
  }

  .input-group-custom {
    margin-top: 4px;
    display: flex;

    &:focus {
      box-shadow: 0px 0px 0px 4px #CBC7F4;
    }
  }

  .input-group-custom.input-group-custom-success {
    input {
      background-color: #F5FFFA;
      color: #197650;
      border-color: #7AF5B8;
    }

    .input-group-right {
      background-color: #DCFEED;
      border-color: #7AF5B8;

      span {
        color: #197650;
      }
    }
  }

  .input-group-custom input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    flex: 1;

    &:focus {
      box-shadow: 0;
    }
  }

  .input-group-custom .input-group-right {
    background-color: #F9F9F8;
    border: 1px solid #E3E3E0;
    display: flex;
    padding: 0 1em;
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    border-left: 0;
  }

  .input-group-custom .input-group-right span {
    display: block;
    margin: auto;
    font-size: 22px;
    color: #706F6C;
  }

  .subText {
    font-size: 0.85rem;
    padding: 8px 0;

    .error {
      display: flex;
      align-items: center;
      color: #A81500;

      svg {
        margin-right: 5px;
      }

      span {
        flex: 1;
      }
    }
    
    .success {
      display: flex;
      align-items: center;
      color: #197650;
      
      svg {
        margin-right: 5px;
      }

      span {
        flex: 1;
      }
    }
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

  const onSubmit = handleSubmit(async (data: { email: string; username: string; }) => {
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
  });

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
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.0306 4.96938C10.1005 5.03905 10.156 5.12185 10.1939 5.21301C10.2317 5.30417 10.2512 5.40191 10.2512 5.50063C10.2512 5.59934 10.2317 5.69708 10.1939 5.78824C10.156 5.8794 10.1005 5.9622 10.0306 6.03188L6.53063 9.53187C6.46095 9.60179 6.37816 9.65727 6.28699 9.69513C6.19583 9.73298 6.09809 9.75247 5.99938 9.75247C5.90067 9.75247 5.80293 9.73298 5.71176 9.69513C5.6206 9.65727 5.53781 9.60179 5.46813 9.53187L3.96813 8.03187C3.89836 7.96211 3.84302 7.87929 3.80527 7.78814C3.76751 7.69698 3.74808 7.59929 3.74808 7.50062C3.74808 7.40196 3.76751 7.30427 3.80527 7.21311C3.84302 7.12196 3.89836 7.03914 3.96813 6.96938C4.03789 6.89961 4.12072 6.84427 4.21187 6.80651C4.30302 6.76876 4.40072 6.74932 4.49938 6.74932C4.59804 6.74932 4.69574 6.76876 4.78689 6.80651C4.87804 6.84427 4.96086 6.89961 5.03063 6.96938L6 7.9375L8.96938 4.9675C9.03916 4.89789 9.12197 4.84272 9.21309 4.80513C9.3042 4.76755 9.40183 4.7483 9.50039 4.74847C9.59895 4.74865 9.69651 4.76825 9.7875 4.80615C9.87848 4.84405 9.9611 4.89952 10.0306 4.96938ZM13.75 7C13.75 8.33502 13.3541 9.64007 12.6124 10.7501C11.8707 11.8601 10.8165 12.7253 9.58312 13.2362C8.34971 13.7471 6.99252 13.8808 5.68314 13.6203C4.37377 13.3598 3.17104 12.717 2.22703 11.773C1.28303 10.829 0.640153 9.62623 0.379702 8.31686C0.119252 7.00749 0.252925 5.65029 0.763816 4.41689C1.27471 3.18349 2.13987 2.12928 3.2499 1.38758C4.35994 0.645881 5.66498 0.25 7 0.25C8.78961 0.251985 10.5053 0.963781 11.7708 2.22922C13.0362 3.49466 13.748 5.2104 13.75 7ZM12.25 7C12.25 5.96165 11.9421 4.94661 11.3652 4.08326C10.7883 3.2199 9.9684 2.54699 9.00909 2.14963C8.04978 1.75227 6.99418 1.6483 5.97578 1.85088C4.95738 2.05345 4.02192 2.55346 3.28769 3.28769C2.55347 4.02191 2.05345 4.95738 1.85088 5.97578C1.64831 6.99418 1.75228 8.04978 2.14964 9.00909C2.547 9.9684 3.2199 10.7883 4.08326 11.3652C4.94662 11.9421 5.96165 12.25 7 12.25C8.39193 12.2485 9.72643 11.6949 10.7107 10.7107C11.6949 9.72642 12.2485 8.39193 12.25 7Z" fill="#37CD83" />
                </svg>
                <span>Account ID available</span>
              </div>
            )}
            <ErrorMessage
              errors={errors}
              name="username"
              render={({ message }) => (
                <div className="error">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1.25C6.66498 1.25 5.35994 1.64588 4.2499 2.38758C3.13987 3.12928 2.27471 4.18349 1.76382 5.41689C1.25292 6.65029 1.11925 8.00749 1.3797 9.31686C1.64015 10.6262 2.28303 11.829 3.22703 12.773C4.17104 13.717 5.37377 14.3598 6.68314 14.6203C7.99252 14.8808 9.34971 14.7471 10.5831 14.2362C11.8165 13.7253 12.8707 12.8601 13.6124 11.7501C14.3541 10.6401 14.75 9.33502 14.75 8C14.748 6.2104 14.0362 4.49466 12.7708 3.22922C11.5053 1.96378 9.78961 1.25199 8 1.25ZM8 13.25C6.96165 13.25 5.94662 12.9421 5.08326 12.3652C4.2199 11.7883 3.547 10.9684 3.14964 10.0091C2.75228 9.04978 2.64831 7.99418 2.85088 6.97578C3.05345 5.95738 3.55347 5.02191 4.28769 4.28769C5.02192 3.55346 5.95738 3.05345 6.97578 2.85088C7.99418 2.6483 9.04978 2.75227 10.0091 3.14963C10.9684 3.54699 11.7883 4.2199 12.3652 5.08326C12.9421 5.94661 13.25 6.96165 13.25 8C13.2485 9.39193 12.6949 10.7264 11.7107 11.7107C10.7264 12.6949 9.39193 13.2485 8 13.25ZM7.25 8.25V5C7.25 4.80109 7.32902 4.61032 7.46967 4.46967C7.61032 4.32902 7.80109 4.25 8 4.25C8.19892 4.25 8.38968 4.32902 8.53033 4.46967C8.67098 4.61032 8.75 4.80109 8.75 5V8.25C8.75 8.44891 8.67098 8.63968 8.53033 8.78033C8.38968 8.92098 8.19892 9 8 9C7.80109 9 7.61032 8.92098 7.46967 8.78033C7.32902 8.63968 7.25 8.44891 7.25 8.25ZM9 10.75C9 10.9478 8.94135 11.1411 8.83147 11.3056C8.72159 11.47 8.56541 11.5982 8.38269 11.6739C8.19996 11.7496 7.99889 11.7694 7.80491 11.7308C7.61093 11.6922 7.43275 11.597 7.2929 11.4571C7.15304 11.3173 7.0578 11.1391 7.01922 10.9451C6.98063 10.7511 7.00044 10.55 7.07612 10.3673C7.15181 10.1846 7.27998 10.0284 7.44443 9.91853C7.60888 9.80865 7.80222 9.75 8 9.75C8.26522 9.75 8.51957 9.85536 8.70711 10.0429C8.89465 10.2304 9 10.4848 9 10.75Z" fill="#D95C4A" />
                  </svg>
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
