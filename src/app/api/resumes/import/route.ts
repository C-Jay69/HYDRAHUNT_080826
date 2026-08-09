import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { parseUpload } from '@/lib/file-upload'
import { complete, extractJson } from '@/lib/ai'
import { RESUME_RESTRUCTURE_SYSTEM_PROMPT, buildResumeRestructureUserPrompt } from '@/lib/prompts'
import { structuredToSections } from '@/lib/resume-structure'
import { enforcePlanGate } from '@/lib/plans'
import { AI_RATE_LIMIT, rateLimitResponse } from '@/lib/rate-limit'

// POST /api/resumes/import — upload a resume file, LLM restructures it into
// the proper section format, and saves it as a new resume.
export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const limited = rateLimitResponse(`ai:${user.id}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)
    if (limited) return limited

    await enforcePlanGate(user.id, 'resumes')
    await enforcePlanGate(user.id, 'aiGenerations')

    const { filename, text } = await parseUpload(request)
    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: 'No readable text found in the file. Try a PDF, DOCX, TXT, or MD file.' },
        { status: 400 },
      )
    }

    // Run AI restructure (non-streaming)
    const rawContent = await complete({
      messages: [
        { role: 'system', content: RESUME_RESTRUCTURE_SYSTEM_PROMPT },
        { role: 'user', content: buildResumeRestructureUserPrompt(text) },
      ],
      temperature: 0.3,
      maxTokens: 5000,
    })

    const parsed = extractJson(rawContent)
    if (!parsed) {
      return NextResponse.json(
        { error: 'The AI could not parse the resume. Please try a cleaner file or fix the formatting.' },
        { status: 422 },
      )
    }

    const { summary, sections } = structuredToSections(parsed)
    const title = typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim().slice(0, 200)
      : filename.replace(/\.[^.]+$/, '').slice(0, 200)

    const existingCount = await db.resume.count({ where: { userId: user.id } })

    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title,
        summary: summary || null,
        isDefault: existingCount === 0,
        sections: { create: sections },
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    await db.activityLog.create({
      data: { userId: user.id, action: 'Imported resume', category: 'resume', details: `${title} (${filename})` },
    })

    return NextResponse.json(resume, { status: 201 })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('Resume import error:', error)
    return NextResponse.json({ error: 'Failed to import resume' }, { status: 500 })
  }
}
