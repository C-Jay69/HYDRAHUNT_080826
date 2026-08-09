import ZAI from 'z-ai-web-dev-sdk'
import type { ChatMessage } from 'z-ai-web-dev-sdk'

const DEFAULT_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const STREAM_MODEL = process.env.AI_STREAM_MODEL || process.env.AI_MODEL || 'default'

export interface AICompletionOptions {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getClient() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

/**
 * Non-streaming completion. Returns the assistant's text content.
 */
export async function complete(opts: AICompletionOptions): Promise<string> {
  const zai = await getClient()
  const completion = await zai.chat.completions.create({
    model: opts.model || DEFAULT_MODEL,
    messages: opts.messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    thinking: { type: 'disabled' },
  })
  return completion?.choices?.[0]?.message?.content || ''
}

/**
 * Streaming completion. Returns a ReadableStream of text chunks (UTF-8).
 */
export async function completeStream(opts: AICompletionOptions): Promise<ReadableStream<Uint8Array>> {
  const zai = await getClient()
  const stream = (await zai.chat.completions.create({
    model: opts.model || STREAM_MODEL,
    messages: opts.messages,
    stream: true,
    temperature: opts.temperature,
  })) as AsyncIterable<{ choices: Array<{ delta?: { content?: string }; message?: { content?: string } }> }>

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of stream) {
          const content = part?.choices?.[0]?.delta?.content || part?.choices?.[0]?.message?.content
          if (content) {
            controller.enqueue(encoder.encode(content))
          }
        }
      } catch (err) {
        console.error('AI stream error:', err)
      } finally {
        controller.close()
      }
    },
    cancel() {
      // Client aborted; iterator will be torn down by GC.
    },
  })
}

/** Helper for parsing JSON that may be wrapped in code fences. */
export function extractJson(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}
