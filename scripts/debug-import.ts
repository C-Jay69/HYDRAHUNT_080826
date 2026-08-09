import 'dotenv/config'
import { complete } from '@/lib/ai'
import {
  RESUME_RESTRUCTURE_SYSTEM_PROMPT,
  buildResumeRestructureUserPrompt,
} from '@/lib/prompts'
import { structuredToSections } from '@/lib/resume-structure'
import { extractJson } from '@/lib/ai'

const sample = `
John Doe
john@example.com | (555) 123-4567 | Austin, TX

SUMMARY
Frontend engineer with 5 years of experience building React apps.

EXPERIENCE
 Acme Corp — Senior Engineer, Jan 2020 – Present
  - Led a team of 4 developers.
  - Increased performance by 40% with code splitting.

EDUCATION
UT Austin — BS Computer Science, 2016-2020

SKILLS
React, TypeScript, Next.js, CSS
`

async function main() {
  console.log('=== ENV: AI_MODEL =', process.env.AI_MODEL)
  console.log('=== ENV: AI_STREAM_MODEL =', process.env.AI_STREAM_MODEL)
  try {
    const raw = await complete({
      messages: [
        { role: 'system', content: RESUME_RESTRUCTURE_SYSTEM_PROMPT },
        { role: 'user', content: buildResumeRestructureUserPrompt(sample) },
      ],
      temperature: 0.3,
      maxTokens: 2000,
    })
    console.log('=== RAW AI OUTPUT (length=' + raw.length + '):')
    console.log(JSON.stringify(raw))
    const parsed = extractJson(raw)
    console.log('=== PARSED KEYS:', parsed ? Object.keys(parsed) : 'null')
    if (parsed) {
      const result = structuredToSections(parsed as any)
      console.log('=== SECTIONS COUNT:', result.sections.length)
      console.log('=== SECTIONS:', JSON.stringify(result.sections, null, 2))
    } else {
      console.log('=== extractJson returned NULL')
    }
  } catch (e) {
    console.error('=== AI CALL FAILED:', e)
  }
}

main()
