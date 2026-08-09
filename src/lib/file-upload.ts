import mammoth from 'mammoth';

// 1. Polyfill DOMMatrix for pdfjs-dist in Node.js / Bun server environments
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
  };
}

export async function extractTextFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');

  if (normalizedExt === 'pdf') {
    return await extractPdfText(buffer);
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

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Dynamically load legacy Node.js build of pdfjs-dist
    let getDocument: any;
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      getDocument = pdfjs.getDocument;
    } catch {
      const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
      getDocument = pdfjs.getDocument;
    }

    const typedarray = new Uint8Array(buffer);
    
    // Disable font rendering logic (we only need raw text)
    const loadingTask = getDocument({
      data: typedarray,
      useSystemFonts: true,
      disableFontFace: true,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error(`Failed to parse PDF: ${error}`);
  }
}

export async function parseUpload(file: File | null | undefined) {
  if (!file || !file.name) {
    throw new Error('No file provided or file name is missing.');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name;
    
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