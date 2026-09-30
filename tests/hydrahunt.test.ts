import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  createMagicLinkToken,
  verifyMagicLinkToken,
} from '../src/lib/auth'
import {
  signupSchema,
  loginSchema,
  resumeCreateSchema,
  jobTargetCreateSchema,
  jobTargetUpdateSchema,
  analyzeResumeSchema,
  generatePayloadSchema,
  interviewSessionCreateSchema,
  interviewChatSchema,
} from '../src/lib/validators'
import { SUBSCRIPTION_LIMITS, planFromPriceId } from '../src/lib/plans'
import { extractJson } from '../src/lib/ai'
import { formatResumeForAI, buildResumeAnalysisUserPrompt } from '../src/lib/prompts'
import { rateLimit } from '../src/lib/rate-limit'
import { validateEnv } from '../src/lib/env'

// Ensure AUTH_SECRET is set for token signing tests
process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters'

describe('HydraHunt — Core Test Suite', () => {
  describe('1. Authentication & Security (Signup / Login / Magic Link)', () => {
    it('hashes and verifies passwords accurately', () => {
      const hash = hashPassword('HunterPassword123!')
      assert.equal(verifyPassword('HunterPassword123!', hash), true)
      assert.equal(verifyPassword('WrongPassword', hash), false)
    })

    it('creates and verifies magic link & session tokens', () => {
      const userId = 'user-uuid-1234'
      const magicToken = createMagicLinkToken(userId)
      assert.equal(verifyMagicLinkToken(magicToken), userId)

      const sessionToken = createSessionToken(userId)
      assert.equal(verifyMagicLinkToken(sessionToken), userId)
      assert.equal(verifyMagicLinkToken('tampered.token'), null)
    })

    it('validates signup and login payloads with Zod', () => {
      const validSignup = signupSchema.safeParse({
        name: 'Alex Hunter',
        email: 'alex@hydrahunt.ai',
        password: 'StrongPassword99',
      })
      assert.equal(validSignup.success, true)

      const invalidSignup = signupSchema.safeParse({
        name: '',
        email: 'not-an-email',
        password: '123',
      })
      assert.equal(invalidSignup.success, false)

      const validLogin = loginSchema.safeParse({
        email: 'alex@hydrahunt.ai',
        password: 'StrongPassword99',
      })
      assert.equal(validLogin.success, true)
    })
  })

  describe('2. Resume Forge & Strike Analysis Flows', () => {
    it('validates resume creation and formats sections for AI analysis', () => {
      const parsed = resumeCreateSchema.safeParse({ title: 'Senior Staff Engineer Resume' })
      assert.equal(parsed.success, true)

      const formatted = formatResumeForAI('Senior Staff Engineer Resume', [
        { type: 'summary', content: JSON.stringify('10+ years distributed systems leadership.') },
        {
          type: 'experience',
          content: JSON.stringify([
            { company: 'HydraCorp', role: 'Staff Engineer', bullets: ['Scaled throughput 4x'] },
          ]),
        },
      ])
      assert.match(formatted, /Resume: Senior Staff Engineer Resume/)
      assert.match(formatted, /HydraCorp/)

      const prompt = buildResumeAnalysisUserPrompt(formatted, 'Principal Engineer')
      assert.match(prompt, /Principal Engineer/)
    })

    it('validates analyze-resume API contract and parses structured AI JSON', () => {
      const req = analyzeResumeSchema.safeParse({
        resumeId: 'resume-123',
        targetRole: 'Senior Product Manager',
      })
      assert.equal(req.success, true)

      const rawAiOutput = '```json\n{"atsScore": 91, "strengths": ["Clear metrics"], "missingKeywords": ["Kubernetes"]}\n```'
      const extracted = extractJson(rawAiOutput)
      assert.equal(extracted?.atsScore, 91)
      assert.deepEqual(extracted?.missingKeywords, ['Kubernetes'])
    })
  })

  describe('3. AI Payload Forge & Interview Drills Flows', () => {
    it('validates generate-payload API contract', () => {
      const payloadReq = generatePayloadSchema.safeParse({
        resumeId: 'resume-123',
        jobDescription: 'We are looking for a Principal Engineer to lead our platform team.',
        company: 'Acme Corp',
        tone: 'confident',
      })
      assert.equal(payloadReq.success, true)
    })

    it('validates interview session creation and streaming chat input', () => {
      const sessionReq = interviewSessionCreateSchema.safeParse({
        type: 'technical',
        role: 'Staff Backend Engineer',
        company: 'CyberDyne',
      })
      assert.equal(sessionReq.success, true)

      const chatReq = interviewChatSchema.safeParse({
        message: 'I designed an event-driven architecture using Kafka and PostgreSQL.',
        history: [{ role: 'assistant', content: 'Tell me about a system you scaled.' }],
      })
      assert.equal(chatReq.success, true)
    })
  })

  describe('4. Kill List Job Tracker & Subscription Plans', () => {
    it('validates creating and moving job cards across Kanban stages', () => {
      const createTarget = jobTargetCreateSchema.safeParse({
        company: 'Acme',
        role: 'Senior Product Manager',
        priority: 'high',
        jobUrl: 'https://acme.example.com/jobs/1',
      })
      assert.equal(createTarget.success, true)

      const moveCard = jobTargetUpdateSchema.safeParse({
        status: 'interview',
        priority: 'critical',
      })
      assert.equal(moveCard.success, true)
    })

    it('enforces tier limits for Free, Mission Pack, Hunter, and Beastmaster', () => {
      assert.equal(SUBSCRIPTION_LIMITS.free.resumes, 1)
      assert.equal(SUBSCRIPTION_LIMITS.free.aiGenerations, 3)
      assert.equal(SUBSCRIPTION_LIMITS.mission_pack.aiGenerations, 10)
      assert.equal(SUBSCRIPTION_LIMITS.hunter.resumes, null)
      assert.equal(SUBSCRIPTION_LIMITS.hunter.aiGenerations, 100)
      assert.equal(SUBSCRIPTION_LIMITS.beastmaster.aiGenerations, null)
      assert.equal(planFromPriceId('unknown_price'), null)
    })

    it('rate-limits excessive requests per window and validates environment config', () => {
      const key = `test-rate-${Date.now()}`
      assert.equal(rateLimit(key, 2, 60_000).success, true)
      assert.equal(rateLimit(key, 2, 60_000).success, true)
      assert.equal(rateLimit(key, 2, 60_000).success, false)

      const envCfg = validateEnv({ NODE_ENV: 'test' })
      assert.equal(envCfg.NODE_ENV, 'test')
    })
  })
})
