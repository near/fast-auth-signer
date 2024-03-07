import { Account } from 'near-api-js';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import AuthIndicatorButton from './AuthIndicatorButton';
import { useAuthState } from '../../hooks/useAuthState';
import signAndSend, { getDerivedAddress } from '../../utils/multi-chain/multiChain';

function AuthIndicator() {
  const { authenticated } = useAuthState();
  const navigate = useNavigate();

  useEffect(() => {
    if (authenticated !== 'loading' && authenticated === false) {
      navigate('/login');
    }
  }, [authenticated, navigate]);

  return (
    <AuthIndicatorButton data-test-id="auth-indicator-button" $buttonType="secondary" $isSignedIn={authenticated && authenticated !== 'loading'}>
      {authenticated ? (
        <div>
          <button
            type="button"
            onClick={() => signAndSend({
              transaction:      {
                to:      'tb1qz9f5pqk3t0lhrsuppyzrctdtrtlcewjhy0jngu',
                value:   '0.00003',
              },
              derivedAddress:   '',
              derivedPublicKey: '',
              account:          new Account(
                window.fastAuthController.getConnection(),
                window.fastAuthController.getAccountId()
              ),
              derivedPath:      ',bitcoin,felipe.org'
            })}
          >
            Submit
          </button>
          <button
            type="button"
            onClick={() => getDerivedAddress(
              window.fastAuthController.getAccountId(),
              ',bitcoin,felipe.org',
              'BTC'
            )}
          >
            Get address
          </button>
        </div>
      )
        : <p>not signed in</p>}
    </AuthIndicatorButton>
  );
}

export default AuthIndicator;
