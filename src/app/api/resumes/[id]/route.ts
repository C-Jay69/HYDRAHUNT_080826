import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { resumeUpdateSchema } from '@/lib/validators'

// Helper: assert resume ownership or return 404
async function getOwnedResume(id: string, userId: string) {
  const resume = await db.resume.findFirst({ where: { id, userId } })
  if (!resume) return null
  return resume
}

// GET /api/resumes/[id] — return a single resume with sections
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const resume = await getOwnedResume(id, user.id)
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const full = await db.resume.findUnique({
      where: { id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json(full)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to fetch resume' }, { status: 500 })
  }
}

// PUT /api/resumes/[id] — update resume title, summary, sections, atsScore
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const owned = await getOwnedResume(id, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = resumeUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { title, summary, atsScore, isDefault, sections } = parsed.data

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (summary !== undefined) data.summary = summary
    if (atsScore !== undefined) data.atsScore = atsScore
    if (isDefault !== undefined) data.isDefault = isDefault

    // If sections array is provided, replace all sections
    if (Array.isArray(sections)) {
      await db.$transaction([
        db.resumeSection.deleteMany({ where: { resumeId: id } }),
        db.resumeSection.createMany({
          data: sections.map((s, i) => ({
            resumeId: id,
            type: s.type,
            title: s.title,
            content: s.content,
            sortOrder: s.sortOrder ?? i,
          })),
        }),
      ])
    }

    const resume = await db.resume.update({
      where: { id },
      data,
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json(resume)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to update resume' }, { status: 500 })
  }
}

// DELETE /api/resumes/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const owned = await getOwnedResume(id, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.resume.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 })
  }
}
