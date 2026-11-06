'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useI18n, type Messages } from '@/lib/i18n'
import {
  ListChecks,
  Package,
  FileText,
  Mic,
  Plus,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { motion } from 'framer-motion'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

interface MetricCard {
  label: string
  value: number | string
  icon: React.ReactNode
  suffix?: string
  color: string
}

interface ActivityEntry {
  id: string
  text: string
  time: string
}

function getRelativeTime(dateStr: string, t: Messages['dashboard']): string {
  const d = new Date(dateStr)
  const diffMins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMins < 1) return t.justNow
  if (diffMins < 60) return t.minutesAgo.replace('{n}', String(diffMins))
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return t.hoursAgo.replace('{n}', String(diffHours))
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return t.daysAgo.replace('{n}', String(diffDays))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { setView } = useAppStore()
  const { m } = useI18n()
  const t = m.dashboard
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [counts, setCounts] = useState<{
    companies: number | string
    applications: number | string
    score: number | string
    sessions: number | string
  }>({
    companies: '—',
    applications: '—',
    score: '—',
    sessions: '—',
  })
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      const results = await Promise.all([
        fetch('/api/job-targets').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/resumes').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/analyses').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/interviews').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/activity-log').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ])
      if (cancelled) return

      const [targetsRes, resumesRes, analysesRes, interviewsRes, activityRes] = results
      const targets: Array<Record<string, unknown>> = Array.isArray(targetsRes) ? targetsRes : []
      const resumes: Array<Record<string, unknown>> = Array.isArray(resumesRes) ? resumesRes : []
      const analyses: Array<Record<string, unknown>> = Array.isArray(analysesRes) ? analysesRes : []
      const sessions: Array<Record<string, unknown>> = Array.isArray(interviewsRes?.sessions)
        ? interviewsRes.sessions
        : []
      const logs: Array<Record<string, unknown>> = Array.isArray(activityRes)
        ? activityRes
        : Array.isArray(activityRes?.logs)
          ? activityRes.logs
          : []

      const applied = targets.filter((t) =>
        ['payload_sent', 'interview', 'offer'].includes(String(t.status)),
      ).length

      const scores = analyses
        .map((a) => a.atsScore)
        .filter((s): s is number => typeof s === 'number')
      const averageScore = scores.length
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : null

      setCounts({
        companies: targets.length,
        applications: applied,
        score: averageScore ?? '—',
        sessions: sessions.length,
      })

      setActivity(
        logs.slice(0, 5).map((log) => ({
          id: String(log.id),
          text: String(log.action ?? ''),
          time: getRelativeTime(String(log.createdAt ?? new Date().toISOString()), t),
        })),
      )

      if (results.some((r) => r === null)) {
        setLoadError(t.loadError)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [t])

  const quickActions = [
    { label: t.newResume, view: 'resume-forge' as const, icon: <FileText className="h-4 w-4" /> },
    { label: t.buildKit, view: 'payload-forge' as const, icon: <Package className="h-4 w-4" /> },
    { label: t.startInterview, view: 'interview-drills' as const, icon: <Mic className="h-4 w-4" /> },
    { label: t.addCompany, view: 'kill-list' as const, icon: <Plus className="h-4 w-4" /> },
  ]

  const metrics: MetricCard[] = [
    {
      label: t.companies,
      value: counts.companies,
      icon: <ListChecks className="h-5 w-5" />,
      color: 'text-hydra-purple',
    },
    {
      label: t.applications,
      value: counts.applications,
      icon: <Package className="h-5 w-5" />,
      color: 'text-hydra-cyan',
    },
    {
      label: t.resumeScore,
      value: counts.score,
      icon: <FileText className="h-5 w-5" />,
      suffix: '%',
      color: 'text-hydra-green',
    },
    {
      label: t.interviewSessions,
      value: counts.sessions,
      icon: <Mic className="h-5 w-5" />,
      color: 'text-hydra-yellow',
    },
  ]

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Welcome banner */}
      <motion.div variants={item}>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.subtitle}
        </p>
      </motion.div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{loadError}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-red-300 hover:text-red-200 shrink-0"
          >
            {m.common.refresh}
          </Button>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <motion.div key={metric.label} variants={item}>
            <Card className="card-hover">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hydra-surface-2 ${metric.color}`}>
                  {metric.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {metric.value}
                    {typeof metric.value === 'number' ? metric.suffix : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Activity + Quick Actions row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Recent Activity */}
        <motion.div variants={item}>
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-hydra-purple" />
                {t.recentActivity}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded bg-hydra-surface-2" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.noActivity}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {activity.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-sm text-foreground/80">{entry.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {entry.time}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item}>
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-sm">{t.quickActions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="justify-between border-hydra-border bg-hydra-surface-2 hover:border-hydra-purple/30 hover:bg-hydra-purple/10 hover:text-hydra-purple"
                    onClick={() => setView(action.view)}
                  >
                    <span className="flex items-center gap-2">
                      {action.icon}
                      {action.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
