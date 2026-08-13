import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { enforcePlanGate } from '@/lib/plans'
import { scrapeJobsSchema } from '@/lib/validators'
import {
  fetchChocoJobs,
  chocoRateLimit,
  normalizeJob,
  type JobSource,
  type NormalizedJob,
} from '@/lib/chocoClient'

const encoder = new TextEncoder()

function sse(
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: unknown,
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
}

/** Sources served by the JobSpy Python micro-service (ChocoData can't do these). */
const JOBSPY_SOURCES: Record<string, true> = {
  indeed: true,
  glassdoor: true,
  zip_recruiter: true,
  google: true,
}

const JOBSPY_URL = process.env.JOBSPY_URL || 'http://127.0.0.1:3001/scrape'

/** Turn a thrown fetch error from the JobSpy service into an actionable message. */
function jobSpyError(err: unknown): string {
  const cause = (err as { cause?: { code?: string } })?.cause
  const code = cause?.code
  const port = (() => {
    try {
      return new URL(JOBSPY_URL).port || '3001'
    } catch {
      return '3001'
    }
  })()
  if (code === 'ECONNREFUSED') {
    return `JobSpy service is not running on port ${port}. Start it with: npm run dev:services`
  }
  if (code === 'ECONNRESET' || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'ETIMEDOUT') {
    return `JobSpy service on port ${port} did not respond (${code}). It may still be starting — try again in a moment.`
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return `JobSpy service on port ${port} timed out while scraping. Try fewer pages or try again.`
  }
  return err instanceof Error ? err.message : String(err)
}

/** Map a JobSpy service result to the canonical NormalizedJob shape. */
function fromJobSpyJob(j: Record<string, unknown>): NormalizedJob {
  const url = typeof j.jobUrl === 'string' ? j.jobUrl : typeof j.applyUrl === 'string' ? (j.applyUrl as string) : ''
  const title = typeof j.title === 'string' ? j.title : ''
  const company = typeof j.company === 'string' ? j.company : ''
  // Synthesize a stable external id from the job URL or company:title.
  const externalId = url ? `jobspy:${url}` : `jobspy:${company}:${title}`
  return {
    externalId,
    title: title || undefined,
    company,
    companyUrl: typeof j.companyUrl === 'string' ? j.companyUrl : undefined,
    location: typeof j.location === 'string' ? j.location : undefined,
    jobUrl: url || undefined,
    postedDate: typeof j.postedDate === 'string' ? j.postedDate : undefined,
    postedLabel: typeof j.postedLabel === 'string' ? j.postedLabel : undefined,
    salary: typeof j.salary === 'string' ? j.salary : j.salary == null ? null : undefined,
    companyLogo: typeof j.companyLogo === 'string' ? j.companyLogo : undefined,
    applyUrl: typeof j.applyUrl === 'string' ? j.applyUrl : url || undefined,
    raw: typeof j.raw === 'string' ? j.raw : JSON.stringify(j),
  }
}

/**
 * Persist (upsert) a normalized job for the current user. Shared by both the
 * ChocoData and JobSpy code paths so a single write path serves all sources.
 */
async function upsertOpportunity(
  user: { id: string },
  job: NormalizedJob,
): Promise<void> {
  const extId = job.externalId || ''
  try {
    await db.jobOpportunity.upsert({
      where: {
        externalId_userId: { externalId: extId, userId: user.id },
      },
      update: {
        title: job.title || '',
        company: job.company || null,
        companyUrl: job.companyUrl || null,
        location: job.location || null,
        jobUrl: job.jobUrl || null,
        postedDate: job.postedDate || null,
        postedLabel: job.postedLabel || null,
        salary: job.salary || null,
        companyLogo: job.companyLogo || null,
        raw: job.raw || undefined,
      },
      create: {
        userId: user.id,
        externalId: extId || null,
        title: job.title || '',
        company: job.company || null,
        companyUrl: job.companyUrl || null,
        location: job.location || null,
        jobUrl: job.jobUrl || null,
        postedDate: job.postedDate || null,
        postedLabel: job.postedLabel || null,
        salary: job.salary || null,
        companyLogo: job.companyLogo || null,
        raw: job.raw || undefined,
      },
    })
  } catch {
    // unique-constraint miss or transient DB error; keep streaming
  }
}

// GET /api/jobs/scrape?keywords=...&location=...&pages=3&source=linkedin
// Streams ScrapingRun progress as SSE. Sources are split across two backends:
//   - ChocoData (Node HTTP): linkedin, weworkremotely, remoteok, remotive, dice
//   - JobSpy (Python service): indeed, glassdoor, zip_recruiter, google
export async function GET(request: NextRequest) {
  const controller = new ReadableStream<Uint8Array>({
    async start(controller) {
      let runId: string | null = null
      try {
        const user = await requireUser()

        const sp = request.nextUrl.searchParams
        const keywords = sp.get('keywords') || ''
        const location = sp.get('location') || undefined
        const pages = Math.min(Number(sp.get('pages') || 3), 5)
        const source = (sp.get('source') || 'linkedin') as JobSource

        const parseResult = scrapeJobsSchema.safeParse({
          keywords,
          location,
          pages,
          source,
        })
        if (!parseResult.success) {
          sse(controller, {
            type: 'error',
            error:
              parseResult.error.issues[0]?.message || 'Keywords are required',
          })
          controller.close()
          return
        }

        const { keywords: kw, location: loc, pages: p } = parseResult.data

        // Plan gate (admins bypass). Free tier gets a small scrape.
        await enforcePlanGate(user.id, 'jobTargets')

        const run = await db.scrapingRun.create({
          data: {
            userId: user.id,
            keywords: kw,
            location: loc || null,
            pages: p,
            status: 'active',
          },
        })
        runId = run.id

        sse(controller, {
          type: 'progress',
          source,
          page: 0,
          pages: p,
          found: 0,
          totalFound: 0,
        })

        let totalFound = 0
        let requestCount = 0
        const seen = new Set<string>()
        const collected: NormalizedJob[] = []

        if (JOBSPY_SOURCES[source]) {
          // ----------------------- JobSpy branch -----------------------
          // JobSpy isn't paginated like ChocoData; treat `pages` as a result
          // multiplier (pages * 10) and fetch a single batch per source.
          const n = Math.min(p * 10, 50)
          const url = new URL(JOBSPY_URL)
          url.searchParams.set('keywords', kw)
          if (loc) url.searchParams.set('location', loc)
          url.searchParams.set('site', source)
          url.searchParams.set('n', String(n))

          sse(controller, {
            type: 'progress',
            source,
            page: 1,
            pages: p,
            found: totalFound,
            totalFound,
          })

          let data: { jobs?: unknown[]; errors?: string[] }
          try {
            const res = await fetch(url.toString(), {
              method: 'GET',
              headers: { Accept: 'application/json' },
              // JobSpy can be slow (browser scraping under the hood).
              signal: AbortSignal.timeout(90_000),
            })
            if (!res.ok) {
              const body = (await res.text()).slice(0, 300)
              throw new Error(`JobSpy (${source}) returned HTTP ${res.status}: ${body}`)
            }
            data = (await res.json()) as { jobs?: unknown[]; errors?: string[] }
            requestCount += 1
          } catch (err) {
            const msg = jobSpyError(err)
            sse(controller, { type: 'error', error: msg })
            await db.scrapingRun.update({
              where: { id: runId },
              data: { status: 'failed', totalFound, requestCount },
            })
            controller.close()
            return
          }

          const rawJobs = Array.isArray(data?.jobs) ? data.jobs : []
          const pageResults: NormalizedJob[] = rawJobs
            .map((j) => fromJobSpyJob(j as Record<string, unknown>))
            .filter(Boolean)

          for (const job of pageResults) {
            const key = job.externalId || job.jobUrl
            if (!key || seen.has(key)) continue
            seen.add(key)
            collected.push(job)
            await upsertOpportunity(user, job)
          }

          totalFound = collected.length
          sse(controller, {
            type: 'page',
            source,
            page: 1,
            pages: p,
            found: totalFound,
            totalFound,
            jobs: pageResults,
          })

          // Per-site warnings (e.g. Glassdoor 400 on a fuzzy location) are
          // non-fatal: surface them as a note, but don't abort the stream —
          // other boards may still have returned jobs.
          if (data?.errors?.length) {
            sse(controller, {
              type: 'progress',
              source,
              page: 1,
              pages: p,
              found: totalFound,
              totalFound,
              error: `JobSpy warnings: ${data.errors.join('; ')}`,
            })
          }
        } else {
          // ---------------------- ChocoData branch ----------------------
          for (let page = 1; page <= p; page++) {
            if (!chocoRateLimit(user.id)) {
              await new Promise((r) => setTimeout(r, 1500))
            }

            sse(controller, {
              type: 'progress',
              source,
              page,
              pages: p,
              found: totalFound,
              totalFound,
            })

            let data
            try {
              data = await fetchChocoJobs(source, kw, loc, page, 10)
              requestCount += 1
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              sse(controller, { type: 'error', error: msg })
              await db.scrapingRun.update({
                where: { id: runId },
                data: { status: 'failed', totalFound, requestCount },
              })
              controller.close()
              return
            }

            const pageResults: NormalizedJob[] = Array.isArray(data?.results)
              ? (data.results as Record<string, unknown>[]).map(normalizeJob)
              : []

            for (const job of pageResults) {
              const key = job.externalId || job.jobUrl
              if (!key || seen.has(key)) continue
              seen.add(key)
              collected.push(job)
              await upsertOpportunity(user, job)
            }

            totalFound = collected.length
            sse(controller, {
              type: 'page',
              source,
              page,
              pages: p,
              found: totalFound,
              totalFound,
              jobs: pageResults,
            })
          }
        }

        await db.scrapingRun.update({
          where: { id: runId },
          data: { status: 'completed', totalFound, requestCount },
        })

        sse(controller, {
          type: 'done',
          source,
          page: p,
          pages: p,
          found: totalFound,
          totalFound,
          jobs: collected,
          requestCount,
        })
      } catch (err: unknown) {
        if (err instanceof NextResponse) {
          const text = await err.text().catch(() => '')
          sse(controller, { type: 'error', error: text || 'Unauthorized' })
        } else {
          console.error('Scrape error:', err)
          sse(controller, {
            type: 'error',
            error: err instanceof Error ? err.message : 'Scrape failed',
          })
        }
      } finally {
        controller.close()
      }
    },
    cancel() {
      // Client disconnected; underlying fetch loop surfaces E_CANCELED.
    },
  })

  return new Response(controller, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
