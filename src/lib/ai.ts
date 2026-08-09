import ZAI from 'z-ai-web-dev-sdk'
import type { ChatMessage } from 'z-ai-web-dev-sdk'

/*
 * Model resolution:
 * - Per-endpoint override (`opts.model`) wins.
 * - Then `AI_MODEL` (general) / `AI_STREAM_MODEL` (streaming).
 * - Then `OPEN_ROUTER_MODEL` (the env var provisioned for this project).
 * - Finally a sensible default.
 */
const DEFAULT_MODEL = process.env.AI_MODEL || process.env.OPEN_ROUTER_MODEL || 'deepseek-chat'
const STREAM_MODEL =
  process.env.AI_STREAM_MODEL ||
  process.env.OPEN_ROUTER_MODEL ||
  process.env.AI_MODEL ||
  'default'

export interface AICompletionOptions {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

/**
 * Resolves the ZAI config object from environment variables so that
 * a `.z-ai-config` file is not strictly required. Supports OpenRouter
 * (primary) and OpenAI-compatible gateways as fallbacks. If no env vars
 * are present, callers fall back to `ZAI.create()`, which reads `.z-ai-config`.
 */
function resolveEnvConfig(): { baseUrl: string; apiKey: string } | null {
  const openRouterKey = process.env.OPEN_ROUTER_API_KEY
  if (openRouterKey) {
    return {
      baseUrl: process.env.OPEN_ROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
    }
  }
  const openAiKey = process.env.OPENAI_API_KEY
  const openAiBase = process.env.OPENAI_BASE_URL
  if (openAiKey && openAiBase) {
    return { baseUrl: openAiBase, apiKey: openAiKey }
  }
  return null
}

type ZaiInstance = Awaited<ReturnType<typeof ZAI.create>>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInstance: ZaiInstance | null = null

async function getClient(): Promise<ZaiInstance> {
  if (!zaiInstance) {
    const envConfig = resolveEnvConfig()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zaiInstance = envConfig ? new (ZAI as any)(envConfig as any) : await ZAI.create()
  }
  if (!zaiInstance) throw new Error('AI client is not configured')
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
