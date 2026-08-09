import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { versionCreateSchema } from '@/lib/validators'

export async function GET() {
  try {
    const user = await requireUser()
    const versions = await db.resumeVersion.findMany({
      where: { resume: { userId: user.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json({ success: true, versions })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Get versions error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = versionCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'resumeId is required' },
        { status: 400 },
      )
    }
    const { resumeId, label, notes } = parsed.data

    // Ownership check
    const resume = await db.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 })
    }

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
    if (error instanceof NextResponse) return error
    console.error('Create version error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
