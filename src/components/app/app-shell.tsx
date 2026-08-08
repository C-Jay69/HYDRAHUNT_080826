'use client'

import Sidebar from './sidebar'
import Header from './header'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

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
        <main className="flex-1 overflow-auto bg-grid">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
