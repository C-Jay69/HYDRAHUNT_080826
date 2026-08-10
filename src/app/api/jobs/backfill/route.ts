import { NextResponse } from 'next/server'
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
    const sites: string[] = Array.isArray(body?.sites)
      ? body.sites
      : ['linkedin', 'indeed', 'glassdoor']
    const keyword = typeof body?.keyword === 'string' ? body.keyword : ''
    const location = typeof body?.location === 'string' ? body.location : ''
    const recordsLimit: number | undefined =
      typeof body?.recordsLimit === 'number' ? body.recordsLimit : 100
    const dryRun: boolean = body?.dryRun === true

    const triggered: Array<{ site: string; snapshotId: string; status: BdSnapshotStatus | null; ingested?: number }> =
      []

    for (const site of sites) {
      const datasetId = BD_JOB_DATASETS[site]
      if (!datasetId) {
        triggered.push({ site, snapshotId: '', status: null })
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

      if (status.status !== 'ready') continue

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
          } catch {
            // keep going
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

    return NextResponse.json({ success: true, runs: triggered, dryRun })
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err
    console.error('Backfill error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backfill failed' },
      { status: 500 },
    )
  }
}
