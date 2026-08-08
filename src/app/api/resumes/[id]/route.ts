import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/resumes/[id] — return a single resume with sections
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const resume = await db.resume.findUnique({
      where: { id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(resume)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 },
    )
  }
}

// PUT /api/resumes/[id] — update resume title, summary, sections, atsScore
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, summary, atsScore, sections } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (summary !== undefined) data.summary = summary
    if (atsScore !== undefined) data.atsScore = atsScore

    // If sections array is provided, upsert each section
    if (Array.isArray(sections)) {
      // Delete existing sections and recreate (simple approach for demo)
      await db.resumeSection.deleteMany({ where: { resumeId: id } })
      await db.resumeSection.createMany({
        data: sections.map(
          (s: { type: string; title: string; content: string; sortOrder: number }, i: number) => ({
            resumeId: id,
            type: s.type,
            title: s.title,
            content: s.content,
            sortOrder: s.sortOrder ?? i,
          }),
        ),
      })
    }

    const resume = await db.resume.update({
      where: { id },
      data,
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json(resume)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 },
    )
  }
}

// DELETE /api/resumes/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await db.resume.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 },
    )
  }
}
