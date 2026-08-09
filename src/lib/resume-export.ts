import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

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

function sectionEntries(content: string): ParsedEntry[] {
  const parsed = parseSectionContent(content)
  if (Array.isArray(parsed)) return parsed as ParsedEntry[]
  return []
}

function sectionText(content: string): string {
  const parsed = parseSectionContent(content)
  if (typeof parsed === 'string') return parsed
  if (Array.isArray(parsed)) {
    return (parsed as ParsedEntry[])
      .map((entry) => {
        const label =
          (entry.company && typeof entry.company === 'string' ? entry.company : '') ||
          (entry.school && typeof entry.school === 'string' ? entry.school : '') ||
          (entry.name && typeof entry.name === 'string' ? entry.name : '') ||
          ''
        const sub =
          (entry.role && typeof entry.role === 'string' ? entry.role : '') ||
          (entry.degree && typeof entry.degree === 'string' ? entry.degree : '') ||
          ''
        const bullets = Array.isArray(entry.bullets)
          ? (entry.bullets as string[])
          : []
        const lines = [label, sub]
        for (const b of bullets) lines.push(`- ${b}`)
        return lines.filter(Boolean).join('\n')
      })
      .join('\n')
  }
  return ''
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

  if (data.summary) {
    children.push(
      new Paragraph({ text: 'SUMMARY', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }),
      new Paragraph({ text: data.summary, spacing: { after: 120 } }),
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

    if (typeof parsed === 'string' && parsed.trim()) {
      children.push(new Paragraph({ text: parsed, spacing: { after: 80 } }))
    } else if (Array.isArray(parsed) && parsed.length > 0) {
      for (const entry of parsed as ParsedEntry[]) {
        const label =
          (entry.company && typeof entry.company === 'string' ? entry.company : '') ||
          (entry.school && typeof entry.school === 'string' ? entry.school : '') ||
          (entry.name && typeof entry.name === 'string' ? entry.name : '') ||
          ''
        const sub =
          (entry.role && typeof entry.role === 'string' ? entry.role : '') ||
          (entry.degree && typeof entry.degree === 'string' ? entry.degree : '') ||
          ''
        const years =
          typeof entry.startDate === 'string' || typeof entry.year === 'string'
            ? [entry.startDate, entry.endDate].filter(Boolean).join(' – ') || String(entry.year)
            : ''
        const title = [sub, years].filter(Boolean).join('  ·  ')

        if (label) {
          children.push(new Paragraph({ text: label, spacing: { before: 100, after: 20 } }))
        }
        if (title) {
          children.push(new Paragraph({ text: title, spacing: { after: 40 } }))
        }

        const bullets = Array.isArray(entry.bullets) ? (entry.bullets as string[]) : []
        for (const bullet of bullets) {
          children.push(
            new Paragraph({ text: bullet, bullet: { level: 0 }, spacing: { after: 20 } }),
          )
        }

        if (Array.isArray(entry.skills) && (entry.skills as string[]).length > 0) {
          children.push(
            new Paragraph({
              text: `Skills: ${(entry.skills as string[]).join(', ')}`,
              spacing: { after: 60 },
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

export async function generatePdf(data: ResumeExportData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page = pdfDoc.addPage([612, 792]) // US Letter
  const { height } = page.getSize()
  const margin = 48
  const maxWidth = 612 - margin * 2
  let y = height - margin

  const accent = rgb(0.69, 0.33, 0.97) // hydra purple

  function drawText(text: string, size: number, fontType: typeof font, color = rgb(0, 0, 0)) {
    const lines = wrapText(text, fontType, size, maxWidth)
    for (const line of lines) {
      if (y < margin) {
        const newPage = pdfDoc.addPage([612, 792])
        y = newPage.getSize().height - margin
      }
      page.drawText(line, { x: margin, y, size, font: fontType, color })
      y -= size * 1.35
    }
    return lines.length
  }

  function wrapText(text: string, f: typeof font, size: number, maxW: number): string[] {
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

  if (data.summary) {
    y -= 12
    drawText('SUMMARY', 11, fontBold, accent)
    y -= 4
    drawText(data.summary, 10, font)
    y -= 12
  }

  for (const section of data.sections) {
    if (section.type === 'summary') continue
    y -= 14

    drawText(section.title.toUpperCase(), 12, fontBold, accent)
    y -= 6

    const parsed = parseSectionContent(section.content)

    if (typeof parsed === 'string' && parsed.trim()) {
      drawText(parsed, 10, font)
    } else if (Array.isArray(parsed)) {
      for (const entry of parsed as ParsedEntry[]) {
        const label =
          (entry.company && typeof entry.company === 'string' ? entry.company : '') ||
          (entry.school && typeof entry.school === 'string' ? entry.school : '') ||
          (entry.name && typeof entry.name === 'string' ? entry.name : '') ||
          ''
        const sub =
          (entry.role && typeof entry.role === 'string' ? entry.role : '') ||
          (entry.degree && typeof entry.degree === 'string' ? entry.degree : '') ||
          ''
        const years =
          typeof entry.startDate === 'string' || typeof entry.year === 'string'
            ? [entry.startDate, entry.endDate].filter(Boolean).join(' – ') || String(entry.year)
            : ''
        const heading = [label, sub, years].filter(Boolean).join('  ·  ')
        if (heading) {
          drawText(heading, 10.5, fontBold)
          y -= 2
        }
        const bullets = Array.isArray(entry.bullets) ? (entry.bullets as string[]) : []
        for (const bullet of bullets) {
          drawText(`- ${bullet}`, 10, font)
          y -= 2
        }
        if (Array.isArray(entry.skills) && (entry.skills as string[]).length > 0) {
          drawText(`Skills: ${(entry.skills as string[]).join(', ')}`, 10, font)
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

  if (data.summary) {
    parts.push('SUMMARY', data.summary, '')
  }

  for (const section of data.sections) {
    if (section.type === 'summary') continue

    parts.push(section.title.toUpperCase())

    const parsed = parseSectionContent(section.content)
    if (typeof parsed === 'string' && parsed.trim()) {
      parts.push(parsed)
    } else if (Array.isArray(parsed)) {
      for (const entry of parsed as ParsedEntry[]) {
        const label =
          (entry.company && typeof entry.company === 'string' ? entry.company : '') ||
          (entry.school && typeof entry.school === 'string' ? entry.school : '') ||
          (entry.name && typeof entry.name === 'string' ? entry.name : '') ||
          ''
        const sub =
          (entry.role && typeof entry.role === 'string' ? entry.role : '') ||
          (entry.degree && typeof entry.degree === 'string' ? entry.degree : '') ||
          ''
        const years =
          typeof entry.startDate === 'string' || typeof entry.year === 'string'
            ? [entry.startDate, entry.endDate].filter(Boolean).join(' – ') || String(entry.year)
            : ''
        parts.push([label, sub, years].filter(Boolean).join(' - '))
        const bullets = Array.isArray(entry.bullets) ? (entry.bullets as string[]) : []
        for (const bullet of bullets) parts.push(`  - ${bullet}`)
      }
    } else if (typeof parsed === 'string') {
      parts.push(parsed)
    }
    parts.push('')
  }

  return parts.filter((line, i, arr) => !(line === '' && (i === 0 || arr[i - 1] === ''))).join('\n')
}

export { SKILL_NAMES }
