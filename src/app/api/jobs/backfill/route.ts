import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { enforcePlanGate } from '@/lib/plans'
import {
  bdTriggerSnapshot,
  bdWaitForSnapshot,
  bdDownloadSnapshot,
  BD_JOB_DATASETS,
  type BdSnapshotStatus,
} from '@/lib/brightdataClient'
import { normalizeJob } from '@/lib/chocoClient'

// Allow the route to run long enough for a few snapshot builds. Hosts with
// their own limits may still cap this lower.
export const maxDuration = 300

const backfillSchema = z.object({
  sites: z.array(z.string().trim().min(1).max(50)).min(1).max(6).optional(),
  keyword: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  recordsLimit: z.number().int().min(1).max(1000).optional(),
  dryRun: z.boolean().optional(),
})

// POST /api/jobs/backfill
// Triggers a BrightData dataset snapshot for the requested board(s) and, when
// the snapshot is ready, streams the results into JobOpportunity. Designed for
// nightly/periodic bulk backfill (not realtime). Supports a `dryRun` mode that
// only reports counts without persisting.
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    await enforcePlanGate(user.id, 'jobTargets')

    const body = await request.json().catch(() => ({}))
    const parsed = backfillSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid backfill request' },
        { status: 400 },
      )
    }

    const sites = parsed.data.sites ?? ['linkedin', 'indeed', 'glassdoor']
    const keyword = parsed.data.keyword ?? ''
    const location = parsed.data.location ?? ''
    const recordsLimit = parsed.data.recordsLimit ?? 100
    const dryRun = parsed.data.dryRun === true

    const triggered: Array<{ site: string; snapshotId: string; status: BdSnapshotStatus | null; ingested?: number }> =
      []
    const errors: Array<{ site: string; error: string }> = []

    for (const site of sites) {
      const datasetId = BD_JOB_DATASETS[site]
      if (!datasetId) {
        triggered.push({ site, snapshotId: '', status: null })
        errors.push({ site, error: 'Unsupported site' })
        continue
      }

      // Build a filter. Field names are consistent across the jobs datasets
      // (job_title). Fall back to "is_not_null" when no keyword is given.
      let filter
      if (keyword) {
        filter = { name: 'job_title', operator: 'includes' as const, value: keyword }
      } else if (location) {
        filter = { name: 'job_location', operator: 'includes' as const, value: location }
      } else {
        filter = { name: 'job_title', operator: 'is_not_null' as const, value: null }
      }

      const { snapshotId } = await bdTriggerSnapshot(datasetId, filter, recordsLimit)
      triggered.push({ site, snapshotId, status: null })

      // Wait for the snapshot to build (can take minutes).
      const status = await bdWaitForSnapshot(snapshotId, { timeoutMs: 5 * 60_000 })
      triggered[triggered.length - 1].status = status

      if (status.status !== 'ready') {
        errors.push({ site, error: `Snapshot ended with status "${status.status}"` })
        continue
      }

      let ingested = 0
      const seen = new Set<string>()
      for await (const record of bdDownloadSnapshot(snapshotId)) {
        const job = normalizeJob(record as Record<string, unknown>)
        const key = job.externalId || job.jobUrl || `${job.company}:${job.title}`
        if (!key || seen.has(key)) continue
        seen.add(key)

        if (!dryRun) {
          try {
            await db.jobOpportunity.upsert({
              where: {
                externalId_userId: {
                  externalId: `bd:${site}:${key}`,
                  userId: user.id,
                },
              },
              update: {
                title: job.title || '',
                company: job.company || null,
                companyUrl: job.companyUrl || null,
                location: job.location || (location || null),
                jobUrl: job.jobUrl || null,
                postedDate: job.postedDate || null,
                postedLabel: job.postedLabel || null,
                salary: job.salary || null,
                companyLogo: job.companyLogo || null,
                raw: job.raw || undefined,
              },
              create: {
                userId: user.id,
                externalId: `bd:${site}:${key}`,
                title: job.title || '',
                company: job.company || null,
                companyUrl: job.companyUrl || null,
                location: job.location || (location || null),
                jobUrl: job.jobUrl || null,
                postedDate: job.postedDate || null,
                postedLabel: job.postedLabel || null,
                salary: job.salary || null,
                companyLogo: job.companyLogo || null,
                raw: job.raw || undefined,
              },
            })
            ingested += 1
          } catch (err) {
            // Keep going, but do not report success for a run that failed to
            // persist records.
            errors.push({
              site,
              error: err instanceof Error ? err.message : 'Failed to save a record',
            })
          }
        } else {
          ingested += 1
        }
      }

      triggered[triggered.length - 1].ingested = ingested
    }

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: dryRun
          ? 'Backfilled jobs (dry run)'
          : 'Backfilled jobs from BrightData',
        category: 'application',
        details: `${triggered
          .map((t) => `${t.site}=${t.snapshotId?.slice(0, 12)}`)
          .join(', ')}`,
      },
    })

    const readySites = triggered.filter((run) => run.status?.status === 'ready').length
    const allFailed = readySites === 0
    const status = allFailed ? 502 : errors.length > 0 ? 207 : 200

    return NextResponse.json(
      {
        success: !allFailed && errors.length === 0,
        runs: triggered,
        dryRun,
        errors,
      },
      { status },
    )
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err
    console.error('Backfill error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backfill failed' },
      { status: 500 },
    )
  }
}
