import React, { useEffect, useState } from 'react';

import useWalletSelector from './hooks/useWalletSelector';

export default function App() {
  const selectorInstance = useWalletSelector();
  const [fastAuthWallet, setFastAuthWallet] = useState<any>();
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    const getWallet = async () => {
      if (!selectorInstance) return;

      const wallet = await selectorInstance.wallet('fast-auth-wallet');
      setFastAuthWallet(wallet);
    };

    getWallet();
  }, [selectorInstance]);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!fastAuthWallet) return;

      setAccounts(await fastAuthWallet.getAccounts());
    };

    fetchAccounts();
  }, [fastAuthWallet]);

  if (!selectorInstance || !fastAuthWallet) {
    return (
      <div id="loading-ws">Loading wallet selector...</div>
    );
  }

  const handleSignIn = () => {
    fastAuthWallet.signIn({
      contractId: 'v1.social08.testnet',
      isRecovery: true
    });
  };

  const handleSignUp = () => {
    fastAuthWallet.signIn({
      contractId: 'v1.social08.testnet',
      isRecovery: false
    });
  };

  const handleSignOut = async () => {
    await fastAuthWallet.signOut();
  };

  console.log({ accounts });

  return (
    <div id="ws-loaded">
      <p>Wallet selector instance is ready</p>
      <button type="button" onClick={handleSignUp}>
        Create Account
      </button>
      <button type="button" onClick={handleSignIn}>
        Sign In
      </button>
      <button type="button" onClick={handleSignOut}>
        Sign Out
      </button>
      {accounts.length > 0 && <p>User is logged in</p>}
    </div>
  );
}
