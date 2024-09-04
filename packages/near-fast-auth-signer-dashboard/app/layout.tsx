import React from 'react'
import { AuthProvider } from '../lib/auth'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <header>
            {/* Add global header content here */}
          </header>
          {children}
          <footer>
            {/* Add global footer content here */}
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
