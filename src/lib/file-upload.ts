import mammoth from 'mammoth';

// Helper to safely get PDF parser instance
async function getPdfParser() {
  try {
    // Try dynamic import first (safest for Turbopack/Next.js)
    const mod = await import('pdf-parse');
    if (typeof mod === 'function') return mod;
    if (mod.default && typeof mod.default === 'function') return mod.default;
    if (mod.pdfParse && typeof mod.pdfParse === 'function') return mod.pdfParse;
    
    throw new Error('pdf-parse module loaded but function not found');
  } catch (error: any) {
    // Fallback to require if dynamic import fails
    try {
      const mod = require('pdf-parse');
      if (typeof mod === 'function') return mod;
      if (mod.default && typeof mod.default === 'function') return mod.default;
      if (mod.pdfParse && typeof mod.pdfParse === 'function') return mod.pdfParse;
    } catch (reqError) {
      console.error("PDF Parsing Failed completely:", error, reqError);
    }
  }
  throw new Error('Failed to initialize pdf-parse');
}

export async function extractTextFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');

  if (normalizedExt === 'pdf') {
    const pdfParseFunc = await getPdfParser();
    if (!pdfParseFunc) throw new Error('PDF Parser not available');
    
    const data = await pdfParseFunc(buffer);
    return (data.text || '').trim();
  }

  if (normalizedExt === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }

  if (normalizedExt === 'txt' || normalizedExt === 'md') {
    return buffer.toString('utf8').trim();
  }

  throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.');
}

export async function parseUpload(file: File | null | undefined) {
  // SAFETY CHECK: Ensure file exists before accessing properties
  if (!file || !file.name) {
    throw new Error('No file provided or file name is missing.');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name;
    
    // Safe split logic
    const ext = fileName.includes('.') 
      ? fileName.split('.').pop() || '' 
      : '';

    const text = await extractTextFromBuffer(buffer, ext);
    
    return {
      fileName,
      text,
    };
  } catch (error) {
    console.error("Error processing upload:", error);
    throw error;
  }
}