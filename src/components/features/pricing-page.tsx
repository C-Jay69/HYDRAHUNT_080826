'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  X,
  Zap,
  Star,
  Package,
  Sparkles,
  Shield,
  FileText,
  Crosshair,
  Swords,
  Target,
  Download,
  BarChart3,
  Headphones,
  Crown,
  Loader2,
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/app-store'
import { HydraMark } from '@/components/brand/hydra-logo'
import { toast } from '@/hooks/use-toast'

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  name: string
  subtitle: string
  price: string
  period: string
  yearlyPrice?: string
  yearlyPeriod?: string
  features: PlanFeature[]
  highlighted?: boolean
  recommended?: boolean
  icon: typeof Zap
  iconColor: string
  iconBg: string
  buttonVariant?: string
  glowClass?: string
  checkoutPlan?: string
}

const FREE_PLAN: Plan = {
  name: 'DAY ONE',
  subtitle: 'Get started with basic tools',
  price: 'Free',
  period: 'forever',
  icon: Zap,
  iconColor: 'text-hydra-muted',
  iconBg: 'bg-hydra-surface-2',
  features: [
    { text: '1 Resume', included: true },
    { text: '3 AI Kit Generations / month', included: true },
    { text: '1 Resume Analysis / month', included: true },
    { text: '10 Job Targets', included: true },
    { text: 'Watermarked PDF Export', included: true },
    { text: 'A-List Tracker', included: true },
    { text: 'Mock Room', included: true },
    { text: 'Unlimited AI Generations', included: false },
    { text: 'Rewind', included: false },
    { text: 'ATS Scoring', included: false },
    { text: 'DOCX Export', included: false },
    { text: 'Trajectory', included: false },
    { text: 'Advanced Analytics', included: false },
    { text: 'Priority AI Processing', included: false },
    { text: 'Custom Branding', included: false },
    { text: 'Priority Support', included: false },
  ],
}

const HUNTER_PLAN: Plan = {
  name: 'STRIDE',
  subtitle: 'For serious job seekers',
  price: '$24',
  period: '/month',
  yearlyPrice: '$228',
  yearlyPeriod: '/year',
  checkoutPlan: 'hunter_monthly',
  icon: Crosshair,
  iconColor: 'text-hydra-purple',
  iconBg: 'bg-hydra-purple/15',
  features: [
    { text: 'Unlimited Resumes', included: true },
    { text: '100 AI Kit Generations / month', included: true },
    { text: '10 Resume Analyses / month', included: true },
    { text: '20 Interview Sessions / month', included: true },
    { text: 'Unlimited Job Targets', included: true },
    { text: 'Rewind', included: true },
    { text: 'ATS Scoring', included: true },
    { text: 'PDF + DOCX Export', included: true },
    { text: 'A-List Tracker', included: true },
    { text: 'Mock Room', included: true },
    { text: 'Trajectory', included: false },
    { text: 'Advanced Analytics', included: false },
    { text: 'Priority AI Processing', included: false },
    { text: 'Custom Branding', included: false },
    { text: 'Priority Support', included: false },
  ],
}

const BEASTMASTER_PLAN: Plan = {
  name: 'APEX',
  subtitle: 'Unlock everything, at your own pace',
  price: '$59',
  period: '/month',
  yearlyPrice: '$588',
  yearlyPeriod: '/year',
  icon: Crown,
  iconColor: 'text-hydra-purple',
  iconBg: 'bg-hydra-purple/20',
  highlighted: true,
  recommended: true,
  checkoutPlan: 'beastmaster_monthly',
  glowClass: 'shadow-[0_0_40px_rgba(177,84,248,0.2)] border-hydra-purple/40',
  features: [
    { text: 'Unlimited Resumes', included: true },
    { text: 'Unlimited AI Generations', included: true },
    { text: 'Unlimited Analyses', included: true },
    { text: 'Unlimited Interview Sessions', included: true },
    { text: 'Unlimited Job Targets', included: true },
    { text: 'Rewind', included: true },
    { text: 'ATS Scoring', included: true },
    { text: 'PDF + DOCX Export', included: true },
    { text: 'Trajectory', included: true },
    { text: 'Advanced Analytics', included: true },
    { text: 'Priority AI Processing', included: true },
    { text: 'Early Access to Features', included: true },
    { text: 'Custom Branding', included: true },
    { text: 'Priority Support', included: true },
    { text: 'A-List Tracker', included: true },
    { text: 'Mock Room', included: true },
  ],
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: 'easeOut' as const },
  }),
}

const fadeContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

/** Copy of the landing page's compact Pricing section. */
const LANDING_PLANS = [
  {
    name: 'Day One',
    price: 'Free',
    period: 'forever',
    blurb: 'Test the whole workflow.',
    points: ['1 resume', '3 AI kits / month', '10 job targets', 'A-List + Mock Room'],
    cta: 'Start free',
    featured: false,
    checkoutPlan: undefined as string | undefined,
  },
  {
    name: 'Stride',
    price: '$24',
    period: '/month',
    blurb: 'For an active search.',
    points: ['Unlimited resumes', '100 AI kits / month', 'ATS scoring + DOCX', 'Rewind version history'],
    cta: 'Go Stride',
    featured: true,
    checkoutPlan: 'hunter_monthly',
  },
  {
    name: 'Apex',
    price: '$59',
    period: '/month',
    blurb: 'Everything, unmetered.',
    points: ['Unlimited everything', 'Trajectory + analytics', 'Priority AI processing', 'Priority support'],
    cta: 'Go Apex',
    featured: false,
    checkoutPlan: 'beastmaster_monthly',
  },
  {
    name: 'Founder',
    price: '$599',
    period: 'one-time',
    blurb: 'Lifetime Apex access.',
    points: ['Everything in Apex, forever', 'First 250 hunters only', 'Price locked for life', 'No renewals, ever'],
    cta: 'Claim founder deal',
    featured: false,
    checkoutPlan: 'lifetime_founder_deal',
  },
]

function PlanCard({ plan }: { plan: Plan }) {
  const IconComp = plan.icon
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, setView } = useAppStore()

  async function handleCheckout() {
    if (!plan.checkoutPlan) {
      // Free plan — just route to signup/dashboard
      setView(isAuthenticated ? 'dashboard' : 'signup')
      return
    }
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: 'Create an account before upgrading.' })
      setView('signup')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.checkoutPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) window.location.href = data.url
      else toast({ title: 'Checkout unavailable', description: data.error })
    } catch (err: unknown) {
      toast({
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div variants={item}>
      <Card
        className={`relative bg-hydra-surface-2 border transition-all h-full flex flex-col ${
          plan.glowClass || 'border-hydra-border card-hover'
        }`}
      >
        {/* Recommended Badge */}
        {plan.recommended && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-hydra-purple text-white border-hydra-purple px-3 py-0.5 text-[10px] font-bold tracking-wider">
              <Star className="w-3 h-3 mr-1" />
              RECOMMENDED
            </Badge>
          </div>
        )}

        <CardContent className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.iconBg}`}>
              <IconComp className={`w-6 h-6 ${plan.iconColor}`} />
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-wide">{plan.name}</h3>
            <p className="text-sm text-hydra-muted mt-1">{plan.subtitle}</p>
          </div>

          {/* Pricing */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              <span className="text-sm text-hydra-muted">{plan.period}</span>
            </div>
            {plan.yearlyPrice && (
              <p className="text-xs text-hydra-muted mt-1">
                or <span className="text-hydra-cyan font-medium">{plan.yearlyPrice}</span>{plan.yearlyPeriod}
                <span className="text-hydra-green ml-1">Save {plan.name === 'STRIDE' ? '20%' : '16%'}</span>
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-hydra-border mb-6" />

          {/* Features */}
          <ul className="space-y-3 flex-1 mb-6">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                {feature.included ? (
                  <Check className="w-4 h-4 text-hydra-green shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-hydra-muted/40 shrink-0 mt-0.5" />
                )}
                <span
                  className={`text-sm ${
                    feature.included ? 'text-foreground' : 'text-hydra-muted/40'
                  }`}
                >
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className={`w-full h-11 text-sm font-semibold ${
              plan.highlighted
                ? 'bg-hydra-purple hover:bg-hydra-purple/80 text-white shadow-[0_0_20px_rgba(177,84,248,0.3)]'
                : 'bg-hydra-surface border border-hydra-border text-foreground hover:bg-hydra-surface-2 hover:border-hydra-purple/30'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" /> Redirecting...
              </>
            ) : plan.checkoutPlan ? (
              'Upgrade Now'
            ) : (
              'Get Started'
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function PricingPage() {
  const [packLoading, setPackLoading] = useState(false)
  const [founderLoading, setFounderLoading] = useState(false)
  const [teaserLoading, setTeaserLoading] = useState<string | null>(null)
  const { isAuthenticated, setView } = useAppStore()

  async function handleTeaserCheckout(plan: (typeof LANDING_PLANS)[number]) {
    if (!plan.checkoutPlan) {
      setView(isAuthenticated ? 'dashboard' : 'signup')
      return
    }
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: 'Create an account before upgrading.' })
      setView('signup')
      return
    }
    setTeaserLoading(plan.name)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.checkoutPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) window.location.href = data.url
      else toast({ title: 'Checkout unavailable', description: data.error })
    } catch (err: unknown) {
      toast({
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setTeaserLoading(null)
    }
  }

  async function handleFounderDeal() {
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: 'Create an account before claiming the Founder Deal.' })
      setView('signup')
      return
    }
    setFounderLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'lifetime_founder_deal' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) window.location.href = data.url
      else toast({ title: 'Checkout unavailable', description: data.error })
    } catch (err: unknown) {
      toast({
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setFounderLoading(false)
    }
  }

  async function handleMissionPack() {
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: 'Create an account before purchasing a Boost Pack.' })
      setView('signup')
      return
    }
    setPackLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'mission_pack' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) window.location.href = data.url
      else toast({ title: 'Checkout unavailable', description: data.error })
    } catch (err: unknown) {
      toast({
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setPackLoading(false)
    }
  }

  return (
    <div className="min-h-screen scene scene-dusk">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      {/* Back to dashboard */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView(isAuthenticated ? 'dashboard' : 'landing')}
          className="text-hydra-muted hover:text-white shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {isAuthenticated ? 'Back to Dashboard' : 'Back'}
        </Button>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mb-3 flex justify-center">
          <HydraMark size={44} priority />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Choose Your Weapon</h1>
        <p className="text-sm text-hydra-muted max-w-lg mx-auto">
          Select the plan that matches your pace. Upgrade or downgrade at any time.
        </p>
      </motion.div>

      {/* Plan Cards */}
      <motion.div
        id="pricing-plans"
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <PlanCard plan={FREE_PLAN} />
        <PlanCard plan={HUNTER_PLAN} />
        <PlanCard plan={BEASTMASTER_PLAN} />
      </motion.div>

      {/* Lifetime Founder Deal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="relative overflow-hidden border-hydra-yellow/40 bg-gradient-to-br from-hydra-yellow/10 via-hydra-surface-2 to-hydra-surface-2 shadow-[0_0_40px_rgba(250,204,21,0.12)]">
          <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl from-hydra-yellow/15 to-transparent rounded-bl-full" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-hydra-yellow/15">
                <Crown className="w-6 h-6 text-hydra-yellow" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-foreground">LIFETIME FOUNDER DEAL</h3>
                  <Badge className="bg-hydra-yellow/15 text-hydra-yellow border-hydra-yellow/30 text-[10px]">
                    ONE-TIME
                  </Badge>
                  <Badge className="bg-hydra-purple/15 text-hydra-purple border-hydra-purple/30 text-[10px]">
                    FIRST 250 ONLY
                  </Badge>
                </div>
                <p className="text-sm text-hydra-muted mb-3">
                  Pay once and keep Apex-level access for life. Every current and future feature,
                  no renewals, no price increases — reserved for the first 250 hunters.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-hydra-muted">
                    <Sparkles className="w-3.5 h-3.5 text-hydra-yellow" />
                    Everything in Apex
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-hydra-muted">
                    <Shield className="w-3.5 h-3.5 text-hydra-purple" />
                    Lifetime access
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-hydra-muted">
                    <Star className="w-3.5 h-3.5 text-hydra-cyan" />
                    Price locked forever
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-baseline gap-1 mb-2 justify-end">
                  <span className="text-2xl font-bold text-foreground">$599</span>
                  <span className="text-sm text-hydra-muted">one-time</span>
                </div>
                <Button
                  onClick={handleFounderDeal}
                  disabled={founderLoading}
                  className="bg-hydra-yellow hover:bg-hydra-yellow/80 text-hydra-dark h-10 px-6 text-sm font-semibold"
                >
                  {founderLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Claim Founder Deal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Boost Pack */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-hydra-surface-2 border-hydra-border card-hover relative overflow-hidden">
          {/* Background accent */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-hydra-yellow/5 to-transparent rounded-bl-full" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-hydra-yellow/15`}>
                <Package className="w-6 h-6 text-hydra-yellow" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-foreground">BOOST PACK</h3>
                  <Badge className="bg-hydra-yellow/15 text-hydra-yellow border-hydra-yellow/30 text-[10px]">
                    ONE-TIME
                  </Badge>
                </div>
                <p className="text-sm text-hydra-muted mb-3">
                  Need a quick boost? Get a one-time pack with 10 AI kit generations + 1 resume analysis.
                  Expires after 30 days.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-hydra-muted">
                    <Sparkles className="w-3.5 h-3.5 text-hydra-yellow" />
                    10 AI Generations
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-hydra-muted">
                    <Target className="w-3.5 h-3.5 text-hydra-purple" />
                    1 Resume Analysis
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-hydra-muted">
                    <Download className="w-3.5 h-3.5 text-hydra-cyan" />
                    30-day expiry
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-foreground">$12</span>
                  <span className="text-sm text-hydra-muted">one-time</span>
                </div>
                <Button
                  onClick={handleMissionPack}
                  disabled={packLoading}
                  className="bg-hydra-yellow hover:bg-hydra-yellow/80 text-hydra-dark h-10 px-6 text-sm font-semibold"
                >
                  {packLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Buy Pack
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pricing recap — mirror of the landing page Pricing section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="relative overflow-hidden border-y border-hydra-border py-16 sm:py-20"
      >
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[380px] w-[640px] -translate-x-1/2 rounded-full bg-hydra-cyan/8 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hydra-cyan">
              Pricing
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Start free. Upgrade when the search gets serious.
            </h2>
            <p className="mt-4 text-muted-foreground">
              One offer is worth more than a year of any plan here.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeContainer}
            className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {LANDING_PLANS.map((plan, i) => (
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
                  onClick={() => handleTeaserCheckout(plan)}
                  disabled={teaserLoading === plan.name}
                  className={`mt-6 w-full ${
                    plan.featured
                      ? 'bg-hydra-purple text-white hover:bg-hydra-purple/85'
                      : 'border border-hydra-border bg-hydra-surface-2 text-foreground hover:border-hydra-purple/30 hover:bg-hydra-surface-2'
                  }`}
                >
                  {teaserLoading === plan.name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      {plan.cta}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-6 text-center">
            <button
              onClick={() =>
                document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="inline-flex items-center gap-1 text-sm text-hydra-cyan hover:text-hydra-purple"
            >
              Compare every feature, the $12 boost pack, and the $599 founder deal
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.section>

      {/* FAQ / Bottom Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-xs text-hydra-muted"
      >
        <p>All plans include access to the A-List tracker and basic mock interviews.</p>
        <p className="mt-1">Cancel anytime. No questions asked.</p>
      </motion.div>
      </div>
    </div>
  )
}
