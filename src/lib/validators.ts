import { z } from 'zod'

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('A valid email is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required').max(255),
  password: z.string().min(1, 'Password is required').max(128),
})

export const magicLinkSchema = z.object({
  email: z.string().trim().email('A valid email is required').max(255),
})

export const resumeCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
})

export const resumeUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().max(5000).nullable().optional(),
  atsScore: z.number().int().min(0).max(100).nullable().optional(),
  isDefault: z.boolean().optional(),
  sections: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string().min(1),
        title: z.string().min(1),
        content: z.string(),
        sortOrder: z.number().int().default(0),
      }),
    )
    .optional(),
})

export const jobTargetCreateSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  salary: z.string().max(100).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  jobUrl: z.string().url('A valid URL is required').max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export const jobTargetUpdateSchema = jobTargetCreateSchema.extend({
  status: z.enum(['intel', 'acquired', 'payload_sent', 'interview', 'offer', 'eliminated']).optional(),
  company: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().min(1).max(200).optional(),
})

export const analyzeResumeSchema = z.object({
  resumeId: z.string().min(1),
  targetRole: z.string().trim().max(200).nullable().optional(),
})

export const generatePayloadSchema = z.object({
  resumeId: z.string().min(1),
  jobDescription: z.string().trim().min(1).max(20000),
  company: z.string().trim().max(200).optional(),
  tone: z.enum(['confident', 'professional', 'casual', 'aggressive']).default('professional'),
})

export const interviewSessionCreateSchema = z.object({
  type: z.enum(['behavioral', 'technical', 'role-specific']).default('behavioral'),
  role: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
})

export const interviewSessionUpdateSchema = z.object({
  status: z.enum(['active', 'completed']).optional(),
  score: z.number().int().min(0).max(100).optional(),
})

export const interviewChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(10000),
      }),
    )
    .max(200)
    .optional(),
})

export const versionCreateSchema = z.object({
  resumeId: z.string().min(1),
  label: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export const careerNodeCreateSchema = z.object({
  type: z.enum(['current', 'target', 'skill', 'certification', 'milestone']).default('skill'),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
})

export const careerNodeUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  label: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
})

export const activityLogCreateSchema = z.object({
  action: z.string().trim().min(1).max(500),
  category: z.enum(['resume', 'payload', 'application', 'interview', 'analysis', 'billing']).default('application'),
  details: z.string().trim().max(2000).nullable().optional(),
})

export const scrapeJobsSchema = z.object({
  keywords: z.string().trim().min(1, 'Keywords are required').max(200),
  location: z.string().trim().max(200).optional(),
  pages: z.number().int().min(1).max(5).default(3),
  source: z
    .enum(['linkedin', 'weworkremotely', 'remoteok', 'remotive', 'dice', 'indeed', 'glassdoor', 'zip_recruiter', 'google'])
    .default('linkedin'),
})

export const applyJobSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().min(1),
  autoApply: z.boolean().default(false),
  notes: z.string().trim().max(2000).nullable().optional(),
})

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email('A valid email is required').max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  headline: z.string().trim().max(200).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  website: z.string().trim().url('A valid URL is required').max(500).nullable().optional(),
  linkedin: z.string().trim().max(500).nullable().optional(),
  github: z.string().trim().max(500).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  targetRole: z.string().trim().max(200).nullable().optional(),
  targetSalary: z.number().int().positive().nullable().optional(),
  targetLocation: z.string().trim().max(200).nullable().optional(),
  experience: z.string().trim().max(50).nullable().optional(),
  onboardingComplete: z.boolean().optional(),
})
