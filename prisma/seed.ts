import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@hydrahunt.online'
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    console.error('Set ADMIN_PASSWORD env var to provision the admin account.')
    process.exit(1)
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash: hashPassword(password) },
    })
    console.log(`Updated password for ${email}`)
  } else {
    await db.user.create({
      data: {
        email,
        name: 'Hydra Admin',
        passwordHash: hashPassword(password),
        profile: { create: {} },
        subscriptions: { create: { plan: 'beastmaster', status: 'active' } },
      },
    })
    console.log(`Created admin account ${email}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
