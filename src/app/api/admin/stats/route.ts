import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

// GET /api/admin/stats — platform-wide analytics (admin only)
export async function GET() {
  try {
    await requireAdmin()

    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      newUsersMonth,
      newUsersWeek,
      activeSubs,
      subsByPlan,
      totalResumes,
      totalPayloads,
      totalAnalyses,
      totalInterviews,
      totalJobTargets,
      totalCareerMaps,
      totalActivity,
      revenueEvents,
      recentUsers,
      recentActivity,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      db.subscription.count({ where: { status: 'active' } }),
      db.subscription.groupBy({ by: ['plan'], where: { status: 'active' }, _count: { _all: true } }),
      db.resume.count(),
      db.generatedPayload.count(),
      db.resumeAnalysis.count(),
      db.interviewSession.count(),
      db.jobTarget.count(),
      db.careerMap.count(),
      db.activityLog.count(),
      db.billingEvent.findMany({ where: { eventType: 'payment_succeeded' }, select: { amount: true, currency: true } }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      db.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { user: { select: { email: true, name: true } } },
      }),
    ])

    const revenueByCurrency: Record<string, number> = {}
    for (const e of revenueEvents) {
      const cur = e.currency || 'usd'
      revenueByCurrency[cur] = (revenueByCurrency[cur] || 0) + (e.amount || 0)
    }

    const planDistribution = Object.fromEntries(
      subsByPlan.map((g) => [g.plan, g._count._all]),
    )

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        newUsersMonth,
        newUsersWeek,
        activeSubs,
        totalResumes,
        totalPayloads,
        totalAnalyses,
        totalInterviews,
        totalJobTargets,
        totalCareerMaps,
        totalActivity,
        planDistribution,
        revenueByCurrency,
      },
      recentUsers,
      recentActivity,
    })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Admin stats error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
