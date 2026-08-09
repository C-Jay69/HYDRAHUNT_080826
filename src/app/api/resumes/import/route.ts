import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth'; // Adjust import path if different
import { parseUpload } from '@/lib/file-upload'; // Ensure this path matches your structure

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate User
    const user = await requireUser(request);
    
    // 2. Parse FormData safely
    // Note: request.formData() returns a Promise
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No valid file provided in multipart/form-data body.' }),
        { status: 400 }
      );
    }

    // 3. Process the file
    console.log(`Processing upload: ${file.name}`);
    const { fileName, text } = await parseUpload(file);

    // 4. Save to Database
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: fileName.replace(/\.[^/.]+$/, ""), // Remove extension for title
        summary: text.substring(0, 500), // Store first 500 chars as summary
        isDefault: true,
        atsScore: 0, // Initial score
      },
      include: {
        // If you have relations, add them here
        // user: { select: { id: true, email: true } }
      }
    });

    return new Response(JSON.stringify(resume), { status: 201 });

  } catch (error) {
    console.error("Resume Import Error:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to process resume import.', details: String(error) }),
      { status: 500 }
    );
  }
}