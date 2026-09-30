import { z } from 'zod'

/**
 * Centralized environment variable validation using Zod.
 * Validates server-side configuration with sensible development fallbacks.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/hydrahunt'),
  AUTH_SECRET: z.string().min(16).default('hydrahunt-dev-secret-change-in-production'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // AI Configuration (OpenRouter / OpenAI-compatible)
  OPEN_ROUTER_API_KEY: z.string().optional(),
  OPEN_ROUTER_BASE_URL: z.string().url().optional(),
  OPEN_ROUTER_MODEL: z.string().default('deepseek/deepseek-chat'),
  AI_MODEL: z.string().optional(),
  AI_STREAM_MODEL: z.string().optional(),

  // Stripe Billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MISSION_PACK: z.string().optional(),
  STRIPE_PRICE_HUNTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_HUNTER_YEARLY: z.string().optional(),
  STRIPE_PRICE_BEASTMASTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_BEASTMASTER_YEARLY: z.string().optional(),

  // Upstash Redis (Optional — falls back to in-memory rate limiter)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Job Scraping Services
  CHOCODATA_API_KEY: z.string().optional(),
  BRIGHTDATA_API_KEY: z.string().optional(),
  JOBSPY_URL: z.string().url().default('http://127.0.0.1:3001/scrape'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): Env {
  const normalized = Object.fromEntries(
    Object.entries(rawEnv).map(([k, v]) => [k, v === '' ? undefined : v]),
  )
  const parsed = envSchema.safeParse(normalized)
  if (!parsed.success) {
    console.warn('Environment validation warnings:', parsed.error.flatten().fieldErrors)
    return envSchema.parse({})
  }
  return parsed.data
}

export const env = validateEnv()
