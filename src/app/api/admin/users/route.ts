import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

// GET /api/admin/users?q= — list users (admin only) for maintenance
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const q = request.nextUrl.searchParams.get('q')?.trim() || ''
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { name: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { plan: true, status: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
        plan: u.subscriptions[0]?.plan || 'free',
      })),
    })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Admin users error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
