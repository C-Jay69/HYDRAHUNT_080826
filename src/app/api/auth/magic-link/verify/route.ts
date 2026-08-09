import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie, verifyMagicLinkToken } from '@/lib/auth'

// GET /api/auth/magic-link/verify?token=... — exchange token for a session cookie
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })
    }

    const userId = verifyMagicLinkToken(token)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired link' },
        { status: 400 },
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    await setSessionCookie(user.id)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    return NextResponse.redirect(new URL('/', baseUrl))
  } catch (error) {
    console.error('Magic link verify error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
