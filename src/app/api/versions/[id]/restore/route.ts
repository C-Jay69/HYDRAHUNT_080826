import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

// PUT /api/versions/[id]/restore — restore a resume from a version snapshot
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const version = await db.resumeVersion.findFirst({
      where: { id, resume: { userId: user.id } },
    })

    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 })
    }

    let snapshotData: {
      title?: string
      summary?: string
      isDefault?: boolean
      sections?: Array<{
        id: string
        type: string
        title: string
        content: string
        sortOrder: number
      }>
    }
    try {
      snapshotData = JSON.parse(version.snapshot)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid snapshot data' }, { status: 400 })
    }

    const updatedResume = await db.resume.update({
      where: { id: version.resumeId },
      data: {
        title: snapshotData.title,
        summary: snapshotData.summary,
      },
    })

    if (snapshotData.sections && snapshotData.sections.length > 0) {
      await db.$transaction([
        db.resumeSection.deleteMany({ where: { resumeId: version.resumeId } }),
        db.resumeSection.createMany({
          data: snapshotData.sections.map((s) => ({
            resumeId: version.resumeId,
            type: s.type,
            title: s.title,
            content: s.content,
            sortOrder: s.sortOrder,
          })),
        }),
      ])
    }

    return NextResponse.json({ success: true, message: 'Version restored successfully', resume: updatedResume })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Restore version error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
