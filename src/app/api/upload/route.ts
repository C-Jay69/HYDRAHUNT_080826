import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseUpload } from '@/lib/file-upload'
import { db } from '@/lib/db'

// POST /api/upload — upload a resume file (PDF/DOCX/TXT), extract text, persist
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      )
    }

    const { fileName, text } = await parseUpload(file)

    // Placeholder hook: future virus-scan integration point.
    // const scanResult = await scanForMalware(buffer) // TODO

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Could not extract any text from the file. It may be a scanned image.' },
        { status: 422 },
      )
    }

    // Persist the extracted text as a new resume (summary section).
    const existing = await db.resume.count({ where: { userId: user.id } })
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: fileName.replace(/\.[^.]+$/, '').slice(0, 80) || 'Uploaded Resume',
        isDefault: existing === 0,
        sections: {
          create: [
            { type: 'summary', title: 'Summary', content: JSON.stringify(''), sortOrder: 0 },
            { type: 'experience', title: 'Experience', content: JSON.stringify([]), sortOrder: 1 },
            { type: 'education', title: 'Education', content: JSON.stringify([]), sortOrder: 2 },
            { type: 'skills', title: 'Skills', content: JSON.stringify([]), sortOrder: 3 },
            { type: 'projects', title: 'Projects', content: JSON.stringify([]), sortOrder: 4 },
            { type: 'raw', title: 'Original Text', content: JSON.stringify(text), sortOrder: 5 },
          ],
        },
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })

    await db.activityLog.create({
      data: { userId: user.id, action: 'Uploaded resume', category: 'resume', details: resume.title },
    })

    return NextResponse.json({ success: true, resume, textPreview: text.slice(0, 1000) }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    if (error instanceof NextResponse) return error
    return NextResponse.json({ success: false, error: 'Failed to process upload' }, { status: 500 })
  }
}
