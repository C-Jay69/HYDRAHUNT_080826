# ***HYDRAHUNT — Full-Stack Production Build Prompt***

You are a senior staff engineer tasked with building a production-ready SaaS web application called **HydraHunt**. I have supplied HTML mockups for every major screen. Your job is to convert those mockups into a complete, maintainable, scalable full-stack product.

## **Role and Objective**

Build **HydraHunt**, an AI-powered career warfare platform that helps users create resumes, generate tailored application payloads, practice interviews, track job applications, analyze resumes with AI, maintain version history, and manage their career strategy from a single command center.

The visual design and information architecture must match the supplied HTML mockups as closely as possible, but the implementation must be modern, accessible, responsive, and production-ready.

---

# **Preferred Tech Stack (use exactly this unless impossible)**

## **Frontend**

* **Next.js 15+ (App Router)**  
* **React 19**  
* **TypeScript**  
* **Tailwind CSS v4**  
* **shadcn/ui** component system  
* **Lucide React** icons  
* **Framer Motion** for micro-interactions  
* **React Hook Form \+ Zod** for forms  
* **TanStack Query** for client data fetching/caching

## **Backend**

* **Next.js Route Handlers** for API endpoints  
* **tRPC** for end-to-end type safety  
* **Prisma ORM**  
* **PostgreSQL** (Neon or Supabase Postgres)  
* **Redis** (Upstash) for queues, rate limits, and AI job status  
* **WebSockets / Server-Sent Events** for live AI progress updates

## **Authentication**

* **Supabase Auth** or **Auth.js** with:  
  * Email magic link  
  * Google OAuth  
  * Session persistence  
  * Protected dashboard routes

## **AI**

* OpenRouter, Ollama or Huggingface API (GPT-5 family)  
* Streaming responses  
* Structured JSON outputs validated with Zod  
* Background AI jobs for long-running analyses

## **File Storage**

* Supabase Storage or S3-compatible storage for:  
  * Resume uploads (PDF/DOCX)  
  * Generated exports  
  * Version snapshots

## **Payments**

* **Stripe** subscriptions:  
  * Free  
  * Hunter  
  * Beastmaster

## **Deployment**

* Vercel (frontend \+ API)  
* Neon/Supabase Postgres  
* Upstash Redis

---

# **Visual Identity (must match mockups)**

## **Theme**

* Dark cyberpunk / tactical command center  
* Background: near-black (\#000000 / \#0a060e)  
* Primary neon purple: \#b154f8  
* Accent cyan: \#06b6d4 or \#00f2ff  
* Font: **Space Grotesk**  
* Rounded corners: 12–24px  
* Glow effects, scanlines, subtle animated gradients

## **Global UX Requirements**

* Fully responsive (mobile-first)  
* Keyboard accessible  
* WCAG AA contrast  
* Reduced-motion support  
* Dark mode default; light mode optional later

---

# **Application Structure**

Create the following route tree:

/                     Landing  
/pricing  
/login  
/signup

/app  
  /dashboard  
  /kill-list  
  /resume-forge  
  /resume-forge/\[resumeId\]  
  /payload-forge  
  /interview-drills  
  /interview-drills/session/\[sessionId\]  
  /analysis/\[analysisId\]  
  /mission-log  
  /version-vault  
  /career-map  
  /settings  
  /billing  
  /contact

/api  
  /ai/\*  
  /stripe/\*  
  /webhooks/\*  
---

# **Features to Implement**

## **1\. Landing Page**

Recreate the supplied landing page exactly:

* Hero headline: “Job hunting is dead. We killed it.”  
* CTA buttons  
* Feature cards  
* Animated gradient headline  
* Social proof section  
* Pricing teaser  
* Footer

Add subtle Framer Motion entrance animations.

---

## **2\. Authentication**

Implement:

* Email magic link login  
* Google OAuth  
* Route protection middleware  
* User profile onboarding  
* Persisted sessions

Database tables:

* users  
* profiles

---

## **3\. Kill List Dashboard (Job Tracker CRM)**

Implement a kanban-style job tracker with stages:

* Intel Gathered  
* Target Acquired  
* Payload Sent  
* Interview  
* Offer  
* Eliminated

Features:

* Drag-and-drop between columns  
* Company, role, salary, location  
* Priority level  
* Notes  
* Follow-up reminders  
* Search/filter  
* Activity timeline  
* Metrics cards at top

Tables:

* job\_targets  
* job\_notes  
* job\_activities

---

## **4\. Resume Forge Weaponry**

This is the core resume editor.

Implement:

* Rich resume editor  
* Live preview pane  
* Section reordering  
* Inline editing  
* Skill tagging  
* Achievement bullets  
* ATS score meter  
* PDF export  
* DOCX export  
* Autosave  
* Multiple resume profiles

Tables:

* resumes  
* resume\_sections  
* resume\_skills

---

## **5\. Strike Analysis Critique (AI Resume Analysis)**

Upload a resume and receive AI analysis.

Pipeline:

1. Upload PDF/DOCX  
2. Extract text  
3. AI analysis  
4. Persist structured result

Return:

* ATS score  
* Strengths  
* Weaknesses  
* Missing keywords  
* Rewritten bullets  
* Role-fit assessment  
* Action checklist

Store structured JSON in:

* resume\_analyses

Use streaming UI with progress updates.

---

## **6\. AI Payload Forge**

Generate tailored application materials.

Inputs:

* Job description  
* Target company  
* Selected resume  
* Tone/style

Outputs:

* Tailored resume summary  
* Cover letter  
* Outreach email  
* LinkedIn message  
* Interview talking points

Support copy, edit, regenerate, and save.

Table:

* generated\_payloads

---

## **7\. AI Interview Drills**

Implement interactive interview practice.

Features:

* Behavioral questions  
* Technical questions  
* Role-specific drills  
* Timed responses  
* Audio recording (optional)  
* AI scoring  
* Follow-up probing  
* Session transcript  
* Improvement suggestions

Tables:

* interview\_sessions  
* interview\_messages  
* interview\_scores

Use streaming chat UI.

---

## **8\. Version Vault**

Implement version history for resumes.

Features:

* Snapshot on publish/export  
* Restore previous version  
* Diff viewer  
* Labels/tags  
* Timestamp and notes

Tables:

* resume\_versions

---

## **9\. Mission Log**

Global activity feed showing:

* Resume edits  
* Payload generations  
* Applications submitted  
* Interview sessions  
* AI analyses  
* Billing events

Table:

* activity\_log

---

## **10\. Career Territory Map**

Implement an interactive career roadmap.

Use React Flow or D3.

Features:

* Current role node  
* Target role node  
* Skill gap nodes  
* Certification nodes  
* Estimated timeline  
* Progress tracking

Tables:

* career\_maps  
* career\_nodes

---

## **11\. Pricing & Billing**

Implement Stripe subscriptions.

Plans:

### **Free — “ENTER THE HUNT”**

* 1 resume  
* 3 AI generations/month  
* 1 resume analysis/month  
* 1 interview drill/month  
* 10 job targets  
* PDF export with watermark  
* Storage 100mb


### 

**MISSION PACK — “ONE TIME STRIKE” \- US$12** 

10 AI generations \+ 1 resume analysis, expires in 30 days.

### 

### **HUNTER — “WIN YOUR NEXT OFFER” — US$24 PER MONTH | $228/year ($19/month)**

* Unlimited resumes  
* 100 AI generations/month  
* 10 resume analyses/month  
* 20 interview sessions/month  
* Unlimited job targets  
* Version vault  
* ATS scoring  
* PDF \+ DOCX export  
* Email support  
* Storage 2gb


### **BEASTMASTER: — “OPERATE AT EXECUTIVE LEVEL” — US$59/MONTH | $588/YEAR ($49/month)**

Designed for high-volume professional use. Includes priority processing and substantially higher usage allowances than Hunter, subject to fair-use protections against automated or abusive activity.

* Unlimited AI generations (fair-use policy)  
* Unlimited analyses  
* Unlimited interview sessions  
* Advanced analytics  
* Career territory map  
* Priority AI queue  
* Early access features  
* Custom branding for exports  
* Team / coach workspace (future-ready)  
* Priority support  
* Storage 20gb

\-----------------------------------------------------------------------------

**Implement:**

* Checkout  
* Customer portal  
* Webhook sync  
* Subscription gating middleware

**Tables:**

* subscriptions  
* billing\_events

---

## **12\. Success / Target Down Screen**

Show after successful actions:

* Animated success state  
* Confetti (respect reduced motion)  
* Next-step CTA buttons

---

# **Database Schema (minimum)**

Use Prisma and create relations for:

* User  
* Profile  
* Resume  
* ResumeVersion  
* ResumeAnalysis  
* GeneratedPayload  
* JobTarget  
* JobNote  
* JobActivity  
* InterviewSession  
* InterviewMessage  
* InterviewScore  
* CareerMap  
* CareerNode  
* ActivityLog  
* Subscription  
* BillingEvent

Use UUID primary keys and createdAt/updatedAt timestamps everywhere.

---

# **API Contracts**

## **POST /api/ai/analyze-resume**

Input:

{  
  "resumeId": "uuid",  
  "targetRole": "Senior Product Manager"  
}

Output:

{  
  "analysisId": "uuid",  
  "status": "processing"  
}

## **POST /api/ai/generate-payload**

Input:

{  
  "resumeId": "uuid",  
  "jobDescription": "...",  
  "company": "Acme",  
  "tone": "confident"  
}

Return streamed content.

## **POST /api/ai/interview-chat**

Streaming conversational endpoint.

---

# **AI Prompt Engineering**

Create centralized prompt templates.

Requirements:

* Return structured JSON where appropriate.  
* Never fabricate employment history.  
* Preserve factual user data.  
* Optimize for ATS keyword coverage.  
* Explain reasoning briefly.

---

# **Real-Time Features**

Use SSE or WebSockets for:

* AI analysis progress  
* Interview streaming responses  
* Long-running generation tasks

Show live status indicators.

---

# **File Processing**

Support:

* PDF upload  
* DOCX upload  
* Text extraction  
* Size limit 10 MB  
* Virus scan hook placeholder

---

# **Exports**

Generate:

* ATS-friendly PDF  
* Designed PDF matching preview  
* DOCX

Use server-side rendering for deterministic exports.

---

# **Security Requirements**

* Validate all inputs with Zod.  
* CSRF protection for mutations.  
* Rate limit AI endpoints.  
* Signed upload URLs.  
* Row-level ownership checks.  
* Audit log for sensitive actions.  
* Never expose API keys to client.

---

# **Performance Targets**

* Lighthouse 90+ on landing page  
* Initial JS \< 250 KB where possible  
* Streaming AI responses  
* Image optimization  
* Route-level code splitting

---

# **Testing**

Implement:

* Vitest unit tests  
* React Testing Library component tests  
* Playwright E2E tests  
* API route tests

Critical flows:

* Signup/login  
* Create resume  
* Generate payload  
* Analyze resume  
* Move job card  
* Start interview session  
* Upgrade subscription

---

# **Dev Experience**

Provide:

* ESLint  
* Prettier  
* Husky pre-commit hooks  
* Strict TypeScript  
* Environment variable validation  
* Seed script with demo data

---

# **Deliverables**

Generate a complete monorepo-style project with:

1. Full source code  
2. Prisma schema \+ migrations  
3. Seed data  
4. shadcn/ui components  
5. Tailwind theme matching mockups  
6. API routes  
7. AI service layer  
8. Stripe integration  
9. Dockerfile  
10. docker-compose.yml  
11. .env.example  
12. README with setup instructions  
13. Deployment instructions for Vercel \+ Neon/Supabase

---

# **Acceptance Criteria**

The build is complete only if:

* Every supplied HTML mockup exists as a functional route.  
* Users can authenticate.  
* Users can create/edit/export resumes.  
* AI generation works end-to-end.  
* AI resume analysis works end-to-end.  
* Interview drills stream responses.  
* Job tracker persists data.  
* Version history restores correctly.  
* Stripe subscriptions gate premium features.  
* The UI visually matches the supplied designs within \~95%.  
* The app deploys successfully to Vercel without manual code changes.

Build the application now, starting with project scaffolding, Prisma schema, Tailwind theme tokens, authentication, and the landing page.

# REMINDER FOR 30 DAYS AFTER  LAUNCH AND REVIEW

# **PAID CONVERSION**

* Hunter churn  
* Average AI cost per Hunter user  
* Number of Beastmaster signups  
* Mission Pack attach rate

Only if Hunter conversion is above \~8% and AI costs are low would I consider increasing Hunter to US$29 later. I would not raise Beastmaster until you have clear evidence that executive users are deriving substantial value.

