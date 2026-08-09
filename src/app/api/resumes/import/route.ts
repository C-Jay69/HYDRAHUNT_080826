import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { parseUpload } from '@/lib/file-upload';

function parseTextIntoSections(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let currentSection = 'SUMMARY';
  const sections: Record<string, string[]> = { SUMMARY: [], EXPERIENCE: [], EDUCATION: [], SKILLS: [] };
  const sectionHeaderRegex = /^(summary|profile|about|experience|work history|employment|education|skills|technical skills|projects|certifications)/i;

  for (const line of lines) {
    if (sectionHeaderRegex.test(line)) {
      const lower = line.toLowerCase();
      if (lower.includes('experience') || lower.includes('employment') || lower.includes('work history')) currentSection = 'EXPERIENCE';
      else if (lower.includes('education') || lower.includes('academic')) currentSection = 'EDUCATION';
      else if (lower.includes('skill')) currentSection = 'SKILLS';
      else if (lower.includes('summary') || lower.includes('profile') || lower.includes('about')) currentSection = 'SUMMARY';
      continue;
    }
    if (sections[currentSection]) sections[currentSection].push(line);
    else sections.SUMMARY.push(line);
  }

  return [
    { title: 'Professional Summary', type: 'SUMMARY', content: sections.SUMMARY.join('\n') || text.substring(0, 300), order: 0 },
    { title: 'Work Experience', type: 'EXPERIENCE', content: sections.EXPERIENCE.join('\n') || 'Add work experience...', order: 1 },
    { title: 'Education', type: 'EDUCATION', content: sections.EDUCATION.join('\n') || 'Add education...', order: 2 },
    { title: 'Skills', type: 'SKILLS', content: sections.SKILLS.join(', ') || 'Add skills...', order: 3 },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const { fileName, text } = await parseUpload(file);
    const structuredSections = parseTextIntoSections(text);

    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: fileName.replace(/\.[^/.]+$/, ''),
        summary: structuredSections[0].content.substring(0, 500),
        isDefault: true,
        atsScore: 75,
      },
    });

    if ('resumeSection' in db) {
      for (const sec of structuredSections) {
        await (db as any).resumeSection.create({
          data: {
            resumeId: resume.id,
            title: sec.title,
            type: sec.type,
            content: sec.content,
            sortOrder: sec.order, // FIXED: Now using sortOrder
          },
        });
      }
    }

    return NextResponse.json(resume, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}