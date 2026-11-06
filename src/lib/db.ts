import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is noisy (and costly) in production; enable it with
    // PRISMA_QUERY_LOG=true when debugging.
    log: process.env.PRISMA_QUERY_LOG === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })

// Cache the client across hot reloads in dev, and reuse it across invocations
// in production to avoid exhausting the connection pool.
globalForPrisma.prisma = db