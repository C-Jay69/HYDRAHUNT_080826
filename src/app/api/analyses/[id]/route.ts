import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/analyses/[id] — return a single analysis with parsed JSON fields
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const analysis = await db.resumeAnalysis.findUnique({
      where: { id },
      include: {
        resume: {
          select: { title: true },
        },
      },
    })

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const formatted = {
      id: analysis.id,
      resumeId: analysis.resumeId,
      resumeTitle: analysis.resume.title,
      targetRole: analysis.targetRole,
      status: analysis.status,
      atsScore: analysis.atsScore,
      strengths: analysis.strengths ? JSON.parse(analysis.strengths) : null,
      weaknesses: analysis.weaknesses ? JSON.parse(analysis.weaknesses) : null,
      missingKeywords: analysis.missingKeywords ? JSON.parse(analysis.missingKeywords) : null,
      rewrittenBullets: analysis.rewrittenBullets ? JSON.parse(analysis.rewrittenBullets) : null,
      roleFitAssessment: analysis.roleFitAssessment,
      actionChecklist: analysis.actionChecklist ? JSON.parse(analysis.actionChecklist) : null,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    }

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 })
  }
}
