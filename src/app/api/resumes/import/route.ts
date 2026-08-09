import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { parseUpload } from '@/lib/file-upload';

/** Helper to parse raw text into logical section blocks */
function parseTextIntoSections(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  
  let currentSection = 'SUMMARY';
  const sections: Record<string, string[]> = {
    SUMMARY: [],
    EXPERIENCE: [],
    EDUCATION: [],
    SKILLS: [],
  };

  const sectionHeaderRegex = /^(summary|profile|about|experience|work history|employment|education|skills|technical skills|projects|certifications)/i;

  for (const line of lines) {
    if (sectionHeaderRegex.test(line)) {
      const lower = line.toLowerCase();
      if (lower.includes('experience') || lower.includes('employment') || lower.includes('work history')) {
        currentSection = 'EXPERIENCE';
      } else if (lower.includes('education') || lower.includes('academic')) {
        currentSection = 'EDUCATION';
      } else if (lower.includes('skill')) {
        currentSection = 'SKILLS';
      } else if (lower.includes('summary') || lower.includes('profile') || lower.includes('about')) {
        currentSection = 'SUMMARY';
      }
      continue;
    }

    if (sections[currentSection]) {
      sections[currentSection].push(line);
    } else {
      sections.SUMMARY.push(line);
    }
  }

  return [
    {
      title: 'Professional Summary',
      type: 'SUMMARY',
      content: sections.SUMMARY.join('\n') || text.substring(0, 300),
      order: 0,
    },
    {
      title: 'Work Experience',
      type: 'EXPERIENCE',
      content: sections.EXPERIENCE.join('\n') || 'Add your work experience here...',
      order: 1,
    },
    {
      title: 'Education',
      type: 'EDUCATION',
      content: sections.EDUCATION.join('\n') || 'Add your education details here...',
      order: 2,
    },
    {
      title: 'Skills',
      type: 'SKILLS',
      content: sections.SKILLS.join(', ') || 'Add your skills here...',
      order: 3,
    },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`📥 Processing resume import for: ${file.name}`);
    const { fileName, text } = await parseUpload(file);

    const title = fileName.replace(/\.[^/.]+$/, '');
    const structuredSections = parseTextIntoSections(text);

    // Create the Resume along with its ResumeSection children
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: title || 'Imported Resume',
        summary: structuredSections[0].content.substring(0, 500),
        isDefault: true,
        atsScore: 75,
        // Check if your Prisma schema relates ResumeSection to Resume
        sections: {
          create: structuredSections.map((sec) => ({
            title: sec.title,
            type: sec.type,
            content: sec.content,
            order: sec.order,
          })),
        },
      },
      include: {
        sections: true,
      },
    });

    console.log(`✅ Resume created with ID: ${resume.id} and ${structuredSections.length} sections.`);
    return NextResponse.json(resume, { status: 201 });

  } catch (error: any) {
    console.error('❌ Resume Import Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to import resume', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}