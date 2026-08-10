import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AppView =
  | 'landing'
  | 'pricing'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'kill-list'
  | 'resume-forge'
  | 'resume-edit'
  | 'payload-forge'
  | 'interview-drills'
  | 'interview-session'
  | 'analysis'
  | 'version-vault'
  | 'mission-log'
  | 'career-map'
  | 'job-opportunities'
  | 'settings'
  | 'billing'
  | 'contact'
  | 'admin'

interface AppState {
  view: AppView
  isAuthenticated: boolean
  sessionChecked: boolean
  user: {
    id: string
    email: string
    name: string | null
    plan: string
    isAdmin?: boolean
  } | null
  selectedResumeId: string | null
  selectedInterviewSessionId: string | null
  selectedAnalysisId: string | null
  sidebarOpen: boolean
  setView: (view: AppView) => void
  setAuthenticated: (auth: boolean, user?: AppState['user']) => void
  restoreSession: () => Promise<void>
  setSelectedResume: (id: string | null) => void
  setSelectedInterviewSession: (id: string | null) => void
  setSelectedAnalysis: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'landing',
      isAuthenticated: false,
      sessionChecked: false,
      user: null,
      selectedResumeId: null,
      selectedInterviewSessionId: null,
      selectedAnalysisId: null,
      sidebarOpen: true,
      setView: (view) => set({ view }),
      setAuthenticated: (auth, user) =>
        set({
          isAuthenticated: auth,
          user: user || null,
          view: auth ? (get().view === 'login' || get().view === 'signup' ? 'dashboard' : get().view) : 'landing',
        }),
      restoreSession: async () => {
        try {
          const res = await fetch('/api/auth/me')
          if (res.ok) {
            const data = await res.json()
            const { id, email, name, plan, isAdmin } = data.user
            set({
              isAuthenticated: true,
              sessionChecked: true,
              user: { id, email, name, plan, isAdmin: Boolean(isAdmin) },
              view: get().view === 'landing' ? 'dashboard' : get().view,
            })
          } else {
            set({ isAuthenticated: false, sessionChecked: true, user: null })
          }
        } catch {
          set({ isAuthenticated: false, sessionChecked: true, user: null })
        }
      },
      setSelectedResume: (id) => {
        set({ selectedResumeId: id })
        if (id) set({ view: 'resume-edit' })
      },
      setSelectedInterviewSession: (id) => {
        set({ selectedInterviewSessionId: id })
        if (id) set({ view: 'interview-session' })
      },
      setSelectedAnalysis: (id) => {
        set({ selectedAnalysisId: id })
        if (id) set({ view: 'analysis' })
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } catch {
          // ignore network errors during logout
        }
        set({
          isAuthenticated: false,
          user: null,
          view: 'landing',
          sessionChecked: true,
          selectedResumeId: null,
          selectedInterviewSessionId: null,
          selectedAnalysisId: null,
        })
      },
    }),
    {
      name: 'hydrahunt-store',
      partialize: (state) => ({
        view: state.view,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
)

export type { AppView }
