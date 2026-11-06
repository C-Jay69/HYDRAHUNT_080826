import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

/** Cookie holding the OAuth `state` nonce (CSRF protection). */
export const GOOGLE_STATE_COOKIE = 'hydra_oauth_state'
/** Cookie holding the PKCE code verifier. */
export const GOOGLE_PKCE_COOKIE = 'hydra_oauth_pkce'
/** Both cookies are scoped to the OAuth routes and live for 10 minutes. */
export const GOOGLE_COOKIE_PATH = '/api/auth/google'
export const GOOGLE_COOKIE_MAX_AGE = 10 * 60

export interface GoogleCredentials {
  clientId: string
  clientSecret: string
}

/** Returns the configured Google OAuth client, or null when it is not set up. */
export function getGoogleCredentials(): GoogleCredentials | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

function appBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const base = configured || request.nextUrl.origin
  return base.replace(/\/+$/, '')
}

/**
 * The `redirect_uri` sent to Google. Google matches this byte-for-byte against
 * the redirect URIs registered on the OAuth client, so an explicit override
 * wins over the derived value.
 */
export function getGoogleRedirectUri(request: NextRequest): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim()
  if (explicit) return explicit
  return `${appBaseUrl(request)}/api/auth/google/callback`
}

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: GOOGLE_COOKIE_PATH,
    maxAge: GOOGLE_COOKIE_MAX_AGE,
  }
}

/** Constant-time comparison for the state nonce. */
export function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
