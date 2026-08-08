import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { status, score } = body

    // Validate session exists
    const session = await db.interviewSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (score !== undefined) updateData.score = score

    const updatedSession = await db.interviewSession.update({
      where: { id: sessionId },
      data: updateData,
    })

    return NextResponse.json({ success: true, session: updatedSession })
  } catch (error) {
    console.error('Update interview session error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
