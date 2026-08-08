'use client'

import { useAppStore, type AppView } from '@/store/app-store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, lazy, Suspense, Component, type ReactNode } from 'react'

// Lazy load all views for code splitting
const LandingPage = lazy(() => import('@/components/landing/landing-page'))
const LoginPage = lazy(() => import('@/components/landing/login-page'))
const SignupPage = lazy(() => import('@/components/landing/signup-page'))
const PricingPage = lazy(() => import('@/components/features/pricing-page'))
const AppShell = lazy(() => import('@/components/app/app-shell'))
const Dashboard = lazy(() => import('@/components/app/dashboard'))
const KillList = lazy(() => import('@/components/features/kill-list'))
const ResumeForge = lazy(() => import('@/components/features/resume-forge'))
const PayloadForge = lazy(() => import('@/components/features/payload-forge'))
const InterviewDrills = lazy(() => import('@/components/features/interview-drills'))
const StrikeAnalysis = lazy(() => import('@/components/features/strike-analysis'))
const VersionVault = lazy(() => import('@/components/features/version-vault'))
const MissionLog = lazy(() => import('@/components/features/mission-log'))
const CareerMap = lazy(() => import('@/components/features/career-map'))
const SettingsPage = lazy(() => import('@/components/features/settings-page'))
const BillingPage = lazy(() => import('@/components/features/billing-page'))
const ContactPage = lazy(() => import('@/components/features/contact-page'))

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-hydra-purple/30 border-t-hydra-purple rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading systems...</p>
      </div>
    </div>
  )
}

class ViewErrorBoundary extends Component<{
  children: ReactNode
}, { hasError: boolean }> {
  state = { hasError: false, error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-5xl mb-2 text-hydra-purple/50">⚠</div>
          <h2 className="text-xl font-semibold text-foreground">System Malfunction</h2>
          <p className="text-sm text-hydra-muted max-w-md text-center">
            {this.state.error?.message || 'This module encountered an unexpected error.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-6 py-2.5 bg-hydra-purple text-white rounded-lg text-sm hover:bg-hydra-purple/90 transition-colors"
          >
            Reinitialize
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function SafeView({ children }: { children: ReactNode }) {
  return (
    <ViewErrorBoundary>
      {children}
    </ViewErrorBoundary>
  )
}

const PUBLIC_VIEWS: AppView[] = ['landing', 'pricing', 'login', 'signup', 'contact']

function AppRouter() {
  const { view, isAuthenticated } = useAppStore()

  const isPublicView = PUBLIC_VIEWS.includes(view)

  // Redirect to dashboard if authenticated user visits public pages (except landing/pricing/contact)
  if (isAuthenticated && ['login', 'signup'].includes(view)) {
    return (
      <AppShell>
        <Dashboard />
      </AppShell>
    )
  }

  // Public views (no app shell)
  if (isPublicView) {
    switch (view) {
      case 'landing':
        return <LandingPage />
      case 'login':
        return <LoginPage />
      case 'signup':
        return <SignupPage />
      case 'pricing':
        return <PricingPage />
      case 'contact':
        return <ContactPage />
      default:
        return <LandingPage />
    }
  }

  // Protected views (require app shell)
  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />
      case 'kill-list':
        return <KillList />
      case 'resume-forge':
      case 'resume-edit':
        return <ResumeForge />
      case 'payload-forge':
        return <PayloadForge />
      case 'interview-drills':
      case 'interview-session':
        return <SafeView><InterviewDrills /></SafeView>
      case 'analysis':
        return <SafeView><StrikeAnalysis /></SafeView>
      case 'version-vault':
        return <VersionVault />
      case 'mission-log':
        return <MissionLog />
      case 'career-map':
        return <CareerMap />
      case 'settings':
        return <SettingsPage />
      case 'billing':
        return <BillingPage />
      default:
        return <Dashboard />
    }
  }

  return <AppShell>{renderView()}</AppShell>
}

export default function Home() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingSpinner />}>
        <AppRouter />
      </Suspense>
    </QueryClientProvider>
  )
}
