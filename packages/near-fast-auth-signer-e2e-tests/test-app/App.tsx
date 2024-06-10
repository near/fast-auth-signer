import { SignedMessage, SignMessageParams } from '@near-wallet-selector/core';
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

  const handleSignMessage = async () => {
    const message = 'Hello, this is a test message!';
    const signMessageParams: SignMessageParams = {
      message,
      recipient: 'myapp.com',
      nonce:     Buffer.alloc(32),
    };
    const signedMessage: SignedMessage = await fastAuthWallet.signMessage(signMessageParams);
    console.log({ signedMessage });
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

      {accounts.length > 0 ? (
        <div>
          <button type="button" onClick={handleSignOut}>
            Sign Out
          </button>
          <p>User is logged in</p>
        </div>
      ) : (
        <button type="button" onClick={handleSignIn}>
          Sign In
        </button>
      )}
      <button
        type="button"
        data-test-id="sign-transaction-button"
        onClick={() => {
          fastAuthWallet
            .signAndSendTransaction(
              JSON.parse(window.localStorage.transactionData)
            );
        }}
      >
        Sign and send transaction
      </button>
      <button
        type="button"
        data-test-id="sign-message-button"
        onClick={handleSignMessage}
      >
        Sign Message
      </button>
    </div>
  );
}
