import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../lib/Button';
import { inIframe } from '../../utils';
import AuthIndicator from '../AuthIndicator/AuthIndicator';
import { LoginWrapper, InputContainer, ButtonsContainer } from './Login.style';
import { useForm } from 'react-hook-form';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { firebaseAuth } from '../../utils/firebase';
import { isValidEmail } from '../../utils/form-validation';
import { openToast } from '../../lib/Toast';

function Login({ controller }) {
  const [currentSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSignedIn, setIsSignedIn] = useState<boolean>();

  useEffect(() => {
    async function fetchSignedInStatus() {
      const currentlySignedIn = await controller.isSignedIn();
      setTimeout(() => setIsSignedIn(currentlySignedIn), 2000);
    }

    fetchSignedInStatus();
  }, [controller]);

  useEffect(() => {
    const isRecovery = currentSearchParams.get('isRecovery');
    if (isRecovery) {
      if (isRecovery === 'true') {
        navigate({
          pathname: '/add-device',
          search: currentSearchParams.toString(),
        });
      } else {
        navigate({
          pathname: '/create-account',
          search: currentSearchParams.toString(),
        });
      }
    }
  }, [currentSearchParams]);

  const { handleSubmit, setValue } = useForm();

  const emailCheck = async (params: any) => {
    fetchSignInMethodsForEmail(firebaseAuth, params.email)
      .then((result) => {
        result.length === 0 &&
          navigate('/create-account', { state: { email: params['email'] } });
        result[0] == 'emailLink' &&
          navigate('/add-device', { state: { email: params['email'] } });
      })
      .catch((error: any) => {
        console.error('error', error);
        openToast({
          type: 'ERROR',
          title: error.message,
        });
      });
  };

  const onSubmit = handleSubmit(emailCheck);

  return (
    <LoginWrapper>
      <form onSubmit={onSubmit}>
        <header>
          <h1>Log In</h1>
          <p className="desc">Please enter your email</p>
        </header>

        <InputContainer>
          <label htmlFor="email">Email</label>
          <input
            onChange={(e) => {
              setValue('email', e.target.value);
              if (!isValidEmail(e.target.value)) return;
            }}
            placeholder="user_name@email.com"
            type="email"
            required
          />
        </InputContainer>

        <Button
          type="submit"
          label="Continue"
          variant="affirmative"
          onClick={onSubmit}
        />
      </form>

      {/* <ButtonsContainer>
        <AuthIndicator controller={window.fastAuthController} />
        <Button
          label="New account"
          variant="affirmative"
          onClick={() => {
            navigate({
              pathname: '/create-account',
              search: currentSearchParams.toString(),
            });
            if (!isSignedIn && inIframe()) {
              window.open(
                `${window.location.origin}${location.pathname}${location.search}`,
                '_parent'
              );
            }
          }}
        />
        <Button
          label="Existing account"
          variant="affirmative"
          onClick={() => {
            navigate({
              pathname: '/add-device',
              search: currentSearchParams.toString(),
            });
            if (!isSignedIn && inIframe()) {
              window.open(
                `${window.location.origin}${location.pathname}${location.search}`,
                '_parent'
              );
            }
          }}
        />
      </ButtonsContainer> */}
    </LoginWrapper>
  );
}

export default Login;
