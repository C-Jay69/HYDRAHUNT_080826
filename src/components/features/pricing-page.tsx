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
  Target,
  Download,
  Crown,
  Crosshair,
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
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/hooks/use-toast'

type PlanKey = 'free' | 'stride' | 'apex'

interface PlanDesign {
  key: PlanKey
  /** Included flags, positionally aligned with `m.pricing.plans[key].features`. */
  included: boolean[]
  highlighted?: boolean
  recommended?: boolean
  icon: typeof Zap
  iconColor: string
  iconBg: string
  glowClass?: string
  checkoutPlan?: string
}

const FREE_PLAN: PlanDesign = {
  key: 'free',
  icon: Zap,
  iconColor: 'text-hydra-muted',
  iconBg: 'bg-hydra-surface-2',
  included: [
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ],
}

const HUNTER_PLAN: PlanDesign = {
  key: 'stride',
  checkoutPlan: 'hunter_monthly',
  icon: Crosshair,
  iconColor: 'text-hydra-purple',
  iconBg: 'bg-hydra-purple/15',
  included: [true, true, true, true, true, true, true, true, true, true, false, false, false, false, false],
}

const BEASTMASTER_PLAN: PlanDesign = {
  key: 'apex',
  icon: Crown,
  iconColor: 'text-hydra-purple',
  iconBg: 'bg-hydra-purple/20',
  highlighted: true,
  recommended: true,
  checkoutPlan: 'beastmaster_monthly',
  glowClass: 'shadow-[0_0_40px_rgba(177,84,248,0.2)] border-hydra-purple/40',
  included: [
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
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

/** Copy of the landing page's compact Pricing section — display text comes from `m.landing.pricingTeaser.plans`. */
const LANDING_PLANS = [
  { key: 'free', featured: false, checkoutPlan: undefined as string | undefined },
  { key: 'stride', featured: true, checkoutPlan: 'hunter_monthly' as string | undefined },
  { key: 'apex', featured: false, checkoutPlan: 'beastmaster_monthly' as string | undefined },
  { key: 'founder', featured: false, checkoutPlan: 'lifetime_founder_deal' as string | undefined },
]

function PlanCard({ plan }: { plan: PlanDesign }) {
  const IconComp = plan.icon
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, setView } = useAppStore()
  const { m, format } = useI18n()
  const t = m.pricing
  const copy = t.plans[plan.key]
  const yearlyPrice = 'yearlyPrice' in copy ? copy.yearlyPrice : undefined
  const yearlyPeriod = 'yearlyPeriod' in copy ? copy.yearlyPeriod : undefined

  async function handleCheckout() {
    if (!plan.checkoutPlan) {
      // Free plan — just route to signup/dashboard
      setView(isAuthenticated ? 'dashboard' : 'signup')
      return
    }
    if (!isAuthenticated) {
      toast({ title: t.signInRequiredTitle, description: t.signInRequiredBody })
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
      if (!res.ok) throw new Error(data.error || t.genericError)
      if (data.url) window.location.href = data.url
      else toast({ title: t.checkoutUnavailable, description: data.error })
    } catch (err: unknown) {
      toast({
        title: t.checkoutFailedTitle,
        description: err instanceof Error ? err.message : t.genericError,
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
              {t.recommended}
            </Badge>
          </div>
        )}

        <CardContent className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.iconBg}`}>
              <IconComp className={`w-6 h-6 ${plan.iconColor}`} />
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-wide">{copy.name}</h3>
            <p className="text-sm text-hydra-muted mt-1">{copy.subtitle}</p>
          </div>

          {/* Pricing */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{copy.price}</span>
              <span className="text-sm text-hydra-muted">{copy.period}</span>
            </div>
            {yearlyPrice && (
              <p className="text-xs text-hydra-muted mt-1">
                {t.or} <span className="text-hydra-cyan font-medium">{yearlyPrice}</span>
                {yearlyPeriod}
                <span className="text-hydra-green ml-1">
                  {format(t.save, { percent: plan.key === 'stride' ? '20%' : '16%' })}
                </span>
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-hydra-border mb-6" />

          {/* Features */}
          <ul className="space-y-3 flex-1 mb-6">
            {copy.features.map((text, idx) => {
              const included = plan.included[idx] ?? false
              return (
                <li key={idx} className="flex items-start gap-2.5">
                  {included ? (
                    <Check className="w-4 h-4 text-hydra-green shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-hydra-muted/40 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-sm ${included ? 'text-foreground' : 'text-hydra-muted/40'}`}
                  >
                    {text}
                  </span>
                </li>
              )
            })}
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
                <Loader2 className="w-4 h-4 animate-spin mr-1" /> {t.redirecting}
              </>
            ) : plan.checkoutPlan ? (
              t.upgradeNow
            ) : (
              t.getStarted
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
  const { m } = useI18n()
  const t = m.pricing
  const teaserPlans = m.landing.pricingTeaser.plans

  async function handleTeaserCheckout(plan: (typeof LANDING_PLANS)[number]) {
    if (!plan.checkoutPlan) {
      setView(isAuthenticated ? 'dashboard' : 'signup')
      return
    }
    if (!isAuthenticated) {
      toast({ title: t.signInRequiredTitle, description: t.signInRequiredBody })
      setView('signup')
      return
    }
    setTeaserLoading(plan.key)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.checkoutPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t.genericError)
      if (data.url) window.location.href = data.url
      else toast({ title: t.checkoutUnavailable, description: data.error })
    } catch (err: unknown) {
      toast({
        title: t.checkoutFailedTitle,
        description: err instanceof Error ? err.message : t.genericError,
        variant: 'destructive',
      })
    } finally {
      setTeaserLoading(null)
    }
  }

  async function handleFounderDeal() {
    if (!isAuthenticated) {
      toast({ title: t.signInRequiredTitle, description: t.founderSignInBody })
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
      if (!res.ok) throw new Error(data.error || t.genericError)
      if (data.url) window.location.href = data.url
      else toast({ title: t.checkoutUnavailable, description: data.error })
    } catch (err: unknown) {
      toast({
        title: t.checkoutFailedTitle,
        description: err instanceof Error ? err.message : t.genericError,
        variant: 'destructive',
      })
    } finally {
      setFounderLoading(false)
    }
  }

  async function handleMissionPack() {
    if (!isAuthenticated) {
      toast({ title: t.signInRequiredTitle, description: t.packSignInBody })
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
      if (!res.ok) throw new Error(data.error || t.genericError)
      if (data.url) window.location.href = data.url
      else toast({ title: t.checkoutUnavailable, description: data.error })
    } catch (err: unknown) {
      toast({
        title: t.checkoutFailedTitle,
        description: err instanceof Error ? err.message : t.genericError,
        variant: 'destructive',
      })
    } finally {
      setPackLoading(false)
    }
  }

  const founderIcons = [Sparkles, Shield, Star] as const
  const founderColors = ['text-hydra-yellow', 'text-hydra-purple', 'text-hydra-cyan'] as const
  const boostIcons = [Sparkles, Target, Download] as const
  const boostColors = ['text-hydra-yellow', 'text-hydra-purple', 'text-hydra-cyan'] as const

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
            {isAuthenticated ? t.backDashboard : t.back}
          </Button>
          <LanguageSwitcher />
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
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.title}</h1>
          <p className="text-sm text-hydra-muted max-w-lg mx-auto">{t.subtitle}</p>
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
                    <h3 className="text-lg font-bold text-foreground">{t.founder.name}</h3>
                    <Badge className="bg-hydra-yellow/15 text-hydra-yellow border-hydra-yellow/30 text-[10px]">
                      {t.founder.oneTime}
                    </Badge>
                    <Badge className="bg-hydra-purple/15 text-hydra-purple border-hydra-purple/30 text-[10px]">
                      {t.founder.first250}
                    </Badge>
                  </div>
                  <p className="text-sm text-hydra-muted mb-3">{t.founder.body}</p>
                  <div className="flex flex-wrap gap-3">
                    {t.founder.points.map((point, i) => {
                      const Icon = founderIcons[i] ?? Sparkles
                      return (
                        <div
                          key={point}
                          className="flex items-center gap-1.5 text-xs text-hydra-muted"
                        >
                          <Icon className={`w-3.5 h-3.5 ${founderColors[i] ?? 'text-hydra-yellow'}`} />
                          {point}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-baseline gap-1 mb-2 justify-end">
                    <span className="text-2xl font-bold text-foreground">$599</span>
                    <span className="text-sm text-hydra-muted">{t.founder.period}</span>
                  </div>
                  <Button
                    onClick={handleFounderDeal}
                    disabled={founderLoading}
                    className="bg-hydra-yellow hover:bg-hydra-yellow/80 text-hydra-dark h-10 px-6 text-sm font-semibold"
                  >
                    {founderLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {t.founder.cta}
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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-hydra-yellow/15">
                  <Package className="w-6 h-6 text-hydra-yellow" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-foreground">{t.boost.name}</h3>
                    <Badge className="bg-hydra-yellow/15 text-hydra-yellow border-hydra-yellow/30 text-[10px]">
                      {t.boost.oneTime}
                    </Badge>
                  </div>
                  <p className="text-sm text-hydra-muted mb-3">{t.boost.body}</p>
                  <div className="flex flex-wrap gap-3">
                    {t.boost.points.map((point, i) => {
                      const Icon = boostIcons[i] ?? Sparkles
                      return (
                        <div
                          key={point}
                          className="flex items-center gap-1.5 text-xs text-hydra-muted"
                        >
                          <Icon className={`w-3.5 h-3.5 ${boostColors[i] ?? 'text-hydra-yellow'}`} />
                          {point}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-foreground">$12</span>
                    <span className="text-sm text-hydra-muted">{t.boost.period}</span>
                  </div>
                  <Button
                    onClick={handleMissionPack}
                    disabled={packLoading}
                    className="bg-hydra-yellow hover:bg-hydra-yellow/80 text-hydra-dark h-10 px-6 text-sm font-semibold"
                  >
                    {packLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {t.boost.cta}
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
                {t.recap.eyebrow}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {t.recap.title}
              </h2>
              <p className="mt-4 text-muted-foreground">{t.recap.body}</p>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeContainer}
              className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4"
            >
              {LANDING_PLANS.map((plan, i) => {
                const copy = teaserPlans[i]
                if (!copy) return null
                return (
                  <motion.div
                    key={plan.key}
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
                        {t.recap.mostPopular}
                      </span>
                    )}
                    <p className="text-sm font-semibold uppercase tracking-wider text-foreground">
                      {copy.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{copy.blurb}</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{copy.price}</span>
                      <span className="text-xs text-muted-foreground">{copy.period}</span>
                    </div>
                    <ul className="mt-5 flex-1 space-y-2">
                      {copy.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-foreground/80">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hydra-green" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleTeaserCheckout(plan)}
                      disabled={teaserLoading === plan.key}
                      className={`mt-6 w-full ${
                        plan.featured
                          ? 'bg-hydra-purple text-white hover:bg-hydra-purple/85'
                          : 'border border-hydra-border bg-hydra-surface-2 text-foreground hover:border-hydra-purple/30 hover:bg-hydra-surface-2'
                      }`}
                    >
                      {teaserLoading === plan.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          {copy.cta}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )
              })}
            </motion.div>

            <div className="mt-6 text-center">
              <button
                onClick={() =>
                  document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="inline-flex items-center gap-1 text-sm text-hydra-cyan hover:text-hydra-purple"
              >
                {t.recap.compareAll}
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
          <p>{t.footerNote1}</p>
          <p className="mt-1">{t.footerNote2}</p>
        </motion.div>
      </div>
    </div>
  )
}
