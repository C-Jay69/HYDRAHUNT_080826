'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard,
  Zap,
  FileText,
  Swords,
  Target,
  HardDrive,
  ArrowUpRight,
  Check,
  Crown,
  Crosshair,
  Sparkles,
  Star,
  Download,
  Shield,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/app-store'
import { toast } from '@/hooks/use-toast'

interface UsageStat {
  label: string
  used: number
  limit: number | string
  icon: typeof Zap
  color: string
  bgColor: string
}

interface PaymentRecord {
  id: string
  date: string
  description: string
  amount: string
  status: 'paid' | 'pending' | 'failed'
}

const MOCK_USAGE: UsageStat[] = [
  {
    label: 'AI Generations',
    used: 67,
    limit: 100,
    icon: Zap,
    color: 'text-hydra-purple',
    bgColor: 'bg-hydra-purple/15',
  },
  {
    label: 'Resume Analyses',
    used: 4,
    limit: 10,
    icon: Target,
    color: 'text-hydra-cyan',
    bgColor: 'bg-hydra-cyan/15',
  },
  {
    label: 'Interview Sessions',
    used: 8,
    limit: 20,
    icon: Swords,
    color: 'text-hydra-yellow',
    bgColor: 'bg-hydra-yellow/15',
  },
  {
    label: 'Storage Used',
    used: 12,
    limit: '50 MB',
    icon: HardDrive,
    color: 'text-hydra-green',
    bgColor: 'bg-hydra-green/15',
  },
]

const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay1',
    date: 'Dec 1, 2025',
    description: 'Hunter Plan — Monthly',
    amount: '$24.00',
    status: 'paid',
  },
  {
    id: 'pay2',
    date: 'Nov 1, 2025',
    description: 'Hunter Plan — Monthly',
    amount: '$24.00',
    status: 'paid',
  },
  {
    id: 'pay3',
    date: 'Oct 15, 2025',
    description: 'Mission Pack — One-time',
    amount: '$12.00',
    status: 'paid',
  },
  {
    id: 'pay4',
    date: 'Oct 1, 2025',
    description: 'Hunter Plan — Monthly',
    amount: '$24.00',
    status: 'paid',
  },
  {
    id: 'pay5',
    date: 'Sep 1, 2025',
    description: 'Free Plan Activation',
    amount: '$0.00',
    status: 'paid',
  },
  {
    id: 'pay6',
    date: 'Aug 15, 2025',
    description: 'Mission Pack — One-time',
    amount: '$12.00',
    status: 'paid',
  },
]

interface BillingResponse {
  plan: string
  usage: {
    aiGenerations: { used: number; limit: number | null }
    analyses: { used: number; limit: number | null }
    interviews: { used: number; limit: number | null }
    jobTargets: { used: number; limit: number | null }
    resumes: { used: number; limit: number | null }
    storageMb: { used: number; limit: number }
  }
  billingEvents: PaymentRecord[]
}

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    icon: Zap,
    color: 'text-hydra-muted',
  },
  {
    key: 'hunter',
    name: 'Hunter',
    price: '$24/mo',
    icon: Crosshair,
    color: 'text-hydra-purple',
  },
  {
    key: 'beastmaster',
    name: 'Beastmaster',
    price: '$59/mo',
    icon: Crown,
    color: 'text-hydra-purple',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function BillingPage() {
  const setView = useAppStore((s) => s.setView)
  const [currentPlan, setCurrentPlan] = useState('free')
  const [usageStats, setUsageStats] = useState<UsageStat[]>(MOCK_USAGE)
  const [payments, setPayments] = useState<PaymentRecord[]>(MOCK_PAYMENTS)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/billing')
        if (res.ok) {
          const data: BillingResponse = await res.json()
          if (cancelled) return
          setCurrentPlan(data.plan)
          setUsageStats([
            {
              label: 'AI Generations',
              used: data.usage.aiGenerations.used,
              limit: data.usage.aiGenerations.limit ?? 'Unlimited',
              icon: Zap,
              color: 'text-hydra-purple',
              bgColor: 'bg-hydra-purple/15',
            },
            {
              label: 'Resume Analyses',
              used: data.usage.analyses.used,
              limit: data.usage.analyses.limit ?? 'Unlimited',
              icon: Target,
              color: 'text-hydra-cyan',
              bgColor: 'bg-hydra-cyan/15',
            },
            {
              label: 'Interview Sessions',
              used: data.usage.interviews.used,
              limit: data.usage.interviews.limit ?? 'Unlimited',
              icon: Swords,
              color: 'text-hydra-yellow',
              bgColor: 'bg-hydra-yellow/15',
            },
            {
              label: 'Storage Used',
              used: 0,
              limit: `${data.usage.storageMb.limit} MB`,
              icon: HardDrive,
              color: 'text-hydra-green',
              bgColor: 'bg-hydra-green/15',
            },
          ])
          if (data.billingEvents.length > 0) setPayments(data.billingEvents)
        }
      } catch {
        // fall back to mock data
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open portal')
      if (data.url) window.location.href = data.url
    } catch (err: unknown) {
      toast({
        title: 'Portal unavailable',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setPortalLoading(false)
    }
  }

  const getStatusBadge = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-hydra-green/10 text-hydra-green border-hydra-green/30 text-[10px] px-1.5">
            <Check className="w-2.5 h-2.5 mr-0.5" />
            Paid
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-hydra-yellow/10 text-hydra-yellow border-hydra-yellow/30 text-[10px] px-1.5">
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-hydra-red/10 text-hydra-red border-hydra-red/30 text-[10px] px-1.5">
            Failed
          </Badge>
        )
    }
  }

  const getProgressColor = (used: number, limit: number | string): string => {
    if (typeof limit === 'string') return 'bg-hydra-green'
    const pct = (used / limit) * 100
    if (pct >= 90) return 'bg-hydra-red'
    if (pct >= 70) return 'bg-hydra-yellow'
    return 'bg-hydra-purple'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-hydra-purple/10 border border-hydra-border">
          <CreditCard className="w-5 h-5 text-hydra-purple" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-hydra-muted">Manage your plan, usage, and payment history</p>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 max-w-3xl"
      >
        {/* Current Plan */}
        <motion.div variants={item}>
          <Card className="bg-hydra-surface-2 border-hydra-border card-hover">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-hydra-purple/15 flex items-center justify-center">
                    <Crosshair className="w-6 h-6 text-hydra-purple" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-lg font-bold text-foreground">
                        {currentPlan === 'beastmaster' ? 'Beastmaster' : currentPlan === 'hunter' ? 'Hunter' : 'Free'}
                      </h2>
                      <Badge className="bg-hydra-purple/20 text-hydra-purple border-hydra-purple/30 text-[10px]">
                        ACTIVE
                      </Badge>
                    </div>
                    <p className="text-sm text-hydra-muted">
                      {currentPlan === 'beastmaster'
                        ? '$59/month — Billed monthly'
                        : currentPlan === 'hunter'
                        ? '$24/month — Billed monthly'
                        : 'Free forever'}
                    </p>
                  </div>
                </div>

                {currentPlan !== 'beastmaster' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={openPortal}
                      variant="outline"
                      disabled={portalLoading}
                      className="border-hydra-border text-sm h-9"
                    >
                      {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                      Billing Portal
                    </Button>
                    <Button
                      onClick={() => setView('pricing')}
                      className="bg-hydra-purple hover:bg-hydra-purple/80 text-white text-sm h-9"
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1.5" />
                      Upgrade Plan
                    </Button>
                  </div>
                )}

                {currentPlan === 'beastmaster' && (
                  <Badge className="bg-hydra-purple/20 text-hydra-purple border-hydra-purple/30 px-3 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Max Plan
                  </Badge>
                )}
              </div>

              {/* Plan Comparison */}
              <div className="mt-6 pt-4 border-t border-hydra-border">
                <div className="flex flex-wrap gap-2">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.key}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                        currentPlan === plan.key
                          ? 'bg-hydra-purple/15 border-hydra-purple/30 text-hydra-purple'
                          : 'bg-hydra-surface border-hydra-border text-hydra-muted hover:border-hydra-purple/20'
                      }`}
                    >
                      <plan.icon className="w-3.5 h-3.5" />
                      {plan.name}
                      <span className="font-mono">{plan.price}</span>
                      {currentPlan === plan.key && (
                        <Badge className="text-[9px] px-1 py-0 bg-hydra-purple/30 text-hydra-purple border-0">
                          Current
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Usage Stats */}
        <motion.div variants={item}>
          <Card className="bg-hydra-surface-2 border-hydra-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Shield className="w-5 h-5 text-hydra-cyan" />
                <h2 className="text-base font-semibold text-foreground">Usage This Month</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {usageStats.map((stat) => {
                  const IconComp = stat.icon
                  const isStringLimit = typeof stat.limit === 'string'
                  const isUnlimited = stat.limit === 'Unlimited'
                  const percentage = isStringLimit ? (isUnlimited ? 0 : 24) : Math.round((stat.used / stat.limit) * 100)

                  return (
                    <div
                      key={stat.label}
                      className="p-4 rounded-lg bg-hydra-surface border border-hydra-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
                            <IconComp className={`w-4 h-4 ${stat.color}`} />
                          </div>
                          <span className="text-sm font-medium text-foreground">{stat.label}</span>
                        </div>
                        <span className="text-xs font-mono text-hydra-muted">
                          {stat.used} / {stat.limit}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <Progress
                          value={isStringLimit ? 0 : percentage}
                          className={`h-2 bg-hydra-surface-2 ${isUnlimited ? 'bg-hydra-surface-2' : ''}`}
                        />
                        <div className="flex justify-between text-[11px]">
                          <span className="text-hydra-muted">{isUnlimited ? 'Unlimited' : `${percentage}% used`}</span>
                          {!isUnlimited && percentage >= 80 && (
                            <span className="text-hydra-yellow">Running low</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment History */}
        <motion.div variants={item}>
          <Card className="bg-hydra-surface-2 border-hydra-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-hydra-yellow" />
                  <h2 className="text-base font-semibold text-foreground">Payment History</h2>
                </div>
              </div>

              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-4 gap-4 px-3 pb-2 text-xs font-medium text-hydra-muted uppercase tracking-wider border-b border-hydra-border">
                <span>Date</span>
                <span>Description</span>
                <span>Amount</span>
                <span className="text-right">Status</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-hydra-border">
                {MOCK_PAYMENTS.map((payment) => (
                  <div
                    key={payment.id}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 px-3 py-3 items-center hover:bg-hydra-surface/50 transition-colors rounded-lg"
                  >
                    <span className="text-sm text-hydra-muted sm:text-foreground">{payment.date}</span>
                    <span className="text-sm text-foreground">{payment.description}</span>
                    <span className="text-sm font-mono text-foreground">{payment.amount}</span>
                    <div className="flex justify-start sm:justify-end">
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
