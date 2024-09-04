import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupFastAuthWallet } from 'near-fastauth-wallet';
import { useEffect, useState } from 'react';

const networkId = 'testnet';

const useWalletSelector = () => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);

  useEffect(() => {
    async function initSelector() {
      const selectorInstance = await setupWalletSelector({
        network: networkId,
        modules: [
          setupFastAuthWallet({
            relayerUrl:
              networkId === 'testnet'
                ? 'https://near-relayer-testnet.api.pagoda.co/relay'
                : 'https://near-relayer-mainnet.api.pagoda.co/relay',
            walletUrl: 'http://localhost:3000'
          })
        ],
      });
      setSelector(selectorInstance);
    }

    initSelector();
  }, []);

  return selector;
};

export default useWalletSelector;