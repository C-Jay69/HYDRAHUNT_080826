'use client'

import { useState, type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  Mic,
  Package,
  Radar,
  Rewind,
  ScanSearch,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { HydraLogo, HydraMark } from '@/components/brand/hydra-logo'
import { useAppStore } from '@/store/app-store'

/* ------------------------------------------------------------------ */
/*  Motion                                                             */
/* ------------------------------------------------------------------ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: 'easeOut' as const },
  }),
}

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={fadeUp}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const jobBoards = [
  'LinkedIn',
  'Indeed',
  'Glassdoor',
  'ZipRecruiter',
  'Google Jobs',
  'We Work Remotely',
  'RemoteOK',
  'Remotive',
  'Dice',
]

const kitAssets = [
  'Tailored resume',
  'Cover letter',
  'Recruiter outreach email',
  'LinkedIn message',
  'Interview talking points',
]

const oldWay = [
  'The same resume blasted at forty postings',
  'A spreadsheet that stops being updated in week two',
  'Silence, with no idea which part lost you the role',
  'Winging the interview the night before',
]

const newWay = [
  'One resume per posting, rewritten around its keywords',
  'A pipeline board from researched to offer',
  'A fit check that names the gaps before you hit send',
  'Mock interviews with scored, specific feedback',
]

const steps = [
  {
    no: '01',
    icon: Radar,
    title: 'Find the role',
    body: 'Search nine job boards in one query, then open any posting to see the full description without tab-hopping.',
  },
  {
    no: '02',
    icon: Wand2,
    title: 'Build the kit',
    body: 'Paste the description and HydraHunt returns a tailored resume, cover letter, outreach email, LinkedIn message and talking points.',
  },
  {
    no: '03',
    icon: TrendingUp,
    title: 'Close the loop',
    body: 'Track every application, run a fit check on weak spots, and rehearse the interview in the same workspace.',
  },
]

interface ModuleItem {
  icon: React.ElementType
  name: string
  tagline: string
}

const modules: ModuleItem[] = [
  { icon: LayoutDashboard, name: 'Momentum', tagline: 'Your search at a glance' },
  { icon: Search, name: 'Radar', tagline: 'Nine job boards, one search' },
  { icon: Bookmark, name: 'A-List', tagline: 'Pipeline from researched to offer' },
  { icon: FileText, name: 'Resume Studio', tagline: 'Write, score and export' },
  { icon: Package, name: 'Tailor', tagline: 'Five assets per generation' },
  { icon: ScanSearch, name: 'Fit Check', tagline: 'Score the role before you apply' },
  { icon: Mic, name: 'Mock Room', tagline: 'Scored AI interviews' },
  { icon: History, name: 'Rewind', tagline: 'Snapshot and restore versions' },
  { icon: TrendingUp, name: 'Trajectory', tagline: 'Map the skills you need next' },
  { icon: Clock3, name: 'Trail', tagline: 'Timestamped activity feed' },
  { icon: Settings, name: 'Settings', tagline: 'Profile that grounds the AI' },
  { icon: CreditCard, name: 'Billing', tagline: 'Plan and usage' },
]

const firstRun = ['Search', 'A-List', 'Tailor', 'Build kit', 'Fit check', 'Mock Room']

const plans = [
  {
    name: 'Day One',
    price: 'Free',
    period: 'forever',
    blurb: 'Test the whole workflow.',
    points: ['1 resume', '3 AI kits / month', '10 job targets', 'A-List + Mock Room'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Stride',
    price: '$24',
    period: '/month',
    blurb: 'For an active search.',
    points: ['Unlimited resumes', '100 AI kits / month', 'ATS scoring + DOCX', 'Rewind version history'],
    cta: 'Go Stride',
    featured: true,
  },
  {
    name: 'Apex',
    price: '$59',
    period: '/month',
    blurb: 'Everything, unmetered.',
    points: ['Unlimited everything', 'Trajectory + analytics', 'Priority AI processing', 'Priority support'],
    cta: 'Go Apex',
    featured: false,
  },
  {
    name: 'Founder',
    price: '$599',
    period: 'one-time',
    blurb: 'Lifetime Apex access.',
    points: ['Everything in Apex, forever', 'First 250 hunters only', 'Price locked for life', 'No renewals, ever'],
    cta: 'Claim founder deal',
    featured: false,
  },
]

const faqs = [
  {
    q: 'Is there a real free plan?',
    a: 'Yes. Day One is free forever and includes one resume, three AI kits a month, ten job targets, the A-List tracker and mock interviews. No credit card required to start.',
  },
  {
    q: 'Which job boards does Radar search?',
    a: 'LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google Jobs, We Work Remotely, RemoteOK, Remotive and Dice — nine sources from a single keyword and location search.',
  },
  {
    q: 'Will my resume get past ATS filters?',
    a: 'Resume Studio scores keyword and structural fit as you type and exports an ATS-friendly PDF, so you see the score before you send. It gives you a much better shot — no tool can guarantee a human reads it.',
  },
  {
    q: 'Can I bring my existing resume?',
    a: 'Import a PDF, DOCX, TXT or MD file, or start from a blank page. Rewind keeps snapshots so you can roll back before any big rewrite.',
  },
  {
    q: 'Can I cancel whenever I want?',
    a: 'Yes — plans are month to month and cancel from Billing in a couple of clicks. Your documents stay yours.',
  },
]

/* ------------------------------------------------------------------ */
/*  Mockups                                                            */
/* ------------------------------------------------------------------ */

function JobDossier() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-hydra-purple/25 via-transparent to-hydra-cyan/20 blur-2xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="relative overflow-hidden rounded-2xl border border-hydra-border bg-hydra-surface/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-hydra-border bg-hydra-darker/80 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-hydra-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-hydra-yellow/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-hydra-green/70" />
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
            hydrahunt / tailor
          </span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-hydra-green/30 bg-hydra-green/10 px-2 py-0.5 text-[10px] font-medium text-hydra-green">
            <ShieldCheck className="h-2.5 w-2.5" /> Ready
          </span>
        </div>

        {/* Role header */}
        <div className="flex items-start gap-3 border-b border-hydra-border p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-hydra-purple to-hydra-cyan text-sm font-bold text-white">
            NL
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              Senior Product Engineer
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Northwind Labs · Remote · $165k–190k
            </p>
          </div>
          <div className="rounded-lg border border-hydra-green/30 bg-hydra-green/10 px-2.5 py-1 text-center">
            <div className="text-sm font-bold text-hydra-green">92%</div>
            <div className="text-[9px] uppercase tracking-wide text-hydra-green/70">fit</div>
          </div>
        </div>

        {/* Scores */}
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">ATS keyword match</span>
              <span className="font-mono text-hydra-cyan">92 / 100</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-hydra-surface-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1.4, delay: 0.6, ease: 'easeOut' as const }}
                className="h-full rounded-full bg-gradient-to-r from-hydra-purple to-hydra-cyan"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['TypeScript', 'React', 'Design systems', 'B2B SaaS'].map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md border border-hydra-border bg-hydra-surface-2 px-2 py-0.5 text-[10px] text-foreground/80"
              >
                <Check className="h-2.5 w-2.5 text-hydra-green" />
                {k}
              </span>
            ))}
            {['Design ops', 'Accessibility'].map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md border border-hydra-yellow/25 bg-hydra-yellow/10 px-2 py-0.5 text-[10px] text-hydra-yellow/90"
              >
                <X className="h-2.5 w-2.5" />
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* Assets */}
        <div className="border-t border-hydra-border bg-hydra-darker/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-hydra-purple">
              Application kit
            </span>
            <span className="text-[10px] text-muted-foreground">5 assets</span>
          </div>
          <ul className="space-y-1.5">
            {kitAssets.map((asset, i) => (
              <motion.li
                key={asset}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-2 text-[11px] text-foreground/85"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-hydra-green" />
                <span className="truncate">{asset}</span>
                <Copy className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/60" />
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Floating cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="absolute -left-4 bottom-14 hidden rounded-xl border border-hydra-border bg-hydra-surface-2/95 px-3 py-2 shadow-xl backdrop-blur lg:block"
      >
        <div className="flex items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-hydra-cyan" />
          <div>
            <div className="text-[10px] text-muted-foreground">Mock interview</div>
            <div className="text-xs font-semibold text-foreground">8.4 / 10 readiness</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.25, duration: 0.5 }}
        className="absolute -right-3 top-24 hidden rounded-xl border border-hydra-border bg-hydra-surface-2/95 px-3 py-2 shadow-xl backdrop-blur lg:block"
      >
        <div className="flex items-center gap-2">
          <Rewind className="h-3.5 w-3.5 text-hydra-purple" />
          <div>
            <div className="text-[10px] text-muted-foreground">Rewind</div>
            <div className="text-xs font-semibold text-foreground">Snapshot saved</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ResumeMeterMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-hydra-border bg-hydra-surface/90">
      <div className="flex items-center justify-between border-b border-hydra-border px-4 py-2.5">
        <span className="font-mono text-[10px] text-muted-foreground">resume-studio.tsx</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-hydra-green/10 px-2 py-0.5 text-[10px] font-medium text-hydra-green">
          <Zap className="h-2.5 w-2.5" /> ATS 94
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-hydra-border bg-hydra-darker/60 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="h-2 w-24 rounded bg-hydra-purple/60" />
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Summary
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded bg-foreground/10" />
            <div className="h-1.5 w-11/12 rounded bg-foreground/10" />
            <div className="h-1.5 w-4/5 rounded bg-foreground/10" />
          </div>
        </div>
        <div className="rounded-lg border border-hydra-border bg-hydra-darker/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-2 w-20 rounded bg-hydra-cyan/50" />
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Experience
            </span>
          </div>
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hydra-cyan/60" />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-full rounded bg-foreground/10" />
                  <div className="h-1.5 w-10/12 rounded bg-foreground/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-hydra-green/25 bg-hydra-green/8 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-hydra-green" />
          <p className="text-[10px] leading-snug text-foreground/80">
            Rewrote 3 bullets to include <span className="text-hydra-green">design systems</span> and{' '}
            <span className="text-hydra-green">B2B SaaS</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

function KitMockup() {
  const tabs = ['Summary', 'Cover letter', 'Outreach', 'LinkedIn', 'Talking points']
  return (
    <div className="overflow-hidden rounded-xl border border-hydra-border bg-hydra-surface/90">
      <div className="flex items-center gap-1 overflow-hidden border-b border-hydra-border px-2.5 py-2">
        {tabs.map((tab, i) => (
          <span
            key={tab}
            className={`whitespace-nowrap rounded-md px-2 py-1 text-[10px] ${
              i === 1
                ? 'bg-hydra-purple/20 text-hydra-purple'
                : 'text-muted-foreground'
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded border border-hydra-border bg-hydra-surface-2 px-1.5 py-0.5">
            Tone: Confident
          </span>
          <span className="rounded border border-hydra-border bg-hydra-surface-2 px-1.5 py-0.5">
            Northwind Labs
          </span>
        </div>
        <div className="space-y-1.5 rounded-lg border border-hydra-border bg-hydra-darker/60 p-3">
          <div className="h-1.5 w-3/4 rounded bg-foreground/12" />
          <div className="h-1.5 w-full rounded bg-foreground/10" />
          <div className="h-1.5 w-11/12 rounded bg-foreground/10" />
          <div className="h-1.5 w-full rounded bg-foreground/10" />
          <div className="h-1.5 w-2/3 rounded bg-foreground/10" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">4 of 5 tabs generated</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-hydra-purple/15 px-2 py-1 text-[10px] font-medium text-hydra-purple">
            <Copy className="h-2.5 w-2.5" /> Copy
          </span>
        </div>
      </div>
    </div>
  )
}

function FitCheckMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-hydra-border bg-hydra-surface/90">
      <div className="flex items-center justify-between border-b border-hydra-border px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-hydra-purple">
          Fit check
        </span>
        <span className="text-[10px] text-muted-foreground">vs. job description</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold gradient-text">8.4</span>
          <span className="pb-1 text-[10px] text-muted-foreground">/ 10 role fit</span>
        </div>
        {[
          { label: 'Keyword coverage', value: 92, color: 'from-hydra-purple to-hydra-cyan' },
          { label: 'Impact language', value: 78, color: 'from-hydra-cyan to-hydra-green' },
          { label: 'Seniority match', value: 85, color: 'from-hydra-green to-hydra-cyan' },
        ].map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-mono text-foreground/70">{row.value}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-hydra-surface-2">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
                style={{ width: `${row.value}%` }}
              />
            </div>
          </div>
        ))}
        <div className="space-y-1.5 rounded-lg border border-hydra-yellow/20 bg-hydra-yellow/5 p-2.5">
          <p className="text-[10px] font-medium text-hydra-yellow">Gaps to close</p>
          {['No metrics on two recent bullets', 'Design ops never mentioned'].map((g) => (
            <p key={g} className="flex gap-1.5 text-[10px] text-foreground/70">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-hydra-yellow/70" />
              {g}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const setView = useAppStore((s) => s.setView)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: 'Product', id: 'product' },
    { label: 'How it works', id: 'how-it-works' },
    { label: 'Field Guide', id: 'field-manual' },
    { label: 'Pricing', id: 'pricing-teaser' },
  ]

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div className="flex min-h-screen flex-col scene scene-lights">
      {/* ============================================================ */}
      {/*  NAV                                                          */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 border-b border-hydra-border bg-hydra-dark/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2"
            aria-label="HydraHunt home"
          >
            <HydraMark size={32} alt="" />
            <span className="text-lg font-bold tracking-tight gradient-text">HydraHunt</span>
          </button>

          <div className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollTo(item.id)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setView('login')}
            >
              Log in
            </Button>
            <Button
              className="bg-hydra-purple font-semibold text-white shadow-[0_0_24px_-6px_rgba(177,84,248,0.7)] hover:bg-hydra-purple/85"
              onClick={() => setView('signup')}
            >
              Start free
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <button
            className="p-2 text-muted-foreground hover:text-foreground sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border-t border-hydra-border bg-hydra-surface/95 backdrop-blur-md sm:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollTo(item.id)}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-hydra-surface-2 hover:text-foreground"
                >
                  {item.label}
                </button>
              ))}
              <div className="mt-2 flex gap-2 border-t border-hydra-border pt-3">
                <Button
                  variant="outline"
                  className="flex-1 border-hydra-border bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setView('login')
                  }}
                >
                  Log in
                </Button>
                <Button
                  className="flex-1 bg-hydra-purple text-white hover:bg-hydra-purple/85"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setView('signup')
                  }}
                >
                  Start free
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </header>

      <main className="flex-1">
        {/* ============================================================ */}
        {/*  HERO                                                         */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[880px] -translate-x-1/2 rounded-full bg-hydra-purple/15 blur-[130px]" />
          <div className="pointer-events-none absolute -right-32 top-40 h-[380px] w-[380px] rounded-full bg-hydra-cyan/10 blur-[110px]" />

          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
              <motion.div initial="hidden" animate="visible" variants={container}>
                <motion.div variants={fadeUp} custom={0}>
                  <span className="inline-flex items-center gap-2 rounded-full border border-hydra-border bg-hydra-surface/80 px-3 py-1 text-xs text-hydra-cyan">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hydra-cyan/70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-hydra-cyan" />
                    </span>
                    Nine job boards. One workspace.
                  </span>
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  custom={1}
                  className="mt-6 text-[2.75rem] font-bold leading-[0.98] tracking-tight sm:text-6xl lg:text-[4.2rem]"
                >
                  Hunt smarter.
                  <br />
                  <span className="gradient-text">Land faster.</span>
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  custom={2}
                  className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
                >
                  HydraHunt reads the job post, then builds the tailored resume, cover
                  letter, outreach email and interview prep to win it — all in one
                  workspace instead of six browser tabs.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  custom={3}
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Button
                    size="lg"
                    onClick={() => setView('signup')}
                    className="h-12 rounded-lg bg-hydra-purple px-6 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(177,84,248,0.9)] hover:bg-hydra-purple/85"
                  >
                    Start free — no card needed
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => scrollTo('how-it-works')}
                    className="h-12 rounded-lg border-hydra-border bg-hydra-surface/60 px-6 text-sm text-foreground hover:border-hydra-cyan/40 hover:bg-hydra-surface hover:text-foreground"
                  >
                    See how it works
                  </Button>
                </motion.div>

                <motion.ul
                  variants={fadeUp}
                  custom={4}
                  className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
                >
                  {['Free forever plan', 'No credit card', 'Cancel anytime'].map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-hydra-green" />
                      {item}
                    </li>
                  ))}
                </motion.ul>
              </motion.div>

              <JobDossier />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  BOARD MARQUEE                                                */}
        {/* ============================================================ */}
        <section className="border-y border-hydra-border bg-hydra-darker/50 py-6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="mb-4 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Searches the boards you already use
            </p>
            <div className="marquee-mask overflow-hidden">
              <div className="flex w-max animate-marquee items-center gap-3">
                {[...jobBoards, ...jobBoards].map((board, i) => (
                  <span
                    key={`${board}-${i}`}
                    className="whitespace-nowrap rounded-lg border border-hydra-border bg-hydra-surface/70 px-4 py-2 text-sm text-foreground/70"
                  >
                    {board}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PROBLEM / COMPARISON                                         */}
        {/* ============================================================ */}
        <section className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Applying everywhere isn’t a strategy.
                <br className="hidden sm:block" />
                <span className="text-muted-foreground"> It’s a numbers game you lose.</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Recruiters skim for relevance in seconds. HydraHunt makes every
                application obviously relevant — without turning your evening into
                a second job.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-6">
              <Reveal delay={0}>
                <div className="h-full rounded-2xl border border-hydra-border bg-hydra-surface/60 p-6 sm:p-7">
                  <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <X className="h-4 w-4 text-hydra-red" />
                    The spray-and-pray way
                  </div>
                  <ul className="space-y-3.5">
                    {oldWay.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground/80">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-hydra-red/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={1}>
                <div className="relative h-full overflow-hidden rounded-2xl border border-hydra-purple/30 bg-hydra-surface p-6 shadow-[0_0_60px_-30px_rgba(177,84,248,0.8)] sm:p-7">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-hydra-purple/15 blur-2xl" />
                  <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Target className="h-4 w-4 text-hydra-purple" />
                    The HydraHunt way
                  </div>
                  <ul className="space-y-3.5">
                    {newWay.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-hydra-green" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  HOW IT WORKS                                                 */}
        {/* ============================================================ */}
        <section id="how-it-works" className="relative border-t border-hydra-border py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hydra-cyan">
                How it works
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                One posting in. A whole application out.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Three steps, one workspace. No exporting between documents, no
                copying and pasting into a cover-letter template at midnight.
              </p>
            </Reveal>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={container}
              className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-3"
            >
              {steps.map((step, i) => (
                <motion.div
                  key={step.no}
                  variants={fadeUp}
                  custom={i}
                  className="group relative overflow-hidden rounded-2xl border border-hydra-border bg-hydra-surface/70 p-6 transition-colors hover:border-hydra-purple/30"
                >
                  <span className="pointer-events-none absolute -right-2 -top-4 text-6xl font-bold text-foreground/5">
                    {step.no}
                  </span>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-hydra-border bg-hydra-surface-2">
                    <step.icon className="h-5 w-5 text-hydra-purple" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PRODUCT DEEP DIVES                                           */}
        {/* ============================================================ */}
        <section id="product" className="relative overflow-hidden border-t border-hydra-border py-20 sm:py-28">
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-hydra-purple/8 blur-[140px]" />
          <div className="relative mx-auto max-w-6xl space-y-20 px-4 sm:px-6 sm:space-y-28">
            {/* Resume Studio */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hydra-purple">
                  Resume Studio
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  A resume that reads like it was written for this job.
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Import what you already have, then edit with live ATS scoring in
                  the corner. Missing keywords get flagged, weak bullets get
                  rewritten, and the export is a clean, parser-friendly PDF.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {[
                    'Import PDF, DOCX, TXT or Markdown',
                    'Drag sections into the order you want',
                    'ATS score updates as you type',
                    'One-click export to PDF or DOCX',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-hydra-green" />
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={1}>
                <div className="relative">
                  <div className="absolute -inset-4 rounded-2xl bg-gradient-to-tr from-hydra-purple/15 to-transparent blur-xl" />
                  <ResumeMeterMockup />
                </div>
              </Reveal>
            </div>

            {/* Tailor */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className="lg:order-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hydra-cyan">
                  Tailor
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  Five assets. One click. Same voice, every channel.
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Paste the job description, pick a tone — Confident, Professional,
                  Casual or Bold — and HydraHunt writes the whole outreach kit. Your
                  summary, cover letter, recruiter email, LinkedIn DM and talking
                  points all tell the same story.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {[
                    'Grounded in your real profile and experience',
                    'Regenerate in a different tone and compare',
                    'Copy any asset straight into the application',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-hydra-green" />
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={1} className="lg:order-1">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-2xl bg-gradient-to-tr from-hydra-cyan/15 to-transparent blur-xl" />
                  <KitMockup />
                </div>
              </Reveal>
            </div>

            {/* Fit Check */}
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hydra-green">
                  Fit Check &amp; Mock Room
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  Know why you’ll get the interview — before you send anything.
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  A fit check names your strengths, the gaps and the exact keywords
                  you’re missing, then offers rewrites you can apply in one click.
                  When the call comes, rehearse in Mock Room and get scored feedback
                  after every answer.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: ScanSearch, title: 'Six-part review', body: 'ATS score, strengths, gaps, keywords, rewrites, role fit.' },
                    { icon: Mic, title: 'Scored practice', body: 'Behavioral, technical or role-specific, with feedback per answer.' },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="rounded-xl border border-hydra-border bg-hydra-surface/70 p-4"
                    >
                      <card.icon className="mb-2 h-4 w-4 text-hydra-cyan" />
                      <p className="text-sm font-medium text-foreground">{card.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={1}>
                <div className="relative">
                  <div className="absolute -inset-4 rounded-2xl bg-gradient-to-tr from-hydra-green/12 to-transparent blur-xl" />
                  <FitCheckMockup />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  FIELD GUIDE (compact module map)                             */}
        {/* ============================================================ */}
        <section id="field-manual" className="border-t border-hydra-border py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hydra-cyan">
                  Field Guide
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Twelve modules. Zero mystery.
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Every tool in the sidebar, in plain English — so you never wonder
                  what a name is supposed to mean.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-hydra-border bg-hydra-surface/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-hydra-purple">
                  Recommended first run
                </p>
                <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                  {firstRun.map((step, i) => (
                    <li key={step} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">{step}</span>
                      {i < firstRun.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={container}
              className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {modules.map((mod, i) => (
                <motion.div
                  key={mod.name}
                  variants={fadeUp}
                  custom={i % 3}
                  className="group flex items-start gap-3 rounded-xl border border-hydra-border bg-hydra-surface/60 p-4 transition-colors hover:border-hydra-purple/30 hover:bg-hydra-surface"
                >
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hydra-border bg-hydra-surface-2">
                    <mod.icon className="h-4 w-4 text-hydra-purple transition-colors group-hover:text-hydra-cyan" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{mod.tagline}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PRICING TEASER                                               */}
        {/* ============================================================ */}
        <section
          id="pricing-teaser"
          className="relative overflow-hidden border-y border-hydra-border py-20 sm:py-28"
        >
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-[380px] w-[640px] -translate-x-1/2 rounded-full bg-hydra-cyan/8 blur-[120px]" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hydra-cyan">
                Pricing
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Start free. Upgrade when the search gets serious.
              </h2>
              <p className="mt-4 text-muted-foreground">
                One offer is worth more than a year of any plan here.
              </p>
            </Reveal>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={container}
              className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4"
            >
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  variants={fadeUp}
                  custom={i}
                  className={`relative flex h-full flex-col rounded-2xl border p-6 ${
                    plan.featured
                      ? 'border-hydra-purple/40 bg-hydra-surface shadow-[0_0_50px_-24px_rgba(177,84,248,0.9)]'
                      : 'border-hydra-border bg-hydra-surface/60'
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-hydra-purple px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Most popular
                    </span>
                  )}
                  <p className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.blurb}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="mt-5 flex-1 space-y-2">
                    {plan.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hydra-green" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => setView('pricing')}
                    className={`mt-6 w-full ${
                      plan.featured
                        ? 'bg-hydra-purple text-white hover:bg-hydra-purple/85'
                        : 'border border-hydra-border bg-hydra-surface-2 text-foreground hover:border-hydra-purple/30 hover:bg-hydra-surface-2'
                    }`}
                  >
                    {plan.cta}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>

            <Reveal delay={1} className="mt-6 text-center">
              <button
                onClick={() => setView('pricing')}
                className="inline-flex items-center gap-1 text-sm text-hydra-cyan hover:text-hydra-purple"
              >
                Compare every feature, the $12 boost pack, and the $599 founder deal
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Reveal>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  FAQ                                                          */}
        {/* ============================================================ */}
        <section id="faq" className="py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Reveal className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Straight answers
              </h2>
              <p className="mt-3 text-muted-foreground">
                The questions people actually ask before signing up.
              </p>
            </Reveal>

            <Reveal delay={1} className="mt-10">
              <Accordion type="single" collapsible className="rounded-2xl border border-hydra-border bg-hydra-surface/60 px-5">
                {faqs.map((faq, i) => (
                  <AccordionItem key={faq.q} value={`item-${i}`} className="border-hydra-border">
                    <AccordionTrigger className="py-4 text-left text-sm font-medium text-foreground hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  FINAL CTA                                                    */}
        {/* ============================================================ */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <Reveal className="relative mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl border border-hydra-purple/25 bg-hydra-surface px-6 py-14 text-center sm:px-12 sm:py-20">
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
              <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-hydra-purple/20 blur-[90px]" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-hydra-cyan/15 blur-[90px]" />

              <div className="relative">
                <div className="mb-6 flex justify-center">
                  <HydraMark size={56} alt="" />
                </div>
                <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                  Your next role is <span className="gradient-text">already posted.</span>
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                  Find it, tailor for it, and walk in prepared — starting with the
                  free plan, in about ten minutes.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={() => setView('signup')}
                    className="h-12 rounded-lg bg-hydra-purple px-7 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(177,84,248,0.9)] hover:bg-hydra-purple/85"
                  >
                    Create free account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setView('pricing')}
                    className="h-12 rounded-lg border-hydra-border bg-transparent px-7 text-sm text-foreground hover:border-hydra-cyan/40 hover:bg-hydra-surface-2"
                  >
                    Compare plans
                  </Button>
                </div>
                <p className="mt-5 text-xs text-muted-foreground">
                  Free forever plan · No credit card · Cancel anytime
                </p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="mt-auto border-t border-hydra-border bg-hydra-darker">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <HydraLogo markSize={28} wordmarkClassName="text-lg" />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                The job-search workspace for people who would rather tailor five
                applications than blast five hundred.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                Product
              </p>
              <ul className="mt-3 space-y-2">
                {[
                  { label: 'How it works', id: 'how-it-works' },
                  { label: 'Field Guide', id: 'field-manual' },
                  { label: 'Pricing', id: 'pricing-teaser' },
                  { label: 'FAQ', id: 'faq' },
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => scrollTo(link.id)}
                      className="text-sm text-muted-foreground transition-colors hover:text-hydra-purple"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                Account
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <button
                    onClick={() => setView('login')}
                    className="text-sm text-muted-foreground transition-colors hover:text-hydra-purple"
                  >
                    Log in
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setView('signup')}
                    className="text-sm text-muted-foreground transition-colors hover:text-hydra-purple"
                  >
                    Start free
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setView('contact')}
                    className="text-sm text-muted-foreground transition-colors hover:text-hydra-purple"
                  >
                    Contact
                  </button>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="text-sm text-muted-foreground transition-colors hover:text-hydra-purple"
                  >
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-hydra-border pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} HydraHunt. All rights reserved.
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-hydra-green" />
              Your documents stay yours.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
