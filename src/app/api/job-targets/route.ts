import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/job-targets — return all job targets
export async function GET() {
  try {
    const targets = await db.jobTarget.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(targets)
  } catch {
    return NextResponse.json([])
  }
}

// POST /api/job-targets — create a new job target
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { company, role, salary, location, priority, jobUrl } = body

    if (!company || !role) {
      return NextResponse.json(
        { error: 'Company and role are required' },
        { status: 400 },
      )
    }

    const target = await db.jobTarget.create({
      data: {
        userId: 'demo-user',
        company,
        role,
        salary: salary || null,
        location: location || null,
        priority: priority || 'medium',
        jobUrl: jobUrl || null,
        status: 'intel',
      },
    })

    return NextResponse.json(target, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create target' },
      { status: 500 },
    )
  }
}
