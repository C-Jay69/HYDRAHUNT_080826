'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  User,
  Target,
  Bell,
  Moon,
  Globe,
  Linkedin,
  Github,
  Phone,
  MapPin,
  DollarSign,
  Briefcase,
  BarChart3,
  Save,
  Loader2,
  Shield,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

interface UserProfile {
  id: string
  name: string | null
  email: string
  image?: string | null
  headline?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
  linkedin?: string | null
  github?: string | null
  phone?: string | null
  targetRole?: string | null
  targetSalary?: string | null
  targetLocation?: string | null
  experienceLevel?: string | null
  notificationsEnabled?: boolean
}

const EXPERIENCE_LEVELS = ['Entry Level', 'Mid Level', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Suite', 'Executive']

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    headline: '',
    bio: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    phone: '',
    targetRole: '',
    targetSalary: '',
    targetLocation: '',
    experienceLevel: '',
    notificationsEnabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setProfile({
          id: data.id || '',
          name: data.name || '',
          email: data.email || '',
          headline: data.headline || '',
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
          phone: data.phone || '',
          targetRole: data.targetRole || '',
          targetSalary: data.targetSalary || '',
          targetLocation: data.targetLocation || '',
          experienceLevel: data.experienceLevel || '',
          notificationsEnabled: data.notificationsEnabled ?? true,
        })
      } else {
        // Demo profile
        setProfile({
          id: 'demo',
          name: 'Alex Chen',
          email: 'alex.chen@hydrahunt.io',
          headline: 'Senior Product Manager',
          bio: 'Passionate product leader with 8+ years of experience building B2B SaaS products. Specializing in AI/ML-driven features and growth strategies.',
          location: 'San Francisco, CA',
          website: 'https://alexchen.dev',
          linkedin: 'linkedin.com/in/alexchen',
          github: 'github.com/alexchen',
          phone: '+1 (415) 555-0132',
          targetRole: 'VP of Product',
          targetSalary: '$250K - $350K',
          targetLocation: 'San Francisco, CA | Remote',
          experienceLevel: 'Director',
          notificationsEnabled: true,
        })
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof UserProfile, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-hydra-surface-2 animate-pulse" />
          <div className="h-6 w-40 rounded bg-hydra-surface-2 animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-lg bg-hydra-surface-2 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-hydra-purple/10 border border-hydra-border">
          <Settings className="w-5 h-5 text-hydra-purple" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-hydra-muted">Manage your profile and preferences</p>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 max-w-3xl"
      >
        {/* Profile Section */}
        <motion.div variants={item}>
          <Card className="bg-hydra-surface-2 border-hydra-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-hydra-purple" />
                <h2 className="text-base font-semibold text-foreground">Profile</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 block">Name</Label>
                  <Input
                    value={profile.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Your name"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 block">
                    Email
                    <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 text-hydra-muted border-hydra-border">
                      Read Only
                    </Badge>
                  </Label>
                  <Input
                    value={profile.email || ''}
                    disabled
                    className="bg-hydra-surface/50 border-hydra-border text-hydra-muted"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-hydra-muted text-xs mb-1.5 block">Headline</Label>
                  <Input
                    value={profile.headline || ''}
                    onChange={(e) => updateField('headline', e.target.value)}
                    placeholder="e.g. Senior Product Manager"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-hydra-muted text-xs mb-1.5 block">Bio</Label>
                  <Textarea
                    value={profile.bio || ''}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="bg-hydra-surface border-hydra-border text-foreground resize-none custom-scrollbar"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Location
                  </Label>
                  <Input
                    value={profile.location || ''}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Website
                  </Label>
                  <Input
                    value={profile.website || ''}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </Label>
                  <Input
                    value={profile.linkedin || ''}
                    onChange={(e) => updateField('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/yourprofile"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <Github className="w-3 h-3" /> GitHub
                  </Label>
                  <Input
                    value={profile.github || ''}
                    onChange={(e) => updateField('github', e.target.value)}
                    placeholder="github.com/yourusername"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Phone
                  </Label>
                  <Input
                    value={profile.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Target Section */}
        <motion.div variants={item}>
          <Card className="bg-hydra-surface-2 border-hydra-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Target className="w-5 h-5 text-hydra-cyan" />
                <h2 className="text-base font-semibold text-foreground">Target</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" /> Target Role
                  </Label>
                  <Input
                    value={profile.targetRole || ''}
                    onChange={(e) => updateField('targetRole', e.target.value)}
                    placeholder="e.g. VP of Product"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" /> Target Salary
                  </Label>
                  <Input
                    value={profile.targetSalary || ''}
                    onChange={(e) => updateField('targetSalary', e.target.value)}
                    placeholder="e.g. $250K - $350K"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Target Location
                  </Label>
                  <Input
                    value={profile.targetLocation || ''}
                    onChange={(e) => updateField('targetLocation', e.target.value)}
                    placeholder="e.g. Remote | San Francisco"
                    className="bg-hydra-surface border-hydra-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-hydra-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3" /> Experience Level
                  </Label>
                  <select
                    value={profile.experienceLevel || ''}
                    onChange={(e) => updateField('experienceLevel', e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-hydra-surface border border-hydra-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-hydra-purple"
                  >
                    <option value="">Select level...</option>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences Section */}
        <motion.div variants={item}>
          <Card className="bg-hydra-surface-2 border-hydra-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Settings className="w-5 h-5 text-hydra-yellow" />
                <h2 className="text-base font-semibold text-foreground">Preferences</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-hydra-muted" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Notifications</p>
                      <p className="text-xs text-hydra-muted">Receive email notifications for important updates</p>
                    </div>
                  </div>
                  <Switch
                    checked={profile.notificationsEnabled}
                    onCheckedChange={(checked) => updateField('notificationsEnabled', checked)}
                    className="data-[state=checked]:bg-hydra-purple"
                  />
                </div>

                <Separator className="bg-hydra-border" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon className="w-4 h-4 text-hydra-muted" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Dark Mode</p>
                      <p className="text-xs text-hydra-muted">The hunt always happens in the dark</p>
                    </div>
                  </div>
                  <Switch checked disabled className="data-[state=checked]:bg-hydra-purple opacity-60" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div variants={item} className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-hydra-purple hover:bg-hydra-purple/80 text-white min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
