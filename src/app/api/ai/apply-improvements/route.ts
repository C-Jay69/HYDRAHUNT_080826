import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { complete, extractJson } from '@/lib/ai'
import {
  RESUME_IMPROVE_SYSTEM_PROMPT,
  buildResumeImproveUserPrompt,
  formatResumeForAI,
} from '@/lib/prompts'
import { structuredToSections } from '@/lib/resume-structure'
import { AI_RATE_LIMIT, rateLimitResponse } from '@/lib/rate-limit'
import { enforcePlanGate } from '@/lib/plans'

// POST /api/ai/apply-improvements — rewrite a resume to implement the
// suggestions from an ATS analysis (rewritten bullets, missing keywords,
// action checklist), then persist the improved version.
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const limited = rateLimitResponse(`ai:${user.id}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)
    if (limited) return limited

    await enforcePlanGate(user.id, 'aiGenerations')

    const body = await request.json()
    const resumeId = body?.resumeId as string | undefined
    const improvements = Array.isArray(body?.improvements)
      ? (body.improvements as unknown[]).filter((i): i is string => typeof i === 'string').slice(0, 20)
      : []

    if (!resumeId) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 })
    }
    if (improvements.length === 0) {
      return NextResponse.json({ error: 'improvements must be a non-empty array of instructions' }, { status: 400 })
    }

    // Ownership-checked fetch
    const resume = await db.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    const resumeText = formatResumeForAI(resume.title, resume.sections)

    const rawContent = await complete({
      messages: [
        { role: 'system', content: RESUME_IMPROVE_SYSTEM_PROMPT },
        { role: 'user', content: buildResumeImproveUserPrompt(resumeText, improvements) },
      ],
      temperature: 0.4,
      maxTokens: 5000,
    })

    const parsed = extractJson(rawContent)
    if (!parsed) {
      return NextResponse.json(
        { error: 'The AI could not produce an improved resume. Please try again.' },
        { status: 422 },
      )
    }

    const { summary, sections } = structuredToSections(parsed)

    // Snapshot the current version before overwriting
    await db.resumeVersion.create({
      data: {
        resumeId,
        label: 'Before AI improvements',
        notes: `Auto-snapshot before applying ${improvements.length} improvement(s).`,
        snapshot: JSON.stringify({
          title: resume.title,
          summary: resume.summary,
          sections: resume.sections.map((s) => ({
            type: s.type,
            title: s.title,
            content: s.content,
            sortOrder: s.sortOrder,
          })),
        }),
      },
    })

    // Replace sections (or leave them intact if the AI dropped a category)
    const existingTypes = new Set(resume.sections.map((s) => s.type))
    const nextSections: Array<{
      type: string
      title: string
      content: string
      sortOrder: number
    }> = resume.sections
      .filter((s) => !['summary', 'experience', 'education', 'skills', 'projects'].includes(s.type))
      .map((s) => ({
        type: s.type,
        title: s.title,
        content: s.content,
        sortOrder: s.sortOrder,
      }))
    for (const s of sections) {
      if (s.type === 'summary' && s.content === JSON.stringify('')) continue
      nextSections.push(s)
      existingTypes.delete(s.type)
    }

    const updated = await db.resume.update({
      where: { id: resumeId },
      data: {
        title: parsed.title && typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 200) : resume.title,
        summary: summary || resume.summary,
        sections: {
          deleteMany: {},
          create: nextSections.map((s, i) => ({
            type: s.type,
            title: s.title,
            content: s.content,
            sortOrder: s.sortOrder ?? i,
          })),
        },
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'Applied AI resume improvements',
        category: 'resume',
        details: `${updated.title} — ${improvements.length} improvement(s) applied`,
      },
    })

    return NextResponse.json({ success: true, resume: updated })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Apply improvements error:', error)
    return NextResponse.json({ error: 'Failed to apply improvements' }, { status: 500 })
  }
}
