'use client'

import { useAuth } from '../../../lib/auth'

export default function Payment() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <div>
      <h1>Payment</h1>
      {isAuthenticated ? (
        <>
          <p>Here's your payment information</p>
          {/* Add payment form or information here */}
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>You are not authenticated. Please log in.</p>
      )}
    </div>
  )
}