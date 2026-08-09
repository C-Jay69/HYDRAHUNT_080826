import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { interviewSessionCreateSchema } from '@/lib/validators'

export async function GET() {
  try {
    const user = await requireUser()
    const sessions = await db.interviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        scores: true,
      },
    })

    return NextResponse.json({ success: true, sessions })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Get interview sessions error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = interviewSessionCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }
    const { type, role, company } = parsed.data

    const session = await db.interviewSession.create({
      data: {
        userId: user.id,
        type,
        role: role || null,
        company: company || null,
        status: 'active',
      },
    })

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: `Started ${type} interview`,
        category: 'interview',
        details: `${role || 'General'} at ${company || 'unknown company'}`,
      },
    })

    return NextResponse.json({ success: true, session })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Create interview session error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
