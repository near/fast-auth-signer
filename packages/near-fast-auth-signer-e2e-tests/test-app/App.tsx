import { SignMessageParams } from '@near-wallet-selector/core';
import { FastAuthWallet } from 'near-fastauth-wallet';
import React, { useEffect, useState } from 'react';

import SignMultiChain, { TransactionFormValues } from './components/SignMultiChain';
import useWalletSelector from './hooks/useWalletSelector';
import { getDomain, toSatoshis, toWei } from '../utils/multiChain';

type FastAuthWalletInterface = Awaited<ReturnType<typeof FastAuthWallet>>;

export default function App() {
  const selectorInstance = useWalletSelector();
  const [fastAuthWallet, setFastAuthWallet] = useState<FastAuthWalletInterface | null>(null);
  const [accounts, setAccounts] = useState<any[] | undefined>(undefined);
  const [isMessageSignatureValid, setIsMessageSignatureValid] = useState(false);

  useEffect(() => {
    const getWallet = async () => {
      if (!selectorInstance) return;

      const wallet = await selectorInstance.wallet('fast-auth-wallet');
      // Using any because the selector exposes the NEP wallet interface that cannot be cast to the current FastAuthWallet interface
      setFastAuthWallet(wallet as any);
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
      state:     'test-state',
    };
    try {
      setIsMessageSignatureValid(false);
      const messageSignature = await fastAuthWallet.signMessage(signMessageParams);
      if (messageSignature) {
        const isValid = await fastAuthWallet.verifySignMessage(signMessageParams, messageSignature);
        setIsMessageSignatureValid(isValid);
      }
    } catch (error) {
      console.error('Error signing message:', error);
    }
  };

  const handleSubmitTransaction = async (values: TransactionFormValues) => {
    const domain = getDomain(values.keyType);

    if (values.assetType === 0) {
      await fastAuthWallet.signMultiChainTransaction({
        derivationPath: {
          chain: values.assetType,
          ...(domain ? { domain } : {}),
        },
        transaction: {
          to:      values.address,
          value:   toSatoshis(Number(values.amount)),
        },
        chainConfig: {
          network: 'testnet',
        },
      });
    } else if (values.assetType === 60) {
      await fastAuthWallet.signMultiChainTransaction({
        derivationPath: {
          chain: values.assetType,
          ...(domain ? { domain } : {}),
        },
        transaction: {
          to:      values.address,
          value:   toWei(Number(values.amount)),
          chainId: values.chainId,
        },
      });
    }
  };

  if (!selectorInstance || !fastAuthWallet || accounts === undefined) {
    return (
      <div id="loading-ws">Loading...</div>
    );
  }

  return (
    <div id="ws-loaded" data-testid="app-container">
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
      <SignMultiChain onSubmitForm={handleSubmitTransaction} />
      <button
        type="button"
        data-testid="sign-transaction-button"
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
      <p>{isMessageSignatureValid ? 'Message Signature is valid' : 'Message Signature is not valid'}</p>
    </div>
  );
}
