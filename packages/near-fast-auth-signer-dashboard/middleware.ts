import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')
  const isAuthenticated = !!token
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')

  if (!isAuthenticated && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}