import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { enforcePlanGate } from '@/lib/plans'
import { scrapeJobsSchema } from '@/lib/validators'
import { fetchChocoJobs, waitForChocoRateLimit, normalizeJob, type JobSource, type NormalizedJob } from '@/lib/chocoClient'

const encoder = new TextEncoder()
const JOBSPY_URL = process.env.JOBSPY_URL || 'http://127.0.0.1:3001/scrape'
const JOBSPY_TOKEN = process.env.JOBSPY_TOKEN
const JOBSPY_SOURCES = new Set(['indeed', 'glassdoor', 'zip_recruiter', 'google'])
// A broad search without querying every niche/remote board or consuming excessive API quota.
const BROAD_SOURCES = ['linkedin', 'indeed', 'zip_recruiter', 'google'] as const

// The Python worker runs locally on the developer's machine, where a loopback
// URL is correct. A Vercel function cannot reach that: 127.0.0.1 is the
// function's own sandbox, so every JobSpy board fails with "fetch failed".
// Detect that misconfiguration and explain it instead of leaving the user with
// a generic outage message.
function jobSpyFailureHint(): string {
  let host: string
  try {
    host = new URL(JOBSPY_URL).hostname
  } catch {
    return `JOBSPY_URL (${JOBSPY_URL}) is not a valid URL.`
  }
  const loopback = host === 'localhost' || host === '::1' || host === '[::1]' || host === '0.0.0.0' || /^127\./.test(host)
  if (process.env.VERCEL) {
    return loopback
      ? `JOBSPY_URL points at ${host}, which a Vercel function cannot reach. Deploy the worker (see mini-services/jobspy-svc/DEPLOY.md) and set JOBSPY_URL to its public /scrape URL.`
      : `the JobSpy worker at ${host} is offline or unreachable. Check that the service is running and that JOBSPY_URL is correct.`
  }
  return 'the JobSpy worker is offline or unresponsive. Start it with npm run dev:services, or point JOBSPY_URL at a running worker.'
}

type SavedJob = Awaited<ReturnType<typeof db.jobOpportunity.upsert>>

function fromJobSpyJob(j: Record<string, unknown>): NormalizedJob {
  const url = typeof j.jobUrl === 'string' && j.jobUrl.trim() ? j.jobUrl : typeof j.applyUrl === 'string' ? j.applyUrl : ''
  return {
    externalId: url ? `jobspy:${url}` : typeof j.company === 'string' && j.company.trim() && typeof j.title === 'string' && j.title.trim() ? `jobspy:${JSON.stringify([j.company.trim().toLowerCase(), j.title.trim().toLowerCase(), typeof j.location === 'string' ? j.location.trim().toLowerCase() : ''])}` : undefined,
    title: typeof j.title === 'string' ? j.title : undefined,
    company: typeof j.company === 'string' ? j.company : undefined,
    location: typeof j.location === 'string' ? j.location : undefined,
    jobUrl: url || undefined,
    postedDate: typeof j.postedDate === 'string' ? j.postedDate : undefined,
    postedLabel: typeof j.postedLabel === 'string' ? j.postedLabel : undefined,
    salary: typeof j.salary === 'string' ? j.salary : null,
    companyLogo: typeof j.companyLogo === 'string' ? j.companyLogo : undefined,
    companyUrl: typeof j.companyUrl === 'string' ? j.companyUrl : undefined,
    raw: typeof j.raw === 'string' ? j.raw : JSON.stringify(j),
  }
}

async function upsertOpportunity(userId: string, job: NormalizedJob): Promise<SavedJob> {
  const fields = {
    title: job.title || '', company: job.company || null,
    companyUrl: job.companyUrl || null, location: job.location || null,
    jobUrl: job.jobUrl || null, postedDate: job.postedDate || null,
    postedLabel: job.postedLabel || null, salary: job.salary || null,
    companyLogo: job.companyLogo || null, raw: job.raw || null,
  }
  // Re-scrapes frequently return partial records. Only overwrite values this
  // scrape actually produced so a sparse result does not erase a good field.
  const updateFields = {
    ...(fields.title ? { title: fields.title } : {}),
    ...(fields.company ? { company: fields.company } : {}),
    ...(fields.companyUrl ? { companyUrl: fields.companyUrl } : {}),
    ...(fields.location ? { location: fields.location } : {}),
    ...(fields.jobUrl ? { jobUrl: fields.jobUrl } : {}),
    ...(fields.postedDate ? { postedDate: fields.postedDate } : {}),
    ...(fields.postedLabel ? { postedLabel: fields.postedLabel } : {}),
    ...(fields.salary ? { salary: fields.salary } : {}),
    ...(fields.companyLogo ? { companyLogo: fields.companyLogo } : {}),
    ...(fields.raw ? { raw: fields.raw } : {}),
  }
  // Reuse records found through another source without changing their ID or status.
  if (job.jobUrl) {
    const existing = await db.jobOpportunity.findFirst({ where: { userId, jobUrl: job.jobUrl } })
    if (existing) return db.jobOpportunity.update({ where: { id: existing.id }, data: updateFields })
  }
  return db.jobOpportunity.upsert({
    where: { externalId_userId: { externalId: job.externalId!, userId } },
    update: updateFields,
    create: { ...fields, externalId: job.externalId!, userId },
  })
}

// GET /api/jobs/scrape — progress and saved jobs are streamed as SSE.
export async function GET(request: NextRequest) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let runId: string | undefined
      let totalFound = 0
      let requestCount = 0
      let disconnected = false
      const send = (payload: unknown) => {
        if (!disconnected) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)) }
          catch { disconnected = true }
        }
      }
      // Keep proxies from timing out while a provider is scraping a large batch.
      const heartbeat = setInterval(() => {
        if (!disconnected) {
          try { controller.enqueue(encoder.encode(': keep-alive\n\n')) }
          catch { disconnected = true }
        }
      }, 15_000)
      try {
        const user = await requireUser()
        const sp = request.nextUrl.searchParams
        const parsed = scrapeJobsSchema.safeParse({
          keywords: sp.get('keywords') || '', location: sp.get('location') || undefined,
          pages: Number(sp.get('pages') || 3), source: sp.get('source') || 'linkedin',
        })
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid search')
        const { keywords, location, pages, source } = parsed.data
        // Meter Radar by scrape runs, not by A-List size: a user with zero
        // tracked targets used to scrape without limit, while a user at the
        // 10-target cap was blocked from searching at all.
        await enforcePlanGate(user.id, 'scrapes')
        const run = await db.scrapingRun.create({ data: { userId: user.id, keywords, location: location || null, pages, status: 'active' } })
        runId = run.id
        const sources: readonly string[] = source === 'all' ? BROAD_SOURCES : [source]
        const seen = new Set<string>()
        const collected: SavedJob[] = []
        const warnings: string[] = []
        // JobSpy boards that never answered, collapsed into one warning below.
        const jobSpyUnavailable: string[] = []
        // The operator hint is identical for every board; log it once per run.
        let jobSpyHintLogged = false
        let successfulSources = 0
        let saveFailures = 0

        for (const board of sources) {
          if (request.signal.aborted || disconnected) break
          const isJobSpy = JOBSPY_SOURCES.has(board)
          const pageCount = isJobSpy ? 1 : pages
          let sourceSucceeded = false
          let duplicatePages = 0
          for (let page = 1; page <= pageCount; page++) {
            if (request.signal.aborted || disconnected) break
            send({ type: 'progress', source: board, page, pages: pageCount, totalFound })
            let jobs: NormalizedJob[]
            let sourceErrors: string[] = []
            try {
              if (isJobSpy) {
                const url = new URL(JOBSPY_URL)
                url.searchParams.set('keywords', keywords)
                if (location) url.searchParams.set('location', location)
                url.searchParams.set('site', board)
                url.searchParams.set('n', String(Math.min(pages * 25, 100)))
                requestCount++
                const headers: Record<string, string> = { Accept: 'application/json' }
                if (JOBSPY_TOKEN) headers.Authorization = `Bearer ${JOBSPY_TOKEN}`
                const res = await fetch(url, { headers, signal: AbortSignal.any([request.signal, AbortSignal.timeout(180_000)]) })
                if (res.status === 401 || res.status === 403) throw new Error('JobSpy authorization failed. Check JOBSPY_TOKEN.')
                if (!res.ok) throw new Error(`JobSpy returned HTTP ${res.status}`)
                const data = await res.json() as { jobs?: unknown[]; errors?: string[]; success?: boolean; error?: string }
                if (data.success === false) throw new Error(data.error || 'JobSpy request failed')
                sourceErrors = Array.isArray(data.errors) ? data.errors : []
                jobs = (Array.isArray(data.jobs) ? data.jobs : [])
                  .filter((j): j is Record<string, unknown> => !!j && typeof j === 'object' && !Array.isArray(j))
                  .map(fromJobSpyJob)
                if (sourceErrors.length && jobs.length === 0) throw new Error(sourceErrors.join('; '))
              } else {
                await waitForChocoRateLimit(request.signal)
                requestCount++
                const data = await fetchChocoJobs(board as JobSource, keywords, location, page, 10)
                jobs = (Array.isArray(data.results) ? data.results : [])
                  .filter((j): j is Record<string, unknown> => !!j && typeof j === 'object' && !Array.isArray(j))
                  .map((raw) => {
                    const job = normalizeJob(raw)
                    // Namespace source IDs to avoid collisions between different boards.
                    job.externalId = job.externalId ? `${board}:${job.externalId}` : job.jobUrl ? `${board}:${job.jobUrl}` : undefined
                    return job
                  })
              }
              sourceSucceeded = true
            } catch (err) {
              if (request.signal.aborted) break
              if (isJobSpy) {
                const detail = err instanceof Error ? err.message : String(err)
                const connectivityFailure = /fetch failed|ECONNREFUSED|ENOTFOUND|timed out|timeout|aborted/i.test(detail)
                // The hint is for operators (Vercel logs), not end users.
                const hint = connectivityFailure && !jobSpyHintLogged ? ` — ${jobSpyFailureHint()}` : ''
                if (hint) jobSpyHintLogged = true
                console.error(`[jobs/scrape] ${board} via JobSpy (${JOBSPY_URL}) failed: ${detail}${hint}`)
                // Connectivity failures hit every JobSpy board the same way;
                // collect them so the user sees one clear message, not one
                // identical line per board.
                if (connectivityFailure) {
                  jobSpyUnavailable.push(board)
                } else {
                  warnings.push(`${board}: ${detail}`)
                }
              } else {
                warnings.push(`${board}: ${err instanceof Error ? err.message : String(err)}`)
              }
              break
            }
            warnings.push(...sourceErrors.map((error) => `${board}: ${error}`))
            const savedPage: SavedJob[] = []
            for (const job of jobs) {
              // Do not collapse unrelated jobs with missing IDs into a single record.
              if (!job.externalId || !job.title) continue
              const keys = [`id:${job.externalId}`, ...(job.jobUrl ? [`url:${job.jobUrl}`] : [])]
              if (keys.some((key) => seen.has(key))) continue
              keys.forEach((key) => seen.add(key))
              try {
                const saved = await upsertOpportunity(user.id, job)
                collected.push(saved)
                savedPage.push(saved)
              } catch (err) {
                saveFailures++
                console.error('Failed to save job:', err)
              }
            }
            totalFound = collected.length
            send({ type: 'page', source: board, page, pages: pageCount, found: savedPage.length, totalFound, jobs: savedPage })
            if (!isJobSpy) {
              // Provider exhausted.
              if (jobs.length === 0) break
              // Some providers repeat the final page instead of returning an
              // empty one. Require two consecutive pages with no new listings
              // before stopping, so one duplicate-heavy page does not silently
              // truncate the remaining results.
              if (savedPage.length === 0) {
                duplicatePages += 1
                if (duplicatePages >= 2) {
                  warnings.push(
                    `${board}: no new listings after page ${page - 1} (provider exhausted)`,
                  )
                  break
                }
              } else {
                duplicatePages = 0
              }
            }
          }
          if (sourceSucceeded) successfulSources++
        }
        if (jobSpyUnavailable.length) {
          // Keep the user-facing text free of deployment details; the operator
          // hint goes to the server log with the failure above.
          warnings.push(
            `${jobSpyUnavailable.join(', ')}: scraping service unavailable — those sources could not be searched right now, so results include only the sources that responded.`,
          )
        }
        if (saveFailures) warnings.push(`${saveFailures} job(s) could not be saved.`)
        const cancelled = request.signal.aborted || disconnected
        const status = cancelled ? 'cancelled' : successfulSources === 0 ? 'failed' : warnings.length ? 'partial' : 'completed'
        await db.scrapingRun.update({ where: { id: runId }, data: { status, totalFound, requestCount } })
        if (!cancelled) {
          if (!successfulSources) send({ type: 'error', totalFound, error: warnings.join('; ') || 'No sources could be searched.' })
          else send({ type: 'done', source, page: pages, pages, totalFound, found: totalFound, jobs: collected, requestCount, warnings })
        }
      } catch (err) {
        if (runId) await db.scrapingRun.update({ where: { id: runId }, data: { status: 'failed', totalFound, requestCount } }).catch(console.error)
        if (err instanceof NextResponse) {
          const text = await err.text().catch(() => '')
          try { send({ type: 'error', error: JSON.parse(text).error || 'Unauthorized' }) }
          catch { send({ type: 'error', error: text || 'Unauthorized' }) }
        } else {
          console.error('Scrape error:', err)
          send({ type: 'error', error: err instanceof Error ? err.message : 'Scrape failed' })
        }
      } finally {
        clearInterval(heartbeat)
        if (!disconnected) { try { controller.close() } catch { /* client disconnected */ } }
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
}
