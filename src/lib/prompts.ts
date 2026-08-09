/**
 * Centralized AI prompt templates for HydraHunt.
 *
 * Rules applied across every prompt:
 * - Return structured JSON where appropriate.
 * - Never fabricate employment history.
 * - Preserve factual user data exactly.
 * - Optimize for ATS keyword coverage.
 * - Explain reasoning briefly.
 */

export interface ResumeTextSection {
  type: string
  content: string
}

/** Formats a resume's sections into plain text for AI consumption. */
export function formatResumeForAI(title: string, sections: ResumeTextSection[]): string {
  const parts: string[] = [`Resume: ${title}`]

  for (const section of sections) {
    let content = ''
    try {
      const parsed = JSON.parse(section.content)
      if (typeof parsed === 'string') {
        content = parsed
      } else if (Array.isArray(parsed)) {
        content = parsed
          .map((entry: Record<string, unknown>) => {
            const lines: string[] = []
            for (const [k, v] of Object.entries(entry)) {
              if (v && k !== 'id') {
                lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
              }
            }
            return lines.join(' | ')
          })
          .join('\n')
      } else {
        content = JSON.stringify(parsed)
      }
    } catch {
      content = section.content
    }
    parts.push(`\n--- ${section.type.toUpperCase()} ---\n${content || '(empty)'}`)
  }

  return parts.join('\n')
}

/* ------------------------------ Resume analysis ------------------------------ */

export const RESUME_ANALYSIS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume analyst. You perform deep analysis of resumes against target roles.

You MUST respond with a single valid JSON object (no markdown, no code fences, no extra text) with these exact fields:

{
  "atsScore": <number 0-100>,
  "strengths": [<string>, ...] (4-6 items),
  "weaknesses": [<string>, ...] (3-5 items),
  "missingKeywords": [<string>, ...] (8-15 relevant keywords),
  "rewrittenBullets": [{"original": "<original bullet text>", "rewritten": "<improved ATS-optimized version>"}, ...] (3-5 bullets),
  "roleFitAssessment": "<detailed paragraph assessing fit for the target role>",
  "actionChecklist": [<string>, ...] (5-8 specific actionable items)
}

Analysis guidelines:
- ATS Score: Based on keyword density, section completeness, quantified achievements, format clarity, and relevance to the target role.
- Strengths: Specific positive aspects of the resume.
- Weaknesses: Specific areas needing improvement.
- Missing Keywords: Industry-standard terms, skills, and buzzwords that should be added for the target role.
- Rewritten Bullets: Pick 3-5 weak bullet points and rewrite them to be more impactful, quantified, and ATS-friendly using action verbs and metrics. NEVER invent experience that is not present.
- Role Fit Assessment: Overall assessment of how well the resume matches the target role, with specific recommendations.
- Action Checklist: Concrete, prioritized action items to improve the resume.

Grounding rules:
- Never fabricate employment history, employers, dates, or achievements not present in the resume.
- Preserve all factual user data exactly.
- Briefly justify scores with the reasoning baked into the recommendations.`

export function buildResumeAnalysisUserPrompt(resumeText: string, targetRole?: string | null): string {
  return `Analyze the following resume${targetRole ? ` for the target role: "${targetRole}"` : ' (general analysis)'}.

${resumeText}`
}

/* ---------------------------- Resume restructure ---------------------------- */

export const RESUME_RESTRUCTURE_SYSTEM_PROMPT = `You are an expert resume restructuring engine for HydraHunt. You take raw resume text in any format — messy, unstructured, plain text, malformed — and rebuild it into a clean, ATS-optimized structured resume.

You MUST respond with a single valid JSON object (no markdown, no code fences, no extra text) with exactly these fields:

{
  "title": "<a concise professional title derived from the resume, e.g. 'Senior Frontend Developer'>",
  "summary": "<2-4 sentence professional summary synthesized ONLY from what appears in the source>",
  "experience": [
    {
      "company": "<company>",
      "role": "<job title>",
      "startDate": "<start date as written, e.g. 'Jan 2020'; empty string if absent>",
      "endDate": "<end date as written, e.g. 'Present'; empty string if absent>",
      "bullets": "<3-6 achievement bullets separated by newlines, rewritten to be stronger, quantified where numbers exist in source>"
    }
  ],
  "education": [
    {
      "school": "<school name>",
      "degree": "<degree>",
      "field": "<field of study>",
      "year": "<year or date range>"
    }
  ],
  "skills": ["<skill 1>", "<skill 2>", ...],
  "projects": [
    {
      "name": "<project name>",
      "description": "<brief description>",
      "techStack": "<comma-separated tech>",
      "link": "<URL if present, else empty string>"
    }
  ]
}

Restructuring rules:
- Preserve EVERY fact from the source. Reorganize and reword but NEVER invent companies, employers, dates, degrees, or achievements that are not in the source.
- Extract contact info hints (name, email, phone, location) if present and fold the name into title if no title exists.
- Group all work history under experience, all education under education, technical + soft skills under skills, personal/academic projects under projects.
- Rewrite bullets to start with strong action verbs and include metrics when the numbers appear in the source.
- If a category has no data, use an empty array or empty string. Never fabricate filler.
- Ignore irrelevant junk (headers, footers, page numbers, decorative text) but keep all substantive content.`

export function buildResumeRestructureUserPrompt(rawText: string): string {
  return `Restructure the following raw resume text into the structured JSON format described in your instructions.

RAW RESUME TEXT:
---
${rawText}
---`
}

/* ---------------------------- Resume improvements --------------------------- */

export const RESUME_IMPROVE_SYSTEM_PROMPT = `You are an expert ATS resume improvement engine for HydraHunt. You receive a structured resume plus a set of improvement instructions from an ATS analysis, and you rewrite the resume to implement those improvements while preserving all factual information.

You MUST respond with a single valid JSON object (no markdown, no code fences, no extra text) with exactly these fields:

{
  "title": "<title>",
  "summary": "<improved 2-4 sentence professional summary>",
  "experience": [
    {
      "company": "<company>",
      "role": "<job title>",
      "startDate": "<start date>",
      "endDate": "<end date>",
      "bullets": "<3-6 achievement bullets separated by newlines>"
    }
  ],
  "education": [
    {
      "school": "<school name>",
      "degree": "<degree>",
      "field": "<field of study>",
      "year": "<year or date range>"
    }
  ],
  "skills": ["<skill 1>", "<skill 2>", ...],
  "projects": [
    {
      "name": "<project name>",
      "description": "<brief description>",
      "techStack": "<comma-separated tech>",
      "link": "<URL or empty string>"
    }
  ]
}

Grounding rules:
- NEVER invent employment history, employers, dates, or achievements not already present in the resume.
- Never add a technology or skill the candidate has not demonstrated in the source resume.
- Implement the improvement instructions using content already in the resume (reword, restructure, add keywords only if plausibly supported by existing experience).
- Keep the overall structure identical. Return the same set of companies, roles, and education entries that were input.`

export function buildResumeImproveUserPrompt(
  resumeText: string,
  improvements: string[],
): string {
  return `Implement the following improvement instructions on the resume below. Return the improved resume as the structured JSON format described in your instructions.

IMPROVEMENT INSTRUCTIONS:
${improvements.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

CURRENT RESUME:
---
${resumeText}
---`
}

/* ------------------------------- Payload forge ------------------------------- */

export interface PayloadTab {
  key: string
  label: string
  description: string
}

export const PAYLOAD_TABS: PayloadTab[] = [
  { key: 'summary', label: 'Summary', description: 'A concise 2-3 paragraph summary of why the candidate is a strong fit' },
  { key: 'coverLetter', label: 'Cover Letter', description: 'A full, professional cover letter tailored to the job' },
  { key: 'outreachEmail', label: 'Outreach Email', description: 'A concise cold outreach/recruiter email (under 200 words)' },
  { key: 'linkedin', label: 'LinkedIn', description: 'A LinkedIn connection request message or InMail pitch' },
  { key: 'talkingPoints', label: 'Talking Points', description: 'Key bullet points for interview preparation' },
]

export const PAYLOAD_SYSTEM_PROMPT =
  'You are HydraHunt Payload Forge AI. Generate career application materials. Output only the requested content with proper ---TAB: delimiters. No preamble.'

export function buildPayloadPrompt(
  resumeText: string,
  jobDescription: string,
  company: string,
  tone: string,
): string {
  const tabInstructions = PAYLOAD_TABS.map((s, i) => {
    const isFirst = i === 0
    return `${isFirst ? 'START with' : 'Then output'} exactly: ---TAB:${s.key}\nFollowed by the ${s.label}: ${s.description}.`
  }).join('\n\n')

  return `You are an elite career strategist AI for HydraHunt, a cyberpunk-themed career platform. Generate highly tailored application materials for a job applicant.

## TONE: ${tone}
Use a ${tone.toLowerCase()} tone throughout all generated content. Be specific, actionable, and compelling.

## APPLICANT'S RESUME:
${resumeText}

## TARGET JOB DESCRIPTION:
${jobDescription}

## TARGET COMPANY:
${company || '(not specified)'}

## OUTPUT FORMAT:
Generate all 5 sections in order. Use the exact delimiter format below to separate each section:

${tabInstructions}

Do NOT include any other text before the first ---TAB:summary delimiter. Each section should be well-formatted using markdown (headers, bullet points, bold text where appropriate). Make every piece of content specific to THIS job and THIS candidate — no generic filler.

Grounding rules:
- Never fabricate employment history, employers, or dates not present in the resume.
- Preserve all factual user data exactly.`
}

/* ------------------------------ Interview drills ------------------------------ */

export function buildInterviewSystemPrompt(
  type: string,
  role: string | null | undefined,
  company: string | null | undefined,
): string {
  const typeGuide = {
    behavioral:
      'Focus on behavioral questions using the STAR method. Ask about past experiences, teamwork, conflict, leadership, and failure.',
    technical:
      'Ask role-relevant technical questions. Vary between conceptual explanations, problem-solving, and trade-off discussions. Provide brief technical feedback.',
    'role-specific':
      'Ask questions specific to the target role, including domain knowledge, tooling, metrics, and realistic scenario questions.',
  } as Record<string, string>

  return `You are a professional interviewer conducting a ${type} interview for a ${
    role || 'General'
  } position at ${company || 'a company'}. ${typeGuide[type] || typeGuide.behavioral}

Rules:
- Ask one question at a time. Wait for the candidate's answer before moving on.
- After the candidate answers, give brief, encouraging feedback (2-3 sentences), optionally a score /10, then ask the next question.
- Occasionally ask a follow-up probing question to dig deeper into the candidate's answer.
- Never fabricate the candidate's experience. Base all feedback only on what the candidate said.`
}

/* ------------------------------ Contact / misc ------------------------------ */

export const CONTACT_SUCCESS_MESSAGE =
  'Signal received. A member of the HydraHunt crew will respond within 24–48 hours.'
