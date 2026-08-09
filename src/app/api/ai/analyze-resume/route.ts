import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { complete, extractJson } from '@/lib/ai'
import { RESUME_ANALYSIS_SYSTEM_PROMPT, buildResumeAnalysisUserPrompt, formatResumeForAI } from '@/lib/prompts'
import { analyzeResumeSchema } from '@/lib/validators'
import { AI_RATE_LIMIT, rateLimitResponse } from '@/lib/rate-limit'

// POST /api/ai/analyze-resume — create analysis, run AI, update result
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const limited = rateLimitResponse(`ai:${user.id}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)
    if (limited) return limited

    const body = await request.json()
    const parsed = analyzeResumeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 })
    }
    const { resumeId, targetRole } = parsed.data

    // Fetch resume with sections (ownership-checked)
    const resume = await db.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Create analysis record in processing state
    const analysis = await db.resumeAnalysis.create({
      data: {
        userId: user.id,
        resumeId,
        targetRole: targetRole || null,
        status: 'processing',
      },
    })

    const resumeText = formatResumeForAI(resume.title, resume.sections)

    // Run AI analysis (non-streaming)
    const rawContent = await complete({
      messages: [
        { role: 'system', content: RESUME_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: buildResumeAnalysisUserPrompt(resumeText, targetRole) },
      ],
      temperature: 0.4,
      maxTokens: 4000,
    })

    // Parse the AI response
    const parsedResponse = extractJson(rawContent)

    if (!parsedResponse) {
      await db.resumeAnalysis.update({
        where: { id: analysis.id },
        data: { status: 'failed', rawResponse: rawContent },
      })
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Extract and validate fields
    const atsScore = typeof parsedResponse.atsScore === 'number' ? Math.min(100, Math.max(0, Math.round(parsedResponse.atsScore))) : null
    const strengths = Array.isArray(parsedResponse.strengths) ? parsedResponse.strengths.filter((s: unknown) => typeof s === 'string') : null
    const weaknesses = Array.isArray(parsedResponse.weaknesses) ? parsedResponse.weaknesses.filter((w: unknown) => typeof w === 'string') : null
    const missingKeywords = Array.isArray(parsedResponse.missingKeywords) ? parsedResponse.missingKeywords.filter((k: unknown) => typeof k === 'string') : null
    const rewrittenBullets = Array.isArray(parsedResponse.rewrittenBullets)
      ? parsedResponse.rewrittenBullets
          .filter((b: Record<string, unknown>) => typeof b.original === 'string' && typeof b.rewritten === 'string')
          .map((b: Record<string, string>) => ({ original: b.original, rewritten: b.rewritten }))
      : null
    const roleFitAssessment = typeof parsedResponse.roleFitAssessment === 'string' ? parsedResponse.roleFitAssessment : null
    const actionChecklist = Array.isArray(parsedResponse.actionChecklist) ? parsedResponse.actionChecklist.filter((a: unknown) => typeof a === 'string') : null

    // Update analysis with results
    const updated = await db.resumeAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: 'completed',
        atsScore,
        strengths: strengths ? JSON.stringify(strengths) : null,
        weaknesses: weaknesses ? JSON.stringify(weaknesses) : null,
        missingKeywords: missingKeywords ? JSON.stringify(missingKeywords) : null,
        rewrittenBullets: rewrittenBullets ? JSON.stringify(rewrittenBullets) : null,
        roleFitAssessment,
        actionChecklist: actionChecklist ? JSON.stringify(actionChecklist) : null,
        rawResponse: rawContent,
      },
      include: {
        resume: { select: { title: true } },
      },
    })

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'Ran resume analysis',
        category: 'analysis',
        details: `${updated.resume.title} — ATS Score: ${atsScore ?? 'N/A'}/100`,
      },
    })

    return NextResponse.json({
      id: updated.id,
      resumeId: updated.resumeId,
      resumeTitle: updated.resume.title,
      targetRole: updated.targetRole,
      status: updated.status,
      atsScore: updated.atsScore,
      strengths,
      weaknesses,
      missingKeywords,
      rewrittenBullets,
      roleFitAssessment,
      actionChecklist,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    console.error('Resume analysis error:', error)
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to analyze resume' }, { status: 500 })
  }
}
