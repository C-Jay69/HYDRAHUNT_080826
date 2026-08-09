import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { parseUpload } from '@/lib/file-upload'
import { complete, extractJson } from '@/lib/ai'
import {
  RESUME_RESTRUCTURE_SYSTEM_PROMPT,
  buildResumeRestructureUserPrompt,
} from '@/lib/prompts'
import { structuredToSections } from '@/lib/resume-structure'
import { enforcePlanGate } from '@/lib/plans'
import { AI_RATE_LIMIT, rateLimitResponse } from '@/lib/rate-limit'

// POST /api/resumes/import — upload a resume file, LLM restructures it into
// the proper section format (JSON content so the editors can render it),
// and saves it as a new resume.
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const limited = rateLimitResponse(`ai:${user.id}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)
    if (limited) return limited

    await enforcePlanGate(user.id, 'resumes')
    await enforcePlanGate(user.id, 'aiGenerations')

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const { fileName, text } = await parseUpload(file)
    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: 'No readable text found in the file. Try a PDF, DOCX, TXT, or MD file.' },
        { status: 400 },
      )
    }

    // LLM restructure: raw text -> structured resume JSON
    const buildMessages = () => [
      { role: 'system' as const, content: RESUME_RESTRUCTURE_SYSTEM_PROMPT },
      { role: 'user' as const, content: buildResumeRestructureUserPrompt(text) },
    ]

    // The free pool model can intermittently truncate/empty its output, so
    // retry once if the response can't be parsed into structured JSON.
    let rawContent = await complete({
      messages: buildMessages(),
      temperature: 0.3,
      maxTokens: 5000,
    })
    let parsed = extractJson(rawContent)
    if (!parsed) {
      rawContent = await complete({
        messages: buildMessages(),
        temperature: 0.3,
        maxTokens: 5000,
      })
      parsed = extractJson(rawContent)
    }
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            'The AI could not parse a structured resume from your file. Please try a cleaner file or paste the text manually.',
        },
        { status: 422 },
      )
    }

    const { summary, sections } = structuredToSections(parsed as any)
    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim().slice(0, 200)
        : fileName.replace(/\.[^.]+$/, '').slice(0, 200)

    const existingCount = await db.resume.count({ where: { userId: user.id } })

    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title,
        summary: summary || null,
        isDefault: existingCount === 0,
        sections: {
          create: sections.map((s, i) => ({
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
        action: 'Imported resume',
        category: 'resume',
        details: `${title} (${fileName})`,
      },
    })

    return NextResponse.json(resume, { status: 201 })
  } catch (error: any) {
    console.error('Resume import error:', error)
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: error?.message || 'Failed to import resume' }, { status: 500 })
  }
}
