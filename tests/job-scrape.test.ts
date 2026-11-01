import assert from 'node:assert/strict'
import { test } from 'node:test'
import Module from 'node:module'
import { NextRequest } from 'next/server'

// Stub authentication and persistence; exercise the real route, provider client and SSE.
const saved = new Map<string, Record<string, unknown>>()
const runs: Record<string, unknown>[] = []
const fakeDb = {
  scrapingRun: {
    create: async () => ({ id: 'run-1' }),
    update: async (args: { data: Record<string, unknown> }) => { runs.push(args.data) },
  },
  jobOpportunity: {
    findMany: async ({ where, cursor, skip }: { where: { userId: string }; cursor?: { id: string }; skip?: number }) => {
      const rows = [...saved.values()].filter((job) => job.userId === where.userId).sort((a, b) => String(b.id).localeCompare(String(a.id)))
      const start = cursor ? rows.findIndex((job) => job.id === cursor.id) + (skip || 0) : 0
      return rows.slice(start, start + 100)
    },
    findFirst: async ({ where }: { where: { userId: string; jobUrl: string } }) => [...saved.values()].find((job) => job.userId === where.userId && job.jobUrl === where.jobUrl) || null,
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const entry = [...saved.entries()].find(([, job]) => job.id === where.id)!
      const updated = { ...entry[1], ...data }
      saved.set(entry[0], updated)
      return updated
    },
    upsert: async ({ where, create, update }: { where: { externalId_userId: { externalId: string } }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const key = where.externalId_userId.externalId
      const record = saved.has(key) ? { ...saved.get(key), ...update } : { ...create, id: `id-${saved.size + 1}`, status: 'new' }
      saved.set(key, record)
      return record
    },
  },
}
const loader = Module as unknown as { _load: (...args: unknown[]) => unknown }
const originalLoad = loader._load
loader._load = function (...args: unknown[]) {
  if (args[0] === '@/lib/db') return { db: fakeDb }
  if (args[0] === '@/lib/auth') return { requireUser: async () => ({ id: 'user-1' }) }
  if (args[0] === '@/lib/plans') return { enforcePlanGate: async () => {} }
  return originalLoad.apply(this, args)
}
process.env.CHOCODATA_API_KEY = 'test-key'
process.env.CHOCODATA_RATE_LIMIT_RPM = '100'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('../src/app/api/jobs/scrape/route') as typeof import('../src/app/api/jobs/scrape/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: listJobs } = require('../src/app/api/jobs/route') as typeof import('../src/app/api/jobs/route')
loader._load = originalLoad

async function events(query: string) {
  const response = await GET(new NextRequest(`http://localhost/api/jobs/scrape?${query}`))
  return (await response.text()).trim().split('\n\n').map((line) => JSON.parse(line.slice(6)))
}

test('broad search paginates, normalizes and saves IDs, deduplicates, and reports source failures', async () => {
  saved.clear(); runs.length = 0
  const calls: string[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = new URL(String(input)); calls.push(url.toString())
    if (url.host === 'api.chocodata.com') {
      const page = Number(url.searchParams.get('page'))
      const job = page === 1 ? { job_id: '123', title: 'Engineer', company: 'Acme', url: 'https://jobs.test/123' } : { job_id: '456', title: 'Developer', company: 'Acme', url: 'https://jobs.test/456' }
      return Response.json({ results: [job] }) // repeated page 3 stops pagination
    }
    const site = url.searchParams.get('site')
    assert.equal(url.searchParams.get('n'), '75')
    if (site === 'indeed') return Response.json({ jobs: [{ title: 'Engineer', company: 'Acme', jobUrl: 'https://jobs.test/123' }, { title: 'Analyst', company: 'Co', jobUrl: 'https://jobs.test/789' }] })
    if (site === 'zip_recruiter') return Response.json({ jobs: [], errors: ['blocked'] })
    return Response.json({ jobs: [] })
  }
  try {
    const result = await events('keywords=engineer&pages=3&source=all')
    const done = result.at(-1)
    assert.equal(done.type, 'done')
    assert.equal(done.totalFound, 3)
    assert.equal(done.jobs.length, 3)
    assert.ok(done.jobs.every((job: { id?: string }) => job.id))
    assert.ok(done.warnings.some((warning: string) => warning.includes('zip_recruiter') && warning.includes('blocked')))
    assert.equal(runs.at(-1)?.status, 'partial')
    assert.equal(calls.length, 6)
    assert.equal(saved.get('linkedin:123')?.jobUrl, 'https://jobs.test/123')
    const second = await events('keywords=engineer&pages=3&source=indeed')
    assert.equal(second.at(-1).jobs[0].id, 'id-1')
    assert.equal(saved.size, 3)
  } finally { globalThis.fetch = originalFetch }
})

test('single source failures and invalid depths are reported', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('offline') }
  try {
    assert.match((await events('keywords=engineer&pages=1&source=indeed')).at(-1).error, /offline/)
    assert.equal(runs.at(-1)?.status, 'failed')
    assert.equal((await events('keywords=engineer&pages=11&source=linkedin')).at(-1).type, 'error')
  } finally { globalThis.fetch = originalFetch }
})


test('saved jobs can be retrieved beyond the first 100 without including other users', async () => {
  saved.clear()
  for (let i = 0; i < 250; i++) saved.set(`key-${i}`, { id: `id-${String(i).padStart(3, '0')}`, userId: 'user-1' })
  saved.set('other', { id: 'id-999', userId: 'another-user' })
  let cursor = ''
  const ids: string[] = []
  do {
    const response = await listJobs(new Request(`http://localhost/api/jobs${cursor ? `?cursor=${cursor}` : ''}`))
    const batch = await response.json() as { id: string }[]
    ids.push(...batch.map((job) => job.id))
    cursor = batch.length === 100 ? batch.at(-1)!.id : ''
  } while (cursor)
  assert.equal(ids.length, 250)
  assert.equal(new Set(ids).size, 250)
  assert.ok(!ids.includes('id-999'))
})
