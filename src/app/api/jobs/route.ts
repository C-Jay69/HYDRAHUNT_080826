import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET /api/jobs — list the current user's scraped job opportunities.
export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const params = new URL(request.url).searchParams
    const cursor = params.get('cursor')
    const jobs = await db.jobOpportunity.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    return NextResponse.json(jobs)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('GET /api/jobs failed:', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
