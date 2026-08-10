import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { enforcePlanGate } from '@/lib/plans'
import { scrapeJobsSchema } from '@/lib/validators'
import { fetchChocoJobs, chocoRateLimit, type ChocoJob } from '@/lib/chocoClient'

const encoder = new TextEncoder()

function sse(
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: unknown,
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
}

// GET /api/jobs/scrape?keywords=...&location=...&pages=3
// Streams ScrapingRun progress as SSE so the Job Opportunities UI can render
// results as they arrive, page by page, respecting the free-tier quota.
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

        const parseResult = scrapeJobsSchema.safeParse({
          keywords,
          location: location || null,
          pages,
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
          page: 0,
          pages: p,
          found: 0,
          totalFound: 0,
        })

        let totalFound = 0
        let requestCount = 0
        const seen = new Set<string>()
        const collected: ChocoJob[] = []

        for (let page = 1; page <= p; page++) {
          // Respect the per-minute ChocoData rate limit before each call.
          if (!chocoRateLimit(user.id)) {
            await new Promise((r) => setTimeout(r, 1500))
          }

          sse(controller, {
            type: 'progress',
            page,
            pages: p,
            found: totalFound,
            totalFound,
          })

          let data
          try {
            data = await fetchChocoJobs(kw, loc, page, 10)
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

          const pageResults: ChocoJob[] = Array.isArray(data?.results)
            ? (data.results as ChocoJob[])
            : []

          for (const job of pageResults) {
            const key =
              job.id || job.job_id || `${job.company}:${job.title}:${job.url}`
            if (!key || seen.has(key)) continue
            seen.add(key)
            collected.push(job)

            // Persist each discovered opportunity as we find it.
            try {
              await db.jobOpportunity.upsert({
                where: {
                  externalId_userId: {
                    externalId: job.job_id || key,
                    userId: user.id,
                  },
                },
                update: {
                  title: job.title || '',
                  company: job.company || null,
                  companyUrl: job.company_url || null,
                  location: job.location || null,
                  jobUrl: job.url || null,
                  postedDate: job.posted_date || null,
                  postedLabel: job.posted_label || null,
                  salary: job.salary || null,
                  companyLogo: job.company_logo || null,
                  raw: JSON.stringify(job),
                },
                create: {
                  userId: user.id,
                  externalId: job.job_id || key,
                  title: job.title || '',
                  company: job.company || null,
                  companyUrl: job.company_url || null,
                  location: job.location || null,
                  jobUrl: job.url || null,
                  postedDate: job.posted_date || null,
                  postedLabel: job.posted_label || null,
                  salary: job.salary || null,
                  companyLogo: job.company_logo || null,
                  raw: JSON.stringify(job),
                },
              })
            } catch {
              // unique-constraint miss; ignore and keep streaming
            }
          }

          totalFound = collected.length
          sse(controller, {
            type: 'page',
            page,
            pages: p,
            found: totalFound,
            totalFound,
            jobs: pageResults,
          })
        }

        await db.scrapingRun.update({
          where: { id: runId },
          data: { status: 'completed', totalFound, requestCount },
        })

        sse(controller, {
          type: 'done',
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
