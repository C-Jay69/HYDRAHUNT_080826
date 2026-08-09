'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  UserPlus,
  Activity,
  FileText,
  Zap,
  Target,
  Swords,
  Crown,
  Wallet,
  Map,
  BarChart3,
  RefreshCw,
  Shield,
  ShieldCheck,
  Loader2,
  Search,
  Wrench,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'

const PLANS = ['free', 'mission_pack', 'hunter', 'beastmaster'] as const

interface AdminStats {
  totalUsers: number
  newUsersMonth: number
  newUsersWeek: number
  activeSubs: number
  totalResumes: number
  totalPayloads: number
  totalAnalyses: number
  totalInterviews: number
  totalJobTargets: number
  totalCareerMaps: number
  totalActivity: number
  planDistribution: Record<string, number>
  revenueByCurrency: Record<string, number>
}

interface RecentUser {
  id: string
  email: string
  name: string | null
  createdAt: string
  plan?: string
}

interface RecentActivity {
  id: string
  action: string
  category: string
  createdAt: string
  user: { email: string; name: string | null } | null
}

const PLAN_COLORS: Record<string, string> = {
  free: 'text-hydra-muted bg-hydra-surface-2 border-hydra-border',
  mission_pack: 'text-hydra-yellow bg-hydra-yellow/10 border-hydra-yellow/30',
  hunter: 'text-hydra-purple bg-hydra-purple/10 border-hydra-purple/30',
  beastmaster: 'text-hydra-cyan bg-hydra-cyan/10 border-hydra-cyan/30',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(cents: number, currency: string) {
  const symbols: Record<string, string> = { usd: '$', gbp: '£', eur: '€', cad: 'C$', aud: 'A$' }
  const sym = symbols[currency] || '$'
  return `${sym}${(cents / 100).toFixed(2)}`
}

interface MetricCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color: string
  sub?: string
}

function MetricCard({ label, value, icon: Icon, color, sub }: MetricCardProps) {
  return (
    <Card className="bg-hydra-surface-2 border-hydra-border card-hover">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-hydra-muted truncate">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-[11px] text-hydra-muted truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function AdminPanel() {
  const { user } = useAppStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RecentUser[]>([])
  const [planDrafts, setPlanDrafts] = useState<Record<string, string>>({})
  const [savingPlan, setSavingPlan] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const showToast = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed (${res.status})`)
      }
      const data = await res.json()
      setStats(data.stats)
      setRecentUsers(data.recentUsers || [])
      setRecentActivity(data.recentActivity || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery.trim())}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Search failed')
      }
      const data = await res.json()
      setSearchResults(data.users || [])
      const drafts: Record<string, string> = {}
      for (const u of data.users || []) drafts[u.id] = u.plan
      setPlanDrafts(drafts)
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleSetPlan = async (userId: string) => {
    const plan = planDrafts[userId]
    if (!plan) return
    setSavingPlan(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      showToast('ok', `Plan updated to ${plan}`)
      setSearchResults((prev) => prev.map((u) => (u.id === userId ? { ...u, plan } : u)))
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingPlan(null)
    }
  }

  const revenue = stats?.revenueByCurrency || {}
  const revenueTotal = Object.entries(revenue)
    .map(([cur, cents]) => formatCurrency(cents, cur))
    .join(' + ')

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-hydra-purple" />
            <h2 className="text-lg font-bold text-foreground">Admin Control Center</h2>
          </div>
          <p className="text-sm text-hydra-muted">
            Platform analytics and maintenance — signed in as{' '}
            <span className="text-hydra-cyan font-medium">{user?.email}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="border-hydra-border text-hydra-muted hover:text-white shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="bg-hydra-red/5 border-hydra-red/30">
          <CardContent className="p-4 flex items-center gap-2 text-hydra-red text-sm">
            <Shield className="w-4 h-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {loading && !stats ? (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-hydra-purple animate-spin" />
          <p className="text-sm text-hydra-muted">Pulling platform intel...</p>
        </div>
      ) : stats ? (
        <>
          {/* Metrics */}
          <motion.div variants={item}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Total Users"
                value={stats.totalUsers}
                icon={Users}
                color="bg-hydra-purple/15 text-hydra-purple"
                sub={`${stats.newUsersMonth} this month`}
              />
              <MetricCard
                label="New Users (Week)"
                value={stats.newUsersWeek}
                icon={UserPlus}
                color="bg-hydra-cyan/15 text-hydra-cyan"
              />
              <MetricCard
                label="Active Subs"
                value={stats.activeSubs}
                icon={Crown}
                color="bg-hydra-yellow/15 text-hydra-yellow"
              />
              <MetricCard
                label="Lifetime Revenue"
                value={revenueTotal || '$0.00'}
                icon={Wallet}
                color="bg-hydra-green/15 text-hydra-green"
              />
              <MetricCard
                label="Resumes"
                value={stats.totalResumes}
                icon={FileText}
                color="bg-hydra-purple/15 text-hydra-purple"
              />
              <MetricCard
                label="AI Payloads"
                value={stats.totalPayloads}
                icon={Zap}
                color="bg-hydra-cyan/15 text-hydra-cyan"
              />
              <MetricCard
                label="Analyses"
                value={stats.totalAnalyses}
                icon={BarChart3}
                color="bg-hydra-green/15 text-hydra-green"
              />
              <MetricCard
                label="Interview Sessions"
                value={stats.totalInterviews}
                icon={Swords}
                color="bg-hydra-yellow/15 text-hydra-yellow"
              />
              <MetricCard
                label="Job Targets"
                value={stats.totalJobTargets}
                icon={Target}
                color="bg-hydra-red/15 text-hydra-red"
              />
              <MetricCard
                label="Career Maps"
                value={stats.totalCareerMaps}
                icon={Map}
                color="bg-hydra-purple/15 text-hydra-purple"
              />
              <MetricCard
                label="Activity Events"
                value={stats.totalActivity}
                icon={Activity}
                color="bg-hydra-cyan/15 text-hydra-cyan"
              />
            </div>
          </motion.div>

          {/* Plan distribution */}
          <motion.div variants={item}>
            <Card className="bg-hydra-surface-2 border-hydra-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Crown className="w-4 h-4 text-hydra-yellow" />
                  Active Plan Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.keys(stats.planDistribution).length === 0 && (
                  <p className="text-sm text-hydra-muted">No active subscriptions yet.</p>
                )}
                {Object.entries(stats.planDistribution).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('border', PLAN_COLORS[plan] || PLAN_COLORS.free)}>
                        {plan.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent users */}
          <motion.div variants={item}>
            <Card className="bg-hydra-surface-2 border-hydra-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-hydra-purple" />
                  Recent Signups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentUsers.length === 0 && (
                  <p className="text-sm text-hydra-muted">No users yet.</p>
                )}
                {recentUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-hydra-border bg-hydra-surface px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 shrink-0 rounded-full bg-hydra-purple/20 flex items-center justify-center text-xs font-semibold text-hydra-purple">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {u.name || 'Hunter'}
                          <span className="text-hydra-muted text-xs ml-1">{u.email}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-hydra-muted shrink-0">{formatDate(u.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent activity */}
          <motion.div variants={item}>
            <Card className="bg-hydra-surface-2 border-hydra-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-hydra-cyan" />
                  Latest Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentActivity.length === 0 && (
                  <p className="text-sm text-hydra-muted">No activity yet.</p>
                )}
                {recentActivity.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-hydra-border bg-hydra-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{a.action}</p>
                      <p className="text-xs text-hydra-muted truncate">
                        {a.user?.email || 'unknown'} · {a.category}
                      </p>
                    </div>
                    <span className="text-xs text-hydra-muted shrink-0">{formatDate(a.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Maintenance */}
          <motion.div variants={item}>
            <Card className="bg-hydra-surface-2 border-hydra-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-hydra-yellow" />
                  Maintenance — User Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search users by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-hydra-surface border-hydra-border text-white"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="bg-hydra-purple hover:bg-hydra-purple/80 text-white shrink-0"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {searchResults.length === 0 && searchQuery && (
                  <p className="text-sm text-hydra-muted">No users found.</p>
                )}

                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-hydra-border bg-hydra-surface px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">
                        {u.name || 'Hunter'}
                        <span className="text-hydra-muted text-xs ml-1">{u.email}</span>
                      </p>
                      <p className="text-xs text-hydra-muted">Joined {formatDate(u.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={planDrafts[u.id] || u.plan}
                        onChange={(e) => setPlanDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        className="h-9 rounded-lg border border-hydra-border bg-hydra-surface-2 text-sm text-foreground px-2"
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingPlan === u.id || (planDrafts[u.id] || u.plan) === u.plan}
                        onClick={() => handleSetPlan(u.id)}
                        className="border-hydra-border text-hydra-green hover:border-hydra-green/40 shrink-0"
                      >
                        {savingPlan === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {toast && (
            <div
              className={cn(
                'fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg',
                toast.type === 'ok'
                  ? 'bg-hydra-green/10 border-hydra-green/40 text-hydra-green'
                  : 'bg-hydra-red/10 border-hydra-red/40 text-hydra-red',
              )}
            >
              {toast.text}
            </div>
          )}
        </>
      ) : null}
    </motion.div>
  )
}
