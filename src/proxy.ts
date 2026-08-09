import { NextResponse, type NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/magic-link',
  '/api/webhooks/stripe',
  '/api/health',
]

/**
 * Proxy: route protection (Next.js 16 — replaces middleware).
 * - API routes (except public auth/webhook/health) require a valid session cookie.
 * - Authenticated users visiting /login or /signup are redirected to the dashboard.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionUserId = getSessionFromRequest(request)

  // API protection
  if (pathname.startsWith('/api/')) {
    const isPublic = PUBLIC_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
    if (!isPublic && !sessionUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 },
      )
    }
    return NextResponse.next()
  }

  // Auth pages: redirect already-authenticated users to the app
  if ((pathname === '/login' || pathname === '/signup') && sessionUserId) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/login', '/signup'],
}
