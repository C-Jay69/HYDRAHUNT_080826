'use client'

export default function ErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <div className="text-5xl mb-2 text-hydra-purple/50">⚠</div>
      <h2 className="text-xl font-semibold text-foreground">System Malfunction</h2>
      <p className="text-sm text-hydra-muted max-w-md text-center">
        This module encountered an error. The engineering team has been notified.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-6 py-2.5 bg-hydra-purple text-white rounded-lg text-sm hover:bg-hydra-purple/90 transition-colors"
      >
        Reinitialize System
      </button>
    </div>
  )
}
