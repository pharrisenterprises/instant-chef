// src/middleware.ts
import { NextResponse, NextRequest } from 'next/server'

/**
 * Protect routes and auto-logout if 24h cookie is expired.
 * We don't rely on client timers; this runs for each navigation/request.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip public paths & APIs
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname === '/auth' ||
    pathname === '/' ||
    pathname.startsWith('/post-auth')
  ) {
    return NextResponse.next()
  }

  // Check the 24h cookie
  const cookie = req.cookies.get('ic_logout_at')?.value
  if (cookie) {
    const logoutAt = Number(cookie)
    if (Number.isFinite(logoutAt) && Date.now() >= logoutAt) {
      // expired: redirect to server signout (which clears supabase cookies) then to /auth
      const signoutUrl = new URL('/api/signout', req.url)
      // optional: include return path (we’ll just send to /auth anyway)
      return NextResponse.redirect(signoutUrl)
    }
  }

  return NextResponse.next()
}

/**
 * Apply middleware only to routes we want to protect.
 * Add or remove segments based on your app.
 */
export const config = {
  matcher: [
    '/account/:path*',
    '/dashboard/:path*',
    '/orders/:path*',
    '/checkout/:path*',
    // add more protected segments here
  ],
}
