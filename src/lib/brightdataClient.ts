/**
 * BrightData Datasets API client (batch backfill path).
 *
 * This is NOT a realtime search API. It triggers a filtered snapshot of a
 * pre-collected BrightData dataset (LinkedIn / Indeed / Glassdoor job listings),
 * polls until the snapshot is built, then streams the JSONL download. Snapshots
 * can take minutes to build, so this is intended for nightly/periodic backfill
 * into the same `JobOpportunity` table used by the live `/api/jobs/scrape` path.
 *
 * Datasets (verified against your account):
 *   gd_lpfll7v5hcqtkxl6l  — LinkedIn job listings information
 *   gd_l4dx9j9sscpvs7no2  — Indeed job listings information
 *   gd_lpfbbndm1xnopbrcr0 — Glassdoor job listings information
 *
 * Filter operators supported by the API:
 *   =, !=, <, <=, >, >=, in, not_in, includes, not_includes,
 *   array_includes, not_array_includes, is_null, is_not_null, and, or
 *
 * Env: BRIGHTDATA_API_KEY (already in .env)
 */

export interface BdBudgetFilter {
  name: string
  operator:
    | '='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'in'
    | 'not_in'
    | 'includes'
    | 'not_includes'
    | 'array_includes'
    | 'not_array_includes'
    | 'is_null'
    | 'is_not_null'
    | 'and'
    | 'or'
  value: unknown
}

export interface BdTriggerResult {
  snapshotId: string
}

export interface BdSnapshotStatus {
  id: string
  status: 'building' | 'ready' | 'error' | 'failed' | string
  created?: string
  cost?: number
  dataset_id?: string
  initiation_type?: string
  failure_reason?: string
}

/** Map a friendly board name to its BrightData dataset snapshot id. */
export const BD_JOB_DATASETS: Record<string, string> = {
  linkedin: 'gd_lpfll7v5hcqtkxl6l',
  indeed: 'gd_l4dx9j9sscpvs7no2',
  glassdoor: 'gd_lpfbbndm1xnopbrcr0',
}

function bdHeaders(): Record<string, string> {
  const key = process.env.BRIGHTDATA_API_KEY
  if (!key) {
    throw new Error(
      'BRIGHTDATA_API_KEY is not set. Add it to .env (see .env.example).',
    )
  }
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

const BD_BASE = 'https://api.brightdata.com'

/** Trigger a filtered dataset snapshot. Returns the snapshot_id immediately. */
export async function bdTriggerSnapshot(
  datasetId: string,
  filter: BdBudgetFilter,
  recordsLimit?: number,
): Promise<BdTriggerResult> {
  const body: Record<string, unknown> = {
    dataset_id: datasetId,
    filter,
  }
  if (recordsLimit) body.records_limit = recordsLimit

  const res = await fetch(`${BD_BASE}/datasets/filter`, {
    method: 'POST',
    headers: bdHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = (await res.text()).slice(0, 500)
    throw new Error(`BrightData trigger failed (HTTP ${res.status}): ${txt}`)
  }
  const data = (await res.json()) as { snapshot_id?: string; error?: string }
  if (!data.snapshot_id) {
    throw new Error(`BrightData trigger error: ${data.error || JSON.stringify(data)}`)
  }
  return { snapshotId: data.snapshot_id }
}

/** Poll a snapshot's status until ready/error or timeout. */
export async function bdWaitForSnapshot(
  snapshotId: string,
  opts: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<BdSnapshotStatus> {
  const poll = opts.pollIntervalMs ?? 7000
  const timeout = opts.timeoutMs ?? 5 * 60_000
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const res = await fetch(`${BD_BASE}/datasets/snapshots/${snapshotId}`, {
      headers: bdHeaders(),
    })
    if (!res.ok) {
      throw new Error(`BrightData status check failed (HTTP ${res.status})`)
    }
    const status = (await res.json()) as BdSnapshotStatus
    if (status.status === 'ready') return status
    if (status.status === 'error' || status.status === 'failed') {
      throw new Error(
        `BrightData snapshot ${status.status}: ${status.failure_reason || ''}`,
      )
    }
    await new Promise((r) => setTimeout(r, poll))
  }
  throw new Error(`BrightData snapshot ${snapshotId} did not become ready within ${timeout}ms`)
}

/**
 * Download a ready snapshot as a streaming JSONL. Yields one parsed record
 * object per line. Use after `bdWaitForSnapshot(...).status === 'ready'`.
 */
export async function* bdDownloadSnapshot(
  snapshotId: string,
): AsyncGenerator<Record<string, unknown>> {
  const res = await fetch(`${BD_BASE}/datasets/snapshots/${snapshotId}/download`, {
    headers: bdHeaders(),
  })
  if (!res.ok) {
    const txt = (await res.text()).slice(0, 500)
    throw new Error(`BrightData download failed (HTTP ${res.status}): ${txt}`)
  }
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let eol: number
    while ((eol = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, eol).trim()
      buf = buf.slice(eol + 1)
      if (!line) continue
      try {
        yield JSON.parse(line) as Record<string, unknown>
      } catch {
        // skip malformed lines
      }
    }
  }
}
