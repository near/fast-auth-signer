'use client'

import { useAuth } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Auth() {
  const { fastAuthWallet, signAndVerifyMessage } = useAuth()
  const [isMessageValid, setIsMessageValid] = useState<boolean | null>(null);
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      if (fastAuthWallet) {
        const accounts = await fastAuthWallet.getAccounts();
        if (accounts.length > 0) {
          router.push('/');
        }
      }
    };
    checkAuth();
  }, [fastAuthWallet, router]);

  const handleLogin = async () => {
    if (fastAuthWallet) {
      const isValid = await signAndVerifyMessage();
      if (isValid) {
        setIsMessageValid(true);
        router.push('/');
      } else {
        setIsMessageValid(false);
      }
    }
  }

  return (
    <div>
      <h1>Authentication Page</h1>
      <button onClick={handleLogin}>Login</button>
      {isMessageValid !== null && (
        <p>Message signature is {isMessageValid ? 'valid' : 'invalid'}</p>
      )}
    </div>
  )
}