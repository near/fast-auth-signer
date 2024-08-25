import { yupResolver } from '@hookform/resolvers/yup';
import React, { useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import { SeparatorWrapper, Separator } from './Login.style';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import WalletSvg from '../../Images/WalletSvg';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';
import { inIframe } from '../../utils';
import environment from '../../utils/environment';
import { FormContainer, StyledContainer } from '../Layout';
import SocialLogin from '../SocialLogin/SocialLogin';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Please enter a valid email address'),
});

// TODO: remove condition when we release on mainnet
const LoginForm = styled(FormContainer)`
  height: ${environment.NETWORK_ID === 'testnet' ? '560px;' : '400px;'}
`;

function Login() {
  const loginFormRef = useRef(null);
  // Send form height to modal if in iframe
  useIframeDialogConfig({ element: loginFormRef.current });

  const [currentSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const isRecovery = currentSearchParams.get('isRecovery');
    if (isRecovery) {
      navigate({
        pathname: isRecovery === 'true' ? '/add-device' : '/create-account',
        search:   currentSearchParams.toString(),
      });
    }
  }, [currentSearchParams, navigate]);

  const { handleSubmit, register, formState: { errors } } = useForm({
    mode:          'all',
    resolver:      yupResolver(schema),
    defaultValues: {
      email: decodeURIComponent(currentSearchParams.get('email') ?? ''),
    }
  });

  const emailCheck = async (
    data: { email: string }
  ) => {
    const newParams = new URLSearchParams(currentSearchParams);
    newParams.set('email', encodeURIComponent(data.email));
    navigate({
      pathname: '/add-device',
      search:   newParams.toString(),
    });
  };

  const handleConnectWallet = () => {
    if (!inIframe()) return;
    window.parent.postMessage({
      closeIframe:        true,
      showWalletSelector:    true,
    }, '*');
  };

  return (
    <StyledContainer inIframe={inIframe()}>

      <LoginForm ref={loginFormRef} inIframe={inIframe()} onSubmit={handleSubmit(emailCheck)}>
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
        <SocialLogin />
        <SeparatorWrapper>
          <Separator />
          Or
          <Separator />
        </SeparatorWrapper>
        <Button
          size="large"
          label={(
            <>
              <WalletSvg />
              {' '}
              Connect Wallet
            </>
          )}
          variant="secondary"
          data-test-id="connect_wallet_button"
          iconLeft="bi bi-wallet"
          onClick={handleConnectWallet}
        />
      </LoginForm>
    </StyledContainer>
  );
}

export default Login;
