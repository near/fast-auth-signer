'use client'

import { useAuth } from '../../../lib/auth'

export default function Dashboard() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <div>
      <h1>Dashboard</h1>
      {isAuthenticated ? (
        <>
          <p>Welcome to your dashboard!</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>You are not authenticated. Please log in.</p>
      )}
    </div>
  )
}