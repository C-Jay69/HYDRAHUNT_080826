import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

// PATCH /api/admin/users/[id] — set a user's plan (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const plan = body?.plan as string | undefined
    if (!plan || !['free', 'mission_pack', 'hunter', 'beastmaster'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan. Use free, mission_pack, hunter, or beastmaster.' },
        { status: 400 },
      )
    }

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const existing = await db.subscription.findFirst({
      where: { userId: id, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      await db.subscription.update({ where: { id: existing.id }, data: { plan } })
    } else {
      await db.subscription.create({ data: { userId: id, plan, status: 'active' } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Admin update user error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
