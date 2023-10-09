import { fetchSignInMethodsForEmail } from 'firebase/auth';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { LoginWrapper, InputContainer } from './Login.style';
import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { firebaseAuth } from '../../utils/firebase';
import { isValidEmail } from '../../utils/form-validation';

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
  }, [currentSearchParams]);

  const { handleSubmit, setValue } = useForm();

  const emailCheck = async (params: any) => {
    fetchSignInMethodsForEmail(firebaseAuth, params.email)
      .then((result) => {
        if (result.length === 0) {
          navigate({
            pathname: '/create-account',
            search:   `email=${params.email}`,
          });
        } else if (result[0] === 'emailLink') {
          navigate({
            pathname: '/add-device',
            search:   `email=${params.email}`,
          });
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

  const onSubmit = handleSubmit(emailCheck);

  return (
    <LoginWrapper>
      <form onSubmit={onSubmit}>
        <header>
          <h1>Log In</h1>
          <p className="desc">Please enter your email</p>
        </header>

        <InputContainer>
          <label htmlFor="email">
            Email
            <input
              onChange={(e) => {
                setValue('email', e.target.value);
                // eslint-disable-next-line
                if (!isValidEmail(e.target.value)) return;
              }}
              placeholder="user_name@email.com"
              type="email"
              required
            />
          </label>
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
