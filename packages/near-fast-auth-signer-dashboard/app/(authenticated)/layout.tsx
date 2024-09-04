import React from 'react'
import Link from 'next/link'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <nav>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/payment">Payment</Link>
        {/* Add a logout button/link here */}
      </nav>
      <main>{children}</main>
    </div>
  )
}