import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { enforcePlanGate } from '@/lib/plans'
import { applyJobSchema } from '@/lib/validators'

const isDryRun = () => process.env.AUTO_APPLY_DRY_RUN !== 'false'

// POST /api/jobs/apply — create an application record for a job.
// Respects the AUTO_APPLY_DRY_RUN env: when dry-run is on, the application is
// recorded with status "pending" + dryRun=true and an activity log entry is
// written, but no external email/send action is taken. The UI gates the actual
// call behind explicit user approval per job.
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = applyJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'jobId and resumeId are required',
        },
        { status: 400 },
      )
    }
    const { jobId, resumeId, autoApply, notes } = parsed.data

    // Plan gate (admins bypass).
    await enforcePlanGate(user.id, 'jobTargets')

    const job = await db.jobOpportunity.findFirst({
      where: { id: jobId, userId: user.id },
    })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const dryRun = isDryRun() || !autoApply

    const application = await db.jobApplication.create({
      data: {
        userId: user.id,
        jobId: job.id,
        resumeId: resumeId || null,
        status: dryRun ? 'pending' : 'sent',
        dryRun,
        sentAt: dryRun ? null : new Date(),
        details: notes || null,
      },
    })

    // Log to the shared activity timeline.
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: dryRun
          ? 'Queued auto-apply (dry run)'
          : 'Auto-applied to job',
        category: 'application',
        details: `${job.company || 'Unknown'} — ${job.title} (${job.location || 'remote'})`,
      },
    })

    // Promote the job status when a real (non-dry-run) application is sent.
    if (!dryRun) {
      await db.jobOpportunity.update({
        where: { id: job.id },
        data: { status: 'applied' },
      })
    }

    return NextResponse.json({
      success: true,
      dryRun,
      application,
    })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('POST /api/jobs/apply failed:', err)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
}
