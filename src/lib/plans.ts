/**
 * Centralized subscription plan definitions and usage limits.
 */

export type Plan = 'free' | 'mission_pack' | 'hunter' | 'beastmaster'

export interface PlanLimits {
  resumes: number | null // null = unlimited
  aiGenerations: number | null
  analyses: number | null
  interviews: number | null
  jobTargets: number | null
  storageMb: number
  exportFormats: string[]
  watermarkPdf: boolean
}

export const SUBSCRIPTION_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    resumes: 1,
    aiGenerations: 3,
    analyses: 1,
    interviews: 1,
    jobTargets: 10,
    storageMb: 100,
    exportFormats: ['pdf'],
    watermarkPdf: true,
  },
  mission_pack: {
    resumes: 1,
    aiGenerations: 10,
    analyses: 1,
    interviews: 1,
    jobTargets: 10,
    storageMb: 100,
    exportFormats: ['pdf'],
    watermarkPdf: true,
  },
  hunter: {
    resumes: null,
    aiGenerations: 100,
    analyses: 10,
    interviews: 20,
    jobTargets: null,
    storageMb: 2 * 1024,
    exportFormats: ['pdf', 'docx'],
    watermarkPdf: false,
  },
  beastmaster: {
    resumes: null,
    aiGenerations: null,
    analyses: null,
    interviews: null,
    jobTargets: null,
    storageMb: 20 * 1024,
    exportFormats: ['pdf', 'docx'],
    watermarkPdf: false,
  },
}

/** Stripe price IDs (set via env). Keys map to plan names. */
export const STRIPE_PRICES: Record<string, string> = {
  mission_pack: process.env.STRIPE_PRICE_MISSION_PACK || '',
  hunter_monthly: process.env.STRIPE_PRICE_HUNTER_MONTHLY || '',
  hunter_yearly: process.env.STRIPE_PRICE_HUNTER_YEARLY || '',
  beastmaster_monthly: process.env.STRIPE_PRICE_BEASTMASTER_MONTHLY || '',
  beastmaster_yearly: process.env.STRIPE_PRICE_BEASTMASTER_YEARLY || '',
}

export function planFromPriceId(priceId: string): Plan | null {
  for (const [plan, id] of Object.entries(STRIPE_PRICES)) {
    if (id === priceId) {
      if (plan === 'hunter_monthly' || plan === 'hunter_yearly') return 'hunter'
      if (plan === 'beastmaster_monthly' || plan === 'beastmaster_yearly') return 'beastmaster'
      if (plan === 'mission_pack') return 'mission_pack'
    }
  }
  return null
}

/**
 * Returns true when the user's current plan has consumed the limit for a
 * given resource category. Used for subscription gating middleware/helpers.
 */
export async function usageExceeded(userId: string, category: keyof Omit<PlanLimits, 'exportFormats' | 'watermarkPdf' | 'storageMb'>) {
  // Imported lazily to avoid a circular dependency with db.
  const { db } = await import('@/lib/db')

  const sub = await db.subscription.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  const plan = (sub?.plan || 'free') as Plan
  const limit = SUBSCRIPTION_LIMITS[plan][category]

  if (limit === null) return false

  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  let count = 0
  switch (category) {
    case 'aiGenerations':
      count = await db.generatedPayload.count({ where: { userId, createdAt: { gte: startOfMonth } } })
      break
    case 'analyses':
      count = await db.resumeAnalysis.count({ where: { userId, createdAt: { gte: startOfMonth } } })
      break
    case 'interviews':
      count = await db.interviewSession.count({ where: { userId, createdAt: { gte: startOfMonth } } })
      break
    case 'jobTargets':
      count = await db.jobTarget.count({ where: { userId } })
      break
    case 'resumes':
      count = await db.resume.count({ where: { userId } })
      break
  }

  return count >= limit
}

/**
 * Throws a NextResponse (403) when the user's plan cannot perform `category`.
 * Returns the user's plan when allowed. Requires an authenticated user id.
 */
export async function enforcePlanGate(
  userId: string,
  category: keyof Omit<PlanLimits, 'exportFormats' | 'watermarkPdf' | 'storageMb'>,
) {
  const { NextResponse } = await import('next/server')
  const { db } = await import('@/lib/db')

  const sub = await db.subscription.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  const plan = (sub?.plan || 'free') as Plan
  const limit = SUBSCRIPTION_LIMITS[plan][category]

  if (limit === null) return plan

  const exceeded = await usageExceeded(userId, category)
  if (exceeded) {
    throw new NextResponse(
      JSON.stringify({
        success: false,
        error: `Your ${plan} plan has reached its ${category.replace(/([A-Z])/g, ' $1').toLowerCase()} limit. Upgrade to continue.`,
        upgradeRequired: true,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return plan
}
