import { yupResolver } from '@hookform/resolvers/yup';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import FormContainer from './styles/FormContainer';
import { BadgeProps } from '../../lib/Badge/Badge';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';
import { openToast } from '../../lib/Toast';
import { inIframe, redirectWithError } from '../../utils';
import { network } from '../../utils/config';
import {
  accountAddressPatternNoSubaccount, getEmailId
} from '../../utils/form-validation';
import { handleCreateAccount } from '../AddDevice/AddDevice';

const StyledContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f2f1ea;
  padding: 0 16px;
  padding-bottom: 60px;

  header {
    text-align: center;
    margin-top: 1em;
  }
`;

const emailProviders = ['gmail', 'yahoo', 'outlook'];

const checkIsAccountAvailable = async (desiredUsername: string) => {
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
};

const schema = yup.object().shape({
  email:    yup.string()
    .required('Email address is required')
    .email('Please enter a valid email address'),
  username: yup.string()
    .required('Please enter a valid account ID')
    .matches(accountAddressPatternNoSubaccount, 'Accounts must be lowercase and may contain - or _, but they may not begin or end with a special character or have two consecutive special characters.')
    .test('is-account-available', 'Username is already taken, try something else.', async (username) => {
      if (username) {
        return checkIsAccountAvailable(username);
      }
      return true;
    })

});

function CreateAccount() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm({
    mode:          'onChange',
    resolver:      yupResolver(schema),
  });

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
        email,
        isRecovery: 'false',
        ...(publicKeyFak ? { publicKeyFak } : {}),
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      const hashParams = new URLSearchParams({ ...(privateKey ? { privateKey } : {}) });
      navigate(`/verify-email?${newSearchParams.toString()}#${hashParams.toString()}`);
    } catch (error: any) {
      console.log('error', error);
      redirectWithError({ success_url, failure_url, error });
      // currently running handleCreateAccount() will throw an error as:
      // error DOMException: The following credential operations can only occur in a document which is same-origin with all of its ancestors: storage/retrieval of 'PasswordCredential' and 'FederatedCredential', storage of 'PublicKeyCredential'.

      // TODO: Need to either fix the logic above or handle a different way
      // const message = errorMessages[error.code] || error.message;
      // const parsedUrl = new URL(failure_url || success_url || window.location.origin);
      // parsedUrl.searchParams.set('code', error.code);
      // parsedUrl.searchParams.set('reason', message);
      // window.location.replace(parsedUrl.href);
      // openToast({
      //   type:  'ERROR',
      //   title: message,
      // });
    }
  };

  useEffect(() => {
    const email = searchParams.get('email');
    const username = searchParams.get('accountId');

    if (email) {
      reset({
        email,
        username: username || getEmailId(email),
      });

      if (username) {
        createAccount({ email, username });
      }
    }
  }, []);

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

  const email = watch('email', '');

  return (
    <StyledContainer>
      <FormContainer onSubmit={handleSubmit(createAccount)}>
        <header>
          <h1 data-test-id="heading_create">Create account</h1>
          <p className="desc">
            <span>Have an account?</span>
            {' '}
            <Link to="/login" data-test-id="create_login_link">Sign in</Link>
          </p>
        </header>
        <Input
          {...register('email')}
          placeholder="user_name@email.com"
          type="email"
          id="email"
          label="Email"
          badges={emailProviders?.reduce((acc, provider) => {
            const currProvider = email?.split('@')[1];

            if (currProvider?.includes(provider)) {
              return [{
                isSelected: true,
                label:      `@${provider}`,
                onClick:    () => setValue('email', email?.split('@')[0])
              }];
            }

            if (acc.some((p) => p.isSelected)) return acc;

            return [...acc, {
              isSelected: false,
              label:      `@${provider}`,
              onClick:    () => setValue('email', `${email}@${provider}.com`)
            }];
          }, [] as BadgeProps[])}
          error={!!errors.email}
        />
        <Input
          {...register('username')}
          label="Account ID"
          success={!errors.username && isDirty && 'Account ID available'}
          error={!!errors.username}
          subText="Use a suggested ID or customize your own"
          autoComplete="webauthn username"
          right=".near"
          placeholder="user_name"
        />
        <Button
          disabled={!isValid}
          label="Continue"
          variant="affirmative"
          type="submit"
          size="large"
          data-test-id="continue_button_create"
        />
      </FormContainer>
    </StyledContainer>
  );
}

export default CreateAccount;
