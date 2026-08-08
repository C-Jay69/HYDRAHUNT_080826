import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get first user (demo user)
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ success: true, versions: [] })
    }

    const versions = await db.resumeVersion.findMany({
      where: {
        resume: { userId: user.id },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    })

    return NextResponse.json({ success: true, versions })
  } catch (error) {
    console.error('Get versions error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resumeId, label, notes } = body

    if (!resumeId) {
      return NextResponse.json(
        { success: false, error: 'resumeId is required' },
        { status: 400 }
      )
    }

    // Fetch the current resume with its sections
    const resume = await db.resume.findUnique({
      where: { id: resumeId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!resume) {
      return NextResponse.json(
        { success: false, error: 'Resume not found' },
        { status: 404 }
      )
    }

    // Build snapshot JSON from current resume data
    const snapshot = JSON.stringify({
      id: resume.id,
      title: resume.title,
      summary: resume.summary,
      isDefault: resume.isDefault,
      sections: resume.sections.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        content: s.content,
        sortOrder: s.sortOrder,
      })),
      snapshotTakenAt: new Date().toISOString(),
    })

    const version = await db.resumeVersion.create({
      data: {
        resumeId,
        label: label || `Version ${new Date().toLocaleString()}`,
        snapshot,
        notes: notes || null,
      },
    })

    return NextResponse.json({ success: true, version })
  } catch (error) {
    console.error('Create version error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
