import React, { useEffect, useState } from 'react';

import useWalletSelector from './hooks/useWalletSelector';

export default function App() {
  const selectorInstance = useWalletSelector();
  const [fastAuthWallet, setFastAuthWallet] = useState<any>();
  const [accounts, setAccounts] = useState<any[] | undefined>(undefined);

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
    window.location.reload();
  };

  if (!selectorInstance || !fastAuthWallet || accounts === undefined) {
    return (
      <div id="loading-ws">Loading...</div>
    );
  }

  return (
    <div id="ws-loaded">
      <p>Wallet selector instance is ready</p>
      <button type="button" onClick={handleSignUp}>
        Create Account
      </button>
      <button type="button" onClick={handleSignIn}>
        Sign In
      </button>
      {accounts.length > 0 && (
        <div>
          <button type="button" onClick={handleSignOut}>
            Sign Out
          </button>
          <p>User is logged in</p>
        </div>
      )}
    </div>
  );
}
