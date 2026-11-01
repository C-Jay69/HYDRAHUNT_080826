'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Package,
  Send,
  Mic,
  ScanSearch,
  CreditCard,
  ScrollText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

type ActivityCategory = 'all' | 'resume' | 'payload' | 'application' | 'interview' | 'analysis'

interface ActivityItem {
  id: string
  category: 'resume' | 'payload' | 'application' | 'interview' | 'analysis' | 'billing'
  action: string
  details: string
  timestamp: string
}

const CATEGORY_CONFIG: Record<string, { icon: typeof FileText; color: string; bgColor: string; label: string }> = {
  resume: { icon: FileText, color: 'text-hydra-purple', bgColor: 'bg-hydra-purple/10 border-hydra-purple/30', label: 'Resume' },
  payload: { icon: Package, color: 'text-hydra-yellow', bgColor: 'bg-hydra-yellow/10 border-hydra-yellow/30', label: 'Kit' },
  application: { icon: Send, color: 'text-hydra-cyan', bgColor: 'bg-hydra-cyan/10 border-hydra-cyan/30', label: 'Application' },
  interview: { icon: Mic, color: 'text-hydra-orange', bgColor: 'bg-hydra-orange/10 border-hydra-orange/30', label: 'Interview' },
  analysis: { icon: ScanSearch, color: 'text-hydra-green', bgColor: 'bg-hydra-green/10 border-hydra-green/30', label: 'Analysis' },
  billing: { icon: CreditCard, color: 'text-hydra-red', bgColor: 'bg-hydra-red/10 border-hydra-red/30', label: 'Billing' },
}

const FILTER_TABS: { key: ActivityCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'resume', label: 'Resume' },
  { key: 'payload', label: 'Kit' },
  { key: 'application', label: 'Application' },
  { key: 'interview', label: 'Interview' },
  { key: 'analysis', label: 'Analysis' },
]

function getRelativeTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
}

export default function MissionLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<ActivityCategory>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/activity-log')
      if (res.ok) {
        const data = await res.json()
        const logs: Array<Record<string, unknown>> = Array.isArray(data)
          ? data
          : data.logs || data.activities || []
        setActivities(
          logs.map((log) => ({
            id: String(log.id),
            category: (log.category as ActivityItem['category']) || 'resume',
            action: String(log.action ?? ''),
            details: log.details ? String(log.details) : '',
            timestamp: String(log.createdAt ?? log.timestamp ?? new Date().toISOString()),
          })),
        )
      } else {
        // No invented fallback data — surface the failure and show the honest empty state.
        setActivities([])
        setError(`Couldn't load your activity feed (HTTP ${res.status}).`)
      }
    } catch {
      setActivities([])
      setError("Couldn't reach the server to load your activity feed.")
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activeFilter === 'all'
    ? activities
    : activities.filter((a) => a.category === activeFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-hydra-cyan/10 border border-hydra-border-cyan">
          <ScrollText className="w-5 h-5 text-hydra-cyan" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Trail</h1>
          <p className="text-sm text-hydra-muted">Every step in your search, in one place</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === tab.key
                ? 'bg-hydra-purple/20 text-hydra-purple border border-hydra-purple/30'
                : 'text-hydra-muted hover:text-foreground hover:bg-hydra-surface-2 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-hydra-surface-2 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchActivities()}
            className="text-red-300 hover:text-red-200 shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && filteredActivities.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-16 h-16 rounded-full bg-hydra-purple/10 flex items-center justify-center mb-4">
            <ScrollText className="w-8 h-8 text-hydra-purple/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Activity Yet</h3>
          <p className="text-sm text-hydra-muted text-center max-w-md">
            Your activity feed fills up as you use the tools.
          </p>
        </motion.div>
      )}

      {!loading && filteredActivities.length > 0 && (
        <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative pr-4"
          >
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-hydra-border" />

            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {filteredActivities.map((activity) => {
                  const config = CATEGORY_CONFIG[activity.category]
                  const IconComp = config?.icon || FileText
                  const isExpanded = expandedId === activity.id

                  return (
                    <motion.div
                      key={activity.id}
                      variants={item}
                      layout
                      className="relative pl-10"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full ${config?.color.replace('text-', 'bg-')}`} />

                      <Card
                        className="bg-hydra-surface-2 border-hydra-border card-hover cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            {/* Category Icon */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${config?.bgColor || 'bg-hydra-surface'}`}>
                              <IconComp className={`w-4 h-4 ${config?.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-0.5">
                                <p className="text-sm font-medium text-foreground">{activity.action}</p>
                                <span className="text-[11px] text-hydra-muted whitespace-nowrap shrink-0 mt-0.5">
                                  {getRelativeTime(activity.timestamp)}
                                </span>
                              </div>

                              {/* Category Badge */}
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 px-1.5 ${config?.bgColor} ${config?.color} border`}
                              >
                                {config?.label}
                              </Badge>

                              {/* Expandable Details */}
                              <AnimatePresence>
                                {isExpanded && activity.details && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <p className="text-xs text-hydra-muted mt-2 leading-relaxed">
                                      {activity.details}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Expand Icon */}
                            {activity.details && (
                              <div className="shrink-0 mt-1">
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-hydra-muted" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-hydra-muted" />
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </ScrollArea>
      )}
    </div>
  )
}
