import mammoth from 'mammoth'

export async function extractTextFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '')

  if (normalizedExt === 'pdf') {
    let pdfParseFunc: any

    try {
      pdfParseFunc = require('pdf-parse/lib/pdf-parse.js')
    } catch {
      try {
        pdfParseFunc = require('pdf-parse')
      } catch {
        const mod = await import('pdf-parse')
        pdfParseFunc = mod
      }
    }

    if (typeof pdfParseFunc !== 'function') {
      if (typeof pdfParseFunc?.default === 'function') {
        pdfParseFunc = pdfParseFunc.default
      } else if (typeof pdfParseFunc?.pdfParse === 'function') {
        pdfParseFunc = pdfParseFunc.pdfParse
      }
    }

    if (typeof pdfParseFunc !== 'function') {
      throw new Error('Failed to resolve pdf-parse function.')
    }

    const data = await pdfParseFunc(buffer)
    return (data.text || '').trim()
  }

  if (normalizedExt === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return (result.value || '').trim()
  }

  if (normalizedExt === 'txt' || normalizedExt === 'md') {
    return buffer.toString('utf8').trim()
  }

  throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.')
}

export async function parseUpload(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const fileName = file.name
  const ext = fileName.split('.').pop() || ''

  const text = await extractTextFromBuffer(buffer, ext)
  return {
    fileName,
    text,
  }
}