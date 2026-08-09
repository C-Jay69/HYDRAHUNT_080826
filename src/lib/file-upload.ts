import mammoth from 'mammoth'

export async function extractTextFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '')

  if (normalizedExt === 'pdf') {
    try {
      // We use require directly inside the function. 
      // This is the most reliable way to handle CommonJS modules in Next.js/Turbopack.
      const pdfModule = require('pdf-parse')
      
      // Some environments return the function directly, others wrap it in .default
      const pdfParse = typeof pdfModule === 'function' ? pdfModule : pdfModule.default

      if (typeof pdfParse !== 'function') {
        throw new Error('pdf-parse module loaded but is not a function')
      }

      const data = await pdfParse(buffer)
      return (data.text || '').trim()
    } catch (error) {
      console.error('Detailed PDF Error:', error)
      throw new Error('Failed to parse PDF. The file might be corrupted or protected.')
    }
  }

  if (normalizedExt === 'docx') {
    try {
      const result = await mammoth.extractRawText({ buffer })
      return (result.value || '').trim()
    } catch (error) {
      console.error('Detailed DOCX Error:', error)
      throw new Error('Failed to parse DOCX file.')
    }
  }

  if (normalizedExt === 'txt' || normalizedExt === 'md') {
    return buffer.toString('utf8').trim()
  }

  throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.')
}

export async function parseUpload(file: File) {
  // Ensure file is valid
  if (!file || !file.name) {
    throw new Error('No valid file provided.')
  }

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