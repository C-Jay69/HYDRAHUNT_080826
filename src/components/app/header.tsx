'use client'

import { useAppStore, type AppView } from '@/store/app-store'
import { Input } from '@/components/ui/input'
import { HydraMark } from '@/components/brand/hydra-logo'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useI18n } from '@/lib/i18n'
import type { Messages } from '@/lib/i18n'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEW_TITLE_KEYS: Record<AppView, keyof Messages['header']['titles']> = {
  landing: 'landing',
  pricing: 'pricing',
  login: 'login',
  signup: 'signup',
  dashboard: 'dashboard',
  'kill-list': 'killList',
  'resume-forge': 'resumeForge',
  'resume-edit': 'resumeEdit',
  'payload-forge': 'payloadForge',
  'interview-drills': 'interviewDrills',
  'interview-session': 'interviewSession',
  analysis: 'analysis',
  'version-vault': 'versionVault',
  'mission-log': 'missionLog',
  'career-map': 'careerMap',
  'job-opportunities': 'jobOpportunities',
  settings: 'settings',
  billing: 'billing',
  contact: 'contact',
  admin: 'admin',
}

export default function Header() {
  const { view } = useAppStore()
  const { m } = useI18n()
  const title = m.header.titles[VIEW_TITLE_KEYS[view]] ?? m.header.titles.dashboard

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-hydra-border bg-hydra-surface/80 px-6 backdrop-blur-sm">
      {/* Brand mark — the sidebar is off-canvas on mobile */}
      <HydraMark size={24} alt="" className="md:hidden" />

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
          placeholder={m.header.search}
          className={cn(
            'h-8 border-hydra-border bg-hydra-surface-2 text-sm',
            'focus-visible:border-hydra-purple/50 focus-visible:ring-hydra-purple/20',
            'placeholder:text-muted-foreground'
          )}
        />
      </div>

      {/* Language */}
      <LanguageSwitcher variant="full" />

      {/* Notification bell */}
      <button
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-lg',
          'text-muted-foreground hover:bg-hydra-surface-2 hover:text-foreground',
          'transition-colors'
        )}
        aria-label={m.header.notifications}
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-hydra-purple pulse-glow" />
      </button>
    </header>
  )
}
