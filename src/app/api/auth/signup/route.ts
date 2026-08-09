import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'
import { signupSchema } from '@/lib/validators'

// POST /api/auth/signup — create account with hashed password, issue session cookie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }

    const { name, email, password } = parsed.data

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 },
      )
    }

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        profile: { create: {} },
        subscriptions: {
          create: { plan: 'free', status: 'active' },
        },
      },
      include: {
        subscriptions: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    await setSessionCookie(user.id)

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.subscriptions[0]?.plan || 'free',
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
