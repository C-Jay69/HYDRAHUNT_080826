import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function extractTextFromBuffer(filename: string, buffer: Buffer): Promise<string> {
  const ext = (filename.split('.').pop() || '').toLowerCase()

  if (ext === 'pdf') {
  const pdfModule = await import('pdf-parse')
  // Resolves whether pdf-parse was loaded as dynamic import, .default, or raw CJS module
  const pdfParse = typeof pdfModule === 'function' 
    ? pdfModule 
    : typeof pdfModule.default === 'function' 
    ? pdfModule.default 
    : require('pdf-parse')

  const data = await pdfParse(buffer)
  return (data.text || '').trim()
}
  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return (result.value || '').trim()
  }

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf8').trim()
  }

  throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.')
}

export async function parseUpload(request: Request): Promise<{ filename: string; buffer: Buffer; text: string }> {
  const contentType = request.headers.get('content-type') || ''

  let filename = 'resume'
  let buffer: Buffer

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      throw new NextResponse(
        JSON.stringify({ success: false, error: 'No file uploaded' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new NextResponse(
        JSON.stringify({ success: false, error: 'File exceeds the 10 MB size limit' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } },
      )
    }
    filename = file.name
    buffer = Buffer.from(await file.arrayBuffer())
  } else {
    // Raw binary upload
    buffer = Buffer.from(await request.arrayBuffer())
    if (buffer.length === 0) {
      throw new NextResponse(
        JSON.stringify({ success: false, error: 'No file data received' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (buffer.length > MAX_FILE_SIZE) {
      throw new NextResponse(
        JSON.stringify({ success: false, error: 'File exceeds the 10 MB size limit' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  const text = await extractTextFromBuffer(filename, buffer)
  return { filename, buffer, text }
}
