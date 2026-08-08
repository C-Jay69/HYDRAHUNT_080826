import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { message, history } = body

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Fetch session to get type/role/company
    const session = await db.interviewSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // Build system prompt with session context
    const systemPrompt = `You are a professional interviewer conducting a ${session.type} interview for a ${session.role || 'General'} position at ${session.company || 'a company'}. Ask one question at a time. After the candidate answers, provide brief feedback and then ask the next question. Be encouraging but thorough.`

    // Build messages array: system prompt + history + current message
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content })
        }
      }
    }

    messages.push({ role: 'user', content: message })

    // Call AI
    const zai = ZAI.create()
    const completion = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      thinking: { type: 'disabled' },
    })

    const response = completion.choices[0]?.message?.content || 'No response generated.'

    // Optionally compute a rough score based on answer length and complexity
    // (simple heuristic — can be replaced with AI scoring)
    let score: number | undefined
    if (session.status === 'completed' && session.score === null) {
      // Don't compute score here — let the PUT endpoint handle it
    }

    // Save messages to DB
    await db.interviewMessage.createMany({
      data: [
        { sessionId, role: 'user', content: message },
        { sessionId, role: 'ai', content: response },
      ],
    })

    const result: { response: string; score?: number } = { response }
    if (score !== undefined) result.score = score

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Interview chat error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
