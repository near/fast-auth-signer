import { Account } from 'near-api-js';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import AuthIndicatorButton from './AuthIndicatorButton';
import { useAuthState } from '../../hooks/useAuthState';
import signAndSend, { getDerivedAddress, getEstimatedFeeBTC, getEstimatedFeeEVM } from '../../utils/multi-chain/multiChain';

const CHAIN_CONFIG = {
  ethereum: {
    providerUrl:
      'https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd',
  },
  bsc: {
    providerUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
  },
  btc: {
    networkType: 'testnet' as const,
    // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
    providerUrl: 'https://blockstream.info/testnet/api/',
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

  const account =  new Account(
    window.fastAuthController.getConnection(),
    window.fastAuthController.getAccountId()
  );

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
                account,
                fastAuthRelayerUrl: 'http://34.136.82.88:3030',
                chainConfig:        {
                  contract:    'multichain-testnet-2.testnet',
                  type:        'BTC',
                  networkType: 'testnet',
                  ...CHAIN_CONFIG.btc,
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
                },
                account,
                'multichain-testnet-2.testnet',
                'http://34.136.82.88:3030'
              );

              console.log({ derivedAddress });
            }}
          >
            Get address
          </button>
          <button
            type="button"
            onClick={async () => {
              const fee = await getEstimatedFeeEVM(
                {
                  to:          '0x4174678c78fEaFd778c1ff319D5D326701449b25',
                  value:       '1000000',
                },
                {
                  type:     'EVM',
                  contract: 'multichain-testnet-2.testnet',
                  ...CHAIN_CONFIG.ethereum,
                },
                'http://34.136.82.88:3030'
              );
              console.log(fee);
            }}
          >
            EVM
          </button>
          <button
            type="button"
            onClick={async () => {
              const fee = await getEstimatedFeeBTC(
                {
                  from:    'n1GBudBaFWz3HE3sUJ5mE8JqozjxGeJhLc',
                  targets: [{
                    address: 'tb1qz9f5pqk3t0lhrsuppyzrctdtrtlcewjhy0jngu',
                    value:   3000
                  }]
                },
                {
                  type:        'BTC',
                  networkType: 'testnet',
                  contract:    'multichain-testnet-2.testnet',
                  ...CHAIN_CONFIG.btc,
                },
                'http://34.136.82.88:3030'
              );
              console.log(fee);
            }}
          >
            BTC
          </button>
        </div>
      )
        : <p>not signed in</p>}
    </AuthIndicatorButton>
  );
}

export default AuthIndicator;
