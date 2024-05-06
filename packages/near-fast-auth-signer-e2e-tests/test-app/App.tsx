import React, { useEffect, useState } from 'react';

import useWalletSelector from './hooks/useWalletSelector';

export default function App() {
  const selectorInstance = useWalletSelector();
  const [fastAuthWallet, setFastAuthWallet] = useState<any>();

  useEffect(() => {
    const getWallet = async () => {
      const wallet = await selectorInstance.wallet('fast-auth-wallet');
      setFastAuthWallet(wallet);
    };

    getWallet();
  }, [selectorInstance]);

  if (!selectorInstance || !fastAuthWallet) {
    return (
      <div id="loading-ws">Loading wallet selector...</div>
    );
  }

  const handleSignIn = () => {
    fastAuthWallet.signIn({
      contractId: 'example.near',
      email:      'user@example.com',
      isRecovery: true
    });
  };

  const handleSignUp = () => {
    fastAuthWallet.signIn({
      contractId: 'example.near',
      email:      'user@example.com',
      isRecovery: false
    });
  };

  return (
    <div id="ws-loaded">
      <p>Wallet selector instance is ready</p>
      <button type="button" onClick={handleSignUp}>
        Create Account
      </button>
      <button type="button" onClick={handleSignIn}>
        Sign In
      </button>
    </div>
  );
}
