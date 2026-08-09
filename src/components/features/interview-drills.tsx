'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords,
  Plus,
  ArrowLeft,
  Send,
  Clock,
  Loader2,
  Trophy,
  MessageSquare,
  Briefcase,
  Building2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import ReactMarkdown from 'react-markdown'

// ─── Types ───────────────────────────────────────────────────────────────────

type SessionType = 'behavioral' | 'technical' | 'role-specific'

interface InterviewMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  score?: number
  createdAt: string
}

interface InterviewScore {
  category: string
  score: number
  maxScore: number
  feedback?: string
}

interface InterviewSession {
  id: string
  type: SessionType
  status: 'active' | 'completed'
  role?: string
  company?: string
  score?: number
  createdAt: string
  updatedAt: string
  messages?: InterviewMessage[]
  scores?: InterviewScore[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'role-specific', label: 'Role-Specific' },
]

const TYPE_COLORS: Record<SessionType, string> = {
  behavioral: 'border-cyan-400/30 text-cyan-400',
  technical: 'bg-hydra-purple/20 border-purple-400/30 text-purple-400',
  'role-specific': 'border-emerald-400/30 text-emerald-400',
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-hydra-yellow/10 text-hydra-yellow border-hydra-yellow/20' },
  completed: { label: 'Completed', className: 'bg-hydra-green/10 text-hydra-green border-hydra-green/20' },
}

const SCORE_CATEGORIES = ['Communication', 'Technical Depth', 'Structure', 'Relevance']

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InterviewDrills() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  return (
    <AnimatePresence mode="wait">
      {activeSessionId ? (
        <motion.div
          key="session"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <ActiveSession sessionId={activeSessionId} onBack={() => setActiveSessionId(null)} />
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
        >
          <SessionList onSelect={setActiveSessionId} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Session List View ──────────────────────────────────────────────────────

function SessionList({ onSelect }: { onSelect: (id: string) => void }) {
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [typeFilter, setTypeFilter] = useState<SessionType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newType, setNewType] = useState<SessionType>('behavioral')

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/interviews')
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch {
      // graceful fallback — show empty list
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, role: newRole || undefined, company: newCompany || undefined }),
      })
      if (res.ok) {
        const session = await res.json()
        setShowNewDialog(false)
        setNewRole('')
        setNewCompany('')
        setNewType('behavioral')
        onSelect(session.id)
      }
    } catch {
      // handle error
    } finally {
      setCreating(false)
    }
  }

  const filtered = typeFilter === 'all'
    ? sessions
    : sessions.filter((s) => s.type === typeFilter)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hydra-purple/10 border border-hydra-purple/20">
            <Swords className="h-5 w-5 text-hydra-purple" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Interview Drills</h1>
        </div>
        <Button
          onClick={() => setShowNewDialog(true)}
          className="bg-hydra-purple hover:bg-hydra-purple/90 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </motion.div>

      {/* New Session Dialog */}
      <AnimatePresence>
        {showNewDialog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="bg-hydra-surface-2 border-hydra-border">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-hydra-purple uppercase tracking-wider">New Interview Session</h3>
                <div className="flex flex-wrap gap-2">
                  {SESSION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setNewType(t.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        newType === t.value
                          ? 'bg-hydra-purple/20 border-hydra-purple/40 text-hydra-purple'
                          : 'bg-hydra-surface border-hydra-border text-hydra-muted hover:text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Target Role (e.g. Senior PM)"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="bg-hydra-surface border-hydra-border"
                  />
                  <Input
                    placeholder="Company (e.g. CyberDyne Systems)"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="bg-hydra-surface border-hydra-border"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => { setShowNewDialog(false); setNewRole(''); setNewCompany('') }}
                    className="text-hydra-muted hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="bg-hydra-purple hover:bg-hydra-purple/90 text-white gap-2"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Start Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type Filter Pills */}
      <motion.div variants={item} className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            typeFilter === 'all'
              ? 'bg-hydra-purple/20 border-hydra-purple/40 text-hydra-purple'
              : 'bg-hydra-surface border-hydra-border text-hydra-muted hover:text-foreground'
          }`}
        >
          All
        </button>
        {SESSION_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              typeFilter === t.value
                ? 'bg-hydra-purple/20 border-hydra-purple/40 text-hydra-purple'
                : 'bg-hydra-surface border-hydra-border text-hydra-muted hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-hydra-purple" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={item} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-hydra-purple/10 mb-4">
            <Swords className="h-8 w-8 text-hydra-purple/50" />
          </div>
          <p className="text-hydra-muted text-sm">No interview sessions yet.</p>
          <p className="text-hydra-muted/60 text-xs mt-1">Start a new session to practice with an AI interviewer.</p>
        </motion.div>
      ) : (
        <motion.div variants={container} className="grid gap-3">
          {filtered.map((session) => (
            <motion.div key={session.id} variants={item}>
              <Card
                className="card-hover bg-hydra-surface-2 cursor-pointer"
                onClick={() => onSelect(session.id)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex flex-col items-start gap-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${TYPE_COLORS[session.type as SessionType] || ''}`}
                          >
                            {session.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_CONFIG[session.status]?.className || ''}`}
                          >
                            {STATUS_CONFIG[session.status]?.label || session.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {session.role && (
                            <span className="flex items-center gap-1.5 text-foreground/90">
                              <Briefcase className="h-3.5 w-3.5 text-hydra-muted" />
                              {session.role}
                            </span>
                          )}
                          {session.company && (
                            <span className="flex items-center gap-1.5 text-foreground/90">
                              <Building2 className="h-3.5 w-3.5 text-hydra-muted" />
                              {session.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      {session.score != null && (
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-4 w-4 text-hydra-yellow" />
                          <span className="text-sm font-semibold text-hydra-yellow">{session.score}/40</span>
                        </div>
                      )}
                      <span className="text-xs text-hydra-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Active Session View ────────────────────────────────────────────────────

function ActiveSession({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const [session, setSession] = useState<InterviewSession | null>(null)
  const msgsState = useState<InterviewMessage[]>([])
  const messages = msgsState[0]
  const setMessages = msgsState[1]
  const [scores, setScores] = useState<InterviewScore[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [ended, setEnded] = useState(false)
  const [liveScore, setLiveScore] = useState(0)
  const [ending, setEnding] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch session data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/interviews/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setSession(data)
          setMessages(data.messages || [])
          setScores(data.scores || [])
          if (data.status === 'completed') {
            setEnded(true)
            if (data.scores?.length) {
              const total = data.scores.reduce((sum: number, s: InterviewScore) => sum + s.score, 0)
              setLiveScore(total)
            }
          }
        }
      } catch {
        // handle error
      }
    }
    load()
  }, [sessionId])

  // Timer
  useEffect(() => {
    if (ended) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [ended])

  const dep_essages = messages
  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dep_essages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending || ended) return

    const userMsg: InterviewMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setSending(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const history = updatedMessages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch(`/api/interviews/${sessionId}/chat?XTransformPort=3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Chat request failed')
      }

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) {
        // Streaming SSE response
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const aiMsg: InterviewMessage = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: '',
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])

        const decoder = new TextDecoder()
        let streamScore: number | undefined
        let buffer = ''

        const parseEvent = (line: string) => {
          if (!line.startsWith('data:')) return
          const payload = line.slice(5).trim()
          if (!payload) return
          try {
            const event = JSON.parse(payload)
            if (event.type === 'delta') {
              const content = event.content || ''
              setMessages((prev) => {
                const copy = [...prev]
                const idx = copy.findIndex((m) => m.id === aiMsg.id)
                if (idx >= 0) copy[idx] = { ...copy[idx], content: copy[idx].content + content }
                return copy
              })
            } else if (event.type === 'done') {
              streamScore = event.score
              if (streamScore != null) setLiveScore((prev) => prev + streamScore)
            } else if (event.type === 'error') {
              throw new Error(event.error || 'Stream error')
            }
          } catch {
            // ignore malformed events
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          for (const line of lines) parseEvent(line)
        }
        if (buffer.trim()) parseEvent(buffer)
      } else {
        // Legacy JSON fallback
        const data = await res.json()
        const aiMsg: InterviewMessage = {
          id: data.id || `ai-${Date.now()}`,
          role: 'ai',
          content: data.content || data.message || data.response || '',
          score: data.score,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])

        if (data.score != null) setLiveScore((prev) => prev + data.score)
        if (data.accumulatedScore != null) setLiveScore(data.accumulatedScore)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'ai',
          content: `⚠️ Signal interrupted: ${err instanceof Error ? err.message : 'Something went wrong'}`,
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEndSession = async () => {
    setEnding(true)
    try {
      const res = await fetch(`/api/interviews/${sessionId}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (res.ok) {
        const data = await res.json()
        setSession(data)
        setScores(data.scores || [])
        setEnded(true)
        if (data.scores?.length) {
          const total = data.scores.reduce((sum: number, s: InterviewScore) => sum + s.score, 0)
          setLiveScore(total)
        }
      }
    } catch {
      // handle error
    } finally {
      setEnding(false)
    }
  }

  const avgScore = ended && scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length * 10) / 10
    : liveScore

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 text-hydra-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold truncate">
                {session?.role || 'Interview Session'}
              </h2>
              {session?.company && (
                <span className="text-sm text-hydra-muted">@ {session.company}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="outline"
                className={`text-xs ${TYPE_COLORS[session?.type as SessionType] || ''}`}
              >
                {session?.type || 'behavioral'}
              </Badge>
              <span className="text-xs text-hydra-muted flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(elapsed)}
              </span>
            </div>
          </div>
        </div>
        {!ended && (
          <Button
            variant="outline"
            onClick={handleEndSession}
            disabled={ending || messages.length === 0}
            className="border-hydra-red/30 text-hydra-red hover:bg-hydra-red/10 hover:text-hydra-red shrink-0 gap-2"
          >
            {ending && <Loader2 className="h-4 w-4 animate-spin" />}
            End Session
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <ScrollArea className="flex-1 rounded-lg border border-hydra-border bg-hydra-surface custom-scrollbar">
            <div className="p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-hydra-purple/10 mb-4">
                    <MessageSquare className="h-7 w-7 text-hydra-purple/50" />
                  </div>
                  <p className="text-hydra-muted text-sm font-medium">Session Ready</p>
                  <p className="text-hydra-muted/60 text-xs mt-1 max-w-xs">
                    Type your answer to begin. The AI interviewer will ask the first question when you respond.
                  </p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {msg.role === 'ai' ? (
                      <Avatar className="h-8 w-8 shrink-0 mt-1">
                        <AvatarFallback className="bg-hydra-purple/20 text-hydra-purple border border-hydra-purple/30">
                          <Swords className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-8 w-8 shrink-0 mt-1">
                        <AvatarFallback className="bg-hydra-cyan/10 text-hydra-cyan border border-hydra-cyan/20 text-xs font-bold">
                          U
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Bubble */}
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-hydra-purple/20 border border-hydra-purple/20'
                          : 'bg-hydra-surface-2 border border-hydra-border'
                      }`}
                    >
                      {msg.role === 'ai' ? (
                        <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground/90 [&_p:mb-2] [&_p:last:mb-0] [&_strong]:text-hydra-purple [&_h1]:text-hydra-purple [&_h2]:text-hydra-purple [&_h3]:text-hydra-purple [&_ul]:text-foreground/90 [&_ol]:text-foreground/90 [&_li]:text-foreground/90 [&_code]:text-hydra-cyan [&_pre]:bg-hydra-surface [&_blockquote]:border-hydra-purple/30">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-foreground/90 whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <Avatar className="h-8 w-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-hydra-purple/20 text-hydra-purple border border-hydra-purple/30">
                      <Swords className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-hydra-surface-2 border border-hydra-border rounded-xl px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <span className="h-2 w-2 rounded-full bg-hydra-purple/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-hydra-purple/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-hydra-purple/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          {!ended && (
            <div className="mt-3 flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer... (Enter to send, Shift+Enter for newline)"
                disabled={sending}
                className="min-h-[44px] max-h-32 resize-none bg-hydra-surface-2 border-hydra-border text-sm custom-scrollbar"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-hydra-purple hover:bg-hydra-purple/90 text-white shrink-0 h-11 w-11 p-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Score Panel */}
        <div className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col gap-4">
          {/* Live Score */}
          <Card className="bg-hydra-surface-2 border-hydra-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs font-semibold text-hydra-muted uppercase tracking-wider mb-2">Session Score</p>
              <div className="text-4xl font-bold text-hydra-purple glow-text-purple">
                {avgScore}
              </div>
              <p className="text-xs text-hydra-muted mt-1">out of 40</p>
            </CardContent>
          </Card>

          {/* Timer */}
          <Card className="bg-hydra-surface-2 border-hydra-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs font-semibold text-hydra-muted uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Duration
              </p>
              <div className="text-2xl font-mono font-bold text-hydra-cyan">
                {formatDuration(elapsed)}
              </div>
            </CardContent>
          </Card>

          {/* Score Breakdown (shown when ended) */}
          <AnimatePresence>
            {ended && scores.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-hydra-surface-2 border-hydra-border">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-hydra-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-hydra-yellow" />
                      Score Breakdown
                    </p>
                    {SCORE_CATEGORIES.map((cat) => {
                      const scoreEntry = scores.find((s) => s.category.toLowerCase() === cat.toLowerCase())
                      const val = scoreEntry?.score ?? 0
                      const pct = (val / 10) * 100
                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground/80">{cat}</span>
                            <span className="font-semibold text-hydra-purple">{val}/10</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-hydra-surface overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                pct >= 70 ? 'bg-hydra-green' : pct >= 40 ? 'bg-hydra-yellow' : 'bg-hydra-red'
                              }`}
                            />
                          </div>
                          {scoreEntry?.feedback && (
                            <p className="text-[10px] text-hydra-muted leading-relaxed">
                              {scoreEntry.feedback}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Session Info */}
          <Card className="bg-hydra-surface-2 border-hydra-border mt-auto">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-hydra-muted uppercase tracking-wider">Details</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-hydra-muted">Type</span>
                  <span className="capitalize text-foreground/80">{session?.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hydra-muted">Messages</span>
                  <span className="text-foreground/80">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hydra-muted">Status</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[session?.status || 'active']?.className || ''}`}
                  >
                    {STATUS_CONFIG[session?.status || 'active']?.label || session?.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Score Bar (shown below chat on mobile) */}
      <div className="lg:hidden flex items-center justify-between gap-4 rounded-lg border border-hydra-border bg-hydra-surface-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] text-hydra-muted uppercase tracking-wider">Score</p>
            <p className="text-lg font-bold text-hydra-purple">{avgScore}<span className="text-xs text-hydra-muted font-normal">/40</span></p>
          </div>
          <div className="h-8 w-px bg-hydra-border" />
          <div>
            <p className="text-[10px] text-hydra-muted uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> Time
            </p>
            <p className="text-lg font-mono font-bold text-hydra-cyan">{formatDuration(elapsed)}</p>
          </div>
        </div>
        {!ended && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            disabled={ending || messages.length === 0}
            className="border-hydra-red/30 text-hydra-red hover:bg-hydra-red/10 hover:text-hydra-red gap-1.5 text-xs"
          >
            {ending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Swords className="h-3 w-3" />}
            End
          </Button>
        )}
      </div>
    </div>
  )
}
