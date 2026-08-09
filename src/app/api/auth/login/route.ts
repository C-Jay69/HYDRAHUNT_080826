import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie, verifyPassword } from '@/lib/auth'
import { loginSchema } from '@/lib/validators'

// POST /api/auth/login — verify credentials, issue session cookie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }

    const { email, password } = parsed.data

    const user = await db.user.findUnique({
      where: { email },
      include: {
        subscriptions: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      )
    }

    const valid = verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      )
    }

    await setSessionCookie(user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.subscriptions[0]?.plan || 'free',
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
