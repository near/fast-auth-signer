'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { fastAuthWallet, signAndVerifyMessage } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMessageValid, setIsMessageValid] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      if (fastAuthWallet) {
        const accounts = await fastAuthWallet.getAccounts();
        setIsAuthenticated(accounts.length > 0);
      }
    };
    checkAuth();
  }, [fastAuthWallet]);

  const handleSignIn = async () => {
    if (fastAuthWallet) {
      const isValid = await signAndVerifyMessage();
      if (isValid) {
        setIsAuthenticated(true);
        setIsMessageValid(true);
      } else {
        setIsMessageValid(false);
      }
    }
  };

  const handleSignOut = async () => {
    if (fastAuthWallet) {
      await fastAuthWallet.signOut();
      setIsAuthenticated(false);
      setIsMessageValid(null);
    }
  };

  return (
    <div>
      <h1>Fast Auth Signer Dashboard</h1>
      {isAuthenticated ? (
        <>
          <p>User is logged in</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </>
      ) : (
        <button onClick={handleSignIn}>Sign In</button>
      )}
      {isMessageValid !== null && (
        <p>Message signature is {isMessageValid ? 'valid' : 'invalid'}</p>
      )}
    </div>
  );
}
