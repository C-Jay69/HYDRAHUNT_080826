import { createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  GOOGLE_PKCE_COOKIE,
  GOOGLE_STATE_COOKIE,
  getGoogleCredentials,
  getGoogleRedirectUri,
  oauthCookieOptions,
} from '@/lib/google-oauth'
import { AUTH_RATE_LIMIT, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * GET /api/auth/google — starts the Google authorization-code flow.
 *
 * A random `state` nonce (CSRF) and PKCE verifier are stored in short-lived
 * httpOnly cookies; only their challenge is sent to Google. The callback
 * compares the returned state against the cookie before exchanging the code.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitResponse(
    `google-oauth:${getClientIp(request)}`,
    AUTH_RATE_LIMIT.limit,
    AUTH_RATE_LIMIT.windowMs,
  )
  if (limited) return limited

  const credentials = getGoogleCredentials()
  if (!credentials) {
    console.error('Google sign-in requested but GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not set.')
    return NextResponse.redirect(new URL('/?authError=unavailable', request.nextUrl.origin))
  }

  const state = randomBytes(32).toString('base64url')
  const codeVerifier = randomBytes(48).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

  const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authorizeUrl.searchParams.set('client_id', credentials.clientId)
  authorizeUrl.searchParams.set('redirect_uri', getGoogleRedirectUri(request))
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', 'openid email profile')
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('code_challenge', codeChallenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')
  authorizeUrl.searchParams.set('prompt', 'select_account')

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(GOOGLE_STATE_COOKIE, state, oauthCookieOptions())
  response.cookies.set(GOOGLE_PKCE_COOKIE, codeVerifier, oauthCookieOptions())
  return response
}
