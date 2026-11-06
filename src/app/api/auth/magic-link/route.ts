import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createMagicLinkToken } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { sendEmail, senderConfigured } from '@/lib/email'
import { magicLinkSchema } from '@/lib/validators'
import { AUTH_RATE_LIMIT, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/auth/magic-link
 * Generates a magic sign-in link for the given email. In production an email is
 * sent via the configured mail provider (SENDER_API_KEY). When no provider is
 * configured the link is returned in the response body for dev/test convenience
 * only — production deployments fail closed with a 503 rather than hand out a
 * working sign-in link.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitResponse(
      `magic-link:${getClientIp(request)}`,
      AUTH_RATE_LIMIT.limit,
      AUTH_RATE_LIMIT.windowMs,
    )
    if (limited) return limited

    const body = await request.json()
    const parsed = magicLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }

    const { email } = parsed.data

    // Never mint a passwordless link for an admin address. Signup already
    // reserves these emails; magic-link must enforce the same rule.
    if (isAdminEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'This email is reserved. Contact the platform owner.' },
        { status: 403 },
      )
    }

    // Always create-or-update the user so magic links work for brand-new emails.
    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          profile: { create: {} },
          subscriptions: { create: { plan: 'free', status: 'active' } },
        },
      })
    }

    const token = createMagicLinkToken(user.id)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const link = `${baseUrl}/api/auth/magic-link/verify?token=${token}`

    const mailConfigured = senderConfigured()
    if (mailConfigured) {
      try {
        await sendEmail({
          to: email,
          subject: 'Your HydraHunt sign-in link',
          html: `<p>Click the link below to sign in to HydraHunt:</p><p><a href="${link}">Sign in</a></p><p>This link expires in 15 minutes.</p>`,
        })
      } catch (err) {
        console.error('Magic link email send failed:', err)
      }
    }

    if (!mailConfigured) {
      // Never expose a working sign-in link from a production deployment.
      // Without a mail provider this endpoint cannot safely authenticate
      // anyone, so fail closed rather than handing out sessions.
      if (process.env.NODE_ENV === 'production') {
        console.error('Magic link requested but SENDER_API_KEY is not configured in production.')
        return NextResponse.json(
          { success: false, error: 'Email sign-in is not configured. Contact the platform owner.' },
          { status: 503 },
        )
      }
      return NextResponse.json({
        success: true,
        message: 'Sign-in link generated (no mail provider configured — see link in response).',
        link,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Sign-in link sent to your email.',
    })
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
