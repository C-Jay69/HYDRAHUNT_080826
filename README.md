# HydraHunt

**Apply to fewer jobs, better.**

HydraHunt is an AI-powered job-search workspace. It helps you build and score resumes, tailor a five-piece application kit to a specific job, practice interviews, check resume-to-role fit, track a curated company pipeline, and keep version history — all in one place.

---

## Features

| User-facing label | What it does |
| --- | --- |
| **Momentum** | Command-center dashboard with pipeline stats and next actions. |
| **A-List** | Kanban pipeline of companies you actually want, tracked from first look to offer. |
| **Radar** | Job discovery across LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google Jobs and remote-focused boards. |
| **Resume Studio** | Build, score (ATS), version and export resumes as PDF or DOCX. |
| **Tailor** | Generates a tailored application kit for a single job: resume angle, cover letter, outreach, interview brief and follow-up. |
| **Mock Room** | AI interview practice sessions with per-answer scoring and feedback. |
| **Fit Check** | AI review of a resume against a specific role. |
| **Rewind** | Snapshot and restore resume versions. |
| **Trail** | Activity log of applications and hunt events. |
| **Trajectory** | Career map: target roles, skill gaps and a path to get there. |
| **Settings / Billing** | Profile, plan and subscription management. |

Internal identifiers (`kill-list`, `payload-forge`, `resume-forge`, `interview-drills`, `version-vault`, `mission-log`, `career-map`) are stable and intentionally differ from the labels above. Copy changes should not rename routes, models or view ids.

---

## Tech stack

- **Next.js 16** (App Router, standalone output) + **React 19**
- **TypeScript 5** (strict; typecheck enforced)
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives)
- **Zustand 5** for the in-app view store; **TanStack Query 5** for client data fetching
- **Prisma 6** + **PostgreSQL**
- **Stripe 22** for billing
- **Bun 1.3** as the production runtime; Node 22 for tooling
- **Python 3.12** + **python-jobspy 1.1.82** for the local scraping worker
- AI via `z-ai-web-dev-sdk`, defaulting to OpenRouter (`deepseek/deepseek-chat`)

---

## Prerequisites

- Node.js 22+ and Bun 1.3+
- PostgreSQL 15+ (Supabase recommended)
- Python 3.12+ with `pip`
- A Stripe account (for billing features)
- API keys for the services you intend to use (see [Environment variables](#environment-variables))

---

## Quick start

```bash
# 1. Install dependencies
bun install            # or: npm install

# 2. Configure the environment
cp .env.example .env   # if a template is present in your checkout
# Fill in DATABASE_URL, AUTH_SECRET and the keys for the features you need.

# 3. Set up the database
bun run db:generate
bun run db:push        # dev shortcut; use db:migrate in production

# 4. Provision the admin account (one-time)
bun run db:seed-admin

# 5. Run the dev stack (Next.js + JobSpy worker)
bun run dev
```

The app runs at `http://localhost:3000`. The JobSpy worker runs on port `3001` and binds to loopback only.

### Running without the Python worker

```bash
bun run dev:next       # Next.js only; scraping falls back to ChocoData-only sources
```

Or point `JOBSPY_URL` at an external worker's `/scrape` URL.

---

## Scripts

| Script | Description |
| --- | --- |
| `dev` / `dev:services` | Start the JobSpy worker and Next.js together. |
| `dev:next` | Start Next.js only on port 3000. |
| `build` | Production build, then copy static assets and `public/` into the standalone output. |
| `start` | Serve the standalone build with Bun. |
| `lint` | Run ESLint. |
| `typecheck` | `tsc --noEmit` — enforced in CI and by the production build. |
| `db:generate` | Generate the Prisma client. |
| `db:push` | Push the schema (accepts data loss — dev only). |
| `db:migrate` | Create and apply a migration. |
| `db:reset` | Reset the database and reapply migrations. |
| `db:seed-admin` | Create the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. |
| `jobs:backfill` | POST a backfill request to a running local server. |

---

## Environment variables

Create `.env` in the project root. Never commit real values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `AUTH_SECRET` or `SESSION_SECRET` | Yes | Signs session cookies and magic-link tokens. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL used in emails and redirects. |
| `ADMIN_EMAILS` | Recommended | Comma-separated emails with admin access and paywall bypass. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed only | Credentials for `db:seed-admin`. |
| `SENDER_API_KEY`, `MAIL_FROM` | Email | Sender.net transactional email for magic links and contact form. |
| `CONTACT_EMAIL_TO` | Contact form | Destination for contact-form submissions. |
| `OPEN_ROUTER_API_KEY`, `OPEN_ROUTER_BASE_URL`, `OPEN_ROUTER_MODEL` | AI | OpenRouter credentials and model. |
| `AI_MODEL`, `AI_STREAM_MODEL`, `AI_FALLBACK_MODEL` | AI | Optional model overrides. |
| `AI_MAX_RETRIES`, `AI_TIMEOUT_MS` | AI | Optional retry/timeout tuning. |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL` | AI fallback | OpenAI-compatible gateway fallback. |
| `CHOCODATA_API_KEY`, `CHOCODATA_RATE_LIMIT_RPM` | Scraping | ChocoData sources; default limit is 10 requests/minute. |
| `JOBSPY_URL`, `JOBSPY_PORT` | Scraping | JobSpy worker endpoint/port. |
| `BRIGHTDATA_API_KEY` | Backfill | Optional BrightData backfill. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing | Stripe API and webhook verification. |
| `STRIPE_PRICE_HUNTER_MONTHLY`, `STRIPE_PRICE_HUNTER_YEARLY` | Billing | Hunter plan prices. |
| `STRIPE_PRICE_BEASTMASTER_MONTHLY`, `STRIPE_PRICE_BEASTMASTER_YEARLY` | Billing | Beastmaster plan prices. |
| `STRIPE_PRICE_MISSION_PACK`, `STRIPE_PRICE_LIFETIME_FOUNDER_DEAL` | Billing | One-time pack and founder-deal prices. |
| `AUTO_APPLY_DRY_RUN` | Safety | Auto-apply defaults to a dry run unless set to `false`. |

> **Security note:** if your local `.env.example` contains real credentials, rotate them and replace the file with placeholders before sharing it. `.gitignore` currently excludes `.env*`, so an example file will not be committed unless explicitly un-ignored.

---

## Architecture

- **Single-page app shell.** `src/app/page.tsx` lazy-loads the views and switches between them through the Zustand store. Only `/privacy` and `/field-guide` (a redirect to the landing anchor) are separate routes.
- **API route handlers** in `src/app/api/**` back every feature. `src/proxy.ts` (Next.js 16's replacement for middleware) enforces session auth on all API routes except `/api/auth/login`, `/api/auth/signup`, `/api/auth/magic-link*`, `/api/webhooks/stripe` and `/api/health`.
- **Auth** is custom: scrypt password hashing, 15-minute magic links, and 7-day HMAC-signed session cookies. No NextAuth runtime is used.
- **Data layer** is Prisma over PostgreSQL with 21 models spanning users, resumes, analyses, job targets, opportunities, interview sessions, career maps, scraping runs and billing.
- **Runtime** is a Next.js standalone build served by Bun. Deployment scripts live in `.zscripts/`.

### Feature areas in `src/lib`

`ai.ts` (model resolution/streaming), `prompts.ts` (runtime AI prompts), `ats.ts` (ATS scoring), `auth.ts`, `email.ts` (Sender.net), `stripe.ts`, `plans.ts` (tier limits), `chocoClient.ts` and `brightdataClient.ts` (job sources), `rate-limit.ts`, `resume-export.ts`, `file-upload.ts`, `validators.ts`.

---

## Job scraping

Two backends normalise results into the same `JobOpportunity` shape:

1. **ChocoData** (Node) — LinkedIn, WeWorkRemotely, RemoteOK, Remotive and Dice. Broad search also fans out to Indeed, ZipRecruiter and Google Jobs through the worker. ChocoData requests 10 results per page and shares an in-process 10 RPM budget per server; this is not a distributed limiter.
2. **JobSpy** (Python micro-service) — Indeed, Glassdoor, ZipRecruiter and Google Jobs. Requests 25 results per depth level, capped at 100 per board. Start it with `bun run dev` or run `python3 mini-services/jobspy-svc/app.py` yourself. It binds to loopback and should not be exposed publicly.

Search depth is 1–10. Broad searches continue when a source fails and surface warnings. Results are deduplicated by source ID and exact job URL. BrightData can be used for backfill when configured.

---

## AI

AI calls go through `src/lib/ai.ts`, which resolves credentials from environment variables first (OpenRouter by default), then falls back to `.z-ai-config`. Model resolution order: per-endpoint override → `AI_MODEL`/`AI_STREAM_MODEL` → `OPEN_ROUTER_MODEL` → `deepseek/deepseek-chat`. Use full provider/model ids (e.g. `deepseek/deepseek-chat`), not short forms.

---

## Billing

Stripe Checkout, Customer Portal and webhooks. Plans and limits are defined in `src/lib/plans.ts`:

| Plan | Resumes | AI generations | Analyses | Interviews | Job targets | Storage | Exports | Watermark |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Free | 1 | 3 | 1 | 1 | 10 | 100 MB | PDF | Yes |
| Mission Pack | 1 | 10 | 1 | 1 | 10 | 100 MB | PDF | Yes |
| Hunter | Unlimited | 100 | 10 | 20 | Unlimited | 2 GB | PDF, DOCX | No |
| Beastmaster | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | 20 GB | PDF, DOCX | No |

Admins listed in `ADMIN_EMAILS` bypass paywalls.

---

## Testing

```bash
# Job scraping regression tests
npx tsx --test tests/job-scrape.test.ts
python3 tests/jobspy-service.test.py
```

CI (`.github/workflows/ci.yml`) runs `typecheck` and a production `build` on every push to `main` and on pull requests.

---

## Deployment

The build produces a standalone server:

```bash
bun run build
bun run start   # NODE_ENV=production bun .next/standalone/server.js
```

Deployment helpers in `.zscripts/` package the Python worker and runtime unless `JOBSPY_URL` points at an external service. Set `DATABASE_URL` to a production PostgreSQL instance (Supabase recommended) and run `prisma migrate deploy` before starting the server.

---

## Project layout

```
src/app/            App shell, routes and API handlers
src/components/     Landing, app shell and feature views
src/lib/            Auth, AI, billing, scraping and utilities
prisma/             Schema and seed script
mini-services/      JobSpy Python worker
tests/              Scraping regression tests and runtime build scripts
public/             Static assets, background images and credits
.zscripts/          Deployment and runtime scripts
```

---

## Design notes

The UI is a dark, professional workspace built on hydra theme tokens (`hydra-dark`, `hydra-surface`, `hydra-purple`, etc.) with subtle scanlines. Pexels photographs are used as heavily veiled backgrounds; attribution is in `public/backgrounds/CREDITS.md`. The landing page includes the Field Manual section (`#field-manual`), which `/field-guide` links to.

A product principle carried through the app: **no invented fallbacks.** When an API call fails, the UI reports what failed and offers Retry instead of substituting demo data.
