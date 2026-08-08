'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import {
  Crosshair,
  Zap,
  FileText,
  Swords,
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
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

interface MetricCard {
  label: string
  value: number
  icon: React.ReactNode
  suffix?: string
  color: string
}

const metrics: MetricCard[] = [
  {
    label: 'Total Targets',
    value: 12,
    icon: <Crosshair className="h-5 w-5" />,
    color: 'text-hydra-purple',
  },
  {
    label: 'Active Payloads',
    value: 8,
    icon: <Zap className="h-5 w-5" />,
    color: 'text-hydra-cyan',
  },
  {
    label: 'Resume Score',
    value: 87,
    icon: <FileText className="h-5 w-5" />,
    suffix: '%',
    color: 'text-hydra-green',
  },
  {
    label: 'Interview Prep',
    value: 3,
    icon: <Swords className="h-5 w-5" />,
    color: 'text-hydra-yellow',
  },
]

interface ActivityEntry {
  id: string
  text: string
  time: string
}

const mockActivity: ActivityEntry[] = [
  { id: '1', text: 'Created resume — Senior PM', time: '2 min ago' },
  { id: '2', text: 'Generated payload for Acme Corp', time: '15 min ago' },
  { id: '3', text: 'Completed interview drill — Behavioral', time: '1 hr ago' },
  { id: '4', text: 'Added target: Stripe — Staff Engineer', time: '2 hrs ago' },
  { id: '5', text: 'Updated resume score to 87%', time: '3 hrs ago' },
]

export default function Dashboard() {
  const { setView } = useAppStore()
  const [counts, setCounts] = useState({ targets: 0, resumes: 0 })

  useEffect(() => {
    // Attempt to fetch real counts; fall back to demo data on error
    Promise.all([
      fetch('/api/job-targets').then((r) => r.json()).catch(() => null),
      fetch('/api/resumes').then((r) => r.json()).catch(() => null),
    ]).then(([targetsRes, resumesRes]) => {
      setCounts({
        targets: Array.isArray(targetsRes) ? targetsRes.length : 0,
        resumes: Array.isArray(resumesRes) ? resumesRes.length : 0,
      })
    })
  }, [])

  // Merge real counts with demo data for display
  const displayMetrics: MetricCard[] = metrics.map((m) => {
    if (m.label === 'Total Targets' && counts.targets > 0) {
      return { ...m, value: counts.targets }
    }
    if (m.label === 'Resume Score' && counts.resumes > 0) {
      return { ...m, value: counts.resumes }
    }
    return m
  })

  const quickActions = [
    { label: 'New Resume', view: 'resume-forge' as const, icon: <FileText className="h-4 w-4" /> },
    { label: 'Generate Payload', view: 'payload-forge' as const, icon: <Zap className="h-4 w-4" /> },
    { label: 'Start Interview', view: 'interview-drills' as const, icon: <Swords className="h-4 w-4" /> },
    { label: 'Add Target', view: 'kill-list' as const, icon: <Plus className="h-4 w-4" /> },
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
          Command Center
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your career warfare dashboard. Track targets, forge payloads, and dominate.
        </p>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {displayMetrics.map((metric) => (
          <motion.div key={metric.label} variants={item}>
            <Card className="card-hover">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hydra-surface-2 ${metric.color}`}>
                  {metric.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {metric.value}{metric.suffix}
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
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {mockActivity.map((entry) => (
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item}>
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
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
