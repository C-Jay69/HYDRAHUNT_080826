import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const version = await db.resumeVersion.findUnique({
      where: { id },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    })

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, version })
  } catch (error) {
    console.error('Get version error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action !== 'restore') {
      return NextResponse.json(
        { success: false, error: 'Only action=restore is supported' },
        { status: 400 }
      )
    }

    // Fetch the version with snapshot
    const version = await db.resumeVersion.findUnique({
      where: { id },
    })

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    // Parse the snapshot data
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
      return NextResponse.json(
        { success: false, error: 'Invalid snapshot data' },
        { status: 400 }
      )
    }

    // Update the resume with snapshot data
    const updatedResume = await db.resume.update({
      where: { id: version.resumeId },
      data: {
        title: snapshotData.title,
        summary: snapshotData.summary,
      },
    })

    // Update existing sections and create new ones from snapshot
    if (snapshotData.sections && snapshotData.sections.length > 0) {
      // Delete all existing sections for this resume
      await db.resumeSection.deleteMany({
        where: { resumeId: version.resumeId },
      })

      // Recreate sections from snapshot (without the original IDs to avoid conflicts)
      await db.resumeSection.createMany({
        data: snapshotData.sections.map((s) => ({
          resumeId: version.resumeId,
          type: s.type,
          title: s.title,
          content: s.content,
          sortOrder: s.sortOrder,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Version restored successfully',
      resume: updatedResume,
    })
  } catch (error) {
    console.error('Restore version error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
