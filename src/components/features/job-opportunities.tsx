'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Zap,
  ExternalLink,
  MapPin,
  Briefcase,
  Clock,
  Send,
  Check,
  Calendar,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'

type JobSource = 'linkedin' | 'weworkremotely' | 'remoteok' | 'remotive' | 'dice'

interface JobOpportunity {
  id: string
  externalId: string | null
  title: string
  company: string | null
  companyUrl: string | null
  location: string | null
  jobUrl: string | null
  postedDate: string | null
  postedLabel: string | null
  salary: string | null
  companyLogo: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface Resume {
  id: string
  title: string
  isDefault: boolean
}

interface ScrapeEvent {
  type: 'progress' | 'page' | 'jobs' | 'done' | 'error'
  source?: JobSource
  page?: number
  pages?: number
  found?: number
  totalFound?: number
  jobs?: JobOpportunity[]
  requestCount?: number
  error?: string
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function JobCard({
  job,
  onApply,
}: {
  job: JobOpportunity
  onApply: (job: JobOpportunity) => void
}) {
  const statusColor = {
    new: 'border-hydra-cyan/30 bg-hydra-surface',
    applied: 'border-hydra-green/30 bg-hydra-surface',
    interview: 'border-hydra-yellow/30 bg-hydra-surface',
    offer: 'border-hydra-emerald-400/30 bg-hydra-surface',
    rejected: 'border-hydra-red/30 bg-hydra-surface',
  }[job.status as keyof typeof statusColor] || 'border-hydra-border bg-hydra-surface'

  return (
    <motion.div variants={item} onClick={() => onApply(job)}>
      <Card
        className={cn(
          'card-hover border cursor-pointer bg-hydra-surface-2/50',
          statusColor,
        )}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company || 'logo'}
                className="h-10 w-10 shrink-0 rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-hydra-purple/10 text-hydra-purple">
                <Briefcase className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground line-clamp-1">
                {job.title}
              </p>
              <p className="text-xs text-muted-foreground/80 truncate">
                {job.company || 'Unknown company'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/70">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </span>
                )}
                {job.postedLabel && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {job.postedLabel}
                  </span>
                )}
                {job.salary && (
                  <span className="flex items-center gap-1 text-hydra-green">
                    <span>●</span>
                    {job.salary}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge
              variant="outline"
              className="text-[10px] capitalize"
            >
              {job.status}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-hydra-purple hover:bg-hydra-purple/10"
              onClick={(e) => {
                e.stopPropagation()
                onApply(job)
              }}
            >
              <Send className="h-3 w-3 mr-1" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function JobOpportunities() {
  const { setView } = useAppStore()
  const [jobs, setJobs] = useState<JobOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [scrapeKeyword, setScrapeKeyword] = useState('software engineer')
  const [scrapeLocation, setScrapeLocation] = useState('')
  const [scrapePages, setScrapePages] = useState(2)
  const [scrapeSource, setScrapeSource] = useState<JobSource>('linkedin')
  const [scraping, setScraping] = useState(false)
  const [scrapeProgress, setScrapeProgress] = useState<{
    page: number
    pages: number
    found: number
    totalFound: number
    source?: JobSource
    error?: string
  } | null>(null)
  const [previewJob, setPreviewJob] = useState<JobOpportunity | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [autoApply, setAutoApply] = useState(true)
  const [applyNotes, setApplyNotes] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{
    success: boolean
    dryRun: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/resumes')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Resume[] | { resumes?: Resume[] }) => {
        const list: Resume[] = Array.isArray(data) ? data : data?.resumes ?? []
        setResumes(list)
        const def = list.find((r) => r.isDefault) ?? list[0]
        if (def) setSelectedResumeId(def.id)
      })
      .catch(() => setResumes([]))
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = useCallback(() => {
    setLoading(true)
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((data) => {
        setJobs(Array.isArray(data) ? data : [])
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [])

  const startScrape = useCallback(() => {
    if (!scrapeKeyword.trim() || scraping) return

    setScraping(true)
    setScrapeProgress(null)
    setApplyResult(null)

     const params = new URLSearchParams({
      keywords: scrapeKeyword.trim(),
      pages: String(scrapePages),
      source: scrapeSource,
    })
    if (scrapeLocation.trim()) params.set('location', scrapeLocation.trim())

    const evt = new EventSource(`/api/jobs/scrape?${params.toString()}`)

    evt.onmessage = (e) => {
      const payload: ScrapeEvent = JSON.parse(e.data)

      if (payload.type === 'error') {
        setScrapeProgress((prev) => ({
          page: prev?.page ?? 0,
          pages: prev?.pages ?? 0,
          found: prev?.found ?? 0,
          totalFound: prev?.totalFound ?? 0,
          error: payload.error || 'Scrape failed',
        }))
        setScraping(false)
        evt.close()
        return
      }

      if (payload.type === 'done') {
        setScrapeProgress({
          page: payload.page ?? 0,
          pages: payload.pages ?? 0,
          source: (payload.source as JobSource) || scrapeSource,
          found: payload.found ?? 0,
          totalFound: payload.totalFound ?? 0,
        })
        setScraping(false)
        evt.close()
        // Refresh the job list from DB so the new records render.
        fetchJobs()
        return
      }

      if (
        payload.type === 'progress' ||
        payload.type === 'page' ||
        payload.type === 'jobs'
      ) {
        setScrapeProgress({
          page: payload.page ?? 0,
          pages: payload.pages ?? 0,
          found: payload.found ?? 0,
          totalFound: payload.totalFound ?? 0,
        })
      }
    }

    evt.onerror = () => {
      setScraping(false)
      evt.close()
      fetchJobs()
    }
  }, [scrapeKeyword, scrapeLocation, scrapePages, scrapeSource, scraping, fetchJobs])

  const handleApply = useCallback((job: JobOpportunity) => {
    setPreviewJob(job)
    setApplyNotes('')
    setAutoApply(true)
    setApplyResult(null)
  }, [])

  const confirmApply = useCallback(async () => {
    if (!previewJob) return
    if (!selectedResumeId) {
      setApplyResult({
        success: false,
        dryRun: false,
        message: 'Please select a resume first.',
      })
      return
    }
    setApplying(true)
    setApplyResult(null)
    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: previewJob.id,
          resumeId: selectedResumeId,
          autoApply,
          notes: applyNotes || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setApplyResult({
          success: true,
          dryRun: Boolean(data.dryRun),
          message: data.dryRun
            ? 'Application queued (dry run). No email sent. Enable AUTO_APPLY_DRY_RUN=false to dispatch.'
            : 'Application sent. Check your Resend/Sender dashboard for delivery.',
        })
        setJobs((prev) =>
          prev.map((j) =>
            j.id === previewJob.id ? { ...j, status: 'applied' } : j,
          ),
        )
      } else {
        setApplyResult({
          success: false,
          dryRun: false,
          message: data.error || 'Apply failed',
        })
      }
    } catch {
      setApplyResult({
        success: false,
        dryRun: false,
        message: 'Network error while applying.',
      })
    } finally {
      setApplying(false)
    }
  }, [previewJob, selectedResumeId, autoApply, applyNotes])

  const clearScrape = useCallback(() => {
    setScrapeProgress(null)
  }, [])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          <Search className="inline-block size-6 mr-2 text-hydra-cyan" />
          Job Opportunities
        </h1>
        <p className="text-hydra-muted mt-1 text-sm">
          Harvest listings from ChocoData (LinkedIn), then preview before
          one-click auto-apply.
        </p>
      </motion.div>

      {/* Scrape Controls */}
      <motion.div variants={item}>
        <Card className="bg-hydra-surface-2 border-hydra-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="size-4 text-hydra-purple" />
              Scrape Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Keywords</Label>
                <Input
                  placeholder="software engineer"
                  value={scrapeKeyword}
                  onChange={(e) => setScrapeKeyword(e.target.value)}
                  className="border-hydra-border bg-hydra-surface"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Location (opt)</Label>
                <Input
                  placeholder="New York, NY"
                  value={scrapeLocation}
                  onChange={(e) => setScrapeLocation(e.target.value)}
                  className="border-hydra-border bg-hydra-surface"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pages</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={scrapePages}
                  onChange={(e) => setScrapePages(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                  className="border-hydra-border bg-hydra-surface"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Source</Label>
                <Select value={scrapeSource} onValueChange={(v) => setScrapeSource(v as JobSource)}>
                  <SelectTrigger className="border-hydra-border bg-hydra-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-hydra-border bg-hydra-surface">
                    <SelectItem value="linkedin">LinkedIn (ChocoData)</SelectItem>
                    <SelectItem value="indeed">Indeed (JobSpy)</SelectItem>
                    <SelectItem value="glassdoor">Glassdoor (JobSpy)</SelectItem>
                    <SelectItem value="zip_recruiter">ZipRecruiter (JobSpy)</SelectItem>
                    <SelectItem value="google">Google Jobs (JobSpy)</SelectItem>
                    <SelectItem value="weworkremotely">We Work Remotely</SelectItem>
                    <SelectItem value="remoteok">RemoteOK</SelectItem>
                    <SelectItem value="remotive">Remotive</SelectItem>
                    <SelectItem value="dice">Dice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={startScrape}
                  disabled={scraping || !scrapeKeyword.trim()}
                  className="w-full bg-hydra-cyan hover:bg-hydra-cyan/90"
                >
                  {scraping ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Scrape Jobs
                    </>
                  )}
                </Button>
                {scraping && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setScraping(false)
                    }}
                    className="h-9 px-2"
                  >
                    <AlertCircle className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Scrape Progress */}
            {scrapeProgress && (
              <div className="flex items-center justify-between rounded-md border border-hydra-border bg-hydra-surface p-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <RefreshCw
                    className={cn('h-4 w-4 text-hydra-cyan', scraping && 'animate-spin')}
                  />
                  <span>
                    Page {scrapeProgress.page}/{scrapeProgress.pages} ·{' '}
                    {scrapeProgress.totalFound} jobs found
                  </span>
                  {scrapeProgress.error && (
                    <span className="text-hydra-red">{scrapeProgress.error}</span>
                  )}
                </div>
                {!scraping && scrapeProgress.totalFound > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearScrape}
                    className="h-6 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Results */}
      <motion.div variants={item}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading opportunities...
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-lg border border-hydra-border bg-hydra-surface-2/50 py-16 text-center">
            <div className="text-muted-foreground/30">
              <Search className="mx-auto h-8 w-8" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No opportunities scraped yet. Run a harvest above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onApply={handleApply} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Apply Dialog */}
      <Dialog open={!!previewJob} onOpenChange={(open) => !open && setPreviewJob(null)}>
        <DialogContent className="border-hydra-border bg-hydra-surface sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              <Send className="inline-block h-4 w-4 mr-2 text-hydra-purple" />
              Confirm Auto-Apply
            </DialogTitle>
            <DialogDescription>
              {previewJob?.company} — {previewJob?.title},{' '}
              {previewJob?.location || 'remote'}
            </DialogDescription>
          </DialogHeader>

          {previewJob && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-hydra-purple/10">
                  <Briefcase className="h-4 w-4 text-hydra-purple" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">
                    {previewJob.title}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    {previewJob.company} · {previewJob.location}
                  </p>
                </div>
              </div>

              {previewJob.postedLabel && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{previewJob.postedLabel}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Resume</Label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-md border border-hydra-border bg-hydra-surface text-foreground"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                      {r.isDefault && ' (default)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cover Note (opt)</Label>
                <Textarea
                  placeholder="Add context for your outreach..."
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  className="min-h-[72px] border-hydra-border bg-hydra-surface resize-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-hydra-border p-3">
                <div className="text-xs">
                  <p className="font-medium text-foreground">Auto-Apply</p>
                  <p className="text-muted-foreground/70">
                    {autoApply
                      ? 'Sends outreach via Resend now.'
                      : 'Dry run — logs the action only.'}
                  </p>
                </div>
                <Switch
                  checked={autoApply}
                  onCheckedChange={setAutoApply}
                />
              </div>

              {applyResult && (
                <div
                  className={cn(
                    'rounded-md border p-3 text-xs',
                    applyResult.success
                      ? 'border-hydra-green/30 bg-hydra-green/10 text-hydra-green'
                      : 'border-hydra-red/30 bg-hydra-red/10 text-hydra-red',
                  )}
                >
                  {applyResult.message}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewJob(null)}
              className="border-hydra-border bg-hydra-surface-2"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApply}
              disabled={applying || !selectedResumeId}
              className="bg-hydra-purple hover:bg-hydra-purple/90"
            >
              {applying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
