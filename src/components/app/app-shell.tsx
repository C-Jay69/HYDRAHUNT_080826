'use client'

import Sidebar from './sidebar'
import Header from './header'
import { useAppStore, type AppView } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'

/** Which backdrop artwork belongs to each workspace view. */
const SCENE_BY_VIEW: Record<AppView, string> = {
  landing: 'scene-lights',
  pricing: 'scene-dusk',
  login: 'scene-lights',
  signup: 'scene-lights',
  contact: 'scene-workspace',
  dashboard: 'scene-slate',
  'kill-list': 'scene-dusk',
  'resume-forge': 'scene-workspace',
  'resume-edit': 'scene-workspace',
  'payload-forge': 'scene-workspace',
  'interview-drills': 'scene-interview',
  'interview-session': 'scene-interview',
  analysis: 'scene-workspace',
  'version-vault': 'scene-workspace',
  'mission-log': 'scene-slate',
  'career-map': 'scene-dusk',
  'job-opportunities': 'scene-dusk',
  settings: 'scene-navy',
  billing: 'scene-navy',
  admin: 'scene-navy',
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen, view } = useAppStore()

  return (
    <div className="flex h-screen w-full overflow-hidden bg-hydra-dark">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — hidden off-screen on mobile unless toggled, always visible on md+ */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex-shrink-0 md:relative md:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile menu button + Header */}
        <div className="flex items-stretch">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center text-muted-foreground',
              'hover:bg-hydra-surface-2 hover:text-foreground transition-colors md:hidden'
            )}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <Header />
          </div>
        </div>

        {/* Page content */}
        <main className={cn('flex-1 overflow-auto scene scene-app', SCENE_BY_VIEW[view])}>
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
