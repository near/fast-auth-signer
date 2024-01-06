import { yupResolver } from '@hookform/resolvers/yup';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';

import { LoginWrapper } from './Login.style';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';
import { Spinner } from '../../lib/Spinner';
import { openToast } from '../../lib/Toast';
import { decodeIfTruthy } from '../../utils';
import { useHandleAuthenticationFlow } from '../../utils/auth';
import { firebaseAuth } from '../../utils/firebase';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Please enter a valid email address'),
});

function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const [currentSearchParams] = useSearchParams();

  const searchParamsString = currentSearchParams.toString();

  const handleAuthenticationFlow = useHandleAuthenticationFlow({
    success_url:        decodeIfTruthy(currentSearchParams.get('success_url')),
    failure_url:        decodeIfTruthy(currentSearchParams.get('failure_url')),
    public_key:         decodeIfTruthy(currentSearchParams.get('public_key')),
    contract_id:        decodeIfTruthy(currentSearchParams.get('contract_id')),
    methodNames:        decodeIfTruthy(currentSearchParams.get('methodNames')),
    searchParamsString
  });

  const skipGetKeys = currentSearchParams.get('skipGetKey') === 'true';
  const email = currentSearchParams.get('email');

  const {
    handleSubmit, register, trigger, formState: { errors, isValid }
  } = useForm({
    mode:          'all',
    resolver:      yupResolver(schema),
    defaultValues: {
      email: email ?? '',
    }
  });

  const emailCheck = useCallback(async (
    params: { email: string }
  ) => {
    fetchSignInMethodsForEmail(firebaseAuth, params.email)
      .then(async (result) => {
        if (result.length === 0) {
          navigate({
            pathname: '/create-account',
            search:   `email=${params.email}`,
          });
        } else if (result[0] === 'emailLink') {
          try {
            setIsLoading(true);
            await handleAuthenticationFlow(params.email, skipGetKeys);
          } finally {
            setIsLoading(false);
          }
        }
      })
      .catch((error: any) => {
        console.error('error', error);
        openToast({
          type:  'ERROR',
          title: error.message,
        });
      });
  }, [handleAuthenticationFlow, navigate, skipGetKeys]);

  useEffect(() => {
    if (email && isValid) {
      console.log('email', email);
      emailCheck({ email });
    }

    trigger('email');
  }, [email, emailCheck, isValid, trigger]);

  return (
    <LoginWrapper>
      {isLoading ? <Spinner /> : (
        <form onSubmit={handleSubmit(emailCheck)}>
          <header>
            <h1 data-test-id="heading_login">Log In</h1>
            <p className="desc">Please enter your email</p>
          </header>
          <Input
            {...register('email')}
            placeholder="user_name@email.com"
            type="email"
            dataTest={{ input: 'email_login' }}
            required
            error={errors.email?.message}
          />
          <Button
            size="large"
            type="submit"
            label="Continue"
            variant="affirmative"
            data-test-id="login_button"
          />
        </form>
      )}
    </LoginWrapper>
  );
}

export default Login;
