import { create } from 'zustand'

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
  | 'settings'
  | 'billing'
  | 'contact'

interface AppState {
  view: AppView
  isAuthenticated: boolean
  user: {
    id: string
    email: string
    name: string | null
    plan: string
  } | null
  selectedResumeId: string | null
  selectedInterviewSessionId: string | null
  selectedAnalysisId: string | null
  sidebarOpen: boolean
  setView: (view: AppView) => void
  setAuthenticated: (auth: boolean, user?: AppState['user']) => void
  setSelectedResume: (id: string | null) => void
  setSelectedInterviewSession: (id: string | null) => void
  setSelectedAnalysis: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'landing',
  isAuthenticated: false,
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
      view: auth ? 'dashboard' : 'landing',
    }),
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
  logout: () =>
    set({
      isAuthenticated: false,
      user: null,
      view: 'landing',
      selectedResumeId: null,
      selectedInterviewSessionId: null,
      selectedAnalysisId: null,
    }),
}))

export type { AppView }
