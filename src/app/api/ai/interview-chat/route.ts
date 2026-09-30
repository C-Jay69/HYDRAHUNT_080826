import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { completeStream } from '@/lib/ai'
import { buildInterviewSystemPrompt } from '@/lib/prompts'
import { rateLimit, AI_RATE_LIMIT } from '@/lib/rate-limit'

/**
 * POST /api/ai/interview-chat
 * Streaming conversational endpoint (Server-Sent Events) as specified in the API contract.
 *
 * Accepts:
 *   {
 *     sessionId?: string,
 *     message: string,
 *     history?: Array<{ role: 'user' | 'assistant', content: string }>,
 *     type?: 'behavioral' | 'technical' | 'role-specific',
 *     role?: string,
 *     company?: string
 *   }
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  function sendEvent(controller: ReadableStreamDefaultController<Uint8Array>, payload: unknown) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
  }

  try {
    const user = await requireUser()
    const rate = rateLimit(`ai:interview:${user.id}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)
    if (!rate.success) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'Rate limit exceeded. Please wait before sending another message.' })}\n\n`,
        { status: 429, headers: { 'Content-Type': 'text/event-stream' } },
      )
    }

    const body = await request.json()
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined
    const history = Array.isArray(body?.history) ? body.history : []

    if (!message) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'Message is required' })}\n\n`,
        { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
      )
    }

    let sessionType = typeof body?.type === 'string' ? body.type : 'behavioral'
    let sessionRole = typeof body?.role === 'string' ? body.role : null
    let sessionCompany = typeof body?.company === 'string' ? body.company : null

    if (sessionId) {
      const session = await db.interviewSession.findFirst({
        where: { id: sessionId, userId: user.id },
      })
      if (session) {
        sessionType = session.type
        sessionRole = session.role
        sessionCompany = session.company
        await db.interviewMessage.create({
          data: { sessionId, role: 'user', content: message },
        })
      }
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: buildInterviewSystemPrompt(sessionType, sessionRole, sessionCompany) },
    ]

    for (const msg of history) {
      if (msg?.role && msg?.content) {
        messages.push({
          role: msg.role === 'assistant' || msg.role === 'ai' ? 'assistant' : 'user',
          content: String(msg.content),
        })
      }
    }
    messages.push({ role: 'user', content: message })

    const stream = await completeStream({ messages })
    const contentLength = message.split(/\s+/).length
    const heuristicScore = Math.max(1, Math.min(10, Math.round(contentLength / 25)))
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

    return new Response(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          let full = ''
          reader = stream.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              const chunk = new TextDecoder().decode(value)
              full += chunk
              sendEvent(controller, { type: 'delta', content: chunk })
            }
          } catch (err) {
            console.error('Interview chat stream error:', err)
            sendEvent(controller, { type: 'error', error: 'Failed to generate response' })
            controller.close()
            return
          }

          if (sessionId) {
            await db.interviewMessage.create({
              data: {
                sessionId,
                role: 'ai',
                content: full,
                score: heuristicScore,
                feedback: 'Auto-scored based on response depth.',
              },
            }).catch(() => {})
          }

          sendEvent(controller, { type: 'done', score: heuristicScore })
          controller.close()
        },
        cancel() {
          reader?.cancel().catch(() => {})
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      },
    )
  } catch (error) {
    console.error('Interview chat error:', error)
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`,
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }
}
