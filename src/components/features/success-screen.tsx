'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Crosshair, ArrowRight, RotateCcw, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'

interface TargetDownScreenProps {
  title?: string
  subtitle?: string
  primaryCta?: { label: string; onClick?: () => void; view?: 'dashboard' | 'kill-list' | 'resume-forge' | 'payload-forge' }
  secondaryCta?: { label: string; onClick?: () => void; view?: 'dashboard' | 'kill-list' | 'resume-forge' | 'payload-forge' }
  children?: ReactNode
}

/**
 * Success / "Target Down" screen shown after successful actions.
 * Includes animated success state and confetti (respects reduced motion).
 */
export default function TargetDownScreen({
  title = 'Target Down.',
  subtitle = 'Operation successful. The system has been updated.',
  primaryCta = { label: 'Return to Dashboard', view: 'dashboard' },
  secondaryCta,
  children,
}: TargetDownScreenProps) {
  const setView = useAppStore((s) => s.setView)
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; y: number; r: number; color: string; delay: number }>>([])

  useEffect(() => {
    // Generate confetti pieces only when motion is allowed
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const colors = ['#b154f8', '#06b6d4', '#22c55e', '#eab308', '#00f2ff', '#ef4444']
    const newPieces = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 100 + Math.random() * 20,
      r: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.6,
    }))
    setPieces(newPieces)
  }, [])

  function handlePrimary() {
    if (primaryCta.onClick) primaryCta.onClick()
    else if (primaryCta.view) setView(primaryCta.view)
  }

  function handleSecondary() {
    if (!secondaryCta) return
    if (secondaryCta.onClick) secondaryCta.onClick()
    else if (secondaryCta.view) setView(secondaryCta.view)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70vh] px-4 overflow-hidden">
      {/* Confetti pieces */}
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            className="absolute top-0 rounded-sm pointer-events-none"
            style={{ left: `${p.x}%`, width: p.r, height: p.r * 1.6, backgroundColor: p.color }}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{ y: `${p.y}vh`, opacity: [1, 1, 0], rotate: 360 + Math.random() * 360 }}
            transition={{ duration: 2.4 + Math.random() * 1.5, delay: p.delay, ease: 'easeOut' }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>

      {/* Central badge */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 rounded-full bg-hydra-green/30 blur-2xl" />
        <div className="relative w-24 h-24 rounded-full bg-hydra-green/15 border-2 border-hydra-green flex items-center justify-center">
          <Crosshair className="w-12 h-12 text-hydra-green" />
        </div>
        <motion.div
          className="absolute -inset-2 rounded-full border-2 border-dashed border-hydra-green/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center max-w-md"
      >
        <h1 className="text-4xl font-bold gradient-text glow-text-purple mb-2">{title}</h1>
        <p className="text-hydra-muted mb-6">{subtitle}</p>
      </motion.div>

      {/* Optional children (e.g. metrics, badges) */}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="w-full max-w-md mb-6"
        >
          {children}
        </motion.div>
      )}

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button onClick={handlePrimary} className="bg-hydra-purple hover:bg-hydra-purple/90 text-white gap-2">
          {primaryCta.label}
          <ArrowRight className="w-4 h-4" />
        </Button>
        {secondaryCta && (
          <Button variant="outline" onClick={handleSecondary} className="border-hydra-border gap-2">
            {secondaryCta.label}
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </motion.div>
    </div>
  )
}

/** Convenience icon block used inside success screens. */
export function SuccessActions() {
  const setView = useAppStore((s) => s.setView)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
      <Button variant="outline" className="border-hydra-border justify-start gap-2" onClick={() => setView('resume-forge')}>
        <Download className="w-4 h-4 text-hydra-cyan" /> Export Resume
      </Button>
      <Button variant="outline" className="border-hydra-border justify-start gap-2" onClick={() => setView('payload-forge')}>
        <Share2 className="w-4 h-4 text-hydra-purple" /> Generate Payload
      </Button>
      <Button variant="outline" className="border-hydra-border justify-start gap-2" onClick={() => setView('interview-drills')}>
        <CheckCircle2 className="w-4 h-4 text-hydra-green" /> Start Interview
      </Button>
    </div>
  )
}
