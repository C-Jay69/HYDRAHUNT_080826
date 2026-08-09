import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'hydra_session'
const SESSION_DAYS = 7
const MAGIC_LINK_TTL_SECONDS = 15 * 60

function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.SESSION_SECRET
  if (!s) {
    throw new Error('AUTH_SECRET is not set. Add AUTH_SECRET to your environment variables.')
  }
  return s
}

/* ----------------------------- Password hashing ----------------------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

/* ------------------------------- Session tokens ------------------------------ */

interface SessionPayload {
  userId: string
  exp: number
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function encodeToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

function decodeToken(token: string): SessionPayload | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = sign(body)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function createSessionToken(userId: string, ttlSeconds = SESSION_DAYS * 24 * 3600): string {
  return encodeToken({ userId, exp: Date.now() + ttlSeconds * 1000 })
}

export function createMagicLinkToken(userId: string): string {
  return encodeToken({ userId, exp: Date.now() + MAGIC_LINK_TTL_SECONDS * 1000 })
}

export function verifyMagicLinkToken(token: string): string | null {
  const payload = decodeToken(token)
  return payload ? payload.userId : null
}

/* ----------------------------- Cookie helpers ----------------------------- */

function cookieOptions(expiresInSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: expiresInSeconds,
  }
}

export async function setSessionCookie(userId: string, maxAgeSeconds = SESSION_DAYS * 24 * 3600) {
  const store = await cookies()
  store.set(SESSION_COOKIE, createSessionToken(userId), cookieOptions(maxAgeSeconds))
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { ...cookieOptions(0), maxAge: 0 })
}

/* --------------------------- Current user resolution --------------------------- */

/** Reads the session cookie from the request context and returns the current user, or null. */
export async function getCurrentUser() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload) return null
  return db.user.findUnique({ where: { id: payload.userId } })
}

/** Like getCurrentUser but throws a 401 JSON response if no authenticated user exists. */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new NextResponse(
      JSON.stringify({ success: false, error: 'Unauthorized. Please sign in.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }
  return user
}

/** Middleware-compatible token check (reads cookie from a NextRequest). */
export function getSessionFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = decodeToken(token)
  return payload ? payload.userId : null
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
