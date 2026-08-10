/**
 * ChocoData Scraper API client.
 *
 * ChocoData is a general web-scraper-as-a-service (1000 req/day on the
 * free tier). This client wraps multiple job-board endpoints that all share
 * the same envelope shape:
 *
 *   { query, page, total_results, results:[{ ... }] }
 *
 * Confirmed-working sources (all verified live with the project key):
 *   - linkedin         → /api/v1/linkedin/jobsearch   (params: keywords, location)
 *   - weworkremotely   → /api/v1/weworkremotely/search  (params: q, location)
 *   - remoteok         → /api/v1/remoteok/search        (params: q, location)
 *   - remotive         → /api/v1/remotive/search        (params: q, location)
 *   - dice             → /api/v1/dice/search            (params: q, location)
 *
 * Registered but flaky (transient/extraction failures):
 *   - indeed.search  (bot-blocked), monster.search, careerbuilder.search
 *
 * NOT supported by ChocoData: glassdoor, ziprecruiter, flexjobs, remote.co
 *
 * Free-tier guardrails:
 *  - `pages` is clamped to a small default to stay within the 1000 req/day
 *    quota (10 results/page × ~50 pages still leaves headroom).
 *  - Callers should use `chocoRateLimit` before each request to avoid 429s
 *    and conserve quota.
 */

export type JobSource =
  | 'linkedin'
  | 'weworkremotely'
  | 'remoteok'
  | 'remotive'
  | 'dice'

/** Maps a friendly source name to the ChocoData API path segment. */
export const SOURCE_TARGET: Record<JobSource, string> = {
  linkedin: 'linkedin/jobsearch',
  weworkremotely: 'weworkremotely/search',
  remoteok: 'remoteok/search',
  remotive: 'remotive/search',
  dice: 'dice/search',
}

/** Parameter name each source accepts for the keyword query. */
const KEYWORD_PARAM: Record<JobSource, string> = {
  linkedin: 'keywords',
  weworkremotely: 'q',
  remoteok: 'q',
  remotive: 'q',
  dice: 'q',
}

/**
 * A normalized job record after pulling the disparate source payloads into a
 * common shape. Field names vary by board (e.g. weworkremotely uses `price`,
 * remoteok uses `apply_url`, remotive uses `thumbnail`); this is the canonical
 * representation persisted to JobOpportunity.
 */
export interface NormalizedJob {
  position?: number
  externalId?: string
  title?: string
  url?: string
  company?: string
  companyUrl?: string
  location?: string
  postedDate?: string
  postedLabel?: string
  salary?: string | null
  companyLogo?: string
  applyUrl?: string
  raw?: string
  [key: string]: unknown
}

export interface ChocoSearchResponse {
  query?: string
  keywords?: string
  page?: number
  total_results?: number
  results?: unknown[]
  [key: string]: unknown
}

export interface ScrapeProgress {
  type: 'progress' | 'page' | 'jobs' | 'done' | 'error'
  source?: JobSource
  page?: number
  pages?: number
  found?: number
  totalFound?: number
  jobs?: NormalizedJob[]
  requestCount?: number
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
 * Normalizes a raw ChocoData result object into the canonical JobOpportunity
 * shape. Boards differ in their field names; this hides that from the scraper.
 */
export function normalizeJob(raw: Record<string, unknown>): NormalizedJob {
  const toStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : v === undefined || v === null ? undefined : String(v)

  return {
    position: typeof raw.position === 'number' ? raw.position : undefined,
    externalId:
      toStr(raw.job_id) || toStr(raw.id) || toStr(raw.slug) || undefined,
    title: toStr(raw.title),
    url: toStr(raw.url),
    company: toStr(raw.company),
    companyUrl: toStr(raw.company_url) || toStr(raw.companyUrl),
    location: toStr(raw.location),
    postedDate: toStr(raw.posted_date) || toStr(raw.date_posted),
    postedLabel: toStr(raw.posted_label) || toStr(raw.age),
    salary:
      toStr(raw.salary) || toStr(raw.price) || toStr(raw.compensation) || null,
    companyLogo: toStr(raw.company_logo) || toStr(raw.thumbnail) || toStr(raw.image),
    applyUrl: toStr(raw.apply_url) || toStr(raw.applyLink) || toStr(raw.url),
    raw: JSON.stringify(raw),
  }
}

/**
 * Fetches a single page of job results from a given ChocoData source.
 * `source` selects the endpoint; `page` is 1-indexed.
 */
export async function fetchChocoJobs(
  source: JobSource,
  keywords: string,
  location: string | undefined,
  page: number,
  perPage = 10,
): Promise<ChocoSearchResponse> {
  const target = SOURCE_TARGET[source]
  const kwParam = KEYWORD_PARAM[source]

  const params = new URLSearchParams({
    api_key: process.env.CHOCODATA_API_KEY || '',
    [kwParam]: keywords,
    page: String(page),
    per_page: String(perPage),
  })
  if (location) params.set('location', location)

  const res = await fetch(
    `${CHOCO_API_BASE}/${target}?${params.toString()}`,
    {
      method: 'GET',
      headers: chocoHeaders(),
      cache: 'no-store',
      next: { revalidate: 0 },
    },
  )

  if (!res.ok) {
    const body = (await res.text()).slice(0, 500)
    throw new Error(
      `ChocoData [${source}] request failed (HTTP ${res.status}): ${body}`,
    )
  }

  return (await res.json()) as ChocoSearchResponse
}

/**
 * Minimal sliding-window rate limiter for ChocoData to avoid exhausting the
 * 1000 req/day free tier too fast. `CHOCODATA_RATE_LIMIT_RPM` defaults to 10.
 * Keyed per userId so concurrent users don't share a bucket.
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
