/**
 * ChocoData Scraper API client.
 *
 * ChocoData is a general web-scraper-as-a-service (1000 req/day on the
 * free tier). This client wraps the LinkedIn job-search endpoint, which is
 * the canonical path for harvesting remote/hybrid job listings:
 *
 *   GET https://api.chocodata.com/api/v1/linkedin/jobsearch
 *
 * Query params:
 *   api_key   — ChocoData bearer key (CHOCODATA_API_KEY)
 *   keywords   — search keywords (e.g. "software engineer")
 *   location   — optional location filter
 *   page       — 1-indexed page number
 *   per_page   — results per page (default 10)
 *   start      — offset (alternative to `page`)
 *
 * Response shape (verified live):
 *   {
 *     query: "software engineer",
 *     keywords: "software engineer",
 *     location: "United States",
 *     start: 0,
 *     page: 1,
 *     total_results: 10,
 *     results: [
 *       {
 *         position: 1, id: "4447220072", job_id: "4447220072",
 *         title: "Software Engineer (All Levels)",
 *         url: "https://www.linkedin.com/jobs/view/...",
 *         company: "Blossom", company_url: "https://www.linkedin.com/company/...",
 *         location: "New York, NY", posted_date: "2026-07-30",
 *         posted_label: "1 week ago", salary: null,
 *         company_logo: "https://media.licdn.com/...",
 *         ...
 *       }
 *     ]
 *   }
 *
 * Free-tier guardrails:
 *  - `pages` is clamped to a small default to stay within the 1000 req/day
 *    quota (10 results/page × ~50 pages still leaves headroom).
 *  - Callers should use `chocoRateLimit` before each request to avoid 429s
 *    and conserve quota.
 */

export interface ChocoJob {
  position?: number
  id?: string
  job_id?: string
  title?: string
  url?: string
  company?: string
  company_url?: string
  location?: string
  posted_date?: string
  posted_label?: string
  salary?: string | null
  company_logo?: string
  [key: string]: unknown
}

export interface ChocoSearchResponse {
  query?: string
  keywords?: string
  location?: string
  start?: number
  page?: number
  total_results?: number
  results?: ChocoJob[]
  [key: string]: unknown
}

export interface ScrapeProgress {
  type: 'progress' | 'page' | 'jobs' | 'done' | 'error'
  page?: number
  pages?: number
  found?: number
  totalFound?: number
  jobs?: ChocoJob[]
  error?: string
}

export const CHOCO_API_BASE = 'https://api.chocodata.com/api/v1'

export function chocoHeaders(): Record<string, string> {
  const apiKey = process.env.CHOCODATA_API_KEY
  if (!apiKey) {
    throw new Error(
      'CHOCODATA_API_KEY is not set. Add it to .env (see .env.example).',
    )
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Fetches a single page of LinkedIn job results from ChocoData.
 * Returns the parsed JSON envelope (no array normalization).
 */
export async function fetchChocoJobs(
  keywords: string,
  location: string | undefined,
  page: number,
  perPage = 10,
): Promise<ChocoSearchResponse> {
  const params = new URLSearchParams({
    api_key: process.env.CHOCODATA_API_KEY || '',
    keywords,
    page: String(page),
    per_page: String(perPage),
  })
  if (location) params.set('location', location)

  const res = await fetch(`${CHOCO_API_BASE}/linkedin/jobsearch?${params.toString()}`, {
    method: 'GET',
    headers: chocoHeaders(),
    cache: 'no-store',
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const body = (await res.text()).slice(0, 500)
    throw new Error(`ChocoData request failed (HTTP ${res.status}): ${body}`)
  }

  return (await res.json()) as ChocoSearchResponse
}

/**
 * Minimal sliding-window rate limiter for ChocoData to avoid exhausting the
 * 1000 req/day free tier too fast. `CHOCODATA_RATE_LIMIT_RPM` defaults to 10.
 */
const chocoBuckets = new Map<string, { count: number; resetAt: number }>()

export function chocoRateLimit(key = 'global'): boolean {
  const limit = Number(process.env.CHOCODATA_RATE_LIMIT_RPM || '10')
  const windowMs = 60_000
  const now = Date.now()
  const bucket = chocoBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    chocoBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}
