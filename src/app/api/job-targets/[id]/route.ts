import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { jobTargetUpdateSchema } from '@/lib/validators'

// PUT /api/job-targets/[id] — update a job target (status change, etc.)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()
    const parsed = jobTargetUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const owned = await db.jobTarget.findFirst({ where: { id, userId: user.id } })
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { status, company, role, salary, location, priority, jobUrl, notes } = parsed.data

    const target = await db.jobTarget.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(company !== undefined && { company }),
        ...(role !== undefined && { role }),
        ...(salary !== undefined && { salary }),
        ...(location !== undefined && { location }),
        ...(priority !== undefined && { priority }),
        ...(jobUrl !== undefined && { jobUrl }),
        ...(notes !== undefined && { notes }),
      },
    })

    // Log stage changes for the activity timeline
    if (status && status !== owned.status) {
      await db.jobActivity.create({
        data: {
          targetId: id,
          action: 'status_change',
          details: `Moved from ${owned.status} to ${status}`,
        },
      })
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: `Moved target to ${status.replace('_', ' ')}`,
          category: 'application',
          details: `${owned.company} — ${owned.role}`,
        },
      })
    }

    return NextResponse.json(target)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to update target' }, { status: 500 })
  }
}

// DELETE /api/job-targets/[id] — delete a job target
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const owned = await db.jobTarget.findFirst({ where: { id, userId: user.id } })
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.jobTarget.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 })
  }
}
