import { yupResolver } from '@hookform/resolvers/yup';
import * as React from 'react';
import {
  useCallback, useEffect, useRef, useState
} from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import isEmail from 'validator/lib/isEmail';
import * as yup from 'yup';

import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import { useInvalidContractId } from '../../hooks/useInvalidContractId';
import { BadgeProps } from '../../lib/Badge/Badge';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';
import { openToast } from '../../lib/Toast';
import { inIframe } from '../../utils';
import { recordEvent } from '../../utils/analytics';
import { basePath, network } from '../../utils/config';
import {
  accountAddressPatternNoSubAccount, getEmailId
} from '../../utils/form-validation';
import { handleCreateAccount } from '../AddDevice/AddDevice';
import { FormContainer, StyledContainer } from '../Layout';
import { getMultiChainContract } from '../SignMultichain/utils';

const CreateAccountForm = styled(FormContainer)`
  height: 500px;
`;

const emailProviders = ['gmail', 'yahoo', 'outlook'];

const checkIsAccountAvailable = async (desiredUsername: string): Promise<boolean> => {
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
  } catch (error: any) {
    console.log(error);
    openToast({
      title: error.message,
      type:  'ERROR'
    });
    return false;
  }
};

const schema = yup.object().shape({
  email:    yup
    .string()
    .required('Email address is required')
    .test(
      'is-email-valid',
      async (email, context) => {
        let message: string;
        if (!isEmail(email)) {
          message = 'Please enter a valid email address';
        } else {
          return true;
        }

        return context.createError({
          message,
          path:    context.path
        });
      }
    ),
  username: yup
    .string()
    .required('Please enter a valid account ID')
    .matches(
      accountAddressPatternNoSubAccount,
      'Accounts must be lowercase and may contain - or _, but they may not begin or end with a special character or have two consecutive special characters.'
    )
    .test(
      'is-account-available',
      async (username, context) => {
        if (username) {
          const isAvailable = await checkIsAccountAvailable(username);
          if (!isAvailable) {
            return context.createError({
              message: `${username}.${network.fastAuth.accountIdSuffix} is taken, try something else.`,
              path:    context.path
            });
          }
        }

        return true;
      }
    )
});

function CreateAccount() {
  const createAccountFormRef = useRef(null);
  // Send form height to modal if in iframe
  useIframeDialogConfig({ element: createAccountFormRef.current });

  const [searchParams] = useSearchParams();
  const [inFlight, setInFlight] = useState(false);

  useInvalidContractId(getMultiChainContract(), 'CreateAccountError');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: {
      errors, isValid
    },
  } = useForm({
    mode:          'all',
    resolver:      yupResolver(schema),
    defaultValues: {
      email:    '',
      username: '',
    }
  });

  const formsEmail = watch('email');
  const formsUsername = watch('username');

  const createAccount = useCallback(async (data: { email: string; username: string; }) => {
    recordEvent('click-signup-continue');
    setInFlight(true);
    const success_url = searchParams.get('success_url');
    const failure_url = searchParams.get('failure_url');
    const public_key =  searchParams.get('public_key');
    const methodNames = searchParams.get('methodNames');
    const contract_id = searchParams.get('contract_id');

    try {
      const fullAccountId = `${data.username}.${network.fastAuth.accountIdSuffix}`;
      const {
        accountId
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
        email:      data.email,
        isRecovery: 'false',
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      window.parent.postMessage({
        type:   'method',
        method: 'query',
        id:     1234,
        params: {
          request_type: 'complete_authentication',
        }
      }, '*');
      window.open(`${window.location.origin}${basePath ? `/${basePath}` : ''}/verify-email?${newSearchParams.toString()}`, '_parent');
      // navigate(`/verify-email?${newSearchParams.toString()}`);
    } catch (error: any) {
      recordEvent('signup-error', { errorMessage: error.message });
      console.log('error', error);

      window.parent.postMessage({
        type:    'CreateAccountError',
        message: typeof error?.message === 'string' ? error.message : 'Something went wrong'
      }, '*');

      openToast({
        type:  'ERROR',
        title: error.message,
      });
      // redirectWithError({ success_url, failure_url, error });
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
    } finally {
      setInFlight(false);
    }
  }, [searchParams]);
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
        handleSubmit(createAccount)();
      }
    }
  }, [createAccount, handleSubmit, reset, searchParams, trigger]);

  useEffect(() => {
    if (formsEmail?.split('@').length > 1 && !formsUsername) {
      setValue('username', getEmailId(formsEmail), { shouldValidate: true, shouldDirty: true });
    }
  // Should only trigger when email changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formsEmail, setValue]);

  const handleSignInClick = () => {
    recordEvent('click-has-account-sign-in');
  };

  return (
    <StyledContainer inIframe={inIframe()}>
      <CreateAccountForm ref={createAccountFormRef} inIframe={inIframe()} onSubmit={handleSubmit(createAccount)}>
        <header>
          <h1 data-test-id="heading_create">Create account</h1>
          <p className="desc">
            <span>Have an account?</span>
            {' '}
            <Link to="/login" data-test-id="create_login_link" onClick={handleSignInClick}>Sign in</Link>
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
              return [{
                isSelected: true,
                label:      `@${provider}`,
                onClick:    () => setValue('email', username, { shouldValidate: true })
              }];
            }

            if (acc.some((p) => p.isSelected)) return acc;

            return [...acc, {
              isSelected: false,
              label:      `@${provider}`,
              onClick:    () => setValue('email', `${username}@${provider}.com`, {
                shouldValidate: true
              })
            }];
          }, [] as BadgeProps[])}
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
          disabled={!isValid || inFlight}
          label={inFlight ? 'Sending...' : 'Continue'}
          variant="affirmative"
          type="submit"
          size="large"
          data-test-id="continue_button_create"
        />
      </CreateAccountForm>
    </StyledContainer>
  );
}

export default CreateAccount;
