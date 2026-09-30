# HydraHunt — AI-Powered Career Warfare Platform

> **"Job hunting is dead. We killed it."**

HydraHunt is a full-stack SaaS command center that helps users forge ATS-optimized resumes, deploy tailored AI application payloads, run interactive AI interview drills, track job targets across a tactical Kanban pipeline, run deep AI strike analyses on resumes, maintain version history, and map out their career trajectory.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Lucide React, Framer Motion, TanStack Query, Zustand
- **Backend**: Next.js Route Handlers, Prisma ORM, PostgreSQL (Neon / Supabase Postgres), Server-Sent Events (SSE) for real-time AI streaming
- **Authentication**: Session token cookies (`hydra_session`) with Email/Password, Magic Link (`/api/auth/magic-link`), and route protection (`src/proxy.ts`)
- **AI Layer**: OpenRouter / OpenAI-compatible streaming & structured JSON completions (`src/lib/ai.ts`, `src/lib/prompts.ts`)
- **Exports & File Processing**: PDF (`pdf-lib`) & DOCX (`docx`) deterministic resume exports; PDF (`unpdf`) & DOCX (`mammoth`) text extraction
- **Payments**: Stripe Checkout, Customer Portal, Webhook sync, and plan gating (`Free`, `Mission Pack`, `Hunter`, `Beastmaster`)

---

## Application Route Tree

```text
/                                           Landing Page
/pricing                                    Plans & Pricing
/login                                      Authentication — Sign In
/signup                                     Authentication — Create Account
/contact                                    Contact Command

/app
  /dashboard                                Command Center Dashboard
  /kill-list                                Kanban Job Target CRM
  /resume-forge                             Resume Forge List & Builder
  /resume-forge/[resumeId]                  Split-Pane Resume Editor & Live Preview
  /payload-forge                            Streaming AI Application Payload Generator
  /interview-drills                         AI Interview Practice & Scoring
  /interview-drills/session/[sessionId]     Live Streaming Interview Session
  /analysis                                 Strike Analysis List
  /analysis/[analysisId]                    Detailed ATS Strike Critique
  /mission-log                              Global Activity Feed
  /version-vault                            Resume Version History & Restore
  /career-map                               Interactive Career Territory Map
  /settings                                 Profile & Career Target Settings
  /billing                                  Subscription & Usage Dashboard
  /contact                                  In-App Contact Command

/api
  /ai/analyze-resume                        POST — AI Resume Strike Analysis
  /ai/generate-payload                      POST — Streaming AI Payload Generation
  /ai/interview-chat                        POST — Streaming AI Interview Conversational Endpoint
  /ai/apply-improvements                    POST — Apply AI Bullet & Keyword Improvements
  /stripe/checkout                          POST — Create Stripe Checkout Session
  /stripe/portal                            POST — Create Stripe Billing Portal Session
  /webhooks/stripe                          POST — Stripe Webhook Receiver
```

---

## Local Setup Instructions

### 1. Prerequisites

- **Node.js** 20+ (or **Bun** 1.2+)
- **PostgreSQL** 15+ (local, Docker, [Neon](https://neon.tech), or [Supabase](https://supabase.com))
- *(Optional)* **Python 3.10+** with `python-jobspy` for live Indeed/Glassdoor scraping

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/C-Jay69/HYDRAHUNT_080826.git
cd HYDRAHUNT_080826
npm install --legacy-peer-deps
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Minimum required variables for local development:
- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: Random secret string (32+ characters)
- `OPEN_ROUTER_API_KEY`: OpenRouter API key for AI generation/analysis

### 4. Initialize Database & Seed Data

```bash
# Generate Prisma Client
npm run db:generate

# Push schema or run migrations
npm run db:push
# or: npm run db:migrate

# Seed demo data
npx tsx seed.ts

# (Optional) Provision admin user
ADMIN_EMAIL="admin@hydrahunt.online" ADMIN_PASSWORD="your-password" npm run db:seed-admin
```

### 5. Run the Development Server

```bash
npm run dev:next
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker Setup

Run the entire stack (Next.js app, PostgreSQL 16, Redis 7, and JobSpy Python service) using Docker Compose:

```bash
docker compose up --build -d
```

Then apply the Prisma schema to the container database:

```bash
docker compose exec app npx prisma db push
```

---

## Deployment Instructions (Vercel + Neon/Supabase)

### Step 1: Provision PostgreSQL on Neon or Supabase

1. **Neon**:
   - Create a new project at [console.neon.tech](https://console.neon.tech).
   - Copy the pooled connection string (`postgresql://...`).
2. **Supabase**:
   - Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard).
   - Navigate to **Project Settings → Database → Connection string (URI)** and copy the Transaction Pooler URI.

### Step 2: Provision Upstash Redis (Optional)

1. Create a serverless Redis database at [console.upstash.com](https://console.upstash.com).
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### Step 3: Configure Stripe Products & Webhook

1. In the [Stripe Dashboard](https://dashboard.stripe.com/products), create prices for:
   - **Mission Pack** ($12 one-time) → `STRIPE_PRICE_MISSION_PACK`
   - **Hunter Monthly** ($24/mo) → `STRIPE_PRICE_HUNTER_MONTHLY`
   - **Hunter Yearly** ($228/yr) → `STRIPE_PRICE_HUNTER_YEARLY`
   - **Beastmaster Monthly** ($59/mo) → `STRIPE_PRICE_BEASTMASTER_MONTHLY`
   - **Beastmaster Yearly** ($588/yr) → `STRIPE_PRICE_BEASTMASTER_YEARLY`
2. Add a webhook endpoint pointing to `https://your-domain.vercel.app/api/webhooks/stripe` listening for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

### Step 4: Deploy to Vercel

1. Push your repository to GitHub and import it in [Vercel](https://vercel.com/new).
2. Add all environment variables from `.env.example` in **Vercel Project Settings → Environment Variables**.
3. Set the **Build Command** in Vercel to:
   ```bash
   npx prisma generate && npx prisma migrate deploy && next build
   ```
4. Click **Deploy**. Vercel will build the Next.js App Router bundle, run database migrations against Neon/Supabase, and publish your deployment.
