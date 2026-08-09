import mammoth from 'mammoth';
import { extractText } from 'unpdf';

export async function extractTextFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');

  if (normalizedExt === 'pdf') {
    try {
      const uint8Array = new Uint8Array(buffer);
      const result = await extractText(uint8Array, { mergePages: true });
      
      const parsedText = typeof result.text === 'string' 
        ? result.text 
        : Array.isArray(result.text) 
        ? result.text.join('\n') 
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

  throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.');
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
    console.error('Error processing upload:', error);
    throw error;
  }
}