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
                to:      '0x4174678c78fEaFd778c1ff319D5D326701449b25',
                value:   '0.002',
                chainId: 11155111
              },
              derivedAddress:   '',
              derivedPublicKey: '',
              account:          new Account(
                window.fastAuthController.getConnection(),
                window.fastAuthController.getAccountId()
              ),
              derivedPath:      ',ethereum,near.org'
            })}
          >
            Submit
          </button>
          <button
            type="button"
            onClick={() => getDerivedAddress(
              window.fastAuthController.getAccountId(),
              ',ethereum,near.org',
              'ETH'
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
