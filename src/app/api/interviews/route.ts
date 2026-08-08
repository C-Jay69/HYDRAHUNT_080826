import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get first user (demo user)
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ success: true, sessions: [] })
    }

    const sessions = await db.interviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        scores: true,
      },
    })

    return NextResponse.json({ success: true, sessions })
  } catch (error) {
    console.error('Get interview sessions error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, role, company } = body

    // Get first user (demo user)
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No user found' },
        { status: 404 }
      )
    }

    const session = await db.interviewSession.create({
      data: {
        userId: user.id,
        type: type || 'behavioral',
        role: role || null,
        company: company || null,
        status: 'active',
      },
    })

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('Create interview session error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
