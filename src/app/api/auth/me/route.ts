import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { profileUpdateSchema } from '@/lib/validators'

// GET /api/auth/me — return the current authenticated user, or 401
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({ where: { userId: user.id } })
    const activeSubscription = await db.subscription.findFirst({
      where: { userId: user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        profile,
        plan: activeSubscription?.plan || 'free',
        isAdmin: isAdminEmail(user.email),
      },
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/auth/me — update the current user's profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = profileUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }

    const data = parsed.data
    const { name, ...profileData } = data

    const profileUpdate: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(profileData)) {
      if (value !== undefined) profileUpdate[key] = value
    }

    const [updatedUser] = await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: name !== undefined ? { name } : {},
        include: { profile: true },
      }),
      db.profile.upsert({
        where: { userId: user.id },
        update: profileUpdate,
        create: { userId: user.id, ...profileUpdate },
      }),
    ])

    const activeSubscription = await db.subscription.findFirst({
      where: { userId: user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        profile: updatedUser.profile,
        plan: activeSubscription?.plan || 'free',
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
