import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE_NAME, createSessionToken } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import {
  GOOGLE_PKCE_COOKIE,
  GOOGLE_STATE_COOKIE,
  getGoogleCredentials,
  getGoogleRedirectUri,
  safeEqual,
} from '@/lib/google-oauth'

const SESSION_MAX_AGE = 7 * 24 * 3600

interface GoogleUserInfo {
  sub?: string
  email?: string
  email_verified?: boolean | string
  name?: string
  picture?: string
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(GOOGLE_STATE_COOKIE, '', { path: '/api/auth/google', maxAge: 0 })
  response.cookies.set(GOOGLE_PKCE_COOKIE, '', { path: '/api/auth/google', maxAge: 0 })
  return response
}

function redirectWithError(request: NextRequest, code: string) {
  const url = new URL('/', request.nextUrl.origin)
  url.searchParams.set('authError', code)
  return clearOAuthCookies(NextResponse.redirect(url))
}

/**
 * GET /api/auth/google/callback — completes the Google flow.
 *
 * Verifies state + PKCE, exchanges the code using the client secret, rejects
 * unverified email addresses and admin addresses, then issues the same
 * `hydra_session` cookie password login uses. The account is created on first
 * sign-in and linked by verified email afterwards.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const oauthError = params.get('error')

  if (oauthError) {
    return redirectWithError(request, oauthError === 'access_denied' ? 'cancelled' : 'exchange')
  }

  const code = params.get('code')
  const state = params.get('state') ?? undefined
  const storedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value
  const codeVerifier = request.cookies.get(GOOGLE_PKCE_COOKIE)?.value

  if (!code || !safeEqual(state, storedState) || !codeVerifier) {
    return redirectWithError(request, 'state')
  }

  const credentials = getGoogleCredentials()
  if (!credentials) return redirectWithError(request, 'unavailable')

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: getGoogleRedirectUri(request),
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      cache: 'no-store',
    })

    if (!tokenResponse.ok) {
      const detail = (await tokenResponse.text()).slice(0, 300)
      console.error(`Google token exchange failed (HTTP ${tokenResponse.status}): ${detail}`)
      return redirectWithError(request, 'exchange')
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string }
    if (!tokens.access_token) return redirectWithError(request, 'exchange')

    // The token was obtained server-to-server with the client secret, so the
    // userinfo response can be trusted without re-verifying the id_token JWT.
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: 'no-store',
    })
    if (!profileResponse.ok) {
      console.error(`Google userinfo request failed (HTTP ${profileResponse.status})`)
      return redirectWithError(request, 'exchange')
    }

    const profile = (await profileResponse.json()) as GoogleUserInfo
    const email = profile.email?.trim().toLowerCase()
    const verified = profile.email_verified === true || profile.email_verified === 'true'
    if (!email || !verified) {
      return redirectWithError(request, 'unverified')
    }

    // Admins are provisioned explicitly (password + seed script). Never mint
    // admin access from a third-party identity provider.
    if (isAdminEmail(email)) {
      return redirectWithError(request, 'admin')
    }

    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: profile.name?.trim() || null,
          image: profile.picture || null,
          profile: { create: {} },
          subscriptions: { create: { plan: 'free', status: 'active' } },
        },
      })
    } else if (!user.name || !user.image) {
      // Fill gaps only; never overwrite a name the user edited in Settings.
      user = await db.user.update({
        where: { id: user.id },
        data: {
          name: user.name || profile.name?.trim() || null,
          image: user.image || profile.picture || null,
        },
      })
    }

    await db.activityLog
      .create({
        data: { userId: user.id, action: 'Signed in with Google', category: 'account' },
      })
      .catch((err) => console.error('Failed to log Google sign-in:', err))

    const response = NextResponse.redirect(new URL('/', request.nextUrl.origin))
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })
    return clearOAuthCookies(response)
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return redirectWithError(request, 'exchange')
  }
}
