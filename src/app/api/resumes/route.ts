import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { resumeCreateSchema } from '@/lib/validators'
import { enforcePlanGate } from '@/lib/plans'

// GET /api/resumes — return all resumes for the current user
export async function GET() {
  try {
    const user = await requireUser()
    const resumes = await db.resume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json(resumes)
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('GET /api/resumes failed:', error)
    return NextResponse.json({ error: 'Failed to fetch resumes' }, { status: 500 })
  }
}

// POST /api/resumes — create a new resume with default sections
export async function POST(request: Request) {
  try {
    const user = await requireUser()

    await enforcePlanGate(user.id, 'resumes')

    const body = await request.json()
    const parsed = resumeCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // First resume becomes the default
    const existingCount = await db.resume.count({ where: { userId: user.id } })

    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        isDefault: existingCount === 0,
        sections: {
          create: [
            { type: 'summary', title: 'Summary', content: JSON.stringify(''), sortOrder: 0 },
            { type: 'experience', title: 'Experience', content: JSON.stringify([]), sortOrder: 1 },
            { type: 'education', title: 'Education', content: JSON.stringify([]), sortOrder: 2 },
            { type: 'skills', title: 'Skills', content: JSON.stringify([]), sortOrder: 3 },
            { type: 'projects', title: 'Projects', content: JSON.stringify([]), sortOrder: 4 },
          ],
        },
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    // Log activity
    await db.activityLog.create({
      data: { userId: user.id, action: 'Created resume', category: 'resume', details: resume.title },
    })

    return NextResponse.json(resume, { status: 201 })
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to create resume' }, { status: 500 })
  }
}
