import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get first user (demo user)
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ success: true, logs: [] })
    }

    const logs = await db.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ success: true, logs })
  } catch (error) {
    console.error('Get activity logs error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, category, details } = body

    if (!action || !category) {
      return NextResponse.json(
        { success: false, error: 'Action and category are required' },
        { status: 400 }
      )
    }

    // Get first user (demo user)
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ success: false, error: 'No user found' }, { status: 404 })
    }

    const log = await db.activityLog.create({
      data: {
        userId: user.id,
        action,
        category,
        details: details || null,
      },
    })

    return NextResponse.json({ success: true, log })
  } catch (error) {
    console.error('Create activity log error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
