import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createMagicLinkToken } from '@/lib/auth'
import { magicLinkSchema } from '@/lib/validators'

/**
 * POST /api/auth/magic-link
 * Generates a magic sign-in link for the given email. In production an email is
 * sent via the configured mail provider (RESEND_API_KEY). When no provider is
 * configured the link is returned in the response body (dev/test convenience).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = magicLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }

    const { email } = parsed.data

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

    const mailConfigured = Boolean(process.env.RESEND_API_KEY)
    if (mailConfigured) {
      try {
        // Lazy-import to avoid bundling the SDK when unused.
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.MAIL_FROM || 'HydraHunt <no-reply@hydrahunt.ai>',
          to: email,
          subject: 'Your HydraHunt sign-in link',
          html: `<p>Click the link below to sign in to HydraHunt:</p><p><a href="${link}">Sign in</a></p><p>This link expires in 15 minutes.</p>`,
        })
      } catch (err) {
        console.error('Magic link email send failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: mailConfigured
        ? 'Sign-in link sent to your email.'
        : 'Sign-in link generated (no mail provider configured — see link in response).',
      // Only expose the link when no mail provider is configured.
      ...(mailConfigured ? {} : { link }),
    })
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
