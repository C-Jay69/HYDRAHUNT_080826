'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
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

export default function SignupPage() {
  const setView = useAppStore((s) => s.setView)
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' })
      return
    }

    if (password.length < 6) {
      toast({ title: 'Weak Payload', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Registration failed')
      }

      const data = await res.json()
      setAuthenticated(true, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        plan: data.user.plan,
        isAdmin: Boolean(data.user.isAdmin),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast({ title: 'Registration Denied', description: message, variant: 'destructive' })
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
            Initialize your hunter profile
          </p>
        </motion.div>

        {/* Card with glow */}
        <motion.div variants={fadeUp}>
          <Card className="border-hydra-border bg-hydra-surface glow-purple">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Hunter alias"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-hydra-surface-2 border-hydra-border focus:border-hydra-purple"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
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
                  <Label htmlFor="signup-password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
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
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-hydra-surface-2 border-hydra-border focus:border-hydra-purple"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Create Account */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-hydra-purple hover:bg-hydra-purple/90 text-white font-semibold h-11"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {loading ? 'Initializing...' : 'Create Account'}
                </Button>

                {/* Sign in link */}
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-hydra-cyan hover:text-hydra-cyan-bright transition-colors font-medium"
                  >
                    Sign in
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
