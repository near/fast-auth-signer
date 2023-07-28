import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../lib/Button';
import AuthIndicator from '../AuthIndicator/AuthIndicator';

function Login() {
  const [currentSearchParams] = useSearchParams()
  const navigate = useNavigate()
  return (
    <div>
      Login route
      <AuthIndicator controller={window.fastAuthController} />
      <Button
        label="Existing account"
        variant="affirmative"
        onClick={() => navigate({
          pathname: '/add-device',
          search:   currentSearchParams.toString()
        })}
      />
    </div>
  );
}

export default Login;