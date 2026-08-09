import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Configure worker source for pdfjs-dist
// This points to the default CDN worker, but we can override if needed later
GlobalWorkerOptions.workerSrc = '/_next/static/chunks/polyfill.js'; 
// Note: In Next.js 16, sometimes workers need specific handling, 
// but often the default import path works fine for server components.
// If this fails, we might need to serve the worker explicitly, 
// but let's try the simple approach first.

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
    // Convert buffer to Uint8Array required by pdfjs
    const typedarray = new Uint8Array(buffer);
    
    const loadingTask = getDocument(typedarray);
    const pdf = await loadingTask.promise;
    
    let fullText = '';

    // Loop through all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatenate items on the page
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
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