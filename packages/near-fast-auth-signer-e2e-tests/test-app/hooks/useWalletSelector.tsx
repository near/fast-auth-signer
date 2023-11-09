import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupFastAuthWallet } from 'near-fastauth-wallet';
import { useEffect, useState } from 'react';

const networkId = 'testnet';
export default () => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  useEffect(() => {
    async function initSelector() {
      const selectorInstance = await setupWalletSelector({
        network: networkId,
        modules: [
          setupFastAuthWallet({
            relayerUrl:
              networkId === 'testnet'
                ? 'http://34.70.226.83:3030/relay'
                : 'https://near-relayer-mainnet.api.pagoda.co/relay',
          })
        ],
      });
      setSelector(selectorInstance);
    }

    initSelector();
  }, []);

  return selector;
};
