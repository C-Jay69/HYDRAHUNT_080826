import { NextResponse } from 'next/server'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * Minimal in-memory sliding-window rate limiter.
 * - `limit`: max requests per window
 * - `windowMs`: window length in milliseconds
 * Returns an object with `success` and `remaining`/`resetInMs` info.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, resetInMs: windowMs }
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetInMs: bucket.resetAt - now }
  }

  bucket.count += 1
  return { success: true, remaining: limit - bucket.count, resetInMs: bucket.resetAt - now }
}

/** Returns a 429 NextResponse when the limit is exceeded, otherwise null. */
export function rateLimitResponse(key: string, limit: number, windowMs: number) {
  const result = rateLimit(key, limit, windowMs)
  if (result.success) return null
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please try again shortly.',
      retryAfterMs: result.resetInMs,
    },
    { status: 429 },
  )
}

/** AI endpoints: shared stricter policy keyed per-user/IP. */
export const AI_RATE_LIMIT = { limit: 20, windowMs: 60 * 1000 }
