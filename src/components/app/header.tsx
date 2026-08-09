'use client'

import { useAppStore, type AppView } from '@/store/app-store'
import { Input } from '@/components/ui/input'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const viewTitles: Record<AppView, string> = {
  landing: 'Welcome',
  pricing: 'Pricing',
  login: 'Login',
  signup: 'Sign Up',
  dashboard: 'Command Center',
  'kill-list': 'Kill List',
  'resume-forge': 'Resume Forge',
  'resume-edit': 'Resume Editor',
  'payload-forge': 'Payload Forge',
  'interview-drills': 'Interview Drills',
  'interview-session': 'Interview Session',
  analysis: 'Strike Analysis',
  'version-vault': 'Version Vault',
  'mission-log': 'Mission Log',
  'career-map': 'Career Map',
  settings: 'Settings',
  billing: 'Billing',
  contact: 'Contact',
  admin: 'Admin Panel',
}

export default function Header() {
  const { view } = useAppStore()
  const title = viewTitles[view] || 'Dashboard'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-hydra-border bg-hydra-surface/80 px-6 backdrop-blur-sm">
      {/* View title */}
      <h1 className="text-sm font-semibold tracking-wide text-foreground">
        {title}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden sm:block w-64">
        <Input
          type="search"
          placeholder="Search..."
          className={cn(
            'h-8 border-hydra-border bg-hydra-surface-2 text-sm',
            'focus-visible:border-hydra-purple/50 focus-visible:ring-hydra-purple/20',
            'placeholder:text-muted-foreground'
          )}
        />
      </div>

      {/* Notification bell */}
      <button
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-lg',
          'text-muted-foreground hover:bg-hydra-surface-2 hover:text-foreground',
          'transition-colors'
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-hydra-purple pulse-glow" />
      </button>
    </header>
  )
}
