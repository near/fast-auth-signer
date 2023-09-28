import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import AuthIndicatorButton from './AuthIndicatorButton';
import { useAuthState } from '../../lib/useAuthState';

function AuthIndicator() {
  const { authenticated, controllerState } = useAuthState();
  const navigate = useNavigate();

  useEffect(() => {
    if (controllerState !== 'loading' && authenticated === false) {
      navigate('/login');
    }
  }, [authenticated, controllerState]);

  return (
    <AuthIndicatorButton $buttonType="secondary" $isSignedIn={authenticated && controllerState !== 'loading'}>
      {authenticated ? <p>signed in</p>
        : <p>not signed in</p>}
    </AuthIndicatorButton>
  );
}

export default AuthIndicator;
