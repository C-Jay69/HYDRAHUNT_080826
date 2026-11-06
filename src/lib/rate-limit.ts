import { NextResponse } from 'next/server'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let operations = 0

/**
 * Periodic sweep so the Map does not grow without bound in long-lived
 * processes. Serverless deployments still get one limiter per instance; a
 * shared store (Redis/Upstash) is the eventual fix for cross-instance limits.
 */
const PRUNE_EVERY = 500

/**
 * Minimal in-memory fixed-window rate limiter.
 * - `limit`: max requests per window
 * - `windowMs`: window length in milliseconds
 * Returns an object with `success` and `remaining`/`resetInMs` info.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()

  operations += 1
  if (operations % PRUNE_EVERY === 0) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey)
    }
  }

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
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, Math.ceil(result.resetInMs / 1000))) },
    },
  )
}

/** Best-effort client IP for rate-limit keys behind a proxy/CDN. */
export function getClientIp(request: { headers: Headers }): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
}

/** AI endpoints: shared stricter policy keyed per-user/IP. */
export const AI_RATE_LIMIT = { limit: 20, windowMs: 60 * 1000 }

/** Credential endpoints: limits keyed per-IP (and per-email where useful). */
export const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 }
export const SIGNUP_RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 }
export const CONTACT_RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 }
