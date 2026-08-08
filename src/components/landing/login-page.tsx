'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/app-store'
import { toast } from '@/hooks/use-toast'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const setView = useAppStore((s) => s.setView)
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Authentication failed')
      }

      const data = await res.json()
      setAuthenticated(true, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        plan: data.user.plan,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast({ title: 'Access Denied', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-grid">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Logo */}
        <motion.div className="text-center mb-8" variants={fadeUp}>
          <h1 className="text-3xl font-bold gradient-text">HydraHunt</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Authenticate to access the command center
          </p>
        </motion.div>

        {/* Card with glow */}
        <motion.div variants={fadeUp}>
          <Card className="border-hydra-border bg-hydra-surface glow-purple">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="hunter@hydrahunt.ai"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-hydra-surface-2 border-hydra-border focus:border-hydra-purple"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-hydra-surface-2 border-hydra-border focus:border-hydra-purple"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Sign In */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-hydra-purple hover:bg-hydra-purple/90 text-white font-semibold h-11"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {loading ? 'Authenticating...' : 'Sign In'}
                </Button>

                {/* Divider */}
                <div className="relative flex items-center my-4">
                  <div className="flex-grow border-t border-hydra-border" />
                  <span className="mx-3 text-xs text-muted-foreground uppercase tracking-wider">
                    or
                  </span>
                  <div className="flex-grow border-t border-hydra-border" />
                </div>

                {/* Google */}
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-md border border-hydra-border bg-transparent hover:bg-hydra-surface-2 transition-colors cursor-pointer text-sm font-medium"
                  onClick={() =>
                    toast({
                      title: 'Coming Soon',
                      description: 'Google sign-in will be available in a future update.',
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toast({
                        title: 'Coming Soon',
                        description: 'Google sign-in will be available in a future update.',
                      })
                    }
                  }}
                >
                  {/* Simple Google icon as SVG */}
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </div>

                {/* Sign up link */}
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('signup')}
                    className="text-hydra-cyan hover:text-hydra-cyan-bright transition-colors font-medium"
                  >
                    Sign up
                  </button>
                </p>

                {/* Back to home link */}
                <p className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setView('landing')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to Home
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
