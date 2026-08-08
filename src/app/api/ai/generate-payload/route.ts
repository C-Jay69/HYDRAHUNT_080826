import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

const TAB_SECTIONS = [
  { key: 'summary', label: 'Summary', description: 'A concise 2-3 paragraph summary of why the candidate is a strong fit' },
  { key: 'coverLetter', label: 'Cover Letter', description: 'A full, professional cover letter tailored to the job' },
  { key: 'outreachEmail', label: 'Outreach Email', description: 'A concise cold outreach/recruiter email (under 200 words)' },
  { key: 'linkedin', label: 'LinkedIn', description: 'A LinkedIn connection request message or InMail pitch' },
  { key: 'talkingPoints', label: 'Talking Points', description: 'Key bullet points for interview preparation' },
] as const

function formatResume(resume: { title: string; sections: Array<{ type: string; content: string }> }): string {
  const parts: string[] = [`Resume: ${resume.title}`]
  for (const section of resume.sections) {
    let content = ''
    try {
      const parsed = JSON.parse(section.content)
      if (typeof parsed === 'string') {
        content = parsed
      } else if (Array.isArray(parsed)) {
        content = parsed.map((entry: Record<string, unknown>) => {
          const lines: string[] = []
          for (const [k, v] of Object.entries(entry)) {
            if (v && k !== 'id') {
              lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
            }
          }
          return lines.join(' | ')
        }).join('\n')
      }
    } catch {
      content = section.content
    }
    parts.push(`## ${section.type}\n${content || '(empty)'}`)
  }
  return parts.join('\n\n')
}

function buildPrompt(resumeText: string, jobDescription: string, company: string, tone: string): string {
  const tabInstructions = TAB_SECTIONS
    .map((s, i) => {
      const isFirst = i === 0
      return `${isFirst ? 'START with' : 'Then output'} exactly: ---TAB:${s.key}\nFollowed by the ${s.label}: ${s.description}.`
    })
    .join('\n\n')

  return `You are an elite career strategist AI for HydraHunt, a cyberpunk-themed career platform. Generate highly tailored application materials for a job applicant.

## TONE: ${tone}
Use a ${tone.toLowerCase()} tone throughout all generated content. Be specific, actionable, and compelling.

## APPLICANT'S RESUME:
${resumeText}

## TARGET JOB DESCRIPTION:
${jobDescription}

## TARGET COMPANY:
${company || '(not specified)'}

## OUTPUT FORMAT:
Generate all 5 sections in order. Use the exact delimiter format below to separate each section:

${tabInstructions}

Do NOT include any other text before the first ---TAB:summary delimiter. Each section should be well-formatted using markdown (headers, bullet points, bold text where appropriate). Make every piece of content specific to THIS job and THIS candidate — no generic filler.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resumeId, jobDescription, company, tone } = body

    if (!resumeId || !jobDescription) {
      return new Response(JSON.stringify({ error: 'resumeId and jobDescription are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch resume from database
    const resume = await db.resume.findUnique({
      where: { id: resumeId },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!resume) {
      return new Response(JSON.stringify({ error: 'Resume not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const resumeText = formatResume(resume as unknown as { title: string; sections: Array<{ type: string; content: string }> })
    const prompt = buildPrompt(resumeText, jobDescription, company || '', tone || 'Professional')

    const zai = await ZAI.create()

    // Use streaming from the AI SDK
    const stream = await zai.chat.completions.create({
      model: 'default',
      messages: [
        { role: 'system', content: 'You are HydraHunt Payload Forge AI. Generate career application materials. Output only the requested content with proper ---TAB: delimiters. No preamble.' },
        { role: 'user', content: prompt },
      ],
      stream: true,
    }) as AsyncIterable<{ choices: Array<{ delta: { content?: string } }> }>

    // Create a TransformStream to convert AI stream chunks to plain text
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      async transform(chunk, controller) {
        controller.enqueue(chunk)
      },
    })

    // Convert the AI async iterable to a ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of stream) {
            const content = part?.choices?.[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
        } catch (err) {
          console.error('Stream error:', err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readableStream.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Payload generation error:', err)
    return new Response(JSON.stringify({ error: 'Failed to generate payload' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
