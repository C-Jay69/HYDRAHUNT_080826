import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/job-targets/[id] — update a job target (status change, etc.)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, company, role, salary, location, priority, jobUrl, notes } =
      body

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

    return NextResponse.json(target)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update target' },
      { status: 500 },
    )
  }
}

// DELETE /api/job-targets/[id] — delete a job target
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await db.jobTarget.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete target' },
      { status: 500 },
    )
  }
}
