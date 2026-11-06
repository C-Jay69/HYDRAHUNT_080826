# HydraHunt — Systems, Component & UX Audit

**Date:** 2026-11-04
**Scope:** 139 TS/TSX files, 41 API routes, 21 Prisma models, Python JobSpy worker, build/deploy config.
**Method:** Six parallel read-only audit agents, plus direct first-hand verification of the highest-severity claims.
**Static gates:** `tsc --noEmit` clean, `eslint .` clean.
**No source files were modified during the audit.**

**Legend:** ✅ = verified first-hand by the lead auditor; ◐ = agent finding with citation (not independently re-read).

---

## Phase 1 — Workflow Analysis & Architecture Mapping

### 1.1 Directory map

```
src/app/page.tsx                 Single client-side SPA shell. Switches on Zustand `view`;
                                 lazy-loads every feature view. Not real routes.
src/app/{privacy,field-guide}    The only real page routes besides `/`.
src/app/api/**                   41 route handlers. No service layer: auth, plan gates,
                                 validation, and business rules live inline per route.
src/components/landing/*         Landing, login, signup (plain views, no URL).
src/components/features/*        11 feature views; one file per feature (resume-forge = 1745 LOC).
src/components/app/*             Shell/chrome: sidebar nav, header, dashboard.
src/components/ui/*              55 shadcn primitives; ~23 never imported.
src/store/app-store.ts           Zustand+persist: view, auth flags, selections.
src/lib/*                        16 modules: auth, db, ai, prompts, ats, plans, stripe,
                                 email, scrape clients, export, upload, rate-limit, validators.
src/proxy.ts                     Next 16 proxy (replaces middleware): API session gate.
prisma/schema.prisma             21 models. No prisma/migrations/ directory.
mini-services/jobspy-svc/        Python stdlib HTTP worker called only by /api/jobs/scrape.
tests/                           1 JS + 1 Python offline test; 2 stale shell tests. Not in CI.
```

**Interaction model:** UI → `fetch`/`EventSource` → `/api/*` → `requireUser` → `enforcePlanGate` → Prisma/external client. Zustand owns navigation; the server is the real authority for data.

**Misplaced / orphaned:** `success-screen.tsx`, `error-fallback.tsx`, 23 `ui/*` components, root `seed.ts`, `create-test-user.ts`, `scripts-inspect-db.ts`, `test_schema.mjs`, `examples/websocket/*`, `.zscripts/*` (stale scaffolding), and the entire **7,113-file `venv/` tree** which is git-tracked ✅ (`git ls-files venv | wc -l` = 7113).

### 1.2 System map

| Area | Implementation |
|---|---|
| **UI** | SPA shell `src/app/page.tsx`; view ids in `app-store.ts`; nav in `sidebar.tsx` |
| **API** | 41 routes under `src/app/api/**`; no shared service/domain layer |
| **Data** | Prisma 6 → PostgreSQL (Supabase); 21 models ✅ |
| **State** | Zustand+localStorage for view/auth; TanStack Query used **only** by Resume Studio; everything else hand-rolled `fetch` |
| **Auth** | Custom scrypt passwords + HMAC cookie (7-day, stateless); proxy gate + per-route `requireUser`/`requireAdmin`; per-record `{id, userId}` checks |
| **External** | Supabase, Stripe (checkout/portal/webhook), OpenRouter/OpenAI-compatible via `z-ai-web-dev-sdk`, Sender.net, ChocoData, BrightData, Python JobSpy |
| **Side effects** | No cron/queue. SSE scrape, synchronous BrightData polling (up to 5 min/site), Stripe webhook, client autosave/polling |
| **Deploy** | `next standalone` on Vercel; JobSpy container on Render; legacy `.zscripts`+Caddy path still documented |

### 1.3 End-to-end workflows

**a) Signup / login / session**
`signup-page` → `POST /api/auth/signup` (zod, blocks admin emails, creates User+Profile+free Subscription, sets HMAC cookie) → Zustand `setAuthenticated` → dashboard. Login mirrors it. `page.tsx` restores session via `GET /api/auth/me` (`{user:{id,email,name,profile,plan,isAdmin}}`). Magic-link API exists but **has no UI caller**. `/login` and `/signup` are not real routes, so the proxy redirects at `proxy.ts:36-38` are effectively dead for direct navigation.

**b) Job discovery → Radar → A-List/apply → Trail**
Radar loads `GET /api/jobs` (cursor pagination) → search opens `EventSource('/api/jobs/scrape?...')` → route gates, creates `ScrapingRun`, fans out to ChocoData + JobSpy, normalizes, dedups by URL then `externalId_userId`, streams SSE `page`/`done`/`error`. A-List is a **separate pipeline** (`JobTarget`, manual add, drag status) with **no relation to `JobOpportunity`**. Apply (`POST /api/jobs/apply`) writes a `JobApplication` + `ActivityLog`; dry-run by default. Trail reads `/api/activity-log`. Backfill → BrightData is synchronous and has **no UI caller**.

**c) Resume flow**
List/create → import (`/api/resumes/import`: rate limit, plan gates, parse PDF/DOCX, AI restructure, persist) → client-side deterministic ATS score (`src/lib/ats.ts`) → edit with 2s debounce autosave → Tailor streams `text/plain` tab-delimited kit → version snapshot only happens automatically in `apply-improvements`; Rewind's manual create is broken → export PDF/DOCX/TXT (DOCX gated; "free watermark" is only a response header).

**d) Billing**
Pricing → `POST /api/stripe/checkout` (session metadata `{userId, plan}`, one-time vs subscription) → webhook → `syncSubscription` updates `Subscription.plan` → `/api/auth/me` and `/api/billing` read it → `enforcePlanGate` limits features. Subscription-lifecycle events are effectively **no-ops** (see §2.1).

**e) AI flows**
All through `src/lib/ai.ts` (`z-ai-web-dev-sdk`, OpenRouter/OpenAI-compatible, default `deepseek/deepseek-chat`), with retries/timeout/JSON repair. `analyze-resume` and `apply-improvements` are non-streaming; `generate-payload` and interview chat stream.

### 1.4 Architectural observations

- **Three parallel job models** (`JobOpportunity`, `JobTarget`, `JobApplication`) with no links; `JobApplication` has no GET endpoint, so applications are write-only to the UI. Dashboard "Applications Sent" counts `JobTarget.status`, not applications.
- **Two unrelated "ATS scores"**: deterministic `ats.ts` (client) vs AI `ResumeAnalysis.atsScore` (Fit Check). They can disagree.
- **Duplicate implementations:** restore logic in `versions/[id]` and `versions/[id]/restore`; analysis creation in `/api/analyses` and `/api/ai/analyze-resume`; resume creation in 3 routes; plan→price maps in `plans.ts` and `stripe.ts`; two seeding scripts.
- **Auth gating is client-side only for views**; the proxy protects APIs, not app views. `isAuthenticated` is persisted and user-editable, so the shell renders protected views from localStorage before `restoreSession` resolves.

---

## Phase 2 — Component Verification & Functional Audit

### 2.1 Critical and high defects (verified first-hand unless marked ◐)

| # | Severity | Defect | Evidence |
|---|---|---|---|
| 1 | **Critical (conditional)** | **Stripe webhook signature is forgeable when `STRIPE_WEBHOOK_SECRET` is unset.** The secret defaults to `''` and is passed to `constructEvent`; stripe-node will HMAC with an empty key. Anyone can POST a forged `checkout.session.completed` and grant themselves a paid plan. | ✅ `src/lib/stripe.ts:14`; `src/app/api/webhooks/stripe/route.ts:18` |
| 2 | **Critical (conditional)** | **Magic-link admin takeover when mail is not configured.** `/api/auth/magic-link` is public, creates a user for *any* email, does **not** block admin addresses (signup does), and returns the signed link in the response when `SENDER_API_KEY` is missing. `ADMIN_EMAILS` falls back to `admin@hydrahunt.online`. | ✅ `magic-link/route.ts:26-62`; `admin.ts:8`; `proxy.ts:7`; `signup/route.ts:21-26` |
| 3 | **High** | **Subscription cancellation never downgrades; billing history is never recorded.** `syncSubscription` updates plan/status but never persists `stripeSubId` (the column exists). Later `customer.subscription.*` events resolve the user only by `stripeSubId` or subscription `metadata.userId` — neither exists, because checkout sets metadata on the *session* only. `customer.subscription.deleted` therefore returns early: a cancelled customer keeps the paid plan forever. `recordBillingEvent` has the same lookup and records nothing. | ✅ `webhooks/stripe/route.ts:60-68,74-92,112-146,148-168`; `checkout/route.ts:46-53`; `schema.prisma` Subscription |
| 4 | **High** | **AI-generation quota is bypassable.** The gate counts `GeneratedPayload` rows, but `apply-improvements` and `resumes/import` call the LLM without creating one. `/api/upload` also skips `enforcePlanGate('resumes')` entirely. | ✅ `plans.ts:114-116`; `upload/route.ts:7-57`; ◐ call sites `apply-improvements:24`, `resumes/import:25` |
| 5 | **High** | **Settings never shows or saves the real profile.** `GET /api/auth/me` returns `{success, user:{name, profile}}`; the UI reads flat `data.id/data.name/...`, so every field is blank, and a non-OK response injects a **fabricated "Alex Chen" demo profile**. Save then PUTs `name:''` (fails `min(1)`) plus `experienceLevel`/`notificationsEnabled`, which the schema doesn't accept, and silently ignores failure. | ✅ `settings-page.tsx:99-138,145-165`; `auth/me/route.ts:21-32`; `validators.ts:140-155` |
| 6 | **High** | **Trajectory (career map) never renders nodes.** API returns `{success, map:{nodes}}`; UI reads `data.nodes` → always `[]`. | ✅ `career-map.tsx:224`; `career-map/route.ts:22` |
| 7 | **High** | **Rewind cannot create a version.** POST sends `{label, notes}`; `versionCreateSchema` requires `resumeId` → always 400. The diff UI is optional-chained, so it is inert rather than crashing because the API never returns `changes`. | ✅ `version-vault.tsx:100-110,334-345`; `validators.ts:92-96` |
| 8 | **High** | **`/api/jobs/apply` accepts another user's `resumeId` and records unsent applications as "sent".** Job ownership is checked; `resumeId` is inserted verbatim with no FK. With `AUTO_APPLY_DRY_RUN=false` it writes `status:'sent'`, `sentAt`, and `job.status='applied'` although no external send exists. No duplicate guard. | ✅ `apply/route.ts:33-51,40-48` |
| 9 | **High** | **Backfill is unrunnable in prod and reports false success.** No zod/limits on `sites`/`recordsLimit`, up to 5 min per site sequentially, no `maxDuration`, and per-record `catch {}` converts DB failures into `success:true`. The npm script also sends no cookie, so it always 401s behind the proxy. | ◐ `jobs/backfill/route.ts:24-31,59,109-111`; `package.json:9` |
| 10 | **High** | **No rate limiting on login/signup/magic-link; scrypt is synchronous.** Credential stuffing and CPU DoS are unmitigated. The limiter that does exist is per-process (`Map`), so it multiplies across serverless instances and never evicts buckets. | ◐ `auth/login:8`, `signup:8`, `magic-link:13`; `rate-limit.ts:8,16-31` |
| 11 | **Medium** | **Guest contact form is always 401.** The contact page is public but `/api/contact` is not in `PUBLIC_API_PREFIXES`; the form also swallows errors and renders no message. | ✅ `proxy.ts:4-10`; ◐ `contact-page.tsx:82-89` |
| 12 | **Medium** | **Scrape is gated by A-List count.** `/api/jobs/scrape` calls `enforcePlanGate(user.id,'jobTargets')`, which counts `JobTarget` rows. A free user with 0 targets scrapes without limit; a user at the 10-target cap is blocked from Radar. | ✅ `plans.ts:123-125`; ◐ `scrape/route.ts:84` |
| 13 | **Medium** | **PDF export crashes on any non-WinAnsi character** (CJK, Arabic, emoji). Free-tier "watermark" is only an `X-HydraHunt-Watermark` header. | ◐ `resume-export.ts:236-238,265,282`; `export/route.ts:79-82` |
| 14 | **Medium** | **No Prisma migrations exist.** `prisma/migrations/` is absent ✅, yet the README's prod path says `prisma migrate deploy` — which applies nothing. | ✅ `ls prisma/migrations`; `README.md:202` |
| 15 | **Medium** | **`venv/` is committed** (7,113 files, ~106 MB pack) despite `.gitignore:66`. | ✅ `git ls-files` |
| 16 | **Medium** | **Tests never run in CI and there is no `test` script.** CI runs only typecheck + build; the JS/Python tests are dormant. CI also sets unused `NEXTAUTH_SECRET` instead of `AUTH_SECRET`. | ✅ `.github/workflows/ci.yml`; `package.json` |
| 17 | **Medium** | **JobSpy worker has no scrape timeout and unbounded thread concurrency**; `/health` stays green while wedged, and `daemon_threads` is unset. | ◐ `app.py:162,206-208,241-243` |
| 18 | **Medium** | **Scrape pagination truncates silently** when a page is all-duplicates/all-failed, and re-scrapes overwrite good fields with nulls. | ◐ `scrape/route.ts:35-41,177` |
| 19 | **Medium** | **Interview chat trusts client-supplied history** (200 × 10k chars, roles chosen client-side), no rate limit, no plan gate, no `max_tokens`. | ✅ `chat/route.ts:67-75`; ◐ `ai.ts:171-186` |
| 20 | **Medium-Low** | **ChocoData API key is also sent in the query string**, leaking into access/CDN logs. | ◐ `chocoClient.ts:156-161` |
| 21 | **Low** | **Prisma logs every query in production**, including parameters. | ◐ `db.ts:9-11` |
| 22 | **Low** | **Passwords/tokens are conflated**: magic-link token is accepted as a session cookie, tokens replayable for 15 min, and logout cannot revoke a captured cookie. | ◐ `auth.ts:36-78,92-111`; `logout/route.ts:5-8` |

### 2.1a Remediation log — 2026-11-04

Critical and high items from the table above (plus the two auth-adjacent mediums) were fixed on branch `feat/resume-delete`. `npx tsc --noEmit` and `npx eslint .` both pass. No database migration was required.

| # | Status | Fix applied |
|---|---|---|
| 1 | ✅ Fixed | `webhooks/stripe/route.ts` returns 503 when `STRIPE_WEBHOOK_SECRET` is unset instead of verifying against an empty key. |
| 2 | ✅ Fixed | `magic-link/route.ts` rejects `ADMIN_EMAILS` addresses (403), rate limits per IP, and fails closed with 503 in production when no mail provider is configured. The dev-only link-in-response path is now explicitly non-production. |
| 3 | ✅ Fixed | Checkout now sets `subscription_data.metadata.userId/plan`; `syncSubscription` persists `stripeSubId`; lifecycle events derive the plan from Stripe and treat `trialing` as active; `recordBillingEvent` resolves the owner via subscription metadata so early invoices are not dropped and records the real event type. `checkout.session.completed` ignores unpaid sessions. |
| 4 | ✅ Fixed | `apply-improvements` and `resumes/import` write a `GeneratedPayload` quota row per LLM call; `/api/upload` now calls `enforcePlanGate(user.id, 'resumes')`. |
| 5 | ✅ Fixed | Settings reads `data.user` / `data.user.profile`, the fabricated "Alex Chen" fallback is gone, saves send only schema-valid fields, and load/save failures surface in the UI with a Retry action. |
| 6 | ✅ Fixed | `career-map.tsx` reads `data.map.nodes` (with legacy fallbacks), and failures render an error with Retry instead of an empty state. |
| 7 | ✅ Fixed | `version-vault.tsx` resolves the user's default resume and sends `{ resumeId, label, notes }`; API errors and partially-successful restores now surface; save is disabled when no resume exists. |
| 8 | ✅ Fixed | `jobs/apply` validates `resumeId` ownership (404), rejects duplicates (409), and only records `status:'sent'` when delivery is actually configured — currently always dry-run. |
| 9 | ✅ Fixed | `jobs/backfill` validates input with zod, bounds sites (`max 6`) and records (`1..1000`), sets `maxDuration = 300`, collects per-site/per-record errors, and returns 502/207 instead of false success. The npm script now requires `HYDRA_SESSION_COOKIE` and forwards it. |
| 10 | ✅ Fixed | `rate-limit.ts` gains `Retry-After`, periodic bucket pruning, and `getClientIp`; login (per-IP + per-email), signup, magic-link, and contact are now limited. Still per-process — a shared store is required for cross-instance enforcement. |
| 11 | ✅ Fixed | `/api/contact` is in `PUBLIC_API_PREFIXES`, is rate limited, and the form renders API/network failures instead of silently resetting. |
| 21 | ✅ Fixed | Prisma logs only `warn`/`error` unless `PRISMA_QUERY_LOG=true`; the client is cached globally in every environment. |

Known limits of this pass: rate limiting is still per-process (serverless instances each hold their own bucket); `/api/jobs/scrape` plan gating and the remaining medium/low items are unchanged.

### 2.1b Remediation log — medium tier (2026-11-04)

Same validation: `tsc --noEmit`, `eslint .`, `npm test` (3 JS tests) and `npm run test:python` (3 Python tests) all pass.

| # | Status | Change |
|---|---|---|
| 12 | ✅ Fixed | Added a `scrapes` plan limit (monthly Radar runs) to `PlanLimits` and switched `/api/jobs/scrape` from `enforcePlanGate('jobTargets')` to `'scrapes'`. Free 5 / Mission Pack 10 / Hunter 100 / Beastmaster unlimited — tune in `SUBSCRIPTION_LIMITS`. Failed runs that never reached a provider do not consume quota. Gate errors now use human labels ("Radar search limit this month"). |
| 13 | ✅ Fixed | `resume-export.ts` sanitizes PDF text to CP1252 (NFKC fold, then strip unencodable characters), so emoji/CJK/arrows cost that character instead of crashing the export. Verified by generating a PDF containing emoji, CJK and ligatures. |
| 14 | ✅ Fixed | Added `prisma/migrations/0_init` (baseline SQL generated from the schema) + `migration_lock.toml`, and documented the one-time `prisma migrate resolve --applied 0_init` baseline step in the README. Nothing was applied to a database. |
| 15 | ✅ Fixed | `venv/` (7,113 files) removed from the git index with `git rm -r --cached`; local files are untouched and `.gitignore` already covered it. |
| 16 | ✅ Fixed | Added `test` / `test:python` npm scripts, a CI `test` job that runs both suites, made `build` depend on it, and replaced the unused `NEXTAUTH_SECRET` with `AUTH_SECRET` in CI. |
| 17 | ✅ Fixed | JobSpy worker now scrapes boards concurrently under a wall-clock deadline (`JOBSPY_SCRAPE_TIMEOUT`, default 60s) with bounded workers (`JOBSPY_MAX_WORKERS`, default 4), daemon scraper threads, and a `/health` payload exposing `inFlight` / `lastCompletedAt` / `status: busy`. Timed-out boards are reported as errors. New regression test covers the timeout. |
| 18 | ✅ Fixed | Re-scrapes only overwrite fields that were actually returned (no more nulls clobbering good data), and pagination stops after **two** consecutive pages with no new listings rather than one, with an explicit warning when it does stop. |
| 20 | ⚠️ Not fixable as suggested | Verified live: `Authorization: Bearer` and `x-api-key` variants all return **401** for ChocoData; only `?api_key=` authenticates. Removing the query parameter would break every ChocoData source. Treated as an accepted vendor constraint — our own logs never include the URL. |

Still open: #19 was fixed in the first pass (server-side history, rate limit, `max_tokens`); #22 (magic-link token accepted as a session cookie, no revocation) remains low severity.

### 2.2 Component health tables

#### Core & architecture

| Component / Module | Observed Function | Status | Risk & Edge Cases |
|---|---|---|---|
| `src/app/page.tsx` | SPA view switch | **Fail** | No auth gate before render; `sessionChecked` read but unused; only 3 of 11 views inside error boundary (`page.tsx:119-152`) |
| `src/store/app-store.ts` | Persisted nav/auth state | **Fail** | Hydration mismatch; stale auth renders protected views; `interview-session` view unreachable; `logout` typed sync but async (`app-store.ts:48,103,122-127`) |
| `src/proxy.ts` | API session gate | Warning | Correct Next 16 convention; `/api/contact` missing; loose prefix match; imports Prisma into proxy graph |
| `src/app/layout.tsx` | Root layout | Pass | No app-level error boundary |
| `error-fallback.tsx` | Error UI | **Fail** | Imported nowhere — dead code |
| `src/lib/db.ts` | Prisma singleton | Warning | `log:['query']` always on; prod singleton not cached (`db.ts:9-13`) |
| `prisma/schema.prisma` | 21 models | Warning | Cascades complete ✅; only 1 index in whole schema; status fields free-form strings; no `(userId, jobUrl)` unique |

#### API, auth & security

| Component / Module | Observed Function | Status | Risk & Edge Cases |
|---|---|---|---|
| `/api/webhooks/stripe` | Entitlement sync | **Fail** | Empty-secret forgeability ✅; no `event.id` idempotency; subscription events no-op ✅; no `payment_status` check |
| `/api/auth/magic-link(+verify)` | Passwordless login | **Fail** | Account takeover path ✅; no admin reservation; no rate limit; replayable token |
| `/api/auth/login|signup` | Credentials | Warning | No rate limit/lockout; sync scrypt; signup blocks admin emails |
| `/api/auth/logout` | Cookie clear | **Fail** | No server-side revocation |
| `/api/auth/me` | Session + profile | Pass (GET) / Warning (PUT) | Response shape mismatched with Settings consumer; PUT schema mismatch |
| `/api/admin/*` | Admin ops | Pass | Server-side role check; email-only role; no audit log |
| `/api/upload` | File → resume | **Fail** | No plan gate ✅, no size/MIME check ✅, full body in memory |
| `/api/resumes/import` | AI import | Warning | Rate-limited/gated, but no file size/MIME before parsing; quota counter bypass |
| `/api/resumes/[id]/export` | PDF/DOCX/TXT | Warning | DOCX 403 shown to all; TXT always allowed; watermark header only; Unicode crash |
| `/api/jobs/scrape` | SSE discovery | **Fail** | Wrong plan gate ✅; state-changing GET; no rate limit; shared provider quota |
| `/api/jobs/backfill` | BrightData ingest | **Fail** | Unbounded work ✅; no `maxDuration`; swallowed failures; unauthenticated npm script |
| `/api/jobs/apply` | Record application | **Fail** | Foreign `resumeId` ✅; false "sent"; duplicates |
| `/api/job-targets/*` | A-List CRUD | Pass | Ownership correct; partial PUT resets `priority` to `medium` |
| `/api/versions/*` | Snapshots | Warning | Restore duplicated; create requires `resumeId` the UI never sends |
| `/api/ai/*` | Generation | Warning | No `max_tokens`; failure leaves `processing` forever; prompt injection via raw interpolation |
| `/api/interviews/**` | Mock Room | **Fail** | Chat unthrottled/ungated; `score`/`status` bypass validators; `InterviewScore` never written |
| `/api/career-map` | Trajectory | **Fail** | Response shape mismatch ✅; PUT bypasses validator; GET creates rows as a side effect |
| `/api/contact` | Public form | **Fail** | Blocked by proxy ✅; silent failure |
| `/api/health` | Health | Warning | DB `SELECT 1` only; no dependency checks |
| `/api/analyses`, `/api/upload`, `/api`, magic-link | — | Orphan | No client callers |

#### Data & scraping

| Component / Module | Observed Function | Status | Risk & Edge Cases |
|---|---|---|---|
| JobSpy worker | Scrape service | **Fail** | No scrape timeout; unbounded threads; health always 200; token compare correct |
| Scrape dedup | Cross-run dedup | Warning | Non-atomic `findFirst`+`upsert`; provider-prefixed `externalId`s; no DB constraint |
| BrightData client | Snapshot ingest | Warning | No timeouts/retries; drops final unterminated JSONL record; no caps |
| ChocoData client | Search | Warning | Key in query string; listener leak in rate guard; no 429 retry |
| Root `seed.ts` | Demo data | **Fail** | Non-idempotent; no transaction; unlinked from scripts; demo user can't log in |
| `prisma/seed.ts` | Admin provision | Warning | Duplicates `create-test-user.ts`; no min password; own scrypt copy |
| Tests | Offline | Warning | Good scrape coverage; not in CI ✅; shell tests assert SQLite vs Postgres schema |
| Retention | — | Warning | No cleanup for opportunities/runs; crashed scrape stays `active` forever |

#### Frontend / UX

| Component | Function | Status | Risk & Edge Cases |
|---|---|---|---|
| `page.tsx` routing | View switch | **Fail** | No URLs/history; back exits app; refresh depends on localStorage |
| `header.tsx` | Chrome | **Fail** | Search + notification bell are dead controls; duplicate `<h1>` |
| `dashboard.tsx` | Momentum | Warning | Only recovery is `window.location.reload()`; raw action strings |
| `settings-page.tsx` | Settings | **Fail** | Fake profile fallback ✅; silent save failure |
| `job-opportunities.tsx` | Radar | **Fail** | Details `<Dialog>` missing `DialogContent`; card click opens two dialogs; `autoApply` defaults **true**; EventSource never cleaned up |
| `resume-forge.tsx` | Resume Studio | **Fail** | 1745-LOC monolith; unguarded response/JSON on editor load (not under SafeView) → white screen; 2s debounce can drop edits on Back |
| `version-vault.tsx` | Rewind | **Fail** | Create always 400 ✅; restore success does nothing; no toast |
| `career-map.tsx` | Trajectory | **Fail** | Nodes never load ✅; status button nested in expand-on-click |
| `kill-list.tsx` | A-List | **Fail** | Pointer-only DnD; persist compares already-mutated state and ignores failures → status silently never saves |
| `strike-analysis.tsx` | Fit Check | **Fail** | Fetch failures shown as empty state; failed analyses unfetchable; fake progress timer |
| `interview-drills.tsx` | Mock Room | **Fail** | Every handler swallows errors; no cancel; no end-session confirm |
| `payload-forge.tsx` | Tailor | Warning | Controller never aborted; no Cancel; output not persisted |
| `contact-page.tsx` | Contact | **Fail** | No error UI at all |
| `pricing-page.tsx` | Pricing | Warning | Feature matrix contradicts shipped gating; free CTA loses plan intent |
| shadcn primitives | UI kit | Pass | `ConfirmDialog` used well; 23 unused files |

#### DX / build / deploy

| Component / Module | Function | Status | Risk & Edge Cases |
|---|---|---|---|
| Prisma migrations | Prod schema | **Fail** | No `prisma/migrations/` ✅; documented `migrate deploy` applies nothing |
| `venv/` | Python deps | **Fail** | 7,113 files tracked ✅, ~106 MB |
| Lockfiles | Deps | Warning | `bun.lock` + `package-lock.json` both tracked; toolchain unpinned |
| `jobs:backfill` | Ops script | **Fail** | No auth cookie → 401; hardcoded port |
| `.zscripts/` + Caddy | Legacy deploy | **Fail** | Hardcoded `/home/z/my-project`; SQLite against Postgres schema; still documented |
| CI | Gates | Warning | Typecheck+build only; no lint/tests; wrong secret var ✅ |
| `.env.example` | Config | Warning | Missing `OPENAI_*`, `OPEN_ROUTER_BASE_URL`, `JOBSPY_HOST`; Resend vs Sender; weak defaults |
| `start-server.sh` | Dev stack | Warning | Orphans worker on reuse; hardcoded 3001; starts local worker even with external `JOBSPY_URL` |
| `tailwind.config.ts` | Config | Warning | Dead (Tailwind 4 CSS-first); globs point at non-existent dirs |
| `next.config.ts` | Build | Warning | `reactStrictMode: false`; standalone output unnecessary on Vercel |

### 2.3 Edge-case & failure themes

- **Race conditions:** check-then-create quota gates (`plans.ts:153-172`), non-atomic job dedup (`scrape/route.ts:43-51`), multiple `isDefault` resumes (`resumes/[id]:60,78-82`), duplicate Stripe checkout sessions.
- **Leaks:** unbounded `rate-limit` Map, ChocoData abort-listener accumulation, EventSource not closed, AI timeouts that never abort the upstream request.
- **Missing fallbacks:** Settings fake data, silent `catch {}` across 7 components, `processing` rows that never terminal, crashed `ScrapingRun` stuck `active`.
- **Missing validation:** `apply` resumeId, interview PUT, career-map PUT, backfill inputs, upload size/MIME.

---

## Phase 3 — Usability & UX Recommendations

### 3.1 Friction points

**Developer experience**

1. A fresh clone can't reach a working app: no migrations ✅, no Python bootstrap step, `AUTH_SECRET` unvalidated, and the documented deploy path (`migrate deploy`, `.zscripts`) is broken by design.
2. The repo fights itself: 106 MB `venv/` tracked, two lockfiles, dead Tailwind config, two seeders, stale shell tests that assert SQLite against a Postgres schema.
3. Tests exist but are invisible: no `test` script and no CI job, so regressions ship silently despite a clean typecheck.
4. Ops scripts lie: `jobs:backfill` always 401s, `start-server.sh` can orphan the worker, `dev:next` masks exit codes.

**User experience**

5. **No addresses.** Back exits the app; nothing is linkable; refresh is a prayer.
6. **Silent failures everywhere.** Users click save/apply/import and get no feedback — worst in Settings, Contact, Mock Room, Fit Check, A-List persistence.
7. **Broken flagship flows:** Settings (fake profile), Trajectory (empty), Rewind (create fails), Mock Room (scores always 0), Tailor (output discarded). These are core promises.
8. **Auth flash + fake fallbacks** undermine trust; a demo persona appearing as your profile is actively misleading.
9. **Destructive/irreversible actions lack confirmation** (auto-apply email, end session, apply-improvements, admin plan change), while safe actions are buried in confirms.
10. **Accessibility debt:** icon-only buttons without labels, clickable `Card` divs with no keyboard semantics, duplicate `<h1>`s, no reduced-motion on marquee, color-only badges.

### 3.2 Actionable enhancements (with concrete examples)

**A. One API client helper + toast-on-failure (highest leverage, ~1 file)**

```ts
// src/lib/api-client.ts
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}
// usage
try { await api('/api/resumes', { method: 'POST', ... }) }
catch (e) { toast({ variant: 'destructive', title: 'Save failed', description: String(e) }) }
```

Replace the ~20 hand-rolled `if (res.ok) {...}` blocks. This alone fixes Contact, Mock Room, Fit Check, Rewind, A-List persistence, and Resume Studio create.

**B. Fix response-shape contracts (small, unblocks 3 features)**

- Settings: `const { user } = await api('/api/auth/me'); setProfile({ ...user.profile, name: user.name, email: user.email })`.
- Trajectory: `setNodes(data.map?.nodes ?? [])`.
- Rewind create: pick the default resume and send `{ resumeId, label, notes }`; return `changes` or delete the diff UI.

**C. Real routing.** Minimum viable: sync the store with history — `history.pushState({}, '', \`/?view=${view}\`)` on `setView`, hydrate from `location.search`, listen to `popstate`. Better: real segments `/app/momentum`, `/app/radar`, etc., with middleware auth gating. This also fixes auth flash and deep links.

**D. Auth + billing hardening (config-only first)**

- Fail fast at boot if `STRIPE_WEBHOOK_SECRET` or `AUTH_SECRET` is missing; never default a webhook secret to `''`.
- Refuse to return magic links in production; block admin emails in magic-link; add a single-use nonce table.
- Persist `stripeSubId` in `syncSubscription` and copy metadata onto the subscription at checkout; add `event.id` idempotency.

**E. Feedback for long operations.** Wire the existing `AbortController` (Tailor) and `EventSource.close()` (Radar) to real Cancel buttons; add a 90s "still working" message; show scrape progress from the SSE `page` events.

**F. Confirm destructive actions with existing primitive.** Use `ConfirmDialog` for auto-apply (show recipient + source), end session, apply-improvements, and admin plan changes. Default `autoApply` to `false`.

**G. Gate and validate at the edge.** Add size/MIME checks in `parseUpload` (`file.size > 10MB` → 413), call `enforcePlanGate` in `/api/upload`, validate `resumeId` ownership in `apply`, and add `(userId, jobUrl)` uniqueness + indexes on `(userId, createdAt)`.

### 3.3 Priority refactors (5 highest impact)

| # | Refactor | Why now | Effort |
|---|---|---|---|
| 1 | **Close the two critical auth/billing holes**: required `STRIPE_WEBHOOK_SECRET` (no `''` fallback), no link-in-response in prod, magic-link admin block + rate limits, persist `stripeSubId` | Forgeable webhooks and admin takeover are existential; cancellation means lost revenue | S–M |
| 2 | **Fix flagship broken flows**: Settings, Trajectory, Rewind create, Mock Room scores, Tailor persistence | Five advertised features don't work; fixes are small shape/field changes | S |
| 3 | **Introduce a shared API client + error/loading contract**, then move feature fetches to React Query hooks | Eliminates the silent-failure epidemic and most UX friction in one convention | M |
| 4 | **Real routing + server-side view gating** | Fixes back/refresh/deep-links, auth flash, and makes the app shareable/testable | M |
| 5 | **Make the repo deployable and testable**: commit a Prisma baseline migration, remove `venv/`, one lockfile, add `test` script + CI lint/test, delete `.zscripts` | Production DB cannot currently be provisioned; tests never run | S–M |

---

## Corrections & confidence notes

- **Verified first-hand (✅):** Stripe secret fallback; magic-link takeover path; subscription-sync no-op; Settings shape mismatch + fake fallback; career-map shape; Rewind create 400; `version.changes` optional-chaining (inert, not a crash); apply `resumeId`; upload gate/limits; quota counter; contact proxy block; 21 models; no migrations; 7,113 tracked `venv/` files; CI contents; clean typecheck/lint.
- **Agent-reported, not independently re-read (◐):** JobSpy concurrency internals; PDF Unicode failure; exact component line numbers in features; ChocoData query-string key; Prisma prod logging behavior.
- **Discrepancies resolved:** model count is **21** (one agent said 18); API route count is **41** (one said 39).
- No core functionality was altered during the audit; both static gates pass.
