// CreateAccountForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import React, { useEffect, forwardRef, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import isEmail from 'validator/lib/isEmail';
import * as yup from 'yup';

import { CreateAccountFormValues } from '../../hooks/useCreateAccount';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';
import { openToast } from '../../lib/Toast';
import { recordEvent } from '../../utils/analytics';
import { network } from '../../utils/config';
import { accountAddressPatternNoSubAccount, getEmailId } from '../../utils/form-validation';
import { FormContainer } from '../Layout';

const CreateAccountFormContainer = styled(FormContainer)`
  height: 500px;
`;

const emailProviders = ['gmail', 'yahoo', 'outlook'];

const checkIsAccountAvailable = async (desiredUsername: string) => {
  try {
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
      return true;
    }

    if (data?.result?.code_hash) {
      return false;
    }

    return false;
  } catch (error) {
    console.log(error);
    openToast({
      title: error.message,
      type:  'ERROR',
    });
    return false;
  }
};

const schema = yup.object().shape({
  email: yup
    .string()
    .required('Email address is required')
    .test('is-email-valid', async (email, context) => {
      let message;
      if (!isEmail(email)) {
        message = 'Please enter a valid email address';
      } else {
        return true;
      }

      return context.createError({
        message,
        path: context.path,
      });
    }),
  username: yup
    .string()
    .required('Please enter a valid account ID')
    .matches(
      accountAddressPatternNoSubAccount,
      'Accounts must be lowercase and may contain - or _, but they may not begin or end with a special character or have two consecutive special characters.'
    )
    .test('is-account-available', async (username, context) => {
      if (username) {
        const isAvailable = await checkIsAccountAvailable(username);
        if (!isAvailable) {
          return context.createError({
            message: `${username}.${network.fastAuth.accountIdSuffix} is taken, try something else.`,
            path:    context.path,
          });
        }
      }

      return true;
    }),
});

type CreateAccountFormProps = {
  onSubmit: SubmitHandler<CreateAccountFormValues>;
  loading: boolean;
  initialValues?: CreateAccountFormValues;
}

// eslint-disable-next-line max-len
const CreateAccountForm = forwardRef<HTMLFormElement, CreateAccountFormProps>(({
  onSubmit, loading, initialValues
}, ref) => {
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors, isValid },
  } = useForm({
    mode:          'all',
    resolver:      yupResolver(schema),
    defaultValues: initialValues ?? {
      email:    '',
      username: '',
    },
  });

  const formsEmail = watch('email');
  const formsUsername = watch('username');

  useEffect(() => {
    const email = searchParams.get('email');
    const username = searchParams.get('accountId');

    if (email) {
      reset({
        email,
        username: username || getEmailId(email),
      });
      trigger();

      if (username) {
        handleSubmit(onSubmit)();
      }
    }
  }, [onSubmit, handleSubmit, reset, searchParams, trigger]);

  useEffect(() => {
    if (formsEmail?.split('@').length > 1 && !formsUsername) {
      setValue('username', getEmailId(formsEmail), { shouldValidate: true, shouldDirty: true });
    }
  }, [formsEmail, formsUsername, setValue]);

  const handleSignInClick = () => {
    recordEvent('click-has-account-sign-in');
  };

  const loginQueryParam = useCallback(() => {
    searchParams.set('isRecovery', 'true');
    return searchParams.toString();
  }, [searchParams]);

  return (
    <CreateAccountFormContainer ref={ref} onSubmit={handleSubmit(onSubmit)}>
      <header>
        <h1 data-test-id="heading_create">Create account</h1>
        <p className="desc">
          <span>Have an account?</span>
          {' '}
          <Link
            to={{ pathname: '/login', search: loginQueryParam() }}
            data-test-id="create_login_link"
            onClick={handleSignInClick}
          >
            Sign in
          </Link>
        </p>
      </header>
      <Input
        {...register('email')}
        debounceTime={1000}
        placeholder="user_name@email.com"
        type="email"
        label="Email"
        error={errors?.email?.message}
        badges={emailProviders?.reduce((acc, provider) => {
          const username = formsEmail?.split('@')[0];
          const currProvider = formsEmail?.split('@')[1];

          if (currProvider?.includes(provider)) {
            return [
              {
                isSelected: true,
                label:      `@${provider}`,
                onClick:    () => setValue('email', username, { shouldValidate: true }),
              },
            ];
          }

          if (acc.some((p) => p.isSelected)) return acc;

          return [
            ...acc,
            {
              isSelected: false,
              label:      `@${provider}`,
              onClick:    () => setValue('email', `${username}@${provider}.com`, {
                shouldValidate: true,
              }),
            },
          ];
        }, [])}
        dataTest={{
          input: 'email_create',
          error: 'create_email_subtext_error',
        }}
      />
      <Input
        {...register('username')}
        debounceTime={1000}
        label="Account ID"
        success={!errors.username && formsUsername && 'Account ID available'}
        error={errors?.username?.message}
        subText="Use a suggested ID or customize your own"
        autoComplete="webauthn username"
        right={`.${network.fastAuth.accountIdSuffix}`}
        placeholder="user_name"
        dataTest={{
          input:   'username_create',
          error:   'account_available_notice',
          success: 'create-error-subtext',
        }}
      />
      <Button
        disabled={!isValid || loading}
        label={loading ? 'Please wait...' : 'Continue'}
        variant="affirmative"
        type="submit"
        size="large"
        data-test-id="continue_button_create"
      />
    </CreateAccountFormContainer>
  );
});

export default CreateAccountForm;
