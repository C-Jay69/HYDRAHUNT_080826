import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET /api/jobs — list the current user's scraped job opportunities.
export async function GET() {
  try {
    const user = await requireUser()
    const jobs = await db.jobOpportunity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(jobs)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('GET /api/jobs failed:', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
