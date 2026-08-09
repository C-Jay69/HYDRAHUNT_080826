import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const user = await requireUser()
    const { sessionId } = await params
    const body = await request.json()
    const { status, score } = body

    // Validate session ownership
    const session = await db.interviewSession.findFirst({
      where: { id: sessionId, userId: user.id },
    })

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (score !== undefined) updateData.score = score

    const updatedSession = await db.interviewSession.update({
      where: { id: sessionId },
      data: updateData,
    })

    if (status === 'completed' && session.status !== 'completed') {
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: 'Completed interview',
          category: 'interview',
          details: `${session.type} — ${session.role || 'General'} (Score: ${score ?? 'N/A'}/40)`,
        },
      })
    }

    return NextResponse.json({ success: true, session: updatedSession })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Update interview session error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
