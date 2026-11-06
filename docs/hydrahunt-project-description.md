# HydraHunt — Project Description

**Sale memorandum · November 2026**

## One workspace from first search to signed offer.

HydraHunt searches **nine job boards in one run**, judges the resume against each posting, drafts the tailored application, rehearses the interview and keeps every move in one tracker. The product, the brand and the billing are built.

- 9 job boards searched
- 11 product modules
- 4 languages shipped
- 27.8k lines of TypeScript
- 43 API routes
- 21 database models

Boards covered: LinkedIn · Indeed · Glassdoor · ZipRecruiter · Google Jobs · We Work Remotely · RemoteOK · Remotive · Dice

---

## 01. The product

Job hunting splits across boards, inboxes, spreadsheets and half-remembered notes. HydraHunt puts one loop around it: search the boards in a single run, score each posting against the resume, produce the tailored application, rehearse the interview, and record every move until an offer is signed.

The customer-facing promise is narrow and easy to repeat: **apply to fewer jobs, better.** The user sees one dashboard, one set of plans and one record of what was sent where.

This is a complete application, not a prototype. Accounts, sessions, plans and server-side quotas, Stripe subscriptions and one-time packs, resume import and PDF or DOCX export, version history, AI interview scoring and an admin panel all exist and run against Postgres. The landing page, pricing page, FAQ and a public field guide ship in English, Spanish, French and Chinese.

The buyer is an individual in an active search, most willing to pay during a career change, a relocation or the weeks after a layoff. Plans suit a single search that lasts weeks, with annual and lifetime options for people who expect to hunt again.

## 02. What is built

Eleven modules, each doing one job well.

| Module | What it does |
| --- | --- |
| **Momentum** | The home screen: streak, progress and the next action in the search. |
| **Radar** | Multi-board job search with live progress over server-sent events and a per-board result count for every run. |
| **A-List** | The job target tracker: status, notes and application activity for every role the user is chasing. |
| **Resume Studio** | Structured resume editor with sections, import, and export to PDF and DOCX. |
| **Fit Check** | AI analysis of a resume against a specific posting, with a score and concrete gaps. |
| **Tailor** | Generates the tailored application payload for a role, with an apply-improvements loop that rewrites from the analysis. |
| **Mock Room** | AI mock interviews with per-answer scoring and a session history. |
| **Rewind** | Resume version history with one-click restore, so a tailored edit never costs the original. |
| **Trail** | Account-wide activity log: every search, analysis, application and change in order. |
| **Trajectory** | Career map: current skills, adjacent roles and the branches between them. |
| **Settings & Billing** | Plan, usage, storage, account deletion and the Stripe customer portal. |
| **Platform** | Google sign-in, email magic links, an admin panel with user-level controls, and a public field guide for organic search. |

## 03. How it earns

Three subscriptions, one lifetime deal, one top-up.

| Plan | Price | Included |
| --- | --- | --- |
| **Day One** | Free, forever | 1 resume, 3 AI generations / month, 1 resume analysis, 1 mock interview, 10 job targets, 5 Radar runs / month, watermarked PDF |
| **Stride** | $24 / month or $228 / year | Unlimited resumes and job targets, 100 AI generations / month, 10 analyses, 20 interviews, 100 Radar runs / month, 2 GB storage, DOCX export, no watermark |
| **Apex** | $59 / month or $588 / year | Every module unmetered, unlimited AI generations, analyses, interviews and Radar runs, 20 GB storage, DOCX export, no watermark |
| **Founder** | $599 one-time | Lifetime Apex access, first 250 accounts only, price locked for life, no renewals |

Prices are live Stripe products with monthly and annual price IDs already configured. Quotas are enforced server-side by plan, with counters that reset on the first of each month; a failed search that never reached a provider does not burn a run. Admins bypass every gate.

The Boost Pack is a $12 one-time top-up that adds 10 AI generations, one analysis, one interview and 10 Radar runs without a subscription. It gives a short, single-search user a way to pay.

## 04. The technology

Small infrastructure. Nothing exotic to operate.

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS 4 · Prisma 6 · PostgreSQL · Stripe · OpenRouter · Resend · Google OAuth 2.0 + PKCE · Python JobSpy worker · Vercel + Render

One Next.js application serves the interface, authentication, billing webhooks and AI routes. Search splits in two: a hosted provider covers LinkedIn, We Work Remotely, RemoteOK, Remotive and Dice; a small self-hosted Python worker running JobSpy covers Indeed, Glassdoor, ZipRecruiter and Google. Results stream to the browser over server-sent events, so a long run reports progress board by board instead of holding a spinner.

The worker is a single-file standard-library HTTP server with a shared-secret token, a per-request deadline, bounded concurrency and a health endpoint. App and worker deploy separately: Vercel for the app, any container host for the worker, with a Render blueprint in the repository. Postgres runs on Supabase.

Twenty-one Prisma models cover users, profiles, resumes and versions, analyses, generated payloads, targets, notes, interviews and scores, career maps, jobs, applications, scrape runs, subscriptions, billing events and an activity log.

Quality gates on every push and pull request:

- **Typecheck** — strict TypeScript, enforced on every build.
- **Scrape tests** — offline suite exercises the real route, SSE stream, deduplication and per-board failure reporting.
- **Worker tests** — Python suite covers normalisation, country inference and auth.
- **Build** — production build gated on the three checks above.

## 05. What a buyer can switch on

Four levers already paid for.

- **Residential egress for the worker.** All nine boards are queried today and every run reports its per-board count. Indeed and Glassdoor can return empty results to datacenter IPs; a proxy list in one environment variable fixes it. The change is documented and takes a redeploy, not a rewrite.
- **Localized reach.** Four locales ship with the product. Localized landing pages, search copy and ad creative are a growth channel that needs marketing work, not engineering.
- **Annual and lifetime pricing.** Both are configured in Stripe. The 250-account founder cap is a scarcity device already written into the product copy.
- **Adjacent buyers.** Career coaches, bootcamps and outplacement firms buy the same workflow in bulk. Team seats and invoicing are not built; the plan model and billing layer are where they would attach.

## 06. What transfers

The whole stack, not a licence to it.

- **Source repository** — full history, documentation, environment template and deployment notes.
- **Domain** — hydrahunt.online, with the Vercel project and deployment configuration.
- **Brand and copy** — name, visual system, landing, pricing, FAQ and field guide text in four languages.
- **Data schema** — Supabase Postgres database, 21 Prisma models and migrations.
- **Billing configuration** — Stripe products, price IDs, webhook handler and customer portal.
- **Scraping worker** — JobSpy service, Dockerfile, render.yaml blueprint and DEPLOY.md.
- **CI pipeline** — typecheck, two test suites and a production build on every push and pull request.
- **Customer records** — [export to be prepared].
- **Third-party accounts** — [transfer method to be set].
- **Handover** — [hours and window to be set].

> **Read this before bidding.** The application is complete and deployed at hydrahunt.online. Search depends on two upstream providers, and board markup changes from time to time; the worker is isolated so it can be repaired or replaced without touching the product.
>
> No revenue, traffic or user figures appear anywhere in this document. They belong in the section below, completed by the seller from Stripe and analytics before the listing is published.

## 07. Trading figures to complete

Every value in this table is a blank on purpose. Fill it from source systems, not estimates, and attach a screenshot or export for each line a buyer is likely to challenge.

| Metric | What it measures | Value |
| --- | --- | --- |
| Accounts | Total registered, and new in the last 30 days | |
| Paying subscribers | Active Stride, Apex and Founder accounts, split by plan | |
| MRR / ARR | Recurring revenue, excluding one-time packs | |
| Churn | Monthly subscription churn over the last six months | |
| Boost Pack units | One-time top-ups sold, and revenue from them | |
| Radar runs | Searches per month, and average boards per run | |
| AI cost | Monthly inference spend across all generation routes | |
| Infrastructure cost | Vercel, Render, Supabase and scraping provider, per month | |
| Gross margin | Revenue less AI and infrastructure cost | |
| Organic traffic | Monthly sessions and sign-up conversion | |
| Support load | Hours per week the owner currently spends running it | |

## 08. The transaction

| Term | Detail |
| --- | --- |
| Asking price | [to be set] |
| Structure | [asset sale, share sale or licensing, to be confirmed] |
| Included | Code, domain, brand, content, data schema, billing configuration and deployment setup, as listed in section 06. |
| Handover | [hours of walkthrough over a stated window, to be set] |
| Reason for sale | [to be completed by the seller] |
| Exclusivity and timetable | [to be agreed] |

---

*Figures marked as blanks are placeholders for the seller. No revenue, traffic or user figures are stated in this document.*
