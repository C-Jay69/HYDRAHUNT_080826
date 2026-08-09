import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { jobTargetCreateSchema } from '@/lib/validators'

// GET /api/job-targets — return all job targets for the current user
export async function GET() {
  try {
    const user = await requireUser()
    const targets = await db.jobTarget.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { activities: { orderBy: { createdAt: 'desc' }, take: 5 } },
    })
    return NextResponse.json(targets)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json([])
  }
}

// POST /api/job-targets — create a new job target
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = jobTargetCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Company and role are required' },
        { status: 400 },
      )
    }

    const { company, role, salary, location, priority, jobUrl, notes } = parsed.data

    const target = await db.jobTarget.create({
      data: {
        userId: user.id,
        company,
        role,
        salary: salary || null,
        location: location || null,
        priority,
        jobUrl: jobUrl || null,
        notes: notes || null,
        status: 'intel',
      },
    })

    await db.activityLog.create({
      data: { userId: user.id, action: 'Added job target', category: 'application', details: `${company} — ${role}` },
    })

    return NextResponse.json(target, { status: 201 })
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to create target' }, { status: 500 })
  }
}
