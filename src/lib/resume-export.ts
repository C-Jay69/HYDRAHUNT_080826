import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx'

interface ResumeExportSection {
  type: string
  title: string
  content: string
}

interface ResumeExportData {
  title: string
  summary: string | null
  sections: ResumeExportSection[]
}

interface ParsedEntry {
  [key: string]: unknown
}

function parseSectionContent(content: string): unknown {
  try {
    return JSON.parse(content)
  } catch {
    return content
  }
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

/**
 * The editor stores experience bullets as a single newline-separated string
 * (`ExperienceEntry.bullets`), while older/AI-imported data may use an array.
 * Normalise both into a clean list so nothing is silently dropped on export.
 */
function bulletsFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asString).filter(Boolean)
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
      .filter(Boolean)
  }
  return []
}

function yearsFrom(entry: ParsedEntry): string {
  const start = asString(entry.startDate)
  const end = asString(entry.endDate)
  const year = asString(entry.year)
  const range = [start, end].filter(Boolean).join(' – ')
  return range || year
}

/**
 * Flattens one stored entry (experience / education / project) into the parts
 * the exporters render. Covers every key the editors actually write, so
 * descriptions, degrees/fields, tech stacks and links are not lost.
 */
function entryParts(entry: ParsedEntry) {
  const label =
    asString(entry.company) || asString(entry.school) || asString(entry.name)
  const role = asString(entry.role)
  const degree = asString(entry.degree)
  const field = asString(entry.field)
  const sub = [role || degree, field].filter(Boolean).join(', ')

  const details: string[] = []
  const description = asString(entry.description)
  const techStack = asString(entry.techStack)
  const link = asString(entry.link)
  if (description) details.push(description)
  if (techStack) details.push(`Tech: ${techStack}`)
  if (link) details.push(link)
  if (Array.isArray(entry.skills)) {
    const inline = entry.skills.map(asString).filter(Boolean)
    if (inline.length) details.push(`Skills: ${inline.join(', ')}`)
  }

  return {
    label,
    sub,
    years: yearsFrom(entry),
    bullets: bulletsFrom(entry.bullets),
    details,
  }
}

/**
 * Skills are stored as a JSON array of strings (`["React", "TypeScript"]`).
 * The old exporter treated each string as an entry object, so skills sections
 * rendered as an empty heading. Handle strings and `{ name }` objects alike.
 */
function skillsFrom(parsed: unknown): string[] {
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          return asString((item as ParsedEntry).name)
        }
        return ''
      })
      .filter(Boolean)
  }
  if (typeof parsed === 'string') return [parsed.trim()].filter(Boolean)
  return []
}

/**
 * The editor keeps the summary in a `summary` section, so the root `summary`
 * column can be empty (manually created resumes) or stale (edited after
 * import). Prefer the section when it has content and fall back to the column.
 */
function resolveSummary(data: ResumeExportData): string {
  const summarySection = data.sections.find((s) => s.type === 'summary')
  if (summarySection) {
    const parsed = parseSectionContent(summarySection.content)
    if (typeof parsed === 'string' && parsed.trim()) return parsed.trim()
    if (Array.isArray(parsed)) {
      const text = parsed.map(asString).filter(Boolean).join('\n')
      if (text) return text
    }
  }
  return asString(data.summary)
}

/* ----------------------------------- DOCX ----------------------------------- */

function buildDocx(data: ResumeExportData): Document {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      text: data.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
  )

  const summaryText = resolveSummary(data)
  if (summaryText) {
    children.push(
      new Paragraph({
        text: 'SUMMARY',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      }),
      new Paragraph({ text: summaryText, spacing: { after: 120 } }),
    )
  }

  for (const section of data.sections) {
    if (section.type === 'summary') continue

    children.push(
      new Paragraph({
        text: section.title.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
      }),
    )

    const parsed = parseSectionContent(section.content)

    if (section.type === 'skills') {
      const skills = skillsFrom(parsed)
      if (skills.length) {
        children.push(
          new Paragraph({ text: skills.join(', '), spacing: { after: 80 } }),
        )
      }
      continue
    }

    if (typeof parsed === 'string' && parsed.trim()) {
      children.push(new Paragraph({ text: parsed, spacing: { after: 80 } }))
    } else if (Array.isArray(parsed) && parsed.length > 0) {
      for (const raw of parsed as unknown[]) {
        if (!raw || typeof raw !== 'object') {
          const text = asString(raw)
          if (text) {
            children.push(new Paragraph({ text, spacing: { after: 40 } }))
          }
          continue
        }

        const { label, sub, years, bullets, details } = entryParts(
          raw as ParsedEntry,
        )
        const title = [sub, years].filter(Boolean).join('  ·  ')

        if (label) {
          children.push(
            new Paragraph({ text: label, spacing: { before: 100, after: 20 } }),
          )
        }
        if (title) {
          children.push(new Paragraph({ text: title, spacing: { after: 40 } }))
        }
        for (const detail of details) {
          children.push(new Paragraph({ text: detail, spacing: { after: 40 } }))
        }
        for (const bullet of bullets) {
          children.push(
            new Paragraph({
              text: bullet,
              bullet: { level: 0 },
              spacing: { after: 20 },
            }),
          )
        }
      }
    } else if (typeof parsed === 'string') {
      children.push(new Paragraph({ text: parsed, spacing: { after: 80 } }))
    }
  }

  return new Document({ sections: [{ children }] })
}

export async function generateDocx(data: ResumeExportData): Promise<Buffer> {
  const doc = buildDocx(data)
  return Buffer.from(await Packer.toBuffer(doc))
}

/* ------------------------------------ PDF ----------------------------------- */

const SKILL_NAMES = ['skills', 'skill', 'technical skills']

/**
 * pdf-lib's standard fonts only encode WinAnsi (CP1252). Emoji, CJK, arrows
 * and other non-CP1252 characters make `drawText`/`widthOfTextAtSize` throw,
 * which used to crash the whole export. Normalize what can be folded to ASCII
 * (ligatures, full-width forms) and drop what cannot be encoded, so one odd
 * character costs that character instead of the entire PDF.
 */
const NON_WIN_ANSI = /[^\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g

function sanitizePdfText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(NON_WIN_ANSI, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function generatePdf(data: ResumeExportData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 48
  const pageWidth = 612 // US Letter
  const pageHeight = 792
  const maxWidth = pageWidth - margin * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const accent = rgb(0.69, 0.33, 0.97) // hydra purple

  function drawText(
    text: string,
    size: number,
    fontType: typeof font,
    color = rgb(0, 0, 0),
  ) {
    const safeText = sanitizePdfText(text)
    if (!safeText) return 0
    const lines = wrapText(safeText, fontType, size, maxWidth)
    for (const line of lines) {
      if (y < margin) {
        // Start a fresh page and keep drawing there. The old code added a new
        // page but kept drawing onto the first one, so overflow text piled up
        // at the top of page 1 and every later page came out blank.
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawText(line, { x: margin, y, size, font: fontType, color })
      y -= size * 1.35
    }
    return lines.length
  }

  function wrapText(
    text: string,
    f: typeof font,
    size: number,
    maxW: number,
  ): string[] {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (f.widthOfTextAtSize(candidate, size) > maxW && current) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    if (current) lines.push(current)
    return lines
  }

  // Title
  drawText(data.title.toUpperCase(), 18, fontBold, accent)
  y -= 12

  const summaryText = resolveSummary(data)
  if (summaryText) {
    y -= 12
    drawText('SUMMARY', 11, fontBold, accent)
    y -= 4
    drawText(summaryText, 10, font)
    y -= 12
  }

  for (const section of data.sections) {
    if (section.type === 'summary') continue
    y -= 14

    drawText(section.title.toUpperCase(), 12, fontBold, accent)
    y -= 6

    const parsed = parseSectionContent(section.content)

    if (section.type === 'skills') {
      const skills = skillsFrom(parsed)
      if (skills.length) drawText(skills.join(', '), 10, font)
      continue
    }

    if (typeof parsed === 'string' && parsed.trim()) {
      drawText(parsed, 10, font)
    } else if (Array.isArray(parsed)) {
      for (const raw of parsed as unknown[]) {
        if (!raw || typeof raw !== 'object') {
          const text = asString(raw)
          if (text) drawText(text, 10, font)
          continue
        }

        const { label, sub, years, bullets, details } = entryParts(
          raw as ParsedEntry,
        )
        const heading = [label, sub, years].filter(Boolean).join('  ·  ')
        if (heading) {
          drawText(heading, 10.5, fontBold)
          y -= 2
        }
        for (const detail of details) {
          drawText(detail, 10, font)
          y -= 2
        }
        for (const bullet of bullets) {
          drawText(`- ${bullet}`, 10, font)
          y -= 2
        }
        y -= 4
      }
    } else if (typeof parsed === 'string') {
      drawText(parsed, 10, font)
    }
  }

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}

/**
 * Returns a plain-text version of the resume (ATS-friendly, deterministic).
 */
export function resumeToPlainText(data: ResumeExportData): string {
  const parts: string[] = [data.title.toUpperCase(), '']

  const summaryText = resolveSummary(data)
  if (summaryText) {
    parts.push('SUMMARY', summaryText, '')
  }

  for (const section of data.sections) {
    if (section.type === 'summary') continue

    parts.push(section.title.toUpperCase())

    const parsed = parseSectionContent(section.content)

    if (section.type === 'skills') {
      const skills = skillsFrom(parsed)
      if (skills.length) parts.push(skills.join(', '))
      parts.push('')
      continue
    }

    if (typeof parsed === 'string' && parsed.trim()) {
      parts.push(parsed)
    } else if (Array.isArray(parsed)) {
      for (const raw of parsed as unknown[]) {
        if (!raw || typeof raw !== 'object') {
          const text = asString(raw)
          if (text) parts.push(text)
          continue
        }

        const { label, sub, years, bullets, details } = entryParts(
          raw as ParsedEntry,
        )
        const heading = [label, sub, years].filter(Boolean).join(' - ')
        if (heading) parts.push(heading)
        for (const detail of details) parts.push(`  ${detail}`)
        for (const bullet of bullets) parts.push(`  - ${bullet}`)
      }
    } else if (typeof parsed === 'string') {
      parts.push(parsed)
    }
    parts.push('')
  }

  return parts
    .filter((line, i, arr) => !(line === '' && (i === 0 || arr[i - 1] === '')))
    .join('\n')
}

export { SKILL_NAMES }
