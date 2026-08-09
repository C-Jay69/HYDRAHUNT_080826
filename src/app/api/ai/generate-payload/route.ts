import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { completeStream } from '@/lib/ai'
import { buildPayloadPrompt, formatResumeForAI, PAYLOAD_SYSTEM_PROMPT } from '@/lib/prompts'
import { generatePayloadSchema } from '@/lib/validators'
import { AI_RATE_LIMIT, rateLimitResponse } from '@/lib/rate-limit'
import { enforcePlanGate } from '@/lib/plans'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const limited = rateLimitResponse(`ai:${user.id}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)
    if (limited) return limited

    await enforcePlanGate(user.id, 'aiGenerations')

    const body = await request.json()
    const parsed = generatePayloadSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'resumeId and jobDescription are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const { resumeId, jobDescription, company, tone } = parsed.data

    // Fetch resume with ownership check
    const resume = await db.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!resume) {
      return new Response(JSON.stringify({ error: 'Resume not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const resumeText = formatResumeForAI(resume.title, resume.sections)
    const prompt = buildPayloadPrompt(resumeText, jobDescription, company || '', tone || 'Professional')

    const readableStream = await completeStream({
      messages: [
        { role: 'system', content: PAYLOAD_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    })

    // Persist the generation record (content filled in on save from client or via a follow-up)
    await db.generatedPayload.create({
      data: {
        userId: user.id,
        resumeId,
        jobDescription,
        company: company || null,
        tone: tone || 'professional',
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Payload generation error:', err)
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: 'Failed to generate payload' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
