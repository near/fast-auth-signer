import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../lib/Button';
import { LoginWrapper, InputContainer } from './Login.style';
import { useForm } from 'react-hook-form';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { firebaseAuth } from '../../utils/firebase';
import { isValidEmail } from '../../utils/form-validation';
import { openToast } from '../../lib/Toast';

function Login() {
  const [currentSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
          navigate({
            pathname: '/create-account',
            search: `email=${params.email}`,
          });
        result[0] == 'emailLink' &&
          navigate({
            pathname: '/add-device',
            search: `email=${params.email}`,
          });
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
          size="large"
          type="submit"
          label="Continue"
          variant="affirmative"
          onClick={onSubmit}
        />
      </form>
    </LoginWrapper>
  );
}

export default Login;
