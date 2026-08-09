import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { activityLogCreateSchema } from '@/lib/validators'

export async function GET() {
  try {
    const user = await requireUser()
    const logs = await db.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ success: true, logs })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Get activity logs error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = activityLogCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Action and category are required' },
        { status: 400 },
      )
    }
    const { action, category, details } = parsed.data

    const log = await db.activityLog.create({
      data: { userId: user.id, action, category, details: details || null },
    })

    return NextResponse.json({ success: true, log })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Create activity log error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
