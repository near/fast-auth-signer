'use client'

import { useAuth } from '../../../lib/auth'

export default function Profile() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <div>
      <h1>User Profile</h1>
      {isAuthenticated ? (
        <>
          <p>Here's your profile information</p>
          {/* Add profile information and edit form here */}
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>You are not authenticated. Please log in.</p>
      )}
    </div>
  )
}