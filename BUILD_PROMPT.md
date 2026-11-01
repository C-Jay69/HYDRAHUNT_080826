# HydraHunt — Build Prompt (Current Platform)

You are a senior staff engineer tasked with building, maintaining and extending **HydraHunt**, a production SaaS web application. This document describes the platform as it exists today. Treat it as the specification to rebuild or extend it without regressing behaviour.

---

## 1. Product

HydraHunt is an AI-powered job-search workspace. The positioning is **"Apply to fewer jobs, better."** Users do not mass-apply; they build a small, high-quality pipeline and tailor every application.

Core loop:

1. Build and score a resume in **Resume Studio**.
2. Discover roles in **Radar** (job scraping across multiple boards).
3. Curate a shortlist in **A-List** (Kanban pipeline).
4. Generate a tailored application kit in **Tailor** for one role.
5. Check resume-to-role fit in **Fit Check**.
6. Practice interviews in **Mock Room**.
7. Track applications and outcomes in **Momentum** and **Trail**.
8. Plan the longer path in **Trajectory**.

---

## 2. Non-negotiables

- **No invented fallbacks.** When an API call fails, surface the failure and offer Retry. Never substitute demo or sample data in place of real results. This applies to Momentum, Rewind, Trajectory, Trail and every other view.
- **Typecheck is a gate.** TypeScript runs in strict mode. `npm run typecheck` must pass, as must `lint` and the production build. CI enforces typecheck and build.
- **Internal identifiers are stable.** User-facing labels change; routes, Prisma models, view ids and environment variable names do not. See the naming table below.
- **Secrets stay server-side.** AI, scraping, Stripe and email credentials must never reach the client bundle. `.env` is never committed.
- **The JobSpy worker binds to loopback.** It must not be exposed publicly. It is reached through `JOBSPY_URL`.
- **Auto-apply is a dry run by default.** `AUTO_APPLY_DRY_RUN` must default to true; sending applications is opt-in.

---

## 3. Naming system

The product was rebranded from a cyberpunk vocabulary to a professional one. Internal identifiers were deliberately preserved.

| Area | User-facing label | Internal id |
| --- | --- | --- |
| Dashboard | Momentum | `dashboard` |
| Pipeline tracker | A-List | `kill-list` |
| Job discovery | Radar | `job-opportunities` |
| Resume builder | Resume Studio | `resume-forge` |
| Application kit | Tailor | `payload-forge` |
| Interview practice | Mock Room | `interview-drills` |
| Resume/role review | Fit Check | `analysis` |
| Version history | Rewind | `version-vault` |
| Activity log | Trail | `mission-log` |
| Career planning | Trajectory | `career-map` |

Do not rename the internal ids, model names, API paths or env vars as part of a copy change.

---

## 4. Stack (exact)

**Frontend:** Next.js 16 (App Router, `output: "standalone"`, React 19), TypeScript 5 (strict), Tailwind CSS 4, shadcn/ui on Radix primitives, Zustand 5 for view state, TanStack Query 5 for data fetching, Framer Motion 12, dnd-kit for the A-List board.

**Backend:** Next.js Route Handlers, Prisma 6 with PostgreSQL, custom auth (no NextAuth runtime), Sender.net transactional email, Stripe 22.

**AI:** `z-ai-web-dev-sdk`, OpenRouter by default (`deepseek/deepseek-chat`), with OpenAI-compatible fallbacks. Full provider/model ids only.

**Scraping:** ChocoData (Node client) plus a Python JobSpy micro-service (`python-jobspy==1.1.82`) and optional BrightData backfill.

**Runtime:** Bun 1.3 serves the standalone build in production; Node 22 for tooling; Python 3.12 for the worker.

---

## 5. Architecture

### App shell
`src/app/page.tsx` is a client component that lazy-loads every view and switches between them via `useAppStore().setView()`. This is intentionally an SPA shell, not one route per screen. Real routes exist only for:
- `/` — the shell (landing, auth views and app views)
- `/privacy` — privacy policy
- `/field-guide` — redirects to `/#field-manual`

### Route protection
`src/proxy.ts` is Next.js 16's replacement for middleware. It:
- Requires a valid session for every `/api/*` route except `/api/auth/login`, `/api/auth/signup`, `/api/auth/magic-link*`, `/api/webhooks/stripe` and `/api/health`.
- Redirects authenticated users away from `/login` and `/signup`.

### Layers
- `src/app/api/**` — route handlers, one folder per domain.
- `src/lib/**` — auth, AI, ATS scoring, billing plans, Stripe, email, scraping clients, rate limiting, resume export, validators.
- `src/store/app-store.ts` — current view and client-side session state.
- `prisma/schema.prisma` — 21 models; `prisma/seed.ts` provisions the admin.

### Health
`/api/health` stamps the app name even when the database is down, so dev/deploy scripts can distinguish this app from an unrelated process on the same port.

---

## 6. Data model

21 Prisma models, grouped by domain:

- **Identity:** `User`, `Profile`, `ActivityLog`, `Subscription`, `BillingEvent`
- **Resumes:** `Resume`, `ResumeSection`, `ResumeVersion`, `ResumeAnalysis`, `GeneratedPayload`
- **Pipeline:** `JobTarget`, `JobNote`, `JobActivity`, `JobOpportunity`, `JobApplication`, `ScrapingRun`
- **Interviews:** `InterviewSession`, `InterviewMessage`, `InterviewScore`
- **Career:** `CareerMap`, `CareerNode`

Key relationships: everything user-owned cascades from `User`; `JobApplication` links a user, a `JobOpportunity` and an optional resume; `ResumeVersion.snapshot` stores serialized resume state; `Subscription` tracks plan and Stripe ids.

---

## 7. API surface

| Group | Routes |
| --- | --- |
| Auth | `/api/auth/login`, `/signup`, `/logout`, `/me`, `/magic-link`, `/magic-link/verify` |
| Account | `/api/account`, `/api/activity-log`, `/api/upload`, `/api/health` |
| Resumes | `/api/resumes`, `/api/resumes/[id]`, `/api/resumes/import`, `/api/resumes/[id]/export` |
| Versions | `/api/versions`, `/api/versions/[id]`, `/api/versions/[id]/restore` |
| Analyses | `/api/analyses`, `/api/analyses/[id]` |
| AI | `/api/ai/analyze-resume`, `/api/ai/apply-improvements`, `/api/ai/generate-payload` |
| Interviews | `/api/interviews`, `/api/interviews/[sessionId]`, `/api/interviews/[sessionId]/chat` |
| Jobs | `/api/jobs`, `/api/jobs/scrape`, `/api/jobs/backfill`, `/api/jobs/apply` |
| Pipeline | `/api/job-targets`, `/api/job-targets/[id]` |
| Career | `/api/career-map` |
| Billing | `/api/billing`, `/api/stripe/checkout`, `/api/stripe/portal`, `/api/webhooks/stripe` |
| Admin | `/api/admin/stats`, `/api/admin/users`, `/api/admin/users/[id]` |
| Misc | `/api/contact` |

Scrape and backfill stream progress (SSE-style events: `progress`, `page`, `done`, `error`).

---

## 8. Feature requirements

### Momentum (dashboard)
Pipeline metrics (total, in pipeline, interviews, offers), recent activity, next actions. Reads from real APIs only.

### A-List (`kill-list`)
Six-column Kanban pipeline with drag-and-drop (dnd-kit), metric cards, search and priority filter, add-target dialog with validation, drag overlay, Framer Motion transitions, horizontal scroll on mobile. Backed by `/api/job-targets`.

### Radar (`job-opportunities`)
Keyword/location/source/depth search. Broad search fans out across sources, continues on partial failure, shows warnings. Results save to `JobOpportunity` and display incrementally. "Show All Jobs" pages saved results. Deduplicate by source ID and exact URL.

### Resume Studio (`resume-forge`)
Create/edit resumes with sections, ATS score, import (PDF/DOCX via mammoth, pdf-parse/unpdf/pdfjs-dist), export (PDF via pdf-lib, DOCX via docx), watermarked PDF on free plans. Version snapshots feed Rewind.

### Tailor (`payload-forge`)
Generates a five-piece application kit for one job: resume angle, cover letter, outreach message, interview brief and follow-up. Uses AI with the selected resume and job record.

### Mock Room (`interview-drills`)
Session creation, streaming chat with the interviewer, per-answer scoring (`InterviewScore`), feedback and session history.

### Fit Check (`analysis`)
AI review of a resume against a target role; stores analysis results in `ResumeAnalysis`; "apply improvements" writes back to the resume.

### Rewind (`version-vault`)
List snapshots, preview and restore (`/api/versions/[id]/restore`).

### Trail (`mission-log`)
Chronological activity feed from `ActivityLog` and application events.

### Trajectory (`career-map`)
Career map with nodes, target roles and skill gaps; generated/persisted via `/api/career-map`.

### Settings / Billing
Profile editing, plan display, Stripe Checkout/Portal, subscription status. Admin panel for stats and user management.

### Landing / auth
Marketing landing with hero, features, social proof, pricing teaser, footer and Field Manual anchor. Login and signup are views in the shell (magic link and password).

---

## 9. Auth and security

- Passwords: scrypt with per-user salt, `timingSafeEqual` verification.
- Magic links: 15-minute TTL, single-use tokens.
- Sessions: HMAC-SHA256 signed cookie `hydra_session`, 7-day expiry, secret from `AUTH_SECRET` or `SESSION_SECRET` (error if neither is set).
- Admin: `ADMIN_EMAILS` grants the admin panel and full paywall bypass. `ADMIN_EMAIL`/`ADMIN_PASSWORD` are only for `db:seed-admin`.
- Rate limiting: in-process limiter in `src/lib/rate-limit.ts`; document that it is per-server, not distributed.
- Uploads: validate type/size in `src/lib/file-upload.ts`.

---

## 10. Billing and plans

`src/lib/plans.ts` defines four plans: `free`, `mission_pack`, `hunter`, `beastmaster`.

| Plan | Resumes | AI generations | Analyses | Interviews | Job targets | Storage | Exports | Watermark |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| free | 1 | 3 | 1 | 1 | 10 | 100 MB | PDF | Yes |
| mission_pack | 1 | 10 | 1 | 1 | 10 | 100 MB | PDF | Yes |
| hunter | Unlimited | 100 | 10 | 20 | Unlimited | 2 GB | PDF, DOCX | No |
| beastmaster | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | 20 GB | PDF, DOCX | No |

Stripe Checkout for subscriptions and one-time packs; Customer Portal for management; `/api/webhooks/stripe` is the source of truth for subscription state. Price ids come from environment variables. `BillingEvent` records webhook events for auditability. Enforce limits server-side in API handlers, not only in the UI.

---

## 11. AI layer

`src/lib/ai.ts` resolves credentials in this order:
1. Environment variables (`OPEN_ROUTER_API_KEY` with `OPEN_ROUTER_BASE_URL`, or `OPENAI_API_KEY`/`OPENAI_BASE_URL`).
2. `.z-ai-config` via `ZAI.create()`.

Model resolution: per-endpoint override → `AI_MODEL` (general) or `AI_STREAM_MODEL` (streaming) → `OPEN_ROUTER_MODEL` → `deepseek/deepseek-chat`.

Requirements:
- Always pass full provider/model ids.
- Support streaming for interview chat and long generations.
- Apply `AI_MAX_RETRIES` and `AI_TIMEOUT_MS`.
- Keep prompts in `src/lib/prompts.ts`; keep provider plumbing in `ai.ts`.
- Handle provider failures gracefully: return a clear error and let the UI offer Retry. No fabricated output.

---

## 12. Job scraping

### ChocoData (Node)
Confirmed sources and paths:
- `linkedin` → `/api/v1/linkedin/jobsearch` (`keywords`, `location`)
- `weworkremotely` → `/api/v1/weworkremotely/search` (`q`, `location`)
- `remoteok` → `/api/v1/remoteok/search` (`q`, `location`)
- `remotive` → `/api/v1/remotive/search` (`q`, `location`)
- `dice` → `/api/v1/dice/search` (`q`, `location`)

Not supported by ChocoData: Glassdoor, ZipRecruiter, FlexJobs, Remote.co. Indeed via ChocoData is bot-blocked. Each page requests 10 results. `CHOCODATA_RATE_LIMIT_RPM` defaults to 10 and is shared in-process across users on that server — not a distributed limiter or daily quota tracker. Higher depth costs more requests and time.

### JobSpy (Python worker)
Boards: Indeed, Glassdoor, ZipRecruiter, Google Jobs. 25 results per depth level, capped at 100 per board. Install with `pip install -r requirements.txt` (`python-jobspy==1.1.82`). Start with `npm run dev:services`, or run `python3 mini-services/jobspy-svc/app.py` and set `JOBSPY_URL`. Loopback only. Deployment scripts package a local worker unless `JOBSPY_URL` is external.

### Behaviour
- Depth 1–10.
- Broad search: ChocoData boards plus the worker's boards; continue on failure; surface warnings.
- Deduplicate by source ID and exact URL; the same posting with different URLs may still appear twice.
- Persist every saved page to `JobOpportunity`; stream results to the client as they save.
- Backfill via `/api/jobs/backfill` (BrightData when configured).

---

## 13. Design system

- Dark, professional workspace: hydra theme tokens (`hydra-dark`, `hydra-surface`, `hydra-surface-2`, `hydra-purple`, `hydra-border`, `hydra-muted`), subtle scanline texture, card-hover glow.
- Pexels photographs as heavily veiled backgrounds; credits in `public/backgrounds/CREDITS.md`.
- Landing: sticky nav, animated gradient headline, terminal-style hero graphic, feature grid, social-proof counters, pricing teaser, footer, Field Manual section.
- Accessibility: semantic landmarks, `aria-label`s on icon-only controls, keyboard-operable dialogs and drag-and-drop alternatives, responsive at mobile widths.
- Copy tone: confident and practical — "fewer applications, better ones," never "career warfare."

---

## 14. Environment variables

Documented in `.env.example` (local only; `.gitignore` excludes `.env*`). Names only:

`DATABASE_URL`, `AUTH_SECRET`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAILS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SENDER_API_KEY`, `MAIL_FROM`, `CONTACT_EMAIL_TO`, `OPEN_ROUTER_API_KEY`, `OPEN_ROUTER_BASE_URL`, `OPEN_ROUTER_MODEL`, `AI_MODEL`, `AI_STREAM_MODEL`, `AI_FALLBACK_MODEL`, `AI_MAX_RETRIES`, `AI_TIMEOUT_MS`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `CHOCODATA_API_KEY`, `CHOCODATA_RATE_LIMIT_RPM`, `JOBSPY_URL`, `JOBSPY_PORT`, `BRIGHTDATA_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_HUNTER_MONTHLY`, `STRIPE_PRICE_HUNTER_YEARLY`, `STRIPE_PRICE_BEASTMASTER_MONTHLY`, `STRIPE_PRICE_BEASTMASTER_YEARLY`, `STRIPE_PRICE_MISSION_PACK`, `STRIPE_PRICE_LIFETIME_FOUNDER_DEAL`, `AUTO_APPLY_DRY_RUN`, `NODE_ENV`.

Never print or commit values. If an example file contains real credentials, rotate them and replace with placeholders before sharing.

---

## 15. Scripts and build gate

| Script | Command |
| --- | --- |
| `dev` / `dev:services` | `bash start-server.sh` (JobSpy worker + Next.js) |
| `dev:next` | `next dev -p 3000` |
| `build` | `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/` |
| `start` | `NODE_ENV=production bun .next/standalone/server.js \| tee server.log` |
| `lint` | `eslint .` |
| `typecheck` | `tsc --noEmit` |
| `db:generate` | `prisma generate` |
| `db:push` | `prisma db push --accept-data-loss` (dev only) |
| `db:migrate` | `prisma migrate dev` |
| `db:reset` | `prisma migrate reset` |
| `db:seed-admin` | `tsx prisma/seed.ts` |
| `jobs:backfill` | POST to the local backfill endpoint |

CI (`.github/workflows/ci.yml`) runs typecheck and a production build with placeholder database/env values on pushes to `main` and on pull requests.

---

## 16. Testing

Offline regression tests:
- `npx tsx --test tests/job-scrape.test.ts`
- `python3 tests/jobspy-service.test.py`

Tests must not require live API keys. Add regression coverage when changing scraping normalisation or source handling.

---

## 17. Deployment

- `bun run build` produces a standalone server; `bun run start` serves it.
- `.zscripts/` contains build/start helpers for the app and Python runtimes.
- Provision PostgreSQL (Supabase recommended), set `DATABASE_URL`, run `prisma migrate deploy`, then start.
- Set `JOBSPY_URL` to an external worker if you do not want the deployment to package one. Do not expose the worker publicly.
- Set `NEXT_PUBLIC_APP_URL` to the public URL so magic links and Stripe redirects resolve correctly.

---

## 18. Definition of done

- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] New API routes are covered by `src/proxy.ts` auth rules (public only when intentional).
- [ ] Server-side plan limits enforced for any new AI/scraping feature.
- [ ] Failed requests surface an error and Retry — no demo-data fallback.
- [ ] User-facing copy uses the current labels; internal ids unchanged.
- [ ] No secrets in client code or committed files.
- [ ] Scraping changes covered by the offline tests.
