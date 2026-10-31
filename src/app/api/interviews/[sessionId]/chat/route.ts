import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { completeStream } from '@/lib/ai'
import { buildInterviewSystemPrompt } from '@/lib/prompts'
import { interviewChatSchema } from '@/lib/validators'
import { NextRequest } from 'next/server'

/**
 * POST /api/interviews/[sessionId]/chat
 * Streaming conversational endpoint (Server-Sent Events).
 *
 * Response format: text/event-stream with `data:` lines:
 *   data: {"type":"delta","content":"..."}
 *   data: {"type":"done","score":8}
 *   data: {"type":"error","error":"..."}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const encoder = new TextEncoder()

  function sendEvent(controller: ReadableStreamDefaultController<Uint8Array>, payload: unknown) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
  }

  try {
    const user = await requireUser()
    const { sessionId } = await params
    const body = await request.json()
    const parsed = interviewChatSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'Message is required' })}\n\n`,
        { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
      )
    }
    const { message, history } = parsed.data

    // Fetch session with ownership check
    const session = await db.interviewSession.findFirst({
      where: { id: sessionId, userId: user.id },
    })

    if (!session) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'Session not found' })}\n\n`,
        { status: 404, headers: { 'Content-Type': 'text/event-stream' } },
      )
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: buildInterviewSystemPrompt(session.type, session.role, session.company) },
    ]

    // If this is the first message (no prior history), add an opening question
    const isFirstMessage = !history || (Array.isArray(history) && history.length === 0)
    if (isFirstMessage) {
      const openingQuestions: Record<string, string> = {
        behavioral: 'To start, could you tell me about a recent professional achievement you\'re proud of and why it mattered?',
        technical: 'To start, could you walk me through a recent technical challenge you solved and your approach?',
        'role-specific': 'To start, could you tell me about your experience with the target role\'s key responsibilities?',
      }
      const question = openingQuestions[session.type] || openingQuestions.behavioral
      messages.push({ role: 'assistant', content: question })
    } else {
      if (Array.isArray(history)) {
        for (const msg of history) {
          if (msg.role && msg.content) {
            messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })
          }
        }
      }
    }
    messages.push({ role: 'user', content: message })

    // Persist the user message immediately
    await db.interviewMessage.create({ data: { sessionId, role: 'user', content: message } })

    const stream = await completeStream({ messages })

    // Rough heuristic score based on answer length/depth (stored per AI message).
    const contentLength = message.trim().split(/\s+/).length
    const heuristicScore = Math.max(0, Math.min(10, Math.round(contentLength / 40)))

    return new Response(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          let full = ''
          const reader = stream.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              const chunk = new TextDecoder().decode(value)
              full += chunk
              sendEvent(controller, { type: 'delta', content: chunk })
            }
          } catch (err) {
            console.error('Interview stream error:', err)
            sendEvent(controller, { type: 'error', error: 'Failed to generate response' })
            controller.close()
            return
          }

          // Persist the AI response
          await db.interviewMessage.create({
            data: {
              sessionId,
              role: 'ai',
              content: full,
              score: heuristicScore,
              feedback: 'Auto-scored based on response depth.',
            },
          })

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
