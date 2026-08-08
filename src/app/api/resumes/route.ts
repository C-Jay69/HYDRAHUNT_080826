import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/resumes — return all resumes with sections
export async function GET() {
  try {
    const resumes = await db.resume.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json(resumes)
  } catch {
    return NextResponse.json([])
  }
}

// POST /api/resumes — create a new resume with default sections
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 },
      )
    }

    const resume = await db.resume.create({
      data: {
        userId: 'demo-user',
        title,
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

    return NextResponse.json(resume, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create resume' },
      { status: 500 },
    )
  }
}
