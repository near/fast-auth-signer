'use client'

import { useAuth } from '../../lib/auth'
import { useRouter } from 'next/navigation'

export default function Auth() {
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = () => {
    login()
    router.push('/dashboard')
  }

  return (
    <div>
      <h1>Authentication Page</h1>
      <button onClick={handleLogin}>Login</button>
    </div>
  )
}