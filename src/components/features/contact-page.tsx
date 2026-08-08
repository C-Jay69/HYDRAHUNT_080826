'use client'

import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Mail,
  Clock,
  User,
  MessageSquare,
  CheckCircle2,
  Radio,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/app-store'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}

/* ------------------------------------------------------------------ */
/*  Subjects                                                           */
/* ------------------------------------------------------------------ */

const subjects = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'billing', label: 'Billing' },
] as const

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ContactPage() {
  const setView = useAppStore((s) => s.setView)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!subject) return

    setLoading(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      setSuccess(true)
    } catch {
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-grid">
      <motion.div
        className="w-full max-w-4xl"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Header */}
        <motion.div className="text-center mb-10" variants={fadeUp}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Radio className="h-5 w-5 text-hydra-cyan" />
            <h1 className="text-3xl font-bold gradient-text">Contact Command</h1>
            <Radio className="h-5 w-5 text-hydra-cyan" />
          </div>
          <p className="text-sm text-muted-foreground">
            Transmit your signal — we&apos;ll decode and respond within 24-48 hours.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <motion.div className="lg:col-span-2" variants={fadeUp}>
            <Card className="border-hydra-border bg-hydra-surface glow-purple">
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div
                      key="success"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <motion.div variants={scaleIn}>
                        <CheckCircle2 className="h-16 w-16 text-hydra-green mb-4" />
                      </motion.div>
                      <motion.h2
                        className="text-xl font-semibold text-foreground mb-2"
                        variants={fadeUp}
                      >
                        Signal Transmitted
                      </motion.h2>
                      <motion.p
                        className="text-sm text-muted-foreground mb-6 max-w-sm"
                        variants={fadeUp}
                      >
                        Your message has been received. Expect a response within 24-48 hours.
                      </motion.p>
                      <motion.div variants={fadeUp}>
                        <Button
                          onClick={() => {
                            setSuccess(false)
                            setName('')
                            setEmail('')
                            setSubject('')
                            setMessage('')
                          }}
                          className="bg-hydra-purple hover:bg-hydra-purple/90 text-white"
                        >
                          Send Another Signal
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit}
                      className="space-y-5"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={{
                        visible: { transition: { staggerChildren: 0.06 } },
                      }}
                    >
                      {/* Name & Email row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.div className="space-y-2" variants={fadeUp}>
                          <Label htmlFor="contact-name" className="text-sm font-medium">
                            Name
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="contact-name"
                              type="text"
                              placeholder="Your callsign"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="pl-10 bg-hydra-surface-2 border-hydra-border focus:border-hydra-purple"
                            />
                          </div>
                        </motion.div>

                        <motion.div className="space-y-2" variants={fadeUp}>
                          <Label htmlFor="contact-email" className="text-sm font-medium">
                            Email
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="contact-email"
                              type="email"
                              placeholder="hunter@hydrahunt.ai"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10 bg-hydra-surface-2 border-hydra-border focus:border-hydra-purple"
                            />
                          </div>
                        </motion.div>
                      </div>

                      {/* Subject */}
                      <motion.div className="space-y-2" variants={fadeUp}>
                        <Label htmlFor="contact-subject" className="text-sm font-medium">
                          Subject
                        </Label>
                        <Select value={subject} onValueChange={setSubject} required>
                          <SelectTrigger className="bg-hydra-surface-2 border-hydra-border focus:border-hydra-purple">
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                          <SelectContent className="bg-hydra-surface border-hydra-border">
                            {subjects.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>

                      {/* Message */}
                      <motion.div className="space-y-2" variants={fadeUp}>
                        <Label htmlFor="contact-message" className="text-sm font-medium">
                          Message
                        </Label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            id="contact-message"
                            placeholder="Describe your transmission..."
                            required
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="pl-10 bg-hydra-surface-2 border-hydra-border focus:border-hydra-purple resize-none"
                          />
                        </div>
                      </motion.div>

                      {/* Submit */}
                      <motion.div variants={fadeUp}>
                        <Button
                          type="submit"
                          disabled={loading || !subject}
                          className="w-full bg-hydra-purple hover:bg-hydra-purple/90 text-white font-semibold h-11"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          {loading ? 'Transmitting...' : 'Send Message'}
                        </Button>
                      </motion.div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar info */}
          <motion.div className="space-y-4" variants={fadeUp}>
            <Card className="border-hydra-border bg-hydra-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-hydra-cyan flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground font-medium">support@hydrahunt.ai</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Direct line to our support team.
                </p>
              </CardContent>
            </Card>

            <Card className="border-hydra-border bg-hydra-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-hydra-cyan flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground font-medium">24–48 Hours</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We decode and respond to all signals during business days.
                </p>
              </CardContent>
            </Card>

            <Card className="border-hydra-border bg-hydra-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-hydra-cyan flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-hydra-green pulse-glow" />
                  <span className="text-sm text-foreground font-medium">Systems Online</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All systems operational.
                </p>
              </CardContent>
            </Card>

            {/* Back link */}
            <button
              type="button"
              onClick={() => setView('landing')}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              ← Back to Home
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
