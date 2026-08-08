import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// POST /api/ai/analyze-resume — create analysis, run AI, update result
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resumeId, targetRole } = body

    if (!resumeId) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 })
    }

    // Fetch resume with sections
    const resume = await db.resume.findUnique({
      where: { id: resumeId },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Create analysis record in processing state
    const analysis = await db.resumeAnalysis.create({
      data: {
        userId: 'demo-user',
        resumeId,
        targetRole: targetRole || null,
        status: 'processing',
      },
    })

    // Format resume for AI
    const resumeText = formatResume(resume.title, resume.sections)

    // Build system prompt
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) resume analyst. You perform deep analysis of resumes against target roles.

You MUST respond with a single valid JSON object (no markdown, no code fences, no extra text) with these exact fields:

{
  "atsScore": <number 0-100>,
  "strengths": [<string>, ...] (4-6 items),
  "weaknesses": [<string>, ...] (3-5 items),
  "missingKeywords": [<string>, ...] (8-15 relevant keywords),
  "rewrittenBullets": [{"original": "<original bullet text>", "rewritten": "<improved ATS-optimized version>"}, ...] (3-5 bullets),
  "roleFitAssessment": "<detailed paragraph assessing fit for the target role>",
  "actionChecklist": [<string>, ...] (5-8 specific actionable items)
}

Analysis guidelines:
- ATS Score: Based on keyword density, section completeness, quantified achievements, format clarity, and relevance to the target role.
- Strengths: Specific positive aspects of the resume.
- Weaknesses: Specific areas needing improvement.
- Missing Keywords: Industry-standard terms, skills, and buzzwords that should be added for the target role.
- Rewritten Bullets: Pick 3-5 weak bullet points and rewrite them to be more impactful, quantified, and ATS-friendly using action verbs and metrics.
- Role Fit Assessment: Overall assessment of how well the resume matches the target role, with specific recommendations.
- Action Checklist: Concrete, prioritized action items to improve the resume.`

    const userPrompt = `Analyze the following resume${targetRole ? ` for the target role: "${targetRole}"` : ' (general analysis)'}.

${resumeText}`

    // Run AI analysis (non-streaming)
    const zai = ZAI.create()
    const completion = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    })

    const rawContent = completion.choices[0]?.message?.content || ''

    // Parse the AI response
    let parsed: Record<string, unknown>
    try {
      // Try to extract JSON from possible markdown code blocks
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      // Mark as failed if parsing fails
      await db.resumeAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'failed',
          rawResponse: rawContent,
        },
      })
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Extract and validate fields
    const atsScore = typeof parsed.atsScore === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.atsScore))) : null
    const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.filter((s: unknown) => typeof s === 'string') : null
    const weaknesses = Array.isArray(parsed.weaknesses) ? parsed.weaknesses.filter((w: unknown) => typeof w === 'string') : null
    const missingKeywords = Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.filter((k: unknown) => typeof k === 'string') : null
    const rewrittenBullets = Array.isArray(parsed.rewrittenBullets)
      ? parsed.rewrittenBullets
          .filter((b: Record<string, unknown>) => typeof b.original === 'string' && typeof b.rewritten === 'string')
          .map((b: Record<string, string>) => ({ original: b.original, rewritten: b.rewritten }))
      : null
    const roleFitAssessment = typeof parsed.roleFitAssessment === 'string' ? parsed.roleFitAssessment : null
    const actionChecklist = Array.isArray(parsed.actionChecklist) ? parsed.actionChecklist.filter((a: unknown) => typeof a === 'string') : null

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
    return NextResponse.json({ error: 'Failed to analyze resume' }, { status: 500 })
  }
}

function formatResume(title: string, sections: Array<{ type: string; content: string }>): string {
  const parts: string[] = [`Resume: ${title}`]

  for (const section of sections) {
    let content = ''
    try {
      const parsed = JSON.parse(section.content)
      if (typeof parsed === 'string') {
        content = parsed
      } else if (Array.isArray(parsed)) {
        content = parsed
          .map((entry: Record<string, unknown>) => {
            const lines: string[] = []
            for (const [k, v] of Object.entries(entry)) {
              if (v && k !== 'id') {
                lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
              }
            }
            return lines.join(' | ')
          })
          .join('\n')
      } else {
        content = JSON.stringify(parsed)
      }
    } catch {
      content = section.content
    }
    parts.push(`\n--- ${section.type.toUpperCase()} ---\n${content}`)
  }

  return parts.join('\n')
}
