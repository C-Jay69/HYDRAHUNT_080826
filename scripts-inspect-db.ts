import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const runs = await db.scrapingRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { createdAt: true, keywords: true, location: true, pages: true, totalFound: true, requestCount: true, status: true },
  })
  console.log('=== SCRAPING RUNS (latest 15) ===')
  for (const r of runs) {
    console.log(
      r.createdAt.toISOString().slice(0, 16),
      '| kw:', r.keywords.slice(0, 30).padEnd(30),
      '| loc:', (r.location ?? '-').padEnd(15),
      '| pages:', r.pages,
      '| totalFound:', String(r.totalFound).padEnd(5),
      '| reqs:', String(r.requestCount).padEnd(3),
      '|', r.status,
    )
  }

  const perUser = await db.jobOpportunity.groupBy({ by: ['userId'], _count: true })
  console.log('\n=== JOB OPPORTUNITY COUNT PER USER ===')
  for (const g of perUser) console.log(g.userId, '→', g._count)

  const jobs = await db.jobOpportunity.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { externalId: true, title: true, company: true, createdAt: true, userId: true },
  })
  console.log('\n=== LATEST 15 JOBS ===')
  for (const j of jobs) {
    console.log(
      j.createdAt.toISOString().slice(0, 16),
      '|', (j.externalId || 'NULL').slice(0, 34).padEnd(34),
      '|', j.title.slice(0, 36).padEnd(36),
      '|', (j.company ?? '').slice(0, 20),
      '|', j.userId.slice(0, 8),
    )
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
