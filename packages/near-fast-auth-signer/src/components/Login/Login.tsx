import { yupResolver } from '@hookform/resolvers/yup';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';

import { LoginWrapper } from './Login.style';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';
import { Spinner } from '../../lib/Spinner';
import { openToast } from '../../lib/Toast';
import { useHandleAuthenticationFlow } from '../../utils/auth';
import { firebaseAuth } from '../../utils/firebase';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Please enter a valid email address'),
});

function Login() {
  const [currentSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const handleAuthenticationFlow = useHandleAuthenticationFlow();
  const skipGetKeys = currentSearchParams.get('skipGetKey') === 'true';
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleCheck = async () => {
      const isRecovery = currentSearchParams.get('isRecovery');
      const email = currentSearchParams.get('email');
      if (isRecovery) {
        if (isRecovery === 'true' && email) {
          try {
            setIsLoading(true);
            await handleAuthenticationFlow(email, skipGetKeys);
          } finally {
            setIsLoading(false);
          }
        } else if (isRecovery === 'true' && !email) {
          navigate({
            pathname: '/login',
            search:   currentSearchParams.toString(),
          });
        } else {
          navigate({
            pathname: '/create-account',
            search:   currentSearchParams.toString(),
          });
        }
      }
    };

    handleCheck();
  }, [currentSearchParams, handleAuthenticationFlow, navigate, skipGetKeys]);

  const { handleSubmit, register, formState: { errors } } = useForm({
    mode:          'all',
    resolver:      yupResolver(schema),
    defaultValues: {
      email: currentSearchParams.get('email') ?? '',
    }
  });

  const emailCheck = async (
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
  };

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
