import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET /api/analyses — return all analyses for the current user with resume title
export async function GET() {
  try {
    const user = await requireUser()
    const analyses = await db.resumeAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: {
          select: { title: true },
        },
      },
    })

    const formatted = analyses.map((a) => ({
      id: a.id,
      resumeId: a.resumeId,
      resumeTitle: a.resume.title,
      targetRole: a.targetRole,
      status: a.status,
      atsScore: a.atsScore,
      strengths: a.strengths ? JSON.parse(a.strengths) : null,
      weaknesses: a.weaknesses ? JSON.parse(a.weaknesses) : null,
      missingKeywords: a.missingKeywords ? JSON.parse(a.missingKeywords) : null,
      rewrittenBullets: a.rewrittenBullets ? JSON.parse(a.rewrittenBullets) : null,
      roleFitAssessment: a.roleFitAssessment,
      actionChecklist: a.actionChecklist ? JSON.parse(a.actionChecklist) : null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json([])
  }
}

// POST /api/analyses — create a new analysis (processing status)
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { resumeId, targetRole } = body

    if (!resumeId) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 })
    }

    // Verify resume ownership
    const resume = await db.resume.findFirst({ where: { id: resumeId, userId: user.id } })
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    const analysis = await db.resumeAnalysis.create({
      data: {
        userId: user.id,
        resumeId,
        targetRole: targetRole || null,
        status: 'processing',
      },
    })

    return NextResponse.json(analysis, { status: 201 })
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to create analysis' }, { status: 500 })
  }
}
