'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'

type JobSource = 'all' | 'linkedin' | 'weworkremotely' | 'remoteok' | 'remotive' | 'dice' | 'indeed' | 'glassdoor' | 'zip_recruiter' | 'google'

/** Display names for the per-board result summary. */
const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  glassdoor: 'Glassdoor',
  zip_recruiter: 'ZipRecruiter',
  google: 'Google Jobs',
  weworkremotely: 'We Work Remotely',
  remoteok: 'RemoteOK',
  remotive: 'Remotive',
  dice: 'Dice',
}

/** True when a search location string is remote-flavored (Remote, Anywhere, Worldwide…). */
function isRemoteSearch(location: string | undefined | null): boolean {
  if (!location) return false
  return /remote|anywhere|worldwide|work from home|\bwfh\b|global/i.test(location)
}

/** True when a job's location reads as remote ("Anywhere In The World", "Remote", …). */
function isRemoteJob(job: JobOpportunity): boolean {
  return isRemoteSearch(job.location)
}

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
  raw: string | null
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
  warnings?: string[]
  error?: string
  /** Per-board outcome for the finished run. */
  sources?: SourceResult[]
}

interface SourceResult {
  source: string
  found: number
  status: 'ok' | 'empty' | 'error'
  error?: string
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

function JobCard({
  job,
  onApply,
  onDetailsClick,
}: {
  job: JobOpportunity
  onApply: (job: JobOpportunity) => void
  onDetailsClick?: () => void
}) {
  const statusColor = {
    new: 'border-hydra-cyan/30 bg-hydra-surface',
    applied: 'border-hydra-green/30 bg-hydra-surface',
    interview: 'border-hydra-yellow/30 bg-hydra-surface',
    offer: 'border-hydra-emerald-400/30 bg-hydra-surface',
    rejected: 'border-hydra-red/30 bg-hydra-surface',
  }[job.status as keyof typeof statusColor] || 'border-hydra-border bg-hydra-surface'

  return (
    <motion.div
      variants={item}
      onClick={() => {
        onDetailsClick?.()
        onApply(job)
      }}
      className="cursor-pointer"
    >
      <Card
        className={cn(
          'card-hover border cursor-pointer bg-hydra-surface-2/50',
          statusColor,
        )}
        onClick={(e) => {}}
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
              {job.jobUrl ? (
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit underline hover:text-hydra-purple transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.open(job.jobUrl || '', '_blank')
                }}
              >
                {job.title}
              </a>
            ) : (
              <p className="text-sm font-semibold text-foreground line-clamp-1 cursor-pointer">
                {job.title}
              </p>
            )}
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

function JobOpportunityDetail({
  job,
}: {
  job: JobOpportunity
}) {
  const statusColor = {
    new: 'border-hydra-cyan/30 bg-hydra-surface',
    applied: 'border-hydra-green/30 bg-hydra-surface',
    interview: 'border-hydra-yellow/30 bg-hydra-surface',
    offer: 'border-hydra-emerald-400/30 bg-hydra-surface',
    rejected: 'border-hydra-red/30 bg-hydra-surface',
  }[job.status as keyof typeof statusColor] || 'border-hydra-border bg-hydra-surface'

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-3">
        {job.title}
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Company</p>
          <p className="font-medium">{job.company || 'Unknown company'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Location</p>
          <p className="font-medium">{job.location || 'Not specified'}</p>
        </div>
      </div>

      {job.salary && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Salary</p>
          <p className="font-medium text-hydra-green">{job.salary}</p>
        </div>
      )}

      {job.postedLabel && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Posted</p>
          <p className="font-medium">{job.postedLabel}</p>
        </div>
      )}

      {job.jobUrl && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-1">Original Listing</p>
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-hydra-purple underline hover:text-hydra-cursor"
          >
            View on {job.company || 'website'}
          </a>
        </div>
      )}

      {job.raw && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Description</p>
          <p className="text-sm break-all">{job.raw}</p>
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground mb-1">Status</p>
        <span
          className={cn(
            'px-2 py-1 text-xs rounded',
            statusColor,
          )}
        >
          {job.status}
        </span>
      </div>
    </div>
  )
}

export default function JobOpportunities() {
  const { setView } = useAppStore()
  const [jobs, setJobs] = useState<JobOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [scrapeKeyword, setScrapeKeyword] = useState('software engineer')
  const [scrapeLocation, setScrapeLocation] = useState('')
  const [scrapePages, setScrapePages] = useState(3)
  const [scrapeSource, setScrapeSource] = useState<JobSource>('all')
  const [scraping, setScraping] = useState(false)
  const [scrapeProgress, setScrapeProgress] = useState<{
    page: number
    pages: number
    found: number
    totalFound: number
    source?: JobSource
    error?: string
    /** True when the text reports incomplete sources rather than a hard failure. */
    warning?: boolean
    /** Per-board outcome of the finished run. */
    sources?: SourceResult[]
  } | null>(null)
  const [previewJob, setPreviewJob] = useState<JobOpportunity | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [autoApply, setAutoApply] = useState(true)
  const [applyNotes, setApplyNotes] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{
    success: boolean
    dryRun: boolean
    message: string
  } | null>(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string>('')

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

  const handleDeleteResume = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/resumes/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Couldn't delete that resume (HTTP ${res.status}).`)
      }
      const nextResumes = resumes.filter((r) => r.id !== deleteTarget.id)
      setResumes(nextResumes)
      if (selectedResumeId === deleteTarget.id) {
        const fallback = nextResumes.find((r) => r.isDefault) ?? nextResumes[0]
        setSelectedResumeId(fallback?.id ?? '')
      }
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete resume.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const all: JobOpportunity[] = []
      let cursor: string | undefined
      do {
        const response = await fetch(`/api/jobs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
        if (!response.ok) throw new Error('Could not load saved jobs')
        const batch: JobOpportunity[] = await response.json()
        all.push(...batch)
        cursor = batch.length === 100 ? batch[batch.length - 1].id : undefined
      } while (cursor)
      setJobs(all)
    } catch (error) {
      console.error(error)
      setScrapeProgress((prev) => ({ page: prev?.page ?? 0, pages: prev?.pages ?? 0, found: prev?.found ?? 0, totalFound: prev?.totalFound ?? 0, error: 'Could not load saved jobs. Please try again.' }))
    } finally {
      setLoading(false)
    }
  }, [])

  const startScrape = useCallback(() => {
    if (!scrapeKeyword.trim() || scraping) return

    setScraping(true)
    setScrapeProgress(null)
    setApplyResult(null)
    setJobs([])

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
        if ((payload.totalFound ?? 0) > 0) fetchJobs()
        return
      }

      if (payload.type === 'done') {
        setScrapeProgress({
          page: payload.page ?? 0,
          pages: payload.pages ?? 0,
          source: (payload.source as JobSource) || scrapeSource,
          found: payload.found ?? 0,
          totalFound: payload.totalFound ?? 0,
          error: payload.warnings?.length ? `Some sources were incomplete: ${payload.warnings.join('; ')}` : undefined,
          warning: Boolean(payload.warnings?.length),
          sources: payload.sources,
        })
        setScraping(false)
        evt.close()
        // The stream contains persisted records with real IDs, including for existing jobs.
        setJobs(payload.jobs ?? [])
        return
      }

      if (payload.type === 'page' && payload.jobs?.length) {
        setJobs((previous) => [...previous, ...payload.jobs!])
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
          source: payload.source,
          error: payload.error,
        })
      }
    }

    evt.onerror = () => {
      setScraping(false)
      evt.close()
      setScrapeProgress((prev) => ({ page: prev?.page ?? 0, pages: prev?.pages ?? 0, found: prev?.found ?? 0, totalFound: prev?.totalFound ?? 0, error: 'Connection lost. Saved results have been reloaded.' }))
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
    fetchJobs()
  }, [fetchJobs])

  // When the user prefers a remote location, surface remote/anywhere jobs first
  // instead of letting them sink below the on-site results.
  const remotePreferred = isRemoteSearch(scrapeLocation)
  const sortedJobs = useMemo(() => {
    if (!remotePreferred) return jobs
    return [...jobs].sort((a, b) => {
      const ra = isRemoteJob(a) ? 0 : 1
      const rb = isRemoteJob(b) ? 0 : 1
      return ra - rb
    })
  }, [jobs, remotePreferred])

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <Label className="text-xs text-muted-foreground">Search depth (pages)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={scrapePages}
                  onChange={(e) => setScrapePages(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
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
                    <SelectItem value="all">All sources (9)</SelectItem>
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
              <div className="flex items-end">
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

              </div>
            </div>

            <p className="text-xs text-muted-foreground">Broad search checks every connected board: LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google Jobs, We Work Remotely, RemoteOK, Remotive and Dice. Depth is up to 10 pages for ChocoData boards or 25 results per depth level (up to 100) for JobSpy. More depth takes longer and uses more provider requests; availability varies by board.</p>
            {/* Scrape Progress */}
            {scrapeProgress && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 rounded-md border border-hydra-border bg-hydra-surface p-2.5 text-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <RefreshCw
                      className={cn('h-4 w-4 shrink-0 text-hydra-cyan', scraping && 'animate-spin')}
                    />
                    <span className="whitespace-nowrap">
                      {scrapeProgress.source && `${scrapeProgress.source} · `}Page {scrapeProgress.page}/{scrapeProgress.pages} ·{' '}
                      {scrapeProgress.totalFound} jobs found
                    </span>
                    {scrapeProgress.error && (
                      <span
                        className={cn(
                          'min-w-0 break-words',
                          scrapeProgress.warning ? 'text-hydra-yellow' : 'text-hydra-red',
                        )}
                      >
                        {scrapeProgress.error}
                      </span>
                    )}
                  </div>
                  {!scraping && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearScrape}
                      className="h-6 shrink-0 self-start text-xs sm:self-auto"
                    >
                      Show All Jobs
                    </Button>
                  )}
                </div>
                {scrapeProgress.sources?.length ? (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {scrapeProgress.sources.map((result) => (
                      <span
                        key={result.source}
                        title={result.error || (result.status === 'empty' ? 'No results returned' : undefined)}
                        className={cn(
                          'rounded border px-1.5 py-0.5',
                          result.status === 'error'
                            ? 'border-hydra-red/40 text-hydra-red'
                            : result.status === 'empty'
                              ? 'border-hydra-border text-muted-foreground'
                              : 'border-hydra-cyan/40 text-hydra-cyan',
                        )}
                      >
                        {SOURCE_LABELS[result.source] ?? result.source}{' '}
                        {result.status === 'error' ? 'failed' : result.found}
                      </span>
                    ))}
                  </div>
                ) : null}
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
              {scraping ? 'Searching for opportunities…' : scrapeProgress ? 'No opportunities found in this search. Try a broader keyword or another location.' : 'No opportunities scraped yet. Run a harvest above.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedJobs.map((job) => (
              <JobCard
                key={job.id ?? `${job.title}-${job.company || ''}-${job.location || ''}`}
                job={job}
                onApply={handleApply}
                onDetailsClick={() => {
                  setShowJobDetails(true)
                  setSelectedJobId(job.id)
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Job Details Dialog */}
      <Dialog
        open={showJobDetails && !!selectedJobId}
        onOpenChange={(open) => {
          if (!open) {
            setShowJobDetails(false)
            setSelectedJobId('')
          }
        }}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-foreground">
            <Send className="inline-block h-4 w-4 mr-2 text-hydra-purple" />
            {selectedJobId ? 'Job Details' : ''}
          </DialogTitle>
        </DialogHeader>

        {showJobDetails && !!selectedJobId && (
          <div className="p-4 space-y-4 max-w-lg">
            {jobs.find((j) => j.id === selectedJobId) && (
              <JobOpportunityDetail job={jobs.find((j) => j.id === selectedJobId)!} />
            )}
          </div>
        )}

        <DialogFooter className="justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowJobDetails(false)
              setSelectedJobId('')
            }}
            className="border-hydra-border bg-hydra-surface-2"
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>

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
                  <p className="text-sm font-semibold text-foreground line-clamp-1 cursor-pointer">
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
                <div className="flex items-center gap-2">
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="flex-1 min-w-0 w-full rounded-md border border-hydra-border bg-hydra-surface text-foreground"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                        {r.isDefault && ' (default)'}
                      </option>
                    ))}
                  </select>
                  {selectedResumeId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Delete the selected resume"
                      aria-label="Delete the selected resume"
                      onClick={() => {
                        const target = resumes.find((r) => r.id === selectedResumeId)
                        if (target) {
                          setDeleteError(null)
                          setDeleteTarget(target)
                        }
                      }}
                      className="shrink-0 text-muted-foreground hover:text-hydra-red hover:bg-hydra-red/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
        title="Delete this resume?"
        description={
          <>
            <span className="font-medium text-foreground">
              {deleteTarget?.title}
            </span>{' '}
            and all of its saved versions and fit-check analyses will be
            permanently deleted. This cannot be undone.
            {deleteError && (
              <span className="block mt-2 text-hydra-red">{deleteError}</span>
            )}
          </>
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete Resume'}
        onConfirm={handleDeleteResume}
        isPending={deleting}
      />
    </motion.div>
  )
}
