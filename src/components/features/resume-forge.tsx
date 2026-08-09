'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/app-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Plus,
  ArrowLeft,
  Save,
  FileText,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Star,
  X,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderKanban,
  Clock,
  Zap,
  Sparkles,
  Loader2,
  Download,
  FileDown,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ResumeSection {
  id: string
  resumeId: string
  type: string
  title: string
  content: string
  sortOrder: number
}

interface Resume {
  id: string
  userId: string
  title: string
  summary: string | null
  isDefault: boolean
  atsScore: number | null
  createdAt: string
  updatedAt: string
  sections: ResumeSection[]
}

interface ExperienceEntry {
  id: string
  company: string
  role: string
  startDate: string
  endDate: string
  bullets: string
}

interface EducationEntry {
  id: string
  school: string
  degree: string
  field: string
  year: string
}

interface ProjectEntry {
  id: string
  name: string
  description: string
  techStack: string
  link: string
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  summary: <User className="size-4" />,
  experience: <Briefcase className="size-4" />,
  education: <GraduationCap className="size-4" />,
  skills: <Wrench className="size-4" />,
  projects: <FolderKanban className="size-4" />,
}

const uid = () => crypto.randomUUID()

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                         */
/* -------------------------------------------------------------------------- */

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

/* -------------------------------------------------------------------------- */
/*  Sortable Section Wrapper                                                   */
/* -------------------------------------------------------------------------- */

function SortableSectionCard({
  section,
  children,
}: {
  section: { id: string; type: string; title: string; content: string; sortOrder: number }
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="border-hydra-border bg-hydra-surface-2 overflow-hidden">
        {children}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center py-1.5 cursor-grab active:cursor-grabbing text-hydra-muted hover:text-hydra-purple transition-colors"
        >
          <GripVertical className="size-4" />
        </div>
      </Card>
    </div>
  )
}

/* ========================================================================== */
/*  MAIN COMPONENT                                                             */
/* ========================================================================== */

export default function ResumeForge() {
  const { selectedResumeId, setSelectedResume } = useAppStore()
  const queryClient = useQueryClient()

  if (selectedResumeId) {
    return <EditorView resumeId={selectedResumeId} />
  }

  return <ListView />
}

/* ========================================================================== */
/*  LIST VIEW                                                                  */
/* ========================================================================== */

function ListView() {
  const { setSelectedResume } = useAppStore()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { data: resumes = [], isLoading } = useQuery<Resume[]>({
    queryKey: ['resumes'],
    queryFn: () => fetch('/api/resumes').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      setDialogOpen(false)
      setNewTitle('')
      setSelectedResume(data.id)
    },
  })

  const handleCreate = () => {
    if (!newTitle.trim()) return
    createMutation.mutate(newTitle.trim())
  }

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return d
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="size-6 text-hydra-purple" />
            Resume Forge
          </h1>
          <p className="text-hydra-muted text-sm mt-1">
            Build, edit, and optimize your resumes with AI precision
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-hydra-purple hover:bg-hydra-purple/80 text-white">
              <Plus className="size-4 mr-2" />
              New Resume
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-hydra-surface border-hydra-border">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Resume</DialogTitle>
              <DialogDescription className="text-hydra-muted">
                Give your resume a title to get started.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-hydra-border text-hydra-muted hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="bg-hydra-purple hover:bg-hydra-purple/80 text-white"
              >
                {createMutation.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Resume Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="bg-hydra-surface-2 border-hydra-border animate-pulse h-40"
            />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <FileText className="size-16 text-hydra-muted/40 mb-4" />
          <h3 className="text-lg font-semibold text-hydra-muted mb-1">
            No resumes yet
          </h3>
          <p className="text-sm text-hydra-muted/60">
            Create your first resume to start building your career arsenal.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {resumes.map((resume) => (
            <motion.div key={resume.id} variants={item}>
              <Card
                onClick={() => setSelectedResume(resume.id)}
                className="bg-hydra-surface-2 border-hydra-border cursor-pointer card-hover group transition-all duration-200 hover:border-hydra-purple/40"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="size-5 text-hydra-purple shrink-0" />
                      <h3 className="font-semibold text-white truncate">
                        {resume.title}
                      </h3>
                    </div>
                    {resume.isDefault && (
                      <Badge
                        variant="outline"
                        className="border-hydra-cyan/40 text-hydra-cyan text-[10px] shrink-0"
                      >
                        <Star className="size-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-hydra-muted">
                    <Clock className="size-3" />
                    {formatDate(resume.updatedAt)}
                  </div>

                  <div className="flex items-center justify-between">
                    {resume.atsScore !== null && resume.atsScore !== undefined ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            resume.atsScore >= 70
                              ? 'border-emerald-500/40 text-emerald-400 text-[10px]'
                              : resume.atsScore >= 40
                                ? 'border-yellow-500/40 text-yellow-400 text-[10px]'
                                : 'border-red-500/40 text-red-400 text-[10px]'
                          }
                        >
                          <Zap className="size-3 mr-1" />
                          ATS {resume.atsScore}%
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-hydra-muted/50">
                        No ATS score
                      </span>
                    )}
                    <span className="text-xs text-hydra-purple opacity-0 group-hover:opacity-100 transition-opacity">
                      Open →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

/* ========================================================================== */
/*  EDITOR VIEW (fetch wrapper)                                                 */
/* ========================================================================== */

function EditorView({ resumeId }: { resumeId: string }) {
  const { data: resume, isLoading } = useQuery<Resume>({
    queryKey: ['resume', resumeId],
    queryFn: () => fetch(`/api/resumes/${resumeId}`).then((r) => r.json()),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 text-hydra-purple animate-spin" />
      </div>
    )
  }

  if (!resume) return null

  // Key on updatedAt so the editable content remounts after server refresh
  return <EditorContent key={resume.updatedAt} resume={resume} />
}

/* ========================================================================== */
/*  EDITOR CONTENT (holds editable state, auto-saves)                           */
/* ========================================================================== */

function EditorContent({ resume }: { resume: Resume }) {
  const { setSelectedResume } = useAppStore()
  const queryClient = useQueryClient()
  const resumeId = resume.id

  /* ---- local editable state (initialized from props) ---- */
  const [title, setTitle] = useState(resume.title)
  const [sections, setSections] = useState<ResumeSection[]>(resume.sections)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | 'txt' | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstLoad = useRef(true)

  /* ---- autosave ---- */
  const saveResume = useCallback(() => {
    setSaving(true)
    fetch(`/api/resumes/${resumeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, sections }),
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['resumes'] })
        queryClient.invalidateQueries({ queryKey: ['resume', resumeId] })
      })
      .finally(() => setSaving(false))
  }, [title, sections, resumeId, queryClient])

  /* ---- export ---- */
  const handleExport = async (format: 'pdf' | 'docx' | 'txt') => {
    setExporting(format)
    try {
      // Persist first so the export reflects the latest edits
      await fetch(`/api/resumes/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sections }),
      })
      const res = await fetch(`/api/resumes/${resumeId}/export?format=${format}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-')}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(null)
    }
  }

  // Schedule autosave on changes after first render
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false
      return
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      saveResume()
    }, 2000)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [title, sections, saveResume])

  /* ---- section helpers ---- */
  const updateSectionContent = (idx: number, content: string) => {
    setSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, content } : s)),
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSections((prev) => {
        const oldIdx = prev.findIndex((s) => s.id === active.id)
        const newIdx = prev.findIndex((s) => s.id === over.id)
        const reordered = arrayMove(prev, oldIdx, newIdx)
        return reordered.map((s, i) => ({ ...s, sortOrder: i }))
      })
    }
  }

  /* ---- derived data for preview ---- */
  const summaryText =
    sections.find((s) => s.type === 'summary')?.content ?? ''
  const experienceEntries: ExperienceEntry[] = JSON.parse(
    sections.find((s) => s.type === 'experience')?.content ?? '[]',
  )
  const educationEntries: EducationEntry[] = JSON.parse(
    sections.find((s) => s.type === 'education')?.content ?? '[]',
  )
  const skillsList: string[] = JSON.parse(
    sections.find((s) => s.type === 'skills')?.content ?? '[]',
  )
  const projectEntries: ProjectEntry[] = JSON.parse(
    sections.find((s) => s.type === 'projects')?.content ?? '[]',
  )

  /* ---- ATS score (simple heuristic for demo) ---- */
  const computeAtsScore = () => {
    let score = 0
    if (summaryText.length > 50) score += 20
    if (experienceEntries.length > 0) score += 25
    if (educationEntries.length > 0) score += 15
    if (skillsList.length >= 5) score += 20
    if (projectEntries.length > 0) score += 10
    const totalBullets = experienceEntries.reduce(
      (a, e) => a + e.bullets.split('\n').filter(Boolean).length,
      0,
    )
    if (totalBullets >= 5) score += 10
    return Math.min(score, 100)
  }

  const atsScore = computeAtsScore()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-3.5rem)]"
    >
      {/* ---- Top Bar ---- */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-hydra-border bg-hydra-surface/80 backdrop-blur-sm shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedResume(null)}
          className="text-hydra-muted hover:text-white shrink-0"
        >
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-hydra-surface-2 border-hydra-border text-white font-semibold max-w-xs"
        />

        <div className="flex-1" />

        {/* ATS Score Meter */}
        <div className="hidden sm:flex items-center gap-2 min-w-[160px]">
          <span className="text-xs text-hydra-muted">ATS</span>
          <Progress
            value={atsScore}
            className="h-2 w-24"
          />
          <span
            className={`text-xs font-bold min-w-[2rem] text-right ${
              atsScore >= 70
                ? 'text-emerald-400'
                : atsScore >= 40
                  ? 'text-hydra-purple'
                  : 'text-red-400'
            }`}
          >
            {atsScore}%
          </span>
        </div>

        <Button
          size="sm"
          onClick={() => {
            if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
            saveResume()
          }}
          disabled={saving}
          className="bg-hydra-purple hover:bg-hydra-purple/80 text-white shrink-0"
        >
          {saving ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          Save
        </Button>

        {/* Export Buttons */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
          className="border-hydra-border text-hydra-cyan hover:border-hydra-cyan/40 shrink-0"
          title="Export as PDF (ATS-friendly)"
        >
          {exporting === 'pdf' ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Download className="size-4 mr-1" />}
          PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExport('docx')}
          disabled={exporting !== null}
          className="border-hydra-border text-hydra-purple hover:border-hydra-purple/40 shrink-0"
          title="Export as DOCX"
        >
          {exporting === 'docx' ? <Loader2 className="size-4 mr-1 animate-spin" /> : <FileDown className="size-4 mr-1" />}
          DOCX
        </Button>
      </div>

      {/* ---- Split Pane ---- */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* LEFT: Editor */}
        <ResizablePanel defaultSize={55} minSize={35}>
          <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence>
                  {sections.map((section, idx) => (
                    <motion.div
                      key={section.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <SortableSectionCard section={section}>
                        <SectionEditor
                          section={section}
                          index={idx}
                          onUpdateContent={(content) =>
                            updateSectionContent(idx, content)
                          }
                        />
                      </SortableSectionCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SortableContext>
            </DndContext>
          </div>
        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle className="bg-hydra-border w-1 hover:bg-hydra-purple/40 transition-colors" />

        {/* RIGHT: Live Preview */}
        <ResizablePanel defaultSize={45} minSize={25}>
          <div className="h-full overflow-y-auto custom-scrollbar p-4 bg-[#0a0612]">
            <div className="max-w-[600px] mx-auto">
              <ResumePreview
                title={title}
                summary={summaryText}
                experience={experienceEntries}
                education={educationEntries}
                skills={skillsList}
                projects={projectEntries}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </motion.div>
  )
}

/* ========================================================================== */
/*  SECTION EDITOR (collapsible, per-section type)                              */
/* ========================================================================== */

function SectionEditor({
  section,
  index,
  onUpdateContent,
}: {
  section: ResumeSection
  index: number
  onUpdateContent: (content: string) => void
}) {
  const [open, setOpen] = useState(index === 0)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2 text-white font-medium text-sm">
          <span className="text-hydra-purple">
            {SECTION_ICONS[section.type] ?? <FileText className="size-4" />}
          </span>
          {section.title}
        </div>
        <span className="text-hydra-muted">
          {open ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1 space-y-3">
          {section.type === 'summary' && (
            <SummaryEditor content={section.content} onUpdate={onUpdateContent} />
          )}
          {section.type === 'experience' && (
            <ExperienceEditor content={section.content} onUpdate={onUpdateContent} />
          )}
          {section.type === 'education' && (
            <EducationEditor content={section.content} onUpdate={onUpdateContent} />
          )}
          {section.type === 'skills' && (
            <SkillsEditor content={section.content} onUpdate={onUpdateContent} />
          )}
          {section.type === 'projects' && (
            <ProjectsEditor content={section.content} onUpdate={onUpdateContent} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ---- Summary Editor ---- */
function SummaryEditor({
  content,
  onUpdate,
}: {
  content: string
  onUpdate: (c: string) => void
}) {
  return (
    <Textarea
      value={content}
      onChange={(e) => onUpdate(e.target.value)}
      placeholder="Write a professional summary..."
      className="bg-hydra-surface border-hydra-border text-white placeholder:text-hydra-muted min-h-[100px] resize-y"
    />
  )
}

/* ---- Experience Editor ---- */
function ExperienceEditor({
  content,
  onUpdate,
}: {
  content: string
  onUpdate: (c: string) => void
}) {
  let entries: ExperienceEntry[] = []
  try {
    entries = JSON.parse(content)
  } catch {
    entries = []
  }

  const addEntry = () => {
    const newEntry: ExperienceEntry = {
      id: uid(),
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      bullets: '',
    }
    onUpdate(JSON.stringify([...entries, newEntry]))
  }

  const updateEntry = (idx: number, field: keyof ExperienceEntry, value: string) => {
    const updated = entries.map((e, i) =>
      i === idx ? { ...e, [field]: value } : e,
    )
    onUpdate(JSON.stringify(updated))
  }

  const removeEntry = (idx: number) => {
    onUpdate(JSON.stringify(entries.filter((_, i) => i !== idx)))
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="relative p-3 rounded-md bg-hydra-surface border border-hydra-border space-y-2"
        >
          <button
            onClick={() => removeEntry(idx)}
            className="absolute top-2 right-2 text-hydra-muted hover:text-red-400 transition-colors"
          >
            <X className="size-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">Company</label>
              <Input
                value={entry.company}
                onChange={(e) => updateEntry(idx, 'company', e.target.value)}
                placeholder="Acme Corp"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">Role</label>
              <Input
                value={entry.role}
                onChange={(e) => updateEntry(idx, 'role', e.target.value)}
                placeholder="Senior Engineer"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">Start Date</label>
              <Input
                value={entry.startDate}
                onChange={(e) => updateEntry(idx, 'startDate', e.target.value)}
                placeholder="Jan 2022"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">End Date</label>
              <Input
                value={entry.endDate}
                onChange={(e) => updateEntry(idx, 'endDate', e.target.value)}
                placeholder="Present"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-hydra-muted mb-1 block">
              Bullets (one per line)
            </label>
            <Textarea
              value={entry.bullets}
              onChange={(e) => updateEntry(idx, 'bullets', e.target.value)}
              placeholder="- Led team of 5 engineers...&#10;- Improved performance by 40%..."
              className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted min-h-[80px] resize-y text-sm"
            />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addEntry}
        className="border-hydra-border text-hydra-muted hover:text-hydra-purple hover:border-hydra-purple/40"
      >
        <Plus className="size-4 mr-1" />
        Add Experience
      </Button>
    </div>
  )
}

/* ---- Education Editor ---- */
function EducationEditor({
  content,
  onUpdate,
}: {
  content: string
  onUpdate: (c: string) => void
}) {
  let entries: EducationEntry[] = []
  try {
    entries = JSON.parse(content)
  } catch {
    entries = []
  }

  const addEntry = () => {
    const newEntry: EducationEntry = {
      id: uid(),
      school: '',
      degree: '',
      field: '',
      year: '',
    }
    onUpdate(JSON.stringify([...entries, newEntry]))
  }

  const updateEntry = (idx: number, field: keyof EducationEntry, value: string) => {
    const updated = entries.map((e, i) =>
      i === idx ? { ...e, [field]: value } : e,
    )
    onUpdate(JSON.stringify(updated))
  }

  const removeEntry = (idx: number) => {
    onUpdate(JSON.stringify(entries.filter((_, i) => i !== idx)))
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="relative p-3 rounded-md bg-hydra-surface border border-hydra-border space-y-2"
        >
          <button
            onClick={() => removeEntry(idx)}
            className="absolute top-2 right-2 text-hydra-muted hover:text-red-400 transition-colors"
          >
            <X className="size-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">School</label>
              <Input
                value={entry.school}
                onChange={(e) => updateEntry(idx, 'school', e.target.value)}
                placeholder="MIT"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">Degree</label>
              <Input
                value={entry.degree}
                onChange={(e) => updateEntry(idx, 'degree', e.target.value)}
                placeholder="B.S."
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">Field</label>
              <Input
                value={entry.field}
                onChange={(e) => updateEntry(idx, 'field', e.target.value)}
                placeholder="Computer Science"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">Year</label>
              <Input
                value={entry.year}
                onChange={(e) => updateEntry(idx, 'year', e.target.value)}
                placeholder="2020"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addEntry}
        className="border-hydra-border text-hydra-muted hover:text-hydra-purple hover:border-hydra-purple/40"
      >
        <Plus className="size-4 mr-1" />
        Add Education
      </Button>
    </div>
  )
}

/* ---- Skills Editor ---- */
function SkillsEditor({
  content,
  onUpdate,
}: {
  content: string
  onUpdate: (c: string) => void
}) {
  let skills: string[] = []
  try {
    skills = JSON.parse(content)
  } catch {
    skills = []
  }

  const [input, setInput] = useState('')

  const addSkill = () => {
    const trimmed = input.trim()
    if (trimmed && !skills.includes(trimmed)) {
      onUpdate(JSON.stringify([...skills, trimmed]))
      setInput('')
    }
  }

  const removeSkill = (idx: number) => {
    onUpdate(JSON.stringify(skills.filter((_, i) => i !== idx)))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a skill..."
          className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={addSkill}
          className="border-hydra-border text-hydra-muted hover:text-hydra-purple hover:border-hydra-purple/40 shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className="border-hydra-purple/30 text-hydra-purple bg-hydra-purple/5 hover:bg-hydra-purple/10 cursor-pointer"
            onClick={() => removeSkill(idx)}
          >
            {skill}
            <X className="size-3 ml-1" />
          </Badge>
        ))}
        {skills.length === 0 && (
          <span className="text-xs text-hydra-muted/50">
            No skills added yet
          </span>
        )}
      </div>
    </div>
  )
}

/* ---- Projects Editor ---- */
function ProjectsEditor({
  content,
  onUpdate,
}: {
  content: string
  onUpdate: (c: string) => void
}) {
  let entries: ProjectEntry[] = []
  try {
    entries = JSON.parse(content)
  } catch {
    entries = []
  }

  const addEntry = () => {
    const newEntry: ProjectEntry = {
      id: uid(),
      name: '',
      description: '',
      techStack: '',
      link: '',
    }
    onUpdate(JSON.stringify([...entries, newEntry]))
  }

  const updateEntry = (idx: number, field: keyof ProjectEntry, value: string) => {
    const updated = entries.map((e, i) =>
      i === idx ? { ...e, [field]: value } : e,
    )
    onUpdate(JSON.stringify(updated))
  }

  const removeEntry = (idx: number) => {
    onUpdate(JSON.stringify(entries.filter((_, i) => i !== idx)))
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="relative p-3 rounded-md bg-hydra-surface border border-hydra-border space-y-2"
        >
          <button
            onClick={() => removeEntry(idx)}
            className="absolute top-2 right-2 text-hydra-muted hover:text-red-400 transition-colors"
          >
            <X className="size-4" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">Project Name</label>
              <Input
                value={entry.name}
                onChange={(e) => updateEntry(idx, 'name', e.target.value)}
                placeholder="NeuroLink Dashboard"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-hydra-muted mb-1 block">Tech Stack</label>
              <Input
                value={entry.techStack}
                onChange={(e) => updateEntry(idx, 'techStack', e.target.value)}
                placeholder="React, TypeScript, Go"
                className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-hydra-muted mb-1 block">Description</label>
            <Textarea
              value={entry.description}
              onChange={(e) => updateEntry(idx, 'description', e.target.value)}
              placeholder="Brief project description..."
              className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted min-h-[60px] resize-y text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-hydra-muted mb-1 block">Link</label>
            <Input
              value={entry.link}
              onChange={(e) => updateEntry(idx, 'link', e.target.value)}
              placeholder="https://github.com/..."
              className="bg-hydra-surface-2 border-hydra-border text-white placeholder:text-hydra-muted h-9 text-sm"
            />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addEntry}
        className="border-hydra-border text-hydra-muted hover:text-hydra-purple hover:border-hydra-purple/40"
      >
        <Plus className="size-4 mr-1" />
        Add Project
      </Button>
    </div>
  )
}

/* ========================================================================== */
/*  LIVE PREVIEW                                                               */
/* ========================================================================== */

function ResumePreview({
  title,
  summary,
  experience,
  education,
  skills,
  projects,
}: {
  title: string
  summary: string
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: string[]
  projects: ProjectEntry[]
}) {
  const hasContent =
    summary ||
    experience.length > 0 ||
    education.length > 0 ||
    skills.length > 0 ||
    projects.length > 0

  return (
    <div className="bg-[#0d0a16] rounded-lg border border-hydra-border/50 overflow-hidden shadow-2xl shadow-black/40">
      {/* Resume document */}
      <div className="p-6 md:p-8 space-y-5">
        {/* Header */}
        <div className="text-center border-b border-white/10 pb-4">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
            {title || 'Untitled Resume'}
          </h1>
          <p className="text-xs text-hydra-cyan/60 mt-1 uppercase tracking-widest">
            Professional Resume
          </p>
        </div>

        {!hasContent && (
          <p className="text-center text-hydra-muted/40 text-sm py-8">
            Start editing to see a live preview...
          </p>
        )}

        {/* Summary */}
        {summary && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-hydra-purple mb-2 flex items-center gap-2">
              <span className="w-6 h-px bg-hydra-purple" />
              Summary
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-hydra-purple mb-3 flex items-center gap-2">
              <span className="w-6 h-px bg-hydra-purple" />
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {exp.role || 'Role'}
                      </h3>
                      <p className="text-sm text-hydra-cyan/80">
                        {exp.company || 'Company'}
                      </p>
                    </div>
                    <span className="text-xs text-hydra-muted shrink-0">
                      {exp.startDate}
                      {exp.startDate && exp.endDate ? ' — ' : ''}
                      {exp.endDate}
                    </span>
                  </div>
                  {exp.bullets && (
                    <ul className="mt-1.5 space-y-1">
                      {exp.bullets
                        .split('\n')
                        .filter(Boolean)
                        .map((bullet, bIdx) => (
                          <li
                            key={bIdx}
                            className="text-xs text-gray-400 flex items-start gap-1.5"
                          >
                            <span className="text-hydra-purple mt-1 shrink-0">▹</span>
                            <span>{bullet.replace(/^[-*]\s*/, '')}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-hydra-purple mb-3 flex items-center gap-2">
              <span className="w-6 h-px bg-hydra-purple" />
              Education
            </h2>
            <div className="space-y-2">
              {education.map((edu) => (
                <div key={edu.id} className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {edu.school || 'School'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {edu.degree}
                      {edu.degree && edu.field ? ' in ' : ''}
                      {edu.field}
                    </p>
                  </div>
                  {edu.year && (
                    <span className="text-xs text-hydra-muted shrink-0">
                      {edu.year}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-hydra-purple mb-2 flex items-center gap-2">
              <span className="w-6 h-px bg-hydra-purple" />
              Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded bg-hydra-purple/10 text-hydra-cyan/80 border border-hydra-purple/20"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-hydra-purple mb-3 flex items-center gap-2">
              <span className="w-6 h-px bg-hydra-purple" />
              Projects
            </h2>
            <div className="space-y-3">
              {projects.map((proj) => (
                <div key={proj.id}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {proj.name || 'Project'}
                    </h3>
                    {proj.link && (
                      <span className="text-xs text-hydra-cyan/60 truncate">
                        {proj.link}
                      </span>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {proj.description}
                    </p>
                  )}
                  {proj.techStack && (
                    <p className="text-xs text-hydra-muted mt-1">
                      {proj.techStack}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
