import { NextResponse } from 'next/server'

/**
 * Admin emails are configured via the ADMIN_EMAILS env var (comma-separated).
 * Falls back to admin@hydrahunt.online when unset.
 */
function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || 'admin@hydrahunt.online'
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails().includes(email.toLowerCase())
}

export function isAdminUser(user: { email: string | null } | null | undefined): boolean {
  return isAdminEmail(user?.email)
}

/** Like requireUser but also enforces the admin role (403 otherwise). */
export async function requireAdmin() {
  const { requireUser } = await import('@/lib/auth')
  const user = await requireUser()
  if (!isAdminUser(user)) {
    throw new NextResponse(
      JSON.stringify({ success: false, error: 'Admin access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }
  return user
}
