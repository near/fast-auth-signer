'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SignMessageParams } from '@near-wallet-selector/core';
import useWalletSelector from './hooks/useWalletSelector';
import { ReactNode } from 'react';

type AuthContextType = {
  fastAuthWallet: any;
  signAndVerifyMessage: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fastAuthWallet, setFastAuthWallet] = useState<any>(null);
  const selector = useWalletSelector();

  useEffect(() => {
    const getWallet = async () => {
      if (!selector) return;

      const wallet = await selector.wallet('fast-auth-wallet');
      setFastAuthWallet(wallet);
    };

    if (selector) {
      getWallet();
    }
  }, [selector]);

  const signAndVerifyMessage = async (): Promise<boolean> => {
    if (!fastAuthWallet) return false;

    const message = 'Hello, this is a test message!';
    const signMessageParams: SignMessageParams = {
      message,
      recipient: 'myapp.com',
      nonce:     Buffer.alloc(32),
      state:     'test-state',
    };
    try {
      const messageSignature = await fastAuthWallet.signMessage(signMessageParams);
      const isValid = await fastAuthWallet.verifySignMessage(signMessageParams, messageSignature);
      console.log('Message signature is valid:', isValid);
      return isValid;
    } catch (error) {
      console.error('Error signing or verifying message:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ fastAuthWallet, signAndVerifyMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}