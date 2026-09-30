'use client'

import { useEffect } from 'react'
import Home from '@/app/page'
import { useAppStore, type AppView } from '@/store/app-store'

interface RouteViewProps {
  initialView: AppView
  resumeId?: string
  sessionId?: string
  analysisId?: string
}

export default function RouteView({
  initialView,
  resumeId,
  sessionId,
  analysisId,
}: RouteViewProps) {
  const setView = useAppStore((s) => s.setView)
  const setSelectedResume = useAppStore((s) => s.setSelectedResume)
  const setSelectedInterviewSession = useAppStore((s) => s.setSelectedInterviewSession)
  const setSelectedAnalysis = useAppStore((s) => s.setSelectedAnalysis)

  useEffect(() => {
    if (resumeId) {
      setSelectedResume(resumeId)
      return
    }
    if (sessionId) {
      setSelectedInterviewSession(sessionId)
      return
    }
    if (analysisId) {
      setSelectedAnalysis(analysisId)
      return
    }
    setView(initialView)
  }, [
    initialView,
    resumeId,
    sessionId,
    analysisId,
    setView,
    setSelectedResume,
    setSelectedInterviewSession,
    setSelectedAnalysis,
  ])

  return <Home />
}
