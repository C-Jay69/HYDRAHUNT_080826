import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { generateDocx, generatePdf, resumeToPlainText } from '@/lib/resume-export'
import { SUBSCRIPTION_LIMITS } from '@/lib/plans'

// GET /api/resumes/[id]/export?format=pdf|docx|txt — export a resume
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const format = request.nextUrl.searchParams.get('format') || 'pdf'

    if (!['pdf', 'docx', 'txt'].includes(format)) {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    const resume = await db.resume.findFirst({
      where: { id, userId: user.id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Enforce plan gate: free tier only gets watermark PDF, no DOCX
    const activeSub = await db.subscription.findFirst({
      where: { userId: user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })
    const plan = activeSub?.plan || 'free'
    const canDocx = SUBSCRIPTION_LIMITS[plan]?.exportFormats?.includes('docx') ?? false

    const data = {
      title: resume.title,
      summary: resume.summary,
      sections: resume.sections.map((s) => ({ type: s.type, title: s.title, content: s.content })),
    }

    const fileName = `${resume.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-')}`

    if (format === 'txt') {
      return new Response(resumeToPlainText(data), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}.txt"`,
        },
      })
    }

    if (format === 'docx') {
      if (!canDocx) {
        return NextResponse.json(
          { error: 'DOCX export requires the Hunter or Beastmaster plan' },
          { status: 403 },
        )
      }
      const buffer = await generateDocx(data)
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${fileName}.docx"`,
        },
      })
    }

    // PDF
    const buffer = await generatePdf(data)
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
    }
    // Watermark the free tier
    if (plan === 'free') {
      headers['X-HydraHunt-Watermark'] = 'Created with HydraHunt — free plan'
    }
    return new Response(new Uint8Array(buffer), { headers })
  } catch (error) {
    console.error('Export error:', error)
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Failed to export resume' }, { status: 500 })
  }
}
