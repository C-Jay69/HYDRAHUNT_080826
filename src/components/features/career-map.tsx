'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase,
  GraduationCap,
  Trophy,
  Target,
  Wrench,
  Award,
  Plus,
  Star,
  Zap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type NodeType = 'current_role' | 'target_role' | 'skill' | 'certification' | 'milestone'
type NodeStatus = 'pending' | 'in_progress' | 'completed'

interface CareerNode {
  id: string
  type: NodeType
  label: string
  description: string
  status: NodeStatus
  parentId?: string
  childrenIds?: string[]
}

const NODE_ICONS: Record<NodeType, typeof Briefcase> = {
  current_role: Briefcase,
  target_role: Target,
  skill: Wrench,
  certification: Award,
  milestone: Trophy,
}

const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  pending: {
    label: 'Pending',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-hydra-yellow',
    bgColor: 'bg-hydra-yellow/10',
    borderColor: 'border-hydra-yellow/30',
  },
  completed: {
    label: 'Completed',
    color: 'text-hydra-green',
    bgColor: 'bg-hydra-green/10',
    borderColor: 'border-hydra-green/30',
  },
}

const DEMO_NODES: CareerNode[] = [
  {
    id: 'n1',
    type: 'current_role',
    label: 'Senior Product Manager',
    description: 'Current role at TechCorp. Leading cross-functional team of 8 engineers and designers.',
    status: 'completed',
    childrenIds: ['n2', 'n3', 'n4'],
  },
  {
    id: 'n2',
    type: 'skill',
    label: 'System Design',
    description: 'Deepen knowledge of distributed systems, microservices architecture, and scalability patterns.',
    status: 'in_progress',
    parentId: 'n1',
  },
  {
    id: 'n3',
    type: 'certification',
    label: 'AWS Solutions Architect',
    description: 'Professional-level AWS certification for cloud infrastructure expertise.',
    status: 'pending',
    parentId: 'n1',
  },
  {
    id: 'n4',
    type: 'milestone',
    label: 'Lead Product Launch',
    description: 'Successfully lead the Q4 product launch with $2M ARR target.',
    status: 'completed',
    parentId: 'n1',
  },
  {
    id: 'n5',
    type: 'target_role',
    label: 'VP of Product',
    description: 'Target executive role leading product strategy for a Series C startup or public company.',
    status: 'pending',
  },
  {
    id: 'n6',
    type: 'skill',
    label: 'Executive Communication',
    description: 'Board presentations, investor relations, and public speaking skills.',
    status: 'pending',
    parentId: 'n5',
  },
  {
    id: 'n7',
    type: 'skill',
    label: 'P&L Management',
    description: 'Financial planning, budget ownership, and revenue forecasting.',
    status: 'in_progress',
    parentId: 'n5',
  },
  {
    id: 'n8',
    type: 'certification',
    label: 'MBA / Executive Program',
    description: 'Part-time executive MBA or leadership program from top-tier business school.',
    status: 'pending',
    parentId: 'n5',
  },
  {
    id: 'n9',
    type: 'milestone',
    label: 'Build 50-Person Org',
    description: 'Scale product organization from current team to 50+ across multiple product lines.',
    status: 'pending',
    parentId: 'n5',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4 } },
}

function NodeCard({
  node,
  onStatusChange,
  depth = 0,
}: {
  node: CareerNode
  onStatusChange: (id: string, status: NodeStatus) => void
  depth?: number
}) {
  const [hovered, setHovered] = useState(false)
  const IconComp = NODE_ICONS[node.type]
  const status = STATUS_CONFIG[node.status]

  const glowClass =
    node.type === 'current_role'
      ? 'hover:shadow-[0_0_30px_rgba(177,84,248,0.2)] border-hydra-purple/30'
      : node.type === 'target_role'
      ? 'hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] border-hydra-cyan/30'
      : 'border-hydra-border'

  const iconBgClass =
    node.type === 'current_role'
      ? 'bg-hydra-purple/15'
      : node.type === 'target_role'
      ? 'bg-hydra-cyan/15'
      : node.type === 'skill'
      ? 'bg-hydra-yellow/15'
      : node.type === 'certification'
      ? 'bg-hydra-purple/15'
      : 'bg-hydra-green/15'

  const iconColorClass =
    node.type === 'current_role'
      ? 'text-hydra-purple'
      : node.type === 'target_role'
      ? 'text-hydra-cyan'
      : node.type === 'skill'
      ? 'text-hydra-yellow'
      : node.type === 'certification'
      ? 'text-hydra-purple'
      : 'text-hydra-green'

  const nextStatus: Record<NodeStatus, NodeStatus> = {
    pending: 'in_progress',
    in_progress: 'completed',
    completed: 'pending',
  }

  return (
    <motion.div variants={item} className="relative" style={{ paddingLeft: depth * 32 }}>
      {/* Connecting line for child nodes */}
      {depth > 0 && (
        <div className="absolute -left-4 top-0 bottom-0 w-px bg-hydra-border" />
      )}
      {depth > 0 && (
        <div className="absolute -left-4 top-5 left-0 w-4 h-px bg-hydra-border" />
      )}

      <Card
        className={`bg-hydra-surface-2 card-hover ${glowClass} mb-3 transition-shadow`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Type Icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass}`}>
              <IconComp className={`w-5 h-5 ${iconColorClass}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground text-sm">{node.label}</h3>
                {node.type === 'current_role' && (
                  <Badge className="bg-hydra-purple/20 text-hydra-purple border-hydra-purple/30 text-[10px] px-1.5 py-0">
                    Current
                  </Badge>
                )}
                {node.type === 'target_role' && (
                  <Badge className="bg-hydra-cyan/20 text-hydra-cyan border-hydra-cyan/30 text-[10px] px-1.5 py-0">
                    Target
                  </Badge>
                )}
              </div>
              <p className="text-xs text-hydra-muted leading-relaxed mb-2">{node.description}</p>

              {/* Status */}
              <button
                onClick={() => onStatusChange(node.id, nextStatus[node.status])}
                className="flex items-center gap-1.5 group"
                title="Click to cycle status"
              >
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${status.bgColor} ${status.color} ${status.borderColor} group-hover:opacity-80 transition-opacity`}>
                  {node.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                  {node.status === 'in_progress' && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hydra-yellow/60" />
                      <Circle className="w-3 h-3 relative" />
                    </span>
                  )}
                  {node.status === 'pending' && <Circle className="w-3 h-3" />}
                  {status.label}
                </span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function CareerMap() {
  const [nodes, setNodes] = useState<CareerNode[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState<NodeType>('skill')
  const [newParent, setNewParent] = useState<string>('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchMap()
  }, [])

  const fetchMap = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/career-map')
      if (res.ok) {
        const data = await res.json()
        setNodes(Array.isArray(data) ? data : data.nodes || [])
      } else {
        setNodes(DEMO_NODES)
      }
    } catch {
      setNodes(DEMO_NODES)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: string, status: NodeStatus) => {
    try {
      await fetch(`/api/career-map`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
    } catch {
      // silent
    }
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status } : n))
    )
  }

  const handleAddNode = async () => {
    if (!newLabel.trim()) return
    try {
      const res = await fetch('/api/career-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          label: newLabel,
          description: newDesc,
          parentId: newParent || undefined,
        }),
      })
      if (res.ok) {
        setAddOpen(false)
        setNewLabel('')
        setNewDesc('')
        setNewParent('')
        fetchMap()
      }
    } catch {
      // silent fallback
      const newNode: CareerNode = {
        id: `n-${Date.now()}`,
        type: newType,
        label: newLabel,
        description: newDesc,
        status: 'pending',
        parentId: newParent || undefined,
      }
      setNodes((prev) => [...prev, newNode])
      setAddOpen(false)
      setNewLabel('')
      setNewDesc('')
      setNewParent('')
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Build tree structure: group nodes by parentId
  const rootNodes = nodes.filter((n) => !n.parentId)
  const childMap = new Map<string, CareerNode[]>()
  nodes.forEach((n) => {
    if (n.parentId) {
      const existing = childMap.get(n.parentId) || []
      existing.push(n)
      childMap.set(n.parentId, existing)
    }
  })

  const renderTree = (node: CareerNode, depth: number): React.ReactNode => {
    const children = childMap.get(node.id) || []
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id) || depth === 0

    return (
      <div key={node.id}>
        <div
          className="cursor-pointer"
          onClick={() => hasChildren && toggleExpand(node.id)}
        >
          <NodeCard node={node} onStatusChange={handleStatusChange} depth={depth} />
        </div>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children.map((child) => renderTree(child, depth + 1))}
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-hydra-cyan/10 border border-hydra-border-cyan">
            <Zap className="w-5 h-5 text-hydra-cyan" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Career Map</h1>
            <p className="text-sm text-hydra-muted">Your career roadmap — plan, track, and level up</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-hydra-purple hover:bg-hydra-purple/80 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Node
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-hydra-surface border-hydra-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Career Node</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-hydra-muted">Node Type</Label>
                <div className="flex gap-2 mt-1">
                  {(['skill', 'certification', 'milestone'] as NodeType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        newType === type
                          ? 'bg-hydra-purple/20 text-hydra-purple border-hydra-purple/30'
                          : 'text-hydra-muted hover:text-foreground border-hydra-border hover:bg-hydra-surface-2'
                      }`}
                    >
                      {type === 'skill' ? 'Skill' : type === 'certification' ? 'Certification' : 'Milestone'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-hydra-muted">Label</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Learn Machine Learning"
                  className="bg-hydra-surface-2 border-hydra-border text-foreground mt-1"
                />
              </div>
              <div>
                <Label className="text-hydra-muted">Description</Label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What this node represents"
                  className="bg-hydra-surface-2 border-hydra-border text-foreground mt-1"
                />
              </div>
              <div>
                <Label className="text-hydra-muted">Parent Node (optional)</Label>
                <select
                  value={newParent}
                  onChange={(e) => setNewParent(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-hydra-surface-2 border border-hydra-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-hydra-purple"
                >
                  <option value="">None (root level)</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddNode}
                  disabled={!newLabel.trim()}
                  className="bg-hydra-purple hover:bg-hydra-purple/80 text-white"
                >
                  Add Node
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-hydra-purple shadow-[0_0_8px_rgba(177,84,248,0.4)]" />
          <span className="text-hydra-muted">Current Role</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-hydra-cyan shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
          <span className="text-hydra-muted">Target Role</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-hydra-green" />
          <span className="text-hydra-muted">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-hydra-yellow" />
          <span className="text-hydra-muted">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="w-3 h-3 text-gray-400" />
          <span className="text-hydra-muted">Pending</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-hydra-surface-2 animate-pulse" />
          ))}
        </div>
      )}

      {/* Tree Map */}
      {!loading && nodes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-16 h-16 rounded-full bg-hydra-cyan/10 flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-hydra-cyan/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Career Nodes Yet</h3>
          <p className="text-sm text-hydra-muted text-center max-w-md">
            Build your career roadmap by adding goals, skills, certifications, and milestones.
          </p>
        </motion.div>
      )}

      {!loading && nodes.length > 0 && (
        <motion.div variants={container} initial="hidden" animate="show">
          {rootNodes.map((node) => renderTree(node, 0))}
        </motion.div>
      )}
    </div>
  )
}
