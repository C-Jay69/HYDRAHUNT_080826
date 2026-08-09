import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/health — deployment health check
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ success: true, status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ success: false, status: 'degraded' }, { status: 503 })
  }
}
