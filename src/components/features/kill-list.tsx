'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crosshair,
  Zap,
  Swords,
  Trophy,
  Plus,
  Search,
  MapPin,
  Briefcase,
  ExternalLink,
  GripVertical,
  Radar,
  Target,
  Send,
  MessageSquare,
  Gift,
  Skull,
  X,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type ColumnStatus =
  | 'intel'
  | 'acquired'
  | 'payload_sent'
  | 'interview'
  | 'offer'
  | 'eliminated'

type Priority = 'low' | 'medium' | 'high' | 'critical'

interface JobTarget {
  id: string
  company: string
  role: string
  salary: string | null
  location: string | null
  status: ColumnStatus
  priority: Priority
  jobUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface ColumnDef {
  id: ColumnStatus
  label: string
  color: string
  borderColor: string
  icon: React.ReactNode
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const COLUMNS: ColumnDef[] = [
  { id: 'intel', label: 'Intel Gathered', color: 'text-hydra-cyan', borderColor: 'border-t-hydra-cyan', icon: <Radar className="h-3.5 w-3.5" /> },
  { id: 'acquired', label: 'Target Acquired', color: 'text-hydra-purple', borderColor: 'border-t-hydra-purple', icon: <Target className="h-3.5 w-3.5" /> },
  { id: 'payload_sent', label: 'Payload Sent', color: 'text-hydra-green', borderColor: 'border-t-hydra-green', icon: <Send className="h-3.5 w-3.5" /> },
  { id: 'interview', label: 'Interview', color: 'text-hydra-yellow', borderColor: 'border-t-hydra-yellow', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: 'offer', label: 'Offer', color: 'text-emerald-400', borderColor: 'border-t-emerald-400', icon: <Gift className="h-3.5 w-3.5" /> },
  { id: 'eliminated', label: 'Eliminated', color: 'text-hydra-red', borderColor: 'border-t-hydra-red', icon: <Skull className="h-3.5 w-3.5" /> },
]

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  medium: { label: 'Medium', color: 'bg-hydra-yellow/15 text-hydra-yellow border-hydra-yellow/30' },
  high: { label: 'High', color: 'bg-hydra-orange/15 text-hydra-orange border-hydra-orange/30' },
  critical: { label: 'Critical', color: 'bg-hydra-red/15 text-hydra-red border-hydra-red/30' },
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const cardVariant = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}

/* -------------------------------------------------------------------------- */
/*  Sortable Card                                                              */
/* -------------------------------------------------------------------------- */

function SortableCard({ target }: { target: JobTarget }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: target.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = PRIORITY_CONFIG[target.priority]

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`card-hover group relative cursor-grab bg-hydra-surface-2 p-3 select-none ${isDragging ? 'z-50 ring-2 ring-hydra-purple/50 opacity-90' : ''}`}
      {...attributes}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 cursor-grab text-muted-foreground/40 hover:text-hydra-purple transition-colors"
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {target.company}
            </p>
            <Badge
              variant="outline"
              className={`shrink-0 border px-1.5 py-0 text-[10px] font-medium ${priority.color}`}
            >
              {priority.label}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Briefcase className="h-3 w-3 shrink-0" />
            {target.role}
          </p>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
            {target.salary && (
              <span className="flex items-center gap-1">
                <span className="text-hydra-green">●</span>
                {target.salary}
              </span>
            )}
            {target.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {target.location}
              </span>
            )}
          </div>

          {target.jobUrl && (
            <a
              href={target.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-hydra-cyan hover:text-hydra-cyan-bright transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              View listing
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  Kanban Column                                                              */
/* -------------------------------------------------------------------------- */

function KanbanColumn({
  column,
  targets,
  filterText,
}: {
  column: ColumnDef
  targets: JobTarget[]
  filterText: string
}) {
  const filtered = filterText
    ? targets.filter(
        (t) =>
          t.company.toLowerCase().includes(filterText.toLowerCase()) ||
          t.role.toLowerCase().includes(filterText.toLowerCase()) ||
          t.location?.toLowerCase().includes(filterText.toLowerCase()),
      )
    : targets

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-t-[3px] bg-hydra-surface border-hydra-border">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={column.color}>{column.icon}</span>
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${column.color}`}>
            {column.label}
          </h3>
        </div>
        <Badge
          variant="secondary"
          className="h-5 min-w-5 rounded-full px-1.5 text-[10px] tabular-nums"
        >
          {filtered.length}
        </Badge>
      </div>

      {/* Card list */}
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-2.5 pb-2.5 max-h-[calc(100vh-320px)]">
        <AnimatePresence mode="popLayout">
          <SortableContext
            items={filtered.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {filtered.map((target) => (
              <motion.div
                key={target.id}
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <SortableCard target={target} />
              </motion.div>
            ))}
          </SortableContext>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-muted-foreground/30">
              <Target className="mx-auto h-6 w-6" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/40">
              No targets here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Add Target Dialog                                                          */
/* -------------------------------------------------------------------------- */

function AddTargetDialog({
  onAdd,
}: {
  onAdd: (target: Omit<JobTarget, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    company: '',
    role: '',
    salary: '',
    location: '',
    priority: 'medium' as Priority,
    jobUrl: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.company.trim() || !form.role.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/job-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: form.company.trim(),
          role: form.role.trim(),
          salary: form.salary.trim() || null,
          location: form.location.trim() || null,
          priority: form.priority,
          jobUrl: form.jobUrl.trim() || null,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        onAdd({
          ...created,
        })
        setForm({
          company: '',
          role: '',
          salary: '',
          location: '',
          priority: 'medium',
          jobUrl: '',
          notes: '',
        })
        setOpen(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-hydra-purple hover:bg-hydra-purple/90">
          <Plus className="h-4 w-4" />
          Add Target
        </Button>
      </DialogTrigger>
      <DialogContent className="border-hydra-border bg-hydra-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            <Crosshair className="mr-2 inline h-4 w-4 text-hydra-purple" />
            New Target
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company" className="text-xs text-muted-foreground">
                Company
              </Label>
              <Input
                id="company"
                placeholder="Acme Corp"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="border-hydra-border bg-hydra-surface-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs text-muted-foreground">
                Role
              </Label>
              <Input
                id="role"
                placeholder="Senior Engineer"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="border-hydra-border bg-hydra-surface-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary" className="text-xs text-muted-foreground">
                Salary Range
              </Label>
              <Input
                id="salary"
                placeholder="$120k-$160k"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                className="border-hydra-border bg-hydra-surface-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs text-muted-foreground">
                Location
              </Label>
              <Input
                id="location"
                placeholder="San Francisco, CA"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="border-hydra-border bg-hydra-surface-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as Priority })
                }
              >
                <SelectTrigger className="border-hydra-border bg-hydra-surface-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-hydra-border bg-hydra-surface">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobUrl" className="text-xs text-muted-foreground">
                Job URL
              </Label>
              <Input
                id="jobUrl"
                placeholder="https://..."
                value={form.jobUrl}
                onChange={(e) => setForm({ ...form, jobUrl: e.target.value })}
                className="border-hydra-border bg-hydra-surface-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs text-muted-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any intel about this target..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-[72px] border-hydra-border bg-hydra-surface-2 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-hydra-border bg-hydra-surface-2 hover:bg-hydra-purple/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.company.trim() || !form.role.trim()}
              className="bg-hydra-purple hover:bg-hydra-purple/90"
            >
              {submitting ? 'Locking Target...' : 'Lock Target'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  Metric Summary Cards                                                       */
/* -------------------------------------------------------------------------- */

function MetricSummary({ targets }: { targets: JobTarget[] }) {
  const totalTargets = targets.length
  const inPipeline = targets.filter(
    (t) =>
      t.status === 'intel' ||
      t.status === 'acquired' ||
      t.status === 'payload_sent',
  ).length
  const interviews = targets.filter((t) => t.status === 'interview').length
  const offers = targets.filter((t) => t.status === 'offer').length

  const metrics = [
    {
      label: 'Total Targets',
      value: totalTargets,
      icon: <Crosshair className="h-4 w-4" />,
      color: 'text-hydra-purple',
      bg: 'bg-hydra-purple/10',
    },
    {
      label: 'In Pipeline',
      value: inPipeline,
      icon: <Zap className="h-4 w-4" />,
      color: 'text-hydra-cyan',
      bg: 'bg-hydra-cyan/10',
    },
    {
      label: 'Interviews',
      value: interviews,
      icon: <Swords className="h-4 w-4" />,
      color: 'text-hydra-yellow',
      bg: 'bg-hydra-yellow/10',
    },
    {
      label: 'Offers',
      value: offers,
      icon: <Trophy className="h-4 w-4" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <motion.div key={metric.label} variants={item}>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${metric.bg} ${metric.color}`}
              >
                {metric.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {metric.value}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {metric.label}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main Kill List Component                                                  */
/* -------------------------------------------------------------------------- */

export default function KillList() {
  const { setView } = useAppStore()
  const [targets, setTargets] = useState<JobTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [filterText, setFilterText] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  // Fetch targets from API
  useEffect(() => {
    fetch('/api/job-targets')
      .then((r) => r.json())
      .then((data: JobTarget[]) => {
        setTargets(Array.isArray(data) ? data : [])
      })
      .catch(() => setTargets([]))
      .finally(() => setLoading(false))
  }, [])

  // Group targets by column status
  const getColumnTargets = useCallback(
    (status: ColumnStatus) => {
      return targets
        .filter((t) => {
          if (t.status !== status) return false
          if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
          return true
        })
    },
    [targets, priorityFilter],
  )

  // Find the column a target id belongs to
  const findColumn = useCallback(
    (id: string): ColumnStatus => {
      const target = targets.find((t) => t.id === id)
      return (target?.status as ColumnStatus) ?? 'intel'
    },
    [targets],
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle drag over — move cards between columns
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeIdStr = active.id as string
      const overIdStr = over.id as string

      // Find which column the dragged item is currently in
      const activeColumn = findColumn(activeIdStr)

      // Determine the target column
      let overColumn: ColumnStatus
      if (COLUMNS.some((c) => c.id === overIdStr)) {
        // Dropped over a column directly
        overColumn = overIdStr as ColumnStatus
      } else {
        // Dropped over another card
        overColumn = findColumn(overIdStr)
      }

      if (activeColumn !== overColumn) {
        setTargets((prev) => {
          const activeTarget = prev.find((t) => t.id === activeIdStr)
          if (!activeTarget) return prev

          // Remove from old column, add to new column
          const updated = prev.map((t) =>
            t.id === activeIdStr ? { ...t, status: overColumn } : t,
          )
          return updated
        })
      }
    },
    [findColumn],
  )

  // Handle drag end — persist status change
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over) return

      const activeIdStr = active.id as string
      const overIdStr = over.id as string

      // Reorder within the same column
      if (activeIdStr !== overIdStr && !COLUMNS.some((c) => c.id === overIdStr)) {
        const overColumn = findColumn(overIdStr)
        const columnTargets = targets.filter((t) => t.status === overColumn)

        const oldIndex = columnTargets.findIndex((t) => t.id === activeIdStr)
        const newIndex = columnTargets.findIndex((t) => t.id === overIdStr)

        if (oldIndex !== -1 && newIndex !== -1) {
          setTargets((prev) => {
            const reordered = arrayMove(columnTargets, oldIndex, newIndex)
            return prev.map((t) => {
              const ri = reordered.findIndex((rt) => rt.id === t.id)
              return ri !== -1 ? reordered[ri] : t
            })
          })
        }
      }

      // Persist the status change via API
      const target = targets.find((t) => t.id === activeIdStr)
      if (target) {
        const targetColumn = findColumn(activeIdStr)
        if (targetColumn !== target.status) {
          try {
            await fetch(`/api/job-targets/${activeIdStr}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: targetColumn }),
            })
          } catch {
            // Silently fail — local state already updated
          }
        }
      }
    },
    [targets, findColumn],
  )

  // Add a new target from dialog
  const handleAddTarget = useCallback(
    (newTarget: JobTarget) => {
      setTargets((prev) => [newTarget, ...prev])
    },
    [],
  )

  // Get the active dragging card for overlay
  const activeTarget = activeId
    ? targets.find((t) => t.id === activeId)
    : null

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground animate-pulse text-sm">
          Scanning targets...
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="flex flex-col gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Kill List
        </h2>
        <p className="text-sm text-muted-foreground">
          Track your job targets through the elimination pipeline.
        </p>
      </motion.div>

      {/* Metric Summary */}
      <motion.div variants={item}>
        <MetricSummary targets={targets} />
      </motion.div>

      {/* Search / Filter Bar */}
      <motion.div variants={item} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Search targets..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="border-hydra-border bg-hydra-surface-2 pl-9"
          />
          {filterText && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              onClick={() => setFilterText('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] border-hydra-border bg-hydra-surface-2">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="border-hydra-border bg-hydra-surface">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <AddTargetDialog onAdd={handleAddTarget} />
        </div>
      </motion.div>

      {/* Kanban Board */}
      <motion.div variants={item} className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                targets={getColumnTargets(column.id)}
                filterText={filterText}
              />
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTarget ? (
              <Card className="w-64 cursor-grabbing bg-hydra-surface-2 p-3 shadow-2xl ring-2 ring-hydra-purple/40">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {activeTarget.company}
                      </p>
                      <Badge
                        variant="outline"
                        className={`shrink-0 border px-1.5 py-0 text-[10px] font-medium ${PRIORITY_CONFIG[activeTarget.priority].color}`}
                      >
                        {PRIORITY_CONFIG[activeTarget.priority].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Briefcase className="h-3 w-3 shrink-0" />
                      {activeTarget.role}
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </motion.div>
    </motion.div>
  )
}
