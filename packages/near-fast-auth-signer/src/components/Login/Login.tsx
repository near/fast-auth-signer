import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import { SeparatorWrapper, Separator } from './Login.style';
import useElementHeightForIframe from '../../hooks/useElementHeightForIframe';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';
import { openToast } from '../../lib/Toast';
import { inIframe } from '../../utils';
import { userExists } from '../../utils/firebase';
import { FormContainer, StyledContainer } from '../Layout';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Please enter a valid email address'),
});

const LoginForm = styled(FormContainer)`
  height: 400px;
`;

function Login() {
  // Send form height to modal if in iframe
  useElementHeightForIframe(document.querySelector('#loginForm'));

  const [currentSearchParams] = useSearchParams();
  const navigate = useNavigate();

  /*  useEffect(() => {
    const isRecovery = currentSearchParams.get('isRecovery');
    if (isRecovery) {
      if (isRecovery === 'true') {
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
  }, [currentSearchParams, navigate]); */

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
    try {
      if (await userExists(params.email)) {
        navigate({
          pathname: '/add-device',
          search:   `email=${params.email}`,
        });
      } else {
        navigate({
          pathname: '/create-account',
          search:   `email=${params.email}`,
        });
      }
    } catch (e) {
      console.error('error', e);
      openToast({
        type:  'ERROR',
        title: e.message,
      });
    }
  };

  return (
    <StyledContainer inIframe={inIframe()}>

      <LoginForm id="loginForm" inIframe={inIframe()} onSubmit={handleSubmit(emailCheck)}>
        <header>
          <h1 data-test-id="heading_login">Log In</h1>
          <p className="desc">Please enter your email</p>
        </header>
        <Input
          {...register('email')}
          placeholder="your@email.com"
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

        <SeparatorWrapper>
          <Separator />
          Or
          <Separator />
        </SeparatorWrapper>
        <Button
          size="large"
          label="Connect Wallet"
          variant="secondary"
          data-test-id="connect_wallet_button"
          iconLeft="bi bi-wallet"
        />
      </LoginForm>
    </StyledContainer>
  );
}

export default Login;
