    'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Target,
  Copy,
  Check,
  FileText,
  Mail,
  Linkedin,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/app-store'
import ReactMarkdown from 'react-markdown'

interface Resume {
  id: string
  title: string
  atsScore: number
  isDefault: boolean
}

const TONES = ['Confident', 'Professional', 'Casual', 'Aggressive'] as const

type Tone = (typeof TONES)[number]

type OutputTab = 'summary' | 'coverLetter' | 'outreachEmail' | 'linkedin' | 'talkingPoints'

const TAB_CONFIG: { value: OutputTab; label: string; icon: React.ElementType }[] = [
  { value: 'summary', label: 'Summary', icon: Sparkles },
  { value: 'coverLetter', label: 'Cover Letter', icon: FileText },
  { value: 'outreachEmail', label: 'Outreach Email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'talkingPoints', label: 'Talking Points', icon: MessageSquare },
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
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-5 bg-hydra-purple ml-0.5 align-middle animate-pulse rounded-sm" />
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: noop in sandbox
    }
  }, [text])

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      disabled={!text}
      className="h-8 w-8 p-0 text-hydra-muted hover:text-hydra-purple hover:bg-hydra-purple/10"
    >
      {copied ? <Check className="size-4 text-hydra-green" /> : <Copy className="size-4" />}
    </Button>
  )
}

function TabOutputPanel({
  content,
  isStreaming,
}: {
  content: string
  isStreaming: boolean
}) {
  return (
    <div className="relative min-h-[300px] max-h-[600px] overflow-y-auto custom-scrollbar rounded-lg border border-hydra-border bg-hydra-surface-2/50 p-5">
      <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-hydra-purple [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-hydra-cyan [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_p]:text-foreground/90 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-foreground/90 [&_li]:mb-1 [&_strong]:text-hydra-purple [&_strong]:font-semibold">
        {content ? (
          <>
            <ReactMarkdown>{content}</ReactMarkdown>
            {isStreaming && <StreamingCursor />}
          </>
        ) : null}
      </div>
    </div>
  )
}

export default function PayloadForge() {
  const [jobDescription, setJobDescription] = useState('')
  const [company, setCompany] = useState('')
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [tone, setTone] = useState<Tone>('Professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<OutputTab>('summary')
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumesLoaded, setResumesLoaded] = useState(false)

  const [outputs, setOutputs] = useState<Record<OutputTab, string>>({
    summary: '',
    coverLetter: '',
    outreachEmail: '',
    linkedin: '',
    talkingPoints: '',
  })
  const [streamingTab, setStreamingTab] = useState<OutputTab | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetch('/api/resumes')
      .then((res) => res.json())
      .then((data) => {
        const list: Resume[] = Array.isArray(data) ? data : data?.resumes ?? []
        setResumes(list)
        if (list.length > 0) {
          const defaultResume = list.find((r) => r.isDefault) ?? list[0]
          setSelectedResumeId(defaultResume.id)
        }
      })
      .catch(() => {
        // Graceful fallback — no resumes available
      })
      .finally(() => setResumesLoaded(true))
  }, [])

  const canGenerate =
    jobDescription.trim().length > 0 &&
    selectedResumeId &&
    !isGenerating

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    setHasGenerated(true)
    setActiveTab('summary')

    const freshOutputs: Record<OutputTab, string> = {
      summary: '',
      coverLetter: '',
      outreachEmail: '',
      linkedin: '',
      talkingPoints: '',
    }
    setOutputs(freshOutputs)

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/ai/generate-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          jobDescription: jobDescription.trim(),
          company: company.trim(),
          tone,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentTab: OutputTab = 'summary'
      setStreamingTab('summary')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('---TAB:')) {
            const tabName = trimmed.replace('---TAB:', '').trim().toLowerCase() as OutputTab
            if (['summary', 'coverLetter', 'outreachEmail', 'linkedin', 'talkingPoints'].includes(tabName)) {
              currentTab = tabName
              setStreamingTab(tabName)
              setActiveTab(tabName)
            }
            continue
          }

          setOutputs((prev) => ({
            ...prev,
            [currentTab]: prev[currentTab] + trimmed + '\n',
          }))
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        setOutputs((prev) => ({
          ...prev,
          [currentTab]: prev[currentTab] + buffer.trim() + '\n',
        }))
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      // On error, show a message in the summary tab
      setOutputs((prev) => ({
        ...prev,
        summary: '**Error generating payload.** Please check your inputs and try again.\n\nMake sure you have a resume selected and a valid job description.',
      }))
    } finally {
      setIsGenerating(false)
      setStreamingTab(null)
      abortRef.current = null
    }
  }, [canGenerate, selectedResumeId, jobDescription, company, tone])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">
          <Zap className="inline-block size-6 mr-2 text-hydra-purple" />
          AI Payload Forge
        </h1>
        <p className="text-hydra-muted mt-1 text-sm">
          Generate tailored application materials with AI precision.
        </p>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT SIDE — Input */}
        <motion.div variants={item} className="space-y-5">
          <Card className="bg-hydra-surface-2 border-hydra-border card-hover">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="size-4 text-hydra-cyan" />
                Target Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="job-description" className="text-sm font-medium">
                  Job Description <span className="text-hydra-red">*</span>
                </Label>
                <Textarea
                  id="job-description"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[180px] max-h-[320px] overflow-y-auto custom-scrollbar resize-none bg-hydra-surface border-hydra-border text-foreground placeholder:text-hydra-muted/60 focus-visible:ring-hydra-purple/40"
                  required
                />
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-sm font-medium">
                  Company Name
                </Label>
                <Input
                  id="company-name"
                  placeholder="e.g. CyberDyne Systems"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-hydra-surface border-hydra-border text-foreground placeholder:text-hydra-muted/60 focus-visible:ring-hydra-purple/40"
                />
              </div>

              {/* Resume Select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Target Resume</Label>
                <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger className="w-full bg-hydra-surface border-hydra-border text-foreground focus:ring-hydra-purple/40">
                    <SelectValue placeholder={resumesLoaded && resumes.length === 0 ? 'No resumes found' : 'Select a resume...'} />
                  </SelectTrigger>
                  <SelectContent className="bg-hydra-surface border-hydra-border">
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id} className="text-foreground focus:bg-hydra-purple/10 focus:text-hydra-purple">
                        <div className="flex items-center gap-2">
                          <FileText className="size-3.5 text-hydra-muted" />
                          <span>{resume.title}</span>
                          {resume.isDefault && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-hydra-cyan/30 text-hydra-cyan">
                              Default
                            </Badge>
                          )}
                          <span className="text-xs text-hydra-muted ml-auto">{resume.atsScore}%</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tone Select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                  <SelectTrigger className="w-full bg-hydra-surface border-hydra-border text-foreground focus:ring-hydra-purple/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-hydra-surface border-hydra-border">
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t} className="text-foreground focus:bg-hydra-purple/10 focus:text-hydra-purple">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full bg-hydra-purple hover:bg-hydra-purple/90 text-white font-semibold h-11 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    <span className="pulse-glow">Deploying payload...</span>
                  </>
                ) : (
                  <>
                    <Zap className="size-4 mr-2" />
                    Generate Payload
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* RIGHT SIDE — Output */}
        <motion.div variants={item}>
          <Card className="bg-hydra-surface-2 border-hydra-border card-hover h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-hydra-purple" />
                  Generated Payload
                </div>
                {hasGenerated && (
                  <CopyButton text={outputs[activeTab]} />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasGenerated ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="rounded-full bg-hydra-purple/10 p-4 mb-4">
                    <Target className="size-10 text-hydra-purple/50" />
                  </div>
                  <p className="text-hydra-muted text-sm font-medium">
                    Generate a payload to see results
                  </p>
                  <p className="text-hydra-muted/60 text-xs mt-1">
                    Fill in the target configuration and hit deploy.
                  </p>
                </div>
              ) : (
                /* Tabs */
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OutputTab)}>
                  <TabsList className="bg-hydra-surface w-full overflow-x-auto flex-nowrap mb-4 h-auto p-1 gap-0.5">
                    {TAB_CONFIG.map((tab) => {
                      const Icon = tab.icon
                      const hasContent = outputs[tab.value].length > 0
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-hydra-purple/15 data-[state=active]:text-hydra-purple data-[state=active]:shadow-none whitespace-nowrap"
                        >
                          <Icon className="size-3.5" />
                          <span className="hidden sm:inline">{tab.label}</span>
                          {isGenerating && streamingTab === tab.value && (
                            <span className="size-1.5 rounded-full bg-hydra-purple animate-pulse" />
                          )}
                          {!isGenerating && hasContent && (
                            <Badge
                              variant="outline"
                              className="ml-1 h-4 px-1 text-[9px] border-hydra-green/30 text-hydra-green"
                            >
                              ✓
                            </Badge>
                          )}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>

                  {TAB_CONFIG.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value}>
                      {outputs[tab.value] ? (
                        <TabOutputPanel
                          content={outputs[tab.value]}
                          isStreaming={streamingTab === tab.value}
                        />
                      ) : isGenerating && streamingTab !== tab.value ? (
                        <div className="flex items-center justify-center py-12 text-hydra-muted/50 text-sm">
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Waiting in queue...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-12 text-hydra-muted/50 text-sm">
                          No content generated for this section.
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
