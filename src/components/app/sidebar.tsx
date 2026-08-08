'use client'

import { useAppStore, type AppView } from '@/store/app-store'
import {
  LayoutDashboard,
  Crosshair,
  FileText,
  Zap,
  Swords,
  Target,
  Shield,
  Map,
  ScrollText,
  Settings,
  CreditCard,
  LogOut,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  view: AppView
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
  { label: 'Kill List', view: 'kill-list', icon: Crosshair },
  { label: 'Resume Forge', view: 'resume-forge', icon: FileText },
  { label: 'Payload Forge', view: 'payload-forge', icon: Zap },
  { label: 'Interview Drills', view: 'interview-drills', icon: Swords },
  { label: 'Strike Analysis', view: 'analysis', icon: Target },
  { label: 'Version Vault', view: 'version-vault', icon: Shield },
  { label: 'Mission Log', view: 'mission-log', icon: ScrollText },
  { label: 'Career Map', view: 'career-map', icon: Map },
  { label: 'Settings', view: 'settings', icon: Settings },
  { label: 'Billing', view: 'billing', icon: CreditCard },
]

export default function Sidebar() {
  const { view, setView, user, logout, sidebarOpen, setSidebarOpen } =
    useAppStore()

  const handleNav = (itemView: AppView) => {
    setView(itemView)
    // On mobile, close sidebar after navigation
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-hydra-border bg-sidebar transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          'absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-hydra-border bg-hydra-surface text-muted-foreground hover:text-hydra-purple transition-colors',
          !sidebarOpen && 'rotate-180'
        )}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <ChevronLeft className="h-3 w-3" />
      </button>

      {/* Logo area */}
      <div className="flex h-14 items-center px-4 border-b border-hydra-border">
        {sidebarOpen && (
          <span className="text-sm font-bold tracking-wider gradient-text">
            HYDRAHUNT
          </span>
        )}
        {!sidebarOpen && (
          <span className="mx-auto text-xs font-bold text-hydra-purple">H</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = view === item.view
            return (
              <li key={item.view}>
                <button
                  onClick={() => handleNav(item.view)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-hydra-surface-2 hover:text-foreground',
                    'text-muted-foreground',
                    isActive && 'bg-hydra-purple/10 text-hydra-purple',
                    !sidebarOpen && 'justify-center px-2'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-hydra-border p-3">
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-2 py-2',
              !sidebarOpen && 'justify-center'
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hydra-purple/20 text-sm font-semibold text-hydra-purple">
              {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name || 'Hunter'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            'mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
            'hover:bg-hydra-red/10 hover:text-hydra-red',
            !sidebarOpen && 'justify-center px-2'
          )}
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  )
}
