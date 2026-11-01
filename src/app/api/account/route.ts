import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, clearSessionCookie } from '@/lib/auth'

/**
 * DELETE /api/account
 *
 * Permanently deletes the signed-in user and everything that cascades from
 * that record (resumes, kits, sessions, targets, logs, subscription).
 * The client must send `{ "confirm": "DELETE" }` so this cannot fire by
 * accident from a stray request.
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser()

    const body = await request.json().catch(() => ({}))
    if (body?.confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'Send { "confirm": "DELETE" } to delete your account.' },
        { status: 400 },
      )
    }

    await db.user.delete({ where: { id: user.id } })
    await clearSessionCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Account deletion failed:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
