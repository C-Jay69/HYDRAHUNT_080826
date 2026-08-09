import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { SUBSCRIPTION_LIMITS, type Plan } from '@/lib/plans'

// GET /api/billing — current plan, usage counters, and payment history
export async function GET() {
  try {
    const user = await requireUser()

    const sub = await db.subscription.findFirst({
      where: { userId: user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { billingEvents: { orderBy: { createdAt: 'desc' }, take: 12 } },
    })
    const plan = (sub?.plan || 'free') as Plan
    const limits = SUBSCRIPTION_LIMITS[plan]

    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    const [aiGenerations, analyses, interviews, jobTargets, resumes] = await Promise.all([
      db.generatedPayload.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } }),
      db.resumeAnalysis.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } }),
      db.interviewSession.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } }),
      db.jobTarget.count({ where: { userId: user.id } }),
      db.resume.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      success: true,
      plan,
      usage: {
        aiGenerations: { used: aiGenerations, limit: limits.aiGenerations },
        analyses: { used: analyses, limit: limits.analyses },
        interviews: { used: interviews, limit: limits.interviews },
        jobTargets: { used: jobTargets, limit: limits.jobTargets },
        resumes: { used: resumes, limit: limits.resumes },
        storageMb: { used: 0, limit: limits.storageMb },
      },
      billingEvents: (sub?.billingEvents || []).map((e) => ({
        id: e.id,
        date: e.createdAt,
        description: e.description || e.eventType.replace(/_/g, ' '),
        amount: e.amount,
        currency: e.currency,
        status: e.eventType.includes('failed') ? 'failed' : e.eventType.includes('pending') ? 'pending' : 'paid',
      })),
    })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Get billing error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
