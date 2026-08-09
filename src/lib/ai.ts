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
  'deepseek-chat'

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

let zaiInstance: ZaiInstance | null = null

async function getClient(): Promise<ZaiInstance> {
  if (!zaiInstance) {
    const envConfig = resolveEnvConfig()
    zaiInstance = envConfig
      ? (Reflect.construct(ZAI, [envConfig]) as ZaiInstance)
      : await ZAI.create()
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

/**
 * Parses JSON that may be wrapped in code fences or truncated mid-object.
 * First tries a strict parse of the first {...} block. If that fails
 * (e.g. the LLM cut off output), it falls back to a bracket-balancing
 * repair that auto-closes open structures.
 */
export function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null
  const start = raw.indexOf('{')
  if (start === -1) return null
  const candidate = raw.slice(start)

  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(s)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }

  // 1. Strict: capture the first balanced {...} block (greedy to last }).
  const match = candidate.match(/\{[\s\S]*\}/)
  if (match) {
    const strict = tryParse(match[0])
    if (strict) return strict
  }

  // 2. Tolerant: balance brackets/quotes from the start and close any open
  //    structures so a truncated object still yields usable data.
  const repaired = closeJson(candidate)
  const repairedParsed = tryParse(repaired)
  if (repairedParsed) return repairedParsed

  // 3. Progressive longest-valid-prefix fallback.
  for (let end = candidate.length - 1; end > 0; end--) {
    const parsed = tryParse(closeJson(candidate.slice(0, end)))
    if (parsed) return parsed
  }
  return null
}

/**
 * Returns `s` with minimal closing tokens (quotes, commas, brackets)
 * appended so that open structures are closed. Best-effort repair for
 * JSON the LLM emitted but then truncated mid-token.
 */
function closeJson(s: string): string {
  let out = s.replace(/[\s,]+$/, '')
  let depth = 0
  const stack: string[] = []
  let inString = false
  let escape = false
  let prevTokenEndOpen = false // true if last closed token was an unquoted string value

  for (let i = 0; i < out.length; i++) {
    const ch = out[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = false
        prevTokenEndOpen = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      prevTokenEndOpen = false
      continue
    }
    if (ch === '{' || ch === '[') {
      depth++
      stack.push(ch === '{' ? '}' : ']')
      prevTokenEndOpen = false
      continue
    }
    if (ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1)
      if (stack.length) stack.pop()
      prevTokenEndOpen = false
      continue
    }
    if (ch === ':') {
      prevTokenEndOpen = false
      continue
    }
  }

  // If we ended inside an unterminated string, close the quote.
  if (inString) {
    out += '"'
    prevTokenEndOpen = false
  }

  // If we were mid-key/mid-value without a trailing comma, add one before
  // closing so ["a","b" → ["a","b"] doesn't need it, but {a:1 → {a:1}.
  out += stack.reverse().join('')
  return out
}
