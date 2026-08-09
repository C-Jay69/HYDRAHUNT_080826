import { randomUUID } from 'crypto'

/**
 * Shape of the JSON the AI returns for a structured resume.
 */
export interface StructuredResume {
  title?: string
  summary?: string
  experience?: Array<{
    company?: string
    role?: string
    startDate?: string
    endDate?: string
    bullets?: string
  }>
  education?: Array<{
    school?: string
    degree?: string
    field?: string
    year?: string
  }>
  skills?: string[]
  projects?: Array<{
    name?: string
    description?: string
    techStack?: string
    link?: string
  }>
}

/**
 * Coerces an LLM value into the string shape the editor expects.
 * - strings pass through
 * - arrays are joined (so "bullets" returned as an array doesn't get blanked)
 * - objects are JSON-stringified
 * - null/undefined become ''
 */
function coerceString(v: unknown, joiner = '\n'): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  if (Array.isArray(v)) return v.filter((x) => x != null).join(joiner)
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const str = (v: unknown): string => coerceString(v)

const uid = () => randomUUID()

/**
 * Converts the AI's structured resume JSON into the DB section payload used
 * by Resume Forge (sections whose `content` is a JSON string).
 */
export function structuredToSections(data: StructuredResume) {
  const summary = str(data.summary)

  const experience = Array.isArray(data.experience)
    ? data.experience
        .filter((e) => e && typeof e === 'object')
        .map((e) => ({
          id: uid(),
          company: str(e.company),
          role: str(e.role),
          startDate: str(e.startDate),
          endDate: str(e.endDate),
          bullets: str(e.bullets),
        }))
    : []

  const education = Array.isArray(data.education)
    ? data.education
        .filter((e) => e && typeof e === 'object')
        .map((e) => ({
          id: uid(),
          school: str(e.school),
          degree: str(e.degree),
          field: str(e.field),
          year: str(e.year),
        }))
    : []

  const skills = Array.isArray(data.skills)
    ? data.skills.filter((s): s is string => typeof s === 'string')
    : []

  const projects = Array.isArray(data.projects)
    ? data.projects
        .filter((p) => p && typeof p === 'object')
        .map((p) => ({
          id: uid(),
          name: str(p.name),
          description: str(p.description),
          techStack: str(p.techStack),
          link: str(p.link),
        }))
    : []

  const sections: Array<{
    type: string
    title: string
    content: string
    sortOrder: number
  }> = []

  if (summary) sections.push({ type: 'summary', title: 'Summary', content: JSON.stringify(summary), sortOrder: 0 })
  if (experience.length > 0) sections.push({ type: 'experience', title: 'Experience', content: JSON.stringify(experience), sortOrder: 1 })
  if (education.length > 0) sections.push({ type: 'education', title: 'Education', content: JSON.stringify(education), sortOrder: 2 })
  if (skills.length > 0) sections.push({ type: 'skills', title: 'Skills', content: JSON.stringify(skills), sortOrder: 3 })
  if (projects.length > 0) sections.push({ type: 'projects', title: 'Projects', content: JSON.stringify(projects), sortOrder: 4 })

  return { summary, sections }
}
