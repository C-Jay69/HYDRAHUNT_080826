'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Plus,
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  Shield,
  FileText,
  Crosshair,
  ListChecks,
  Loader2,
  Clock,
  Sparkles,
  ChevronRight,
  Brain,
  Search,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/app-store'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResumeOption {
  id: string
  title: string
  atsScore: number | null
  isDefault: boolean
}

interface Analysis {
  id: string
  resumeId: string
  resumeTitle?: string
  targetRole: string | null
  status: 'processing' | 'completed' | 'failed'
  atsScore: number | null
  strengths: string[] | null
  weaknesses: string[] | null
  missingKeywords: string[] | null
  rewrittenBullets: Array<{ original: string; rewritten: string }> | null
  roleFitAssessment: string | null
  actionChecklist: string[] | null
  createdAt: string
  updatedAt: string
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

const detailContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const detailItem = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } },
}

// ─── Progress Steps ──────────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { label: 'Extracting text...', icon: FileText },
  { label: 'Analyzing content...', icon: Brain },
  { label: 'Running ATS simulation...', icon: Search },
  { label: 'Generating recommendations...', icon: Sparkles },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'text-hydra-green'
  if (score >= 60) return 'text-hydra-yellow'
  return 'text-hydra-red'
}

function scoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default'
  if (score >= 60) return 'secondary'
  return 'destructive'
}

function scoreBorderColor(score: number): string {
  if (score >= 80) return 'border-hydra-green'
  if (score >= 60) return 'border-hydra-yellow'
  return 'border-hydra-red'
}

function scoreGlowColor(score: number): string {
  if (score >= 80) return 'shadow-[0_0_30px_rgba(34,197,94,0.3)]'
  if (score >= 60) return 'shadow-[0_0_30px_rgba(234,179,8,0.3)]'
  return 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Circular Gauge ──────────────────────────────────────────────────────────

function CircularGauge({ score }: { score: number }) {
  const radius = 70
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width={180} height={180} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={90}
          cy={90}
          r={radius}
          fill="none"
          stroke="rgba(177,84,248,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={90}
          cy={90}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className={`text-5xl font-bold ${scoreColor(score)}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-hydra-muted mt-1">out of 100</span>
      </div>
    </div>
  )
}

// ─── Processing View ─────────────────────────────────────────────────────────

function ProcessingView({ analysis }: { analysis: Analysis }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepDuration = 2500
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = Math.min(prev + 1, PROGRESS_STEPS.length - 1)
        return next
      })
      setProgress((prev) => {
        const next = Math.min(prev + 25, 100)
        return next
      })
    }, stepDuration)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Animated circular indicator */}
      <div className="relative flex items-center justify-center">
        <svg width={120} height={120} className="-rotate-90">
          <circle
            cx={60}
            cy={60}
            r={50}
            fill="none"
            stroke="rgba(177,84,248,0.1)"
            strokeWidth={6}
          />
          <motion.circle
            cx={60}
            cy={60}
            r={50}
            fill="none"
            stroke="#b154f8"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 50}
            animate={{
              strokeDashoffset:
                2 * Math.PI * 50 - (progress / 100) * 2 * Math.PI * 50,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
        <motion.div
          className="absolute"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-8 w-8 text-hydra-purple" />
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">
          Analyzing Resume...
        </h3>
        <p className="text-sm text-hydra-muted">
          Target Role: {analysis.targetRole || 'General'}
        </p>
      </div>

      {/* Progress steps */}
      <div className="w-full max-w-md space-y-3">
        {PROGRESS_STEPS.map((step, idx) => {
          const StepIcon = step.icon
          const isActive = idx === currentStep
          const isDone = idx < currentStep
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.3, duration: 0.4 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-hydra-purple/10 border border-hydra-purple/30'
                  : isDone
                    ? 'bg-hydra-green/5 border border-hydra-green/20'
                    : 'bg-hydra-surface-2/50 border border-hydra-border'
              }`}
            >
              {isDone ? (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-hydra-green/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-hydra-green" />
                </div>
              ) : isActive ? (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-hydra-purple/20 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <StepIcon className="w-4 h-4 text-hydra-purple" />
                  </motion.div>
                </div>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-hydra-surface-2 flex items-center justify-center">
                  <StepIcon className="w-4 h-4 text-hydra-muted" />
                </div>
              )}
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-hydra-purple'
                    : isDone
                      ? 'text-hydra-green'
                      : 'text-hydra-muted'
                }`}
              >
                {step.label}
              </span>
              {isActive && (
                <Loader2 className="w-4 h-4 text-hydra-purple animate-spin ml-auto" />
              )}
              {isDone && (
                <Check className="w-4 h-4 text-hydra-green ml-auto" />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="h-2 bg-hydra-surface-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-hydra-purple to-hydra-cyan rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-hydra-muted mt-2 text-center">
          {progress}% complete
        </p>
      </div>
    </div>
  )
}

// ─── Detail View ─────────────────────────────────────────────────────────────

function DetailView({
  analysis,
  onBack,
}: {
  analysis: Analysis
  onBack: () => void
}) {
  const { setSelectedResume } = useAppStore()
  const strengths = analysis.strengths || []
  const weaknesses = analysis.weaknesses || []
  const missingKeywords = analysis.missingKeywords || []
  const rewrittenBullets = analysis.rewrittenBullets || []
  const roleFitAssessment = analysis.roleFitAssessment || ''
  const actionChecklist = analysis.actionChecklist || []
  const score = analysis.atsScore ?? 0

  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const handleApplyImprovements = async () => {
    setApplying(true)
    setApplyError(null)
    try {
      const improvements: string[] = []
      for (const bullet of rewrittenBullets) {
        improvements.push(
          `Rewrite the bullet "${bullet.original}" to: "${bullet.rewritten}"`,
        )
      }
      for (const kw of missingKeywords) {
        improvements.push(
          `Incorporate the keyword "${kw}" naturally where it is truthful based on existing experience.`,
        )
      }
      for (const action of actionChecklist) {
        improvements.push(action)
      }

      if (improvements.length === 0) {
        setApplyError('No improvements were generated for this analysis.')
        return
      }

      const res = await fetch('/api/ai/apply-improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: analysis.resumeId, improvements }),
      })
      const data = await res.json()
      if (!res.ok) {
        setApplyError(data?.error || 'Failed to apply improvements.')
        return
      }
      setApplied(true)
    } catch {
      setApplyError('Something went wrong. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  if (analysis.status === 'processing') {
    return (
      <div>
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-hydra-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Analysis List
        </Button>
        <ProcessingView analysis={analysis} />
      </div>
    )
  }

  if (analysis.status === 'failed') {
    return (
      <div>
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-hydra-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Analysis List
        </Button>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-hydra-red/10 flex items-center justify-center">
            <X className="w-8 h-8 text-hydra-red" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Analysis Failed
          </h3>
          <p className="text-sm text-hydra-muted max-w-md text-center">
            Something went wrong during the analysis. Please try again.
          </p>
          <Button variant="outline" onClick={onBack}>
            Back to List
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button + header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-hydra-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground">
            {analysis.resumeTitle || 'Resume'} Analysis
          </h2>
          <p className="text-sm text-hydra-muted">
            Target: {analysis.targetRole || 'General'} &middot;{' '}
            {formatDate(analysis.createdAt)}
          </p>
        </div>
      </div>

      {/* ATS Score Gauge */}
      <motion.div
        className={`flex justify-center mb-10 p-6 rounded-xl bg-hydra-surface border ${scoreBorderColor(score)} ${scoreGlowColor(score)}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center">
          <CircularGauge score={score} />
          <p className={`text-lg font-semibold mt-2 ${scoreColor(score)}`}>
            {score >= 80
              ? 'Excellent Match'
              : score >= 60
                ? 'Good Potential'
                : 'Needs Improvement'}
          </p>
        </div>
      </motion.div>

      {/* Analysis Sections Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={detailContainer}
        initial="hidden"
        animate="show"
      >
        {/* STRENGTHS */}
        <motion.div variants={detailItem}>
          <Card className="bg-hydra-green/5 border-hydra-green/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-hydra-green">
                <div className="w-8 h-8 rounded-lg bg-hydra-green/10 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {strengths.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-foreground/90"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                  >
                    <Check className="w-4 h-4 text-hydra-green flex-shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </motion.li>
                ))}
                {strengths.length === 0 && (
                  <p className="text-sm text-hydra-muted">No strengths identified</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* WEAKNESSES */}
        <motion.div variants={detailItem}>
          <Card className="bg-hydra-red/5 border-hydra-red/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-hydra-red">
                <div className="w-8 h-8 rounded-lg bg-hydra-red/10 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </div>
                Weaknesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {weaknesses.map((w, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-foreground/90"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                  >
                    <X className="w-4 h-4 text-hydra-red flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </motion.li>
                ))}
                {weaknesses.length === 0 && (
                  <p className="text-sm text-hydra-muted">No weaknesses identified</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* MISSING KEYWORDS */}
        <motion.div variants={detailItem}>
          <Card className="bg-hydra-yellow/5 border-hydra-yellow/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-hydra-yellow">
                <div className="w-8 h-8 rounded-lg bg-hydra-yellow/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                Missing Keywords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {missingKeywords.map((kw, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                  >
                    <Badge
                      variant="outline"
                      className="border-hydra-yellow/30 text-hydra-yellow bg-hydra-yellow/5 hover:bg-hydra-yellow/10"
                    >
                      {kw}
                    </Badge>
                  </motion.div>
                ))}
                {missingKeywords.length === 0 && (
                  <p className="text-sm text-hydra-muted">
                    No missing keywords found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* REWRITTEN BULLETS */}
        <motion.div variants={detailItem}>
          <Card className="bg-purple-500/5 border-purple-500/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                Rewritten Bullets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {rewrittenBullets.map((bullet, i) => (
                  <motion.div
                    key={i}
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <div className="text-xs font-medium text-hydra-muted uppercase tracking-wider">
                      Bullet {i + 1}
                    </div>
                    <div className="rounded-lg bg-hydra-red/5 border border-hydra-red/10 p-3">
                      <div className="flex items-start gap-2">
                        <X className="w-3.5 h-3.5 text-hydra-red flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground/70 line-through decoration-hydra-red/50">
                          {bullet.original}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-hydra-green/5 border border-hydra-green/10 p-3">
                      <div className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-hydra-green flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground/90">
                          {bullet.rewritten}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {rewrittenBullets.length === 0 && (
                  <p className="text-sm text-hydra-muted">
                    No bullet rewrites available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ROLE FIT ASSESSMENT — full width */}
        <motion.div variants={detailItem} className="md:col-span-2">
          <Card className="bg-cyan-500/5 border-cyan-500/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-hydra-cyan">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Crosshair className="w-4 h-4" />
                </div>
                Role Fit Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {roleFitAssessment || 'No assessment available.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ACTION CHECKLIST — full width */}
        <motion.div variants={detailItem} className="md:col-span-2">
          <Card className="bg-hydra-surface-2 border-hydra-border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <div className="w-8 h-8 rounded-lg bg-hydra-purple/10 flex items-center justify-center">
                  <ListChecks className="w-4 h-4 text-hydra-purple" />
                </div>
                Action Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {actionChecklist.map((action, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-3 text-sm text-foreground/90"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded border border-hydra-purple/40 bg-hydra-purple/5 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-sm bg-hydra-purple/60" />
                    </div>
                    <span>{action}</span>
                  </motion.li>
                ))}
                {actionChecklist.length === 0 && (
                  <p className="text-sm text-hydra-muted">
                    No action items available
                  </p>
                )}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Apply improvements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-hydra-purple/20 bg-hydra-purple/5 p-6 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-hydra-purple/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-hydra-purple" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Want us to apply these improvements?
        </h3>
        <p className="text-sm text-hydra-muted max-w-md">
          Let the AI rewrite this resume to implement the rewritten bullets,
          missing keywords, and action items above. A backup snapshot is saved
          before any changes are made.
        </p>

        {applyError && (
          <p className="text-sm text-hydra-red">{applyError}</p>
        )}

        {applied ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-hydra-green">
              <Check className="w-4 h-4" />
              Improvements applied — a snapshot was saved first.
            </div>
            <Button
              onClick={() => {
                setSelectedResume(analysis.resumeId)
              }}
              className="bg-hydra-purple hover:bg-hydra-purple/80 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Open Improved Resume
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleApplyImprovements}
            disabled={applying}
            className="bg-hydra-purple hover:bg-hydra-purple/80 text-white"
          >
            {applying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {applying ? 'Rewriting resume...' : 'Apply AI Improvements'}
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StrikeAnalysis() {
  const { selectedAnalysisId, setSelectedAnalysis } = useAppStore()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [resumes, setResumes] = useState<ResumeOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)
  const selectedAnalysis = analyses.find((a) => a.id === selectedAnalysisId)

  // Fetch resumes for dialog
  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch('/api/resumes')
      if (res.ok) {
        const data = await res.json()
        setResumes(data.map((r: { id: string; title: string; atsScore: number | null; isDefault: boolean }) => ({
          id: r.id,
          title: r.title,
          atsScore: r.atsScore,
          isDefault: r.isDefault,
        })))
      }
    } catch {
      // silent fail
    }
  }, [])

  // Fetch analyses
  const fetchAnalyses = useCallback(async () => {
    setLoadingAnalyses(true)
    try {
      const res = await fetch('/api/analyses')
      if (res.ok) {
        const data = await res.json()
        setAnalyses(data)
      }
    } catch {
      // silent fail
    } finally {
      setLoadingAnalyses(false)
    }
  }, [])

  useEffect(() => {
    fetchResumes()
    fetchAnalyses()
  }, [fetchResumes, fetchAnalyses])

  // Poll for processing analyses
  useEffect(() => {
    const hasProcessing = analyses.some((a) => a.status === 'processing')
    if (!hasProcessing) return
    const interval = setInterval(() => {
      fetchAnalyses()
    }, 4000)
    return () => clearInterval(interval)
  }, [analyses, fetchAnalyses])

  // Submit new analysis
  const handleSubmit = async () => {
    if (!selectedResumeId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ai/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          targetRole: targetRole || undefined,
        }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setSelectedResumeId('')
        setTargetRole('')
        await fetchAnalyses()
      }
    } catch {
      // silent fail
    } finally {
      setSubmitting(false)
    }
  }

  // Open detail view
  const openDetail = (id: string) => {
    setSelectedAnalysis(id)
  }

  // Back to list
  const goBack = () => {
    setSelectedAnalysis(null)
  }

  // ─── Detail View ─────────────────────────────────────────────────────────
  if (selectedAnalysis) {
    return <DetailView analysis={selectedAnalysis} onBack={goBack} />
  }

  // ─── List View ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-hydra-purple/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-hydra-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Strike Analysis
            </h1>
            <p className="text-sm text-hydra-muted">
              AI-powered resume analysis and ATS optimization
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-hydra-purple hover:bg-hydra-purple/80 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-hydra-surface border-hydra-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-hydra-purple" />
                New Strike Analysis
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label className="text-foreground text-sm font-medium">
                  Select Resume
                </Label>
                <Select
                  value={selectedResumeId}
                  onValueChange={setSelectedResumeId}
                >
                  <SelectTrigger className="bg-hydra-surface-2 border-hydra-border text-foreground">
                    <SelectValue placeholder="Choose a resume..." />
                  </SelectTrigger>
                  <SelectContent className="bg-hydra-surface-2 border-hydra-border">
                    {resumes.map((r) => (
                      <SelectItem
                        key={r.id}
                        value={r.id}
                        className="text-foreground focus:bg-hydra-purple/10 focus:text-foreground"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-hydra-muted" />
                          <span>{r.title}</span>
                          {r.isDefault && (
                            <Badge
                              variant="outline"
                              className="border-hydra-cyan/30 text-hydra-cyan text-[10px] px-1.5 py-0"
                            >
                              Default
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm font-medium">
                  Target Role
                </Label>
                <Input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Product Manager"
                  className="bg-hydra-surface-2 border-hydra-border text-foreground placeholder:text-hydra-muted/60"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!selectedResumeId || submitting}
                className="w-full bg-hydra-purple hover:bg-hydra-purple/80 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Analysis List */}
      {loadingAnalyses ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="bg-hydra-surface-2 border-hydra-border animate-pulse"
            >
              <CardContent className="p-6 space-y-4">
                <div className="h-5 w-3/4 bg-hydra-surface rounded" />
                <div className="h-4 w-1/2 bg-hydra-surface rounded" />
                <div className="h-4 w-1/3 bg-hydra-surface rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-20 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 rounded-full bg-hydra-purple/10 flex items-center justify-center">
            <Target className="w-8 h-8 text-hydra-purple/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No Analyses Yet
          </h3>
          <p className="text-sm text-hydra-muted text-center max-w-sm">
            Run your first strike analysis to get AI-powered feedback on your
            resume&apos;s ATS compatibility.
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {analyses.map((analysis) => {
            const isCompleted = analysis.status === 'completed'
            const isFailed = analysis.status === 'failed'
            const isProcessing = analysis.status === 'processing'

            return (
              <motion.div key={analysis.id} variants={item}>
                <Card
                  className={`bg-hydra-surface-2 border-hydra-border card-hover cursor-pointer ${
                    isProcessing ? 'pointer-events-none' : ''
                  }`}
                  onClick={() => {
                    if (isCompleted) openDetail(analysis.id)
                  }}
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Resume title + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-hydra-purple flex-shrink-0" />
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {analysis.resumeTitle || 'Resume'}
                        </h3>
                      </div>
                      {isProcessing ? (
                        <Badge
                          variant="secondary"
                          className="bg-hydra-purple/10 text-hydra-purple border-hydra-purple/20 flex-shrink-0"
                        >
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
                      ) : isCompleted ? (
                        <Badge
                          variant="secondary"
                          className="bg-hydra-green/10 text-hydra-green border-hydra-green/20 flex-shrink-0"
                        >
                          Completed
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="flex-shrink-0"
                        >
                          Failed
                        </Badge>
                      )}
                    </div>

                    {/* Target role */}
                    <div className="flex items-center gap-2 text-sm text-hydra-muted">
                      <Crosshair className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {analysis.targetRole || 'General Analysis'}
                      </span>
                    </div>

                    {/* ATS Score */}
                    {analysis.atsScore != null && isCompleted && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-hydra-muted uppercase tracking-wider font-medium">
                          ATS Score
                        </span>
                        <Badge variant={scoreBadgeVariant(analysis.atsScore)}>
                          {analysis.atsScore}/100
                        </Badge>
                      </div>
                    )}

                    {/* Date + arrow */}
                    <div className="flex items-center justify-between pt-1 border-t border-hydra-border">
                      <div className="flex items-center gap-1.5 text-xs text-hydra-muted">
                        <Clock className="w-3 h-3" />
                        {formatDate(analysis.createdAt)}
                      </div>
                      {isCompleted && (
                        <ChevronRight className="w-4 h-4 text-hydra-muted" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
