import mammoth from 'mammoth';
import { extractText } from 'unpdf';

/** 10 MB — matches the largest resume upload we expect to parse in memory. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md']);

/**
 * Validation failure that carries the HTTP status the route should return.
 * Keeps 4xx errors from being reported as 500s.
 */
export class UploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}

export async function extractTextFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');

  if (normalizedExt === 'pdf') {
    try {
      const uint8Array = new Uint8Array(buffer);
      const result = await extractText(uint8Array, { mergePages: true });
      
      const rawText = (result as { text?: string | string[] }).text;
      const parsedText = Array.isArray(rawText)
        ? rawText.join('\n')
        : typeof rawText === 'string'
        ? rawText
        : '';

      return parsedText.trim();
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF file: ${error}`);
    }
  }

  if (normalizedExt === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }

  if (normalizedExt === 'txt' || normalizedExt === 'md') {
    return buffer.toString('utf8').trim();
  }

  throw new UploadError('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.', 415);
}

export async function parseUpload(file: File | null | undefined) {
  if (!file || !file.name) {
    throw new UploadError('No file provided or file name is missing.', 400);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `File is too large. The maximum upload size is ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      413,
    );
  }

  const fileName = file.name;
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';

  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    throw new UploadError('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.', 415);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await extractTextFromBuffer(buffer, ext);

    return {
      fileName,
      text,
    };
  } catch (error) {
    console.error('Error processing upload:', error);
    if (error instanceof UploadError) throw error;
    throw new UploadError('Could not read that file. It may be corrupted or password-protected.', 422);
  }
}