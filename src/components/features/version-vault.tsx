'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Clock, Plus, ArrowUpRight, ArrowDownRight, Minus, RotateCcw, FileText } from 'lucide-react'
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

interface Version {
  id: string
  resumeId: string
  label: string
  notes: string
  changes: {
    new: string[]
    changed: string[]
    deleted: string[]
  }
  createdAt: string
}

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

export default function VersionVault() {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newNotes, setNewNotes] = useState('')

  useEffect(() => {
    fetchVersions()
  }, [])

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/versions')
      if (res.ok) {
        const data = await res.json()
        setVersions(Array.isArray(data) ? data : data.versions || [])
      } else {
        // Demo data
        setVersions([
          {
            id: 'v1',
            resumeId: 'r1',
            label: 'Initial Draft',
            notes: 'First version created from template',
            changes: { new: ['Summary', 'Experience', 'Education', 'Skills', 'Projects'], changed: [], deleted: [] },
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'v2',
            resumeId: 'r1',
            label: 'Added Projects Section',
            notes: 'Added 3 new projects with descriptions',
            changes: { new: ['Portfolio Site', 'API Gateway'], changed: ['Skills'], deleted: [] },
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'v3',
            resumeId: 'r1',
            label: 'ATS Optimization Pass',
            notes: 'Rewrote bullet points with stronger action verbs and keywords',
            changes: { new: [], changed: ['Experience', 'Summary'], deleted: ['Old References Section'] },
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'v4',
            resumeId: 'r1',
            label: 'Before Interview',
            notes: 'Final polish for Acme Corp application',
            changes: { new: ['Certifications'], changed: ['Education', 'Skills'], deleted: [] },
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'v5',
            resumeId: 'r1',
            label: 'Post-Interview Update',
            notes: 'Added interview learnings and refined summary',
            changes: { new: [], changed: ['Summary', 'Experience'], deleted: [] },
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ])
      }
    } catch {
      setVersions([])
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId)
    try {
      const res = await fetch(`/api/versions/${versionId}/restore`, { method: 'PUT' })
      if (res.ok) {
        // Success — could navigate to resume editor
      }
    } catch {
      // silent
    } finally {
      setRestoring(null)
    }
  }

  const handleCreateVersion = async () => {
    if (!newLabel.trim()) return
    try {
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel, notes: newNotes }),
      })
      if (res.ok) {
        setCreateOpen(false)
        setNewLabel('')
        setNewNotes('')
        fetchVersions()
      }
    } catch {
      // silent
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-hydra-purple/10 border border-hydra-border">
            <Shield className="w-5 h-5 text-hydra-purple" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Version Vault</h1>
            <p className="text-sm text-hydra-muted">Resume version history and restore points</p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-hydra-purple hover:bg-hydra-purple/80 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Save Version
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-hydra-surface border-hydra-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Save New Version</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-hydra-muted">Version Label</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Before Interview Round"
                  className="bg-hydra-surface-2 border-hydra-border text-foreground mt-1"
                />
              </div>
              <div>
                <Label className="text-hydra-muted">Notes</Label>
                <Input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="What changed in this version?"
                  className="bg-hydra-surface-2 border-hydra-border text-foreground mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateVersion}
                  disabled={!newLabel.trim()}
                  className="bg-hydra-purple hover:bg-hydra-purple/80 text-white"
                >
                  Save Version
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-hydra-surface-2 animate-pulse" />
          ))}
        </div>
      )}

      {/* Timeline */}
      {!loading && versions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-16 h-16 rounded-full bg-hydra-purple/10 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-hydra-purple/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Versions Yet</h3>
          <p className="text-sm text-hydra-muted text-center max-w-md">
            Save a snapshot of your resume to track changes and restore previous versions at any time.
          </p>
        </motion.div>
      )}

      {!loading && versions.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative"
        >
          {/* Timeline line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-px bg-hydra-border" />

          <div className="space-y-1">
            {versions.map((version, index) => (
              <motion.div
                key={version.id}
                variants={item}
                className="relative pl-14"
              >
                {/* Timeline dot */}
                <div className={`absolute left-4 top-6 w-[18px] h-[18px] rounded-full border-2 ${
                  index === 0
                    ? 'bg-hydra-purple border-hydra-purple shadow-[0_0_12px_rgba(177,84,248,0.5)]'
                    : 'bg-hydra-surface border-hydra-border'
                }`} />

                <Card className="bg-hydra-surface-2 border-hydra-border card-hover">
                  <CardContent className="p-4">
                    {/* Top row: label + date */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {index === 0 ? (
                          <Badge className="bg-hydra-purple/20 text-hydra-purple border-hydra-purple/30 shrink-0">
                            <FileText className="w-3 h-3 mr-1" />
                            Latest
                          </Badge>
                        ) : null}
                        <h3 className="font-semibold text-foreground truncate">{version.label}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-hydra-muted shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs" title={formatDateTime(version.createdAt)}>
                          {formatDate(version.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {version.notes && (
                      <p className="text-sm text-hydra-muted mb-3">{version.notes}</p>
                    )}

                    {/* Diff Indicators */}
                    {(version.changes?.new?.length > 0 || version.changes?.changed?.length > 0 || version.changes?.deleted?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {version.changes.new?.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="text-[11px] py-0 px-1.5 bg-hydra-green/10 text-hydra-green border-hydra-green/30"
                          >
                            <Plus className="w-2.5 h-2.5 mr-0.5" />
                            {s}
                          </Badge>
                        ))}
                        {version.changes.changed?.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="text-[11px] py-0 px-1.5 bg-hydra-yellow/10 text-hydra-yellow border-hydra-yellow/30"
                          >
                            <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                            {s}
                          </Badge>
                        ))}
                        {version.changes.deleted?.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="text-[11px] py-0 px-1.5 bg-hydra-red/10 text-hydra-red border-hydra-red/30"
                          >
                            <Minus className="w-2.5 h-2.5 mr-0.5" />
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Restore Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(version.id)}
                      disabled={restoring === version.id}
                      className="text-hydra-cyan hover:text-hydra-cyan hover:bg-hydra-cyan/10 h-8 text-xs"
                    >
                      {restoring === version.id ? (
                        <RotateCcw className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      )}
                      Restore This Version
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
