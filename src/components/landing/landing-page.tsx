'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  Wrench,
  Zap,
  Swords,
  Crosshair,
  Target,
  Map,
  ChevronRight,
  Menu,
  X,
  Terminal,
  FileText,
  BarChart3,
  Shield,
  Cpu,
  Radio,
  LayoutDashboard,
  Search,
  ScrollText,
  Settings,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

/* ------------------------------------------------------------------ */
/*  Counter hook                                                       */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const tick = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
            setCount(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { count, ref }
}

/* ------------------------------------------------------------------ */
/*  Feature data                                                       */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Wrench,
    title: 'Resume Forge',
    desc: 'AI-crafted resumes weaponized for each target role and ATS system.',
  },
  {
    icon: Zap,
    title: 'AI Payload Forge',
    desc: 'Generate tailored cover letters and outreach messages in seconds.',
  },
  {
    icon: Swords,
    title: 'Interview Drills',
    desc: 'Practice with AI opponents that simulate real interview combat.',
  },
  {
    icon: Crosshair,
    title: 'Kill List Tracker',
    desc: 'Track every application status from pipeline to offer accepted.',
  },
  {
    icon: Target,
    title: 'Strike Analysis',
    desc: 'Deep analytics on your hit rate, response times, and patterns.',
  },
  {
    icon: Map,
    title: 'Career Map',
    desc: 'Visualize your career trajectory and plot your next strategic move.',
  },
]

/* ------------------------------------------------------------------ */
/*  Field Manual data                                                  */
/* ------------------------------------------------------------------ */

/** The order a new user should work through the modules. */
const recommendedFlow = [
  'Search jobs',
  'Add to Kill List',
  'Tailor resume',
  'Generate payload',
  'Run analysis',
  'Drill interview',
]

interface ManualItem {
  icon: React.ElementType
  name: string
  tagline: string
  steps: string[]
}

const manualGroups: { title: string; blurb: string; items: ManualItem[] }[] = [
  {
    title: 'Find & track',
    blurb: 'Pick your targets and keep every application moving.',
    items: [
      {
        icon: LayoutDashboard,
        name: 'Dashboard',
        tagline: 'Your mission overview',
        steps: [
          'Start here after login: four tiles show Total Targets, Active Payloads, Resume Score and Interview Prep.',
          'Use Quick Actions to jump straight into a workflow without hunting through the sidebar.',
        ],
      },
      {
        icon: Search,
        name: 'Job Opportunities',
        tagline: 'One search across nine job boards',
        steps: [
          'Enter a keyword and location, choose a source — LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google, WeWorkRemotely, RemoteOK, Remotive or Dice — then run the search.',
          'Open a posting to preview it, attach the resume you want to use, and send the application. Auto-apply can submit it for you.',
          'Every application you send becomes a target in your Kill List.',
        ],
      },
      {
        icon: Crosshair,
        name: 'Kill List',
        tagline: 'Your application pipeline',
        steps: [
          'Add a target with company, role, salary, location, priority and notes.',
          'Drag cards between stages as things move: Intel Gathered, Target Acquired, Payload Sent, Interview, Offer — or Eliminated.',
          'This board is the single source of truth for where every application stands.',
        ],
      },
    ],
  },
  {
    title: 'Build & send',
    blurb: 'Turn one resume into tailored material for each target.',
    items: [
      {
        icon: FileText,
        name: 'Resume Forge',
        tagline: 'Build, score and export your resume',
        steps: [
          'Import an existing resume (PDF, DOCX, TXT or MD) or start from scratch.',
          'Fill in summary, experience, education, skills and projects — drag sections to reorder them.',
          'Watch the ATS meter update as you type, then export an ATS-friendly PDF.',
          'Mark one resume as Default so Payload Forge, Strike Analysis and applications preselect it.',
        ],
      },
      {
        icon: Zap,
        name: 'Payload Forge',
        tagline: 'Generate the outreach material',
        steps: [
          'Pick a resume, paste the job description, add the company and choose a tone: Confident, Professional, Casual or Aggressive.',
          'Generate once to fill five tabs — Summary, Cover Letter, Outreach Email, LinkedIn message and Talking Points.',
          'Copy any tab, or regenerate with a different tone and compare.',
        ],
      },
      {
        icon: Shield,
        name: 'Version Vault',
        tagline: 'Snapshot and restore resumes',
        steps: [
          'Save a snapshot before any large edit so you can always roll back.',
          'Label snapshots by milestone — "Before Interview Round" or "ATS Optimization Pass", for example.',
          'Restore a snapshot to replace the current resume with that saved version.',
        ],
      },
    ],
  },
  {
    title: 'Prepare & review',
    blurb: 'Sharpen the story and see what is actually working.',
    items: [
      {
        icon: Target,
        name: 'Strike Analysis',
        tagline: 'Deep AI resume review',
        steps: [
          'Choose a resume and the role you are targeting, then run the analysis.',
          'Read six outputs: ATS score, strengths, weaknesses, missing keywords, rewritten bullets and a role-fit assessment.',
          'Hit Apply improvements to write the suggested rewrites back into the resume.',
        ],
      },
      {
        icon: Swords,
        name: 'Interview Drills',
        tagline: 'AI mock interviews',
        steps: [
          'Start a session and pick a type — Behavioral, Technical or Role-Specific — plus the role and company.',
          'Answer one question at a time; the AI responds with brief feedback and a score out of 10.',
          'End the session to save it, then revisit past sessions from the list.',
        ],
      },
      {
        icon: ScrollText,
        name: 'Mission Log',
        tagline: 'Everything you have done, timestamped',
        steps: [
          'Review the activity feed covering resumes, payloads, applications, interviews, analyses and billing.',
          'Filter by category to reconstruct what you sent, and when.',
        ],
      },
      {
        icon: Map,
        name: 'Career Map',
        tagline: 'Plan the next move',
        steps: [
          'Map your current role against the role you want next.',
          'Add the skills, certifications and milestones that bridge the gap.',
          'Move each node from Pending to In Progress to Completed as you close it.',
        ],
      },
    ],
  },
  {
    title: 'Account',
    blurb: 'Keep your profile and plan current.',
    items: [
      {
        icon: Settings,
        name: 'Settings',
        tagline: 'Your profile',
        steps: [
          'Fill in name, headline, bio, location and links (website, LinkedIn, GitHub) so generated material is grounded in real details.',
        ],
      },
      {
        icon: CreditCard,
        name: 'Billing',
        tagline: 'Plan and usage',
        steps: [
          'Check your current plan and how much of each quota you have used.',
          'Upgrade when you need more resumes or AI generations.',
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Stats data                                                         */
/* ------------------------------------------------------------------ */

const stats = [
  { value: 10000, suffix: '+', label: 'Hunters' },
  { value: 50000, suffix: '+', label: 'Payloads Generated' },
  { value: 92, suffix: '%', label: 'Interview Success Rate' },
]

/* ------------------------------------------------------------------ */
/*  Hero Terminal Graphic                                              */
/* ------------------------------------------------------------------ */

function HeroTerminal() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="relative w-full max-w-lg mx-auto mt-10 lg:mt-0"
    >
      {/* Outer glow */}
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-hydra-purple/20 via-hydra-cyan/10 to-hydra-purple/20 blur-xl" />

      {/* Terminal card */}
      <div className="relative rounded-xl border border-hydra-border bg-hydra-surface overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hydra-border bg-hydra-darker">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-hydra-red/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-hydra-yellow/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-hydra-green/80" />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono ml-2">
            hydra://terminal — session active
          </span>
        </div>

        {/* Terminal body */}
        <div className="p-4 space-y-3 font-mono text-xs leading-relaxed">
          {/* Line 1 - command */}
          <div className="flex items-center gap-2">
            <span className="text-hydra-cyan">❯</span>
            <span className="text-hydra-green">hydra</span>
            <span className="text-muted-foreground">--mode hunt --target &quot;Senior Engineer&quot;</span>
          </div>

          {/* Status bar */}
          <div className="grid grid-cols-3 gap-2 py-2">
            {[
              { label: 'Resumes', val: '12', icon: FileText, color: 'text-hydra-purple' },
              { label: 'Payloads', val: '48', icon: Cpu, color: 'text-hydra-cyan' },
              { label: 'Strike Rate', val: '94%', icon: Target, color: 'text-hydra-green' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-hydra-surface-2 border border-hydra-border p-2 text-center"
              >
                <item.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${item.color}`} />
                <div className="text-sm font-bold text-foreground">{item.val}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bars */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>⬡ Resume Optimization</span>
              <span className="text-hydra-green">Complete</span>
            </div>
            <div className="h-1.5 rounded-full bg-hydra-surface-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-hydra-purple to-hydra-cyan"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>⬡ Payload Deployment</span>
              <span className="text-hydra-cyan">87%</span>
            </div>
            <div className="h-1.5 rounded-full bg-hydra-surface-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-hydra-cyan to-hydra-green"
                initial={{ width: 0 }}
                animate={{ width: '87%' }}
                transition={{ duration: 2, delay: 1.3, ease: 'easeOut' }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>⬡ Interview Prep</span>
              <span className="text-hydra-purple">62%</span>
            </div>
            <div className="h-1.5 rounded-full bg-hydra-surface-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-hydra-purple to-hydra-purple/60"
                initial={{ width: 0 }}
                animate={{ width: '62%' }}
                transition={{ duration: 2, delay: 1.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Bottom status */}
          <div className="flex items-center justify-between pt-2 border-t border-hydra-border">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-hydra-green pulse-glow" />
              <span className="text-[10px] text-hydra-green">Systems Online</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-hydra-purple" />
              <span className="text-[10px] text-muted-foreground">Encrypted</span>
            </div>
          </div>
        </div>

        {/* Scanline overlay (local) */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.04)_2px,rgba(0,0,0,0.04)_4px)]" />
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const setView = useAppStore((s) => s.setView)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const stat1 = useCountUp(10000, 2200)
  const stat2 = useCountUp(50000, 2400)
  const stat3 = useCountUp(92, 1800)
  const statRefs = [stat1, stat2, stat3]

  const navItems = [
    { label: 'Features', view: 'features' as const, id: 'features' },
    { label: 'Field Manual', view: 'features' as const, id: 'field-manual' },
    { label: 'Pricing', view: 'pricing' as const, id: 'pricing-teaser' },
  ]

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-hydra-dark bg-grid">
      {/* ============================================================ */}
      {/*  NAV BAR                                                      */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 w-full border-b border-hydra-border bg-hydra-dark/80 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xl font-bold tracking-tight gradient-text"
          >
            HydraHunt
          </button>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollTo(item.id)}
                className="text-sm text-muted-foreground hover:text-hydra-purple transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-hydra-purple hover:bg-hydra-surface"
              onClick={() => setView('login')}
            >
              Login
            </Button>
            <Button
              className="bg-hydra-purple hover:bg-hydra-purple/80 text-white"
              onClick={() => setView('signup')}
            >
              Signup
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-muted-foreground hover:text-hydra-purple"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden border-t border-hydra-border bg-hydra-surface/95 backdrop-blur-md"
          >
            <div className="flex flex-col gap-1 p-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollTo(item.id)}
                  className="text-sm text-left px-3 py-2 rounded-md text-muted-foreground hover:text-hydra-purple hover:bg-hydra-surface-2 transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <div className="flex gap-2 mt-2 pt-2 border-t border-hydra-border">
                <Button
                  variant="outline"
                  className="flex-1 border-hydra-border text-muted-foreground hover:text-hydra-purple"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setView('login')
                  }}
                >
                  Login
                </Button>
                <Button
                  className="flex-1 bg-hydra-purple hover:bg-hydra-purple/80 text-white"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setView('signup')
                  }}
                >
                  Signup
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </header>

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                 */}
      {/* ============================================================ */}
      <main className="flex-1">
        {/* ---------------------------------------------------------- */}
        {/*  HERO SECTION                                               */}
        {/* ---------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          {/* Background radial glow */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-hydra-purple/8 rounded-full blur-[120px]" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center">
              {/* Text side */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={container}
                className="text-center lg:text-left"
              >
                <motion.div variants={fadeUp} custom={0}>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-hydra-border bg-hydra-surface text-xs text-hydra-cyan font-medium mb-6">
                    <Terminal className="w-3 h-3" />
                    Tactical Career Intelligence
                  </span>
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  custom={1}
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
                >
                  <span className="gradient-text">Job hunting is dead. We killed it.</span>
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  custom={2}
                  className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
                >
                  AI-powered resumes, tailored payloads, interview drills, and job tracking — all from one tactical command center.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  custom={3}
                  className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
                >
                  <Button
                    size="lg"
                    className="bg-hydra-purple hover:bg-hydra-purple/80 text-white font-semibold px-6"
                    onClick={() => setView('signup')}
                  >
                    Enter the Hunt
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-hydra-border text-muted-foreground hover:text-hydra-purple hover:border-hydra-purple/40 px-6"
                    onClick={() => setView('pricing')}
                  >
                    See Plans
                  </Button>
                </motion.div>
              </motion.div>

              {/* Terminal graphic side */}
              <HeroTerminal />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  FEATURES SECTION                                           */}
        {/* ---------------------------------------------------------- */}
        <section id="features" className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={container}
              className="text-center mb-12 sm:mb-16"
            >
              <motion.h2
                variants={fadeUp}
                custom={0}
                className="text-3xl sm:text-4xl font-bold tracking-tight"
              >
                Your <span className="gradient-text">Arsenal</span>
              </motion.h2>
              <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground max-w-md mx-auto">
                Six tactical modules designed to dominate every stage of the job hunt.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={container}
              className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  custom={i}
                  className="card-hover group rounded-xl bg-hydra-surface p-5 sm:p-6"
                >
                  <div className="mb-3 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-hydra-surface-2 border border-hydra-border group-hover:border-hydra-purple/30 transition-colors">
                    <f.icon className="w-5 h-5 text-hydra-purple group-hover:text-hydra-cyan transition-colors" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  FIELD MANUAL SECTION                                       */}
        {/* ---------------------------------------------------------- */}
        <section
          id="field-manual"
          className="py-20 sm:py-28 border-t border-hydra-border"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={container}
              className="text-center mb-12 sm:mb-16"
            >
              <motion.h2
                variants={fadeUp}
                custom={0}
                className="text-3xl sm:text-4xl font-bold tracking-tight"
              >
                The <span className="gradient-text">Field Manual</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                custom={1}
                className="mt-3 text-muted-foreground max-w-xl mx-auto"
              >
                Every module in the sidebar, what it is for and how to use it. No
                hunting through menus wondering what a name means.
              </motion.p>
            </motion.div>

            {/* Recommended order */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              custom={0}
              className="mb-12 sm:mb-16 rounded-xl border border-hydra-border bg-hydra-surface p-5 sm:p-6"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-hydra-purple">
                Recommended first run
              </h3>
              <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                {recommendedFlow.map((step, i) => (
                  <li key={step} className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-hydra-border bg-hydra-surface-2 text-[10px] font-bold text-hydra-cyan">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                    {i < recommendedFlow.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-hydra-muted/40" />
                    )}
                  </li>
                ))}
              </ol>
            </motion.div>

            <div className="space-y-12 sm:space-y-16">
              {manualGroups.map((group) => (
                <motion.div
                  key={group.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={container}
                >
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {group.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{group.blurb}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.items.map((item, i) => (
                      <motion.div
                        key={item.name}
                        variants={fadeUp}
                        custom={i}
                        className="card-hover rounded-xl border border-hydra-border bg-hydra-surface p-5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hydra-border bg-hydra-surface-2">
                            <item.icon className="h-4 w-4 text-hydra-purple" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground">
                              {item.name}
                            </h4>
                            <p className="text-xs text-hydra-cyan">{item.tagline}</p>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-1.5">
                          {item.steps.map((step) => (
                            <li
                              key={step}
                              className="flex gap-2 text-sm text-muted-foreground leading-relaxed"
                            >
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-hydra-cyan" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  SOCIAL PROOF SECTION                                       */}
        {/* ---------------------------------------------------------- */}
        <section className="py-16 sm:py-20 border-y border-hydra-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={container}
              className="grid gap-8 sm:grid-cols-3 text-center"
            >
              {stats.map((s, i) => {
                const { count, ref } = statRefs[i]
                return (
                  <motion.div key={s.label} variants={fadeUp} custom={i} ref={ref}>
                    <div className="text-3xl sm:text-4xl font-bold gradient-text">
                      {count.toLocaleString()}{s.suffix}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  PRICING TEASER                                             */}
        {/* ---------------------------------------------------------- */}
        <section id="pricing-teaser" className="py-20 sm:py-28 relative overflow-hidden">
          {/* Background glow */}
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-hydra-cyan/6 rounded-full blur-[100px]" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={container}
            className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl sm:text-4xl font-bold tracking-tight"
            >
              Choose Your <span className="gradient-text">Weapon</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground max-w-md mx-auto">
              From solo operatives to full squads — pick the plan that fits your mission.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8">
              <Button
                size="lg"
                className="bg-hydra-purple hover:bg-hydra-purple/80 text-white font-semibold px-6"
                onClick={() => setView('pricing')}
              >
                View Pricing
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* ============================================================ */}
      {/*  FOOTER                                                      */}
      {/* ============================================================ */}
      <footer className="mt-auto border-t border-hydra-border bg-hydra-darker">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <span className="text-lg font-bold gradient-text">HydraHunt</span>

            {/* Links */}
            <nav className="flex items-center gap-6" aria-label="Footer navigation">
              <button
                onClick={() => scrollTo('features')}
                className="text-sm text-muted-foreground hover:text-hydra-purple transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollTo('field-manual')}
                className="text-sm text-muted-foreground hover:text-hydra-purple transition-colors"
              >
                Field Manual
              </button>
              <button
                onClick={() => setView('pricing')}
                className="text-sm text-muted-foreground hover:text-hydra-purple transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => setView('contact')}
                className="text-sm text-muted-foreground hover:text-hydra-purple transition-colors"
              >
                Contact
              </button>
            </nav>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} HydraHunt. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
