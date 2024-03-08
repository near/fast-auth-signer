import { Account } from 'near-api-js';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import AuthIndicatorButton from './AuthIndicatorButton';
import { useAuthState } from '../../hooks/useAuthState';
import signAndSend, { getDerivedAddress } from '../../utils/multi-chain/multiChain';

const CHAIN_CONFIG = {
  ethereum: {
    providerUrl:
      'https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd',
    scanUrl: 'https://sepolia.etherscan.io',
  },
  bsc: {
    providerUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    scanUrl:     'https://testnet.bscscan.com',
  },
  btc: {
    networkType: 'testnet' as const,
    // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
    providerUrl: 'https://blockstream.info/testnet/api/',
    scanUrl:     'https://blockstream.info/testnet',
  },
};

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
            onClick={async () => {
              const res = await signAndSend({
                transaction:      {
                  to:          'tb1qz9f5pqk3t0lhrsuppyzrctdtrtlcewjhy0jngu',
                  value:       '0.00003',
                  derivedPath:      ',ethereum,felipe.org'
                },
                account:          new Account(
                  window.fastAuthController.getConnection(),
                  window.fastAuthController.getAccountId()
                ),
                fastAuthRelayerUrl: 'http://34.136.82.88:3030',
                chainConfig:        {
                  type: 'BTC',
                  ...CHAIN_CONFIG.btc
                }
              });

              if ('transactionHash' in res) {
                console.log(res.transactionHash);
              } else if ('errorMessage' in res) {
                console.error(res.errorMessage);
              }
            }}
          >
            Submit
          </button>
          <button
            type="button"
            onClick={async () => {
              const derivedAddress = await getDerivedAddress(
                window.fastAuthController.getAccountId(),
                ',ethereum,felipe.org',
                {
                  type:        'BTC',
                  networkType: 'testnet'
                }
              );

              console.log({ derivedAddress });
            }}
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
