/**
 * Shared ATS readiness heuristic.
 *
 * The Resume Studio editor has always computed this score live from resume
 * content, while the resume list only read the persisted `Resume.atsScore`
 * column — which is written solely when a client explicitly PUTs one (the AI
 * analysis endpoint stores its score on the separate `ResumeAnalysis` row).
 * That mismatch made the list say "No ATS score" for resumes whose editor view
 * happily showed a number. Both surfaces now call this function so the list and
 * the editor always agree.
 */

export interface ResumeSectionLike {
  type: string
  content: string
}

const WEIGHTS = {
  summary: 20,
  experience: 25,
  education: 15,
  skills: 20,
  projects: 10,
  bullets: 10,
} as const

/** Summary text must exceed this length to earn its points. */
export const ATS_MIN_SUMMARY_LENGTH = 50
/** Skills array must have at least this many entries to earn its points. */
export const ATS_MIN_SKILLS = 5
/** Experience bullets must total at least this many lines to earn its points. */
export const ATS_MIN_BULLETS = 5

function parseContent<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    return (parsed ?? fallback) as T
  } catch {
    return fallback
  }
}

/**
 * Scores resume completeness on a 0-100 scale. Deterministic and side-effect
 * free so it is safe to call during render.
 */
export function computeResumeAtsScore(sections: ResumeSectionLike[]): number {
  const contentFor = (type: string) =>
    sections.find((section) => section.type === type)?.content

  const summaryRaw = parseContent<unknown>(contentFor('summary'), '')
  const summaryText = typeof summaryRaw === 'string' ? summaryRaw : ''
  const experience = parseContent<Array<{ bullets?: string }>>(
    contentFor('experience'),
    [],
  )
  const education = parseContent<unknown[]>(contentFor('education'), [])
  const skills = parseContent<unknown[]>(contentFor('skills'), [])
  const projects = parseContent<unknown[]>(contentFor('projects'), [])

  let score = 0
  if (summaryText.length > ATS_MIN_SUMMARY_LENGTH) score += WEIGHTS.summary
  if (experience.length > 0) score += WEIGHTS.experience
  if (education.length > 0) score += WEIGHTS.education
  if (skills.length >= ATS_MIN_SKILLS) score += WEIGHTS.skills
  if (projects.length > 0) score += WEIGHTS.projects

  const totalBullets = experience.reduce((count, entry) => {
    if (typeof entry?.bullets !== 'string') return count
    return count + entry.bullets.split('\n').filter((line) => line.trim()).length
  }, 0)
  if (totalBullets >= ATS_MIN_BULLETS) score += WEIGHTS.bullets

  return Math.min(score, 100)
}
