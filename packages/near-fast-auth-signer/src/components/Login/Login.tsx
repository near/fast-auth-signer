import { yupResolver } from '@hookform/resolvers/yup';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';

import { LoginWrapper } from './Login.style';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Please enter a valid email address'),
});

function Login() {
  const [currentSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const isRecovery = currentSearchParams.get('isRecovery');
    if (isRecovery) {
      if (isRecovery === 'true') {
        navigate({
          pathname: '/add-device',
          search:   currentSearchParams.toString(),
        });
      } else {
        navigate({
          pathname: '/create-account',
          search:   currentSearchParams.toString(),
        });
      }
    }
  }, [currentSearchParams, navigate]);

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
    navigate({
      pathname: '/add-device',
      search:   `email=${params.email}`,
    });
  };

  return (
    <LoginWrapper>
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
    </LoginWrapper>
  );
}

export default Login;
