import { db } from './src/lib/db'
import { hashPassword } from './src/lib/auth'

/**
 * Creates or updates an admin user from environment variables.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' bun run db:seed-admin
 *
 * Admin access itself is granted by listing the email in ADMIN_EMAILS.
 */
async function createAdmin() {
  const email = process.env.ADMIN_EMAIL
  const rawPassword = process.env.ADMIN_PASSWORD

  if (!email || !rawPassword) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.')
    process.exitCode = 1
    return
  }

  if (rawPassword.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.')
    process.exitCode = 1
    return
  }

  const passwordHash = hashPassword(rawPassword)

  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: 'Admin User',
      passwordHash,
    },
  })

  console.log('Admin user created/updated:', user.email)
  console.log('Remember to add this address to ADMIN_EMAILS for admin-panel access.')
}

createAdmin()
  .catch((e) => {
    console.error('Error creating user:', e)
    process.exitCode = 1
  })
  .finally(() => process.exit())
