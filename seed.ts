import { db } from './src/lib/db'

async function seed() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const user = await db.user.upsert({
    where: { email: 'demo@hydrahunt.ai' },
    update: {},
    create: {
      email: 'demo@hydrahunt.ai',
      name: 'Alex Hunter',
    },
  })

  console.log(`  ✓ User: ${user.email}`)

  // Create profile
  const profile = await db.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      headline: 'Senior Product Manager | AI & SaaS',
      bio: 'Experienced PM with 8+ years in B2B SaaS. Passionate about AI-driven products.',
      location: 'San Francisco, CA',
      website: 'https://alexhunter.dev',
      linkedin: 'linkedin.com/in/alexhunter',
      github: 'github.com/ahunter',
      targetRole: 'Senior Product Manager',
      targetSalary: 185000,
      targetLocation: 'Remote / SF Bay Area',
      experience: 'senior',
      onboardingComplete: true,
    },
  })

  console.log('  ✓ Profile created')

  // Create subscription
  const sub = await db.subscription.upsert({
    where: { id: `${user.id}-sub` },
    update: {},
    create: {
      id: `${user.id}-sub`,
      userId: user.id,
      plan: 'hunter',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('  ✓ Subscription: hunter')

  // Create demo resume
  const resume = await db.resume.create({
    data: {
      userId: user.id,
      title: 'Senior PM Resume — AI Focus',
      summary:
        'Senior Product Manager with 8+ years of experience driving product strategy for B2B SaaS platforms. Specialized in AI/ML product development, go-to-market strategy, and cross-functional leadership. Proven track record of shipping features that increased revenue by 40%+.',
      isDefault: true,
      atsScore: 87,
      sections: {
        create: [
          {
            type: 'experience',
            title: 'Experience',
            content: JSON.stringify([
              {
                company: 'TechNova AI',
                role: 'Senior Product Manager',
                startDate: '2021-03',
                endDate: 'Present',
                bullets: [
                  'Led cross-functional team of 12 engineers and designers to launch AI-powered analytics platform',
                  'Increased user engagement by 65% through personalized ML-driven feature recommendations',
                  'Defined product roadmap for 3 product lines generating $12M ARR',
                  'Established data-driven product culture with A/B testing framework',
                ],
              },
              {
                company: 'CloudScale Inc',
                role: 'Product Manager',
                startDate: '2018-06',
                endDate: '2021-02',
                bullets: [
                  'Owned end-to-end product lifecycle for cloud infrastructure monitoring tool',
                  'Reduced customer churn by 30% through proactive alerting features',
                  'Launched API marketplace generating $2.5M in partner revenue',
                ],
              },
            ]),
            sortOrder: 0,
          },
          {
            type: 'education',
            title: 'Education',
            content: JSON.stringify([
              {
                school: 'Stanford University',
                degree: 'MBA',
                field: 'Technology Management',
                year: '2018',
              },
              {
                school: 'UC Berkeley',
                degree: 'BS',
                field: 'Computer Science',
                year: '2014',
              },
            ]),
            sortOrder: 1,
          },
          {
            type: 'skills',
            title: 'Skills',
            content: JSON.stringify([
              'Product Strategy',
              'AI/ML Products',
              'Agile/Scrum',
              'SQL',
              'Python',
              'Data Analysis',
              'User Research',
              'Roadmapping',
              'A/B Testing',
              'Jira',
              'Figma',
              'Tableau',
              'Stakeholder Management',
              'Go-to-Market',
              'OKRs',
            ]),
            sortOrder: 2,
          },
          {
            type: 'projects',
            title: 'Projects',
            content: JSON.stringify([
              {
                name: 'AI Analytics Platform',
                description: 'Built ML-powered analytics dashboard serving 10K+ enterprise users',
                tech: 'Python, TensorFlow, React, PostgreSQL',
                link: 'https://github.com/ahunter/analytics-platform',
              },
            ]),
            sortOrder: 3,
          },
        ],
      },
    },
  })

  console.log('  ✓ Resume created')

  // Create resume version
  await db.resumeVersion.create({
    data: {
      resumeId: resume.id,
      label: 'Initial version',
      snapshot: JSON.stringify({ title: resume.title, summary: resume.summary }),
      notes: 'First draft',
    },
  })

  console.log('  ✓ Version created')

  // Create job targets
  const targets = [
    { company: 'OpenAI', role: 'Senior Product Manager, API Platform', salary: '$200K-$250K', location: 'San Francisco, CA', status: 'interview', priority: 'critical', jobUrl: 'https://openai.com/careers' },
    { company: 'Anthropic', role: 'Product Manager, Safety', salary: '$190K-$240K', location: 'San Francisco, CA', status: 'payload_sent', priority: 'high', jobUrl: 'https://anthropic.com/careers' },
    { company: 'Stripe', role: 'Senior PM, AI Products', salary: '$210K-$260K', location: 'Remote', status: 'acquired', priority: 'high', jobUrl: 'https://stripe.com/jobs' },
    { company: 'Vercel', role: 'Product Manager, DX', salary: '$180K-$220K', location: 'Remote', status: 'intel', priority: 'medium', jobUrl: 'https://vercel.com/careers' },
    { company: 'Figma', role: 'PM, AI Features', salary: '$190K-$235K', location: 'San Francisco, CA', status: 'intel', priority: 'medium', jobUrl: 'https://figma.com/careers' },
    { company: 'Notion', role: 'Senior PM, AI', salary: '$185K-$230K', location: 'New York, NY', status: 'acquired', priority: 'high', jobUrl: 'https://notion.so/careers' },
    { company: 'Linear', role: 'Product Manager', salary: '$175K-$210K', location: 'Remote', status: 'offer', priority: 'critical', jobUrl: 'https://linear.app/careers' },
    { company: 'Supabase', role: 'PM, Database', salary: '$170K-$200K', location: 'Remote', status: 'payload_sent', priority: 'medium', jobUrl: 'https://supabase.com/careers' },
    { company: 'Retool', role: 'Senior PM', salary: '$185K-$225K', location: 'San Francisco, CA', status: 'eliminated', priority: 'low', jobUrl: 'https://retool.com/careers' },
    { company: 'Databricks', role: 'PM, ML Platform', salary: '$200K-$250K', location: 'San Francisco, CA', status: 'intel', priority: 'high', jobUrl: 'https://databricks.com/careers' },
    { company: 'Snowflake', role: 'Senior PM, AI/ML', salary: '$195K-$240K', location: 'Remote', status: 'acquired', priority: 'medium', jobUrl: 'https://snowflake.com/careers' },
    { company: 'Palantir', role: 'Product Manager, Gotham', salary: '$210K-$260K', location: 'Denver, CO', status: 'interview', priority: 'high', jobUrl: 'https://palantir.com/careers' },
  ]

  for (const t of targets) {
    await db.jobTarget.create({
      data: {
        userId: user.id,
        company: t.company,
        role: t.role,
        salary: t.salary,
        location: t.location,
        status: t.status,
        priority: t.priority,
        jobUrl: t.jobUrl,
      },
    })
  }

  console.log(`  ✓ ${targets.length} job targets created`)

  // Create a completed interview session
  const session = await db.interviewSession.create({
    data: {
      userId: user.id,
      type: 'behavioral',
      status: 'completed',
      role: 'Senior Product Manager',
      company: 'OpenAI',
      score: 8,
      messages: {
        create: [
          { role: 'ai', content: 'Welcome to your behavioral interview for the Senior Product Manager role at OpenAI. Let\'s start: Can you tell me about a time you had to make a difficult product decision with incomplete data?' },
          { role: 'user', content: 'At CloudScale, we had to decide whether to build or buy a monitoring solution. I gathered what data I could, talked to 15 enterprise customers in 2 weeks, and presented a build recommendation backed by a cost-benefit analysis showing 3x ROI over 18 months.' },
          { role: 'ai', content: 'Great example of decisive action with limited information. You showed initiative by directly engaging customers. Score: 8/10. Next question: How do you handle disagreements with engineering leadership on technical tradeoffs?' },
        ],
      },
      scores: {
        create: [
          { category: 'Communication', score: 8, maxScore: 10 },
          { category: 'Technical Depth', score: 7, maxScore: 10 },
          { category: 'Structure', score: 9, maxScore: 10 },
          { category: 'Relevance', score: 8, maxScore: 10 },
        ],
      },
    },
  })

  console.log('  ✓ Interview session created')

  // Create activity logs
  const activities = [
    { action: 'Created resume', category: 'resume', details: 'Senior PM Resume — AI Focus' },
    { action: 'Generated payload', category: 'payload', details: 'OpenAI — Senior PM, API Platform' },
    { action: 'Added job target', category: 'application', details: 'Stripe — Senior PM, AI Products' },
    { action: 'Completed interview', category: 'interview', details: 'Behavioral — OpenAI (Score: 8/10)' },
    { action: 'Ran resume analysis', category: 'analysis', details: 'ATS Score: 87/100' },
    { action: 'Moved target to Interview', category: 'application', details: 'OpenAI — Senior PM, API Platform' },
    { action: 'Saved resume version', category: 'resume', details: 'v2 — Added AI project' },
    { action: 'Generated cover letter', category: 'payload', details: 'Anthropic — PM, Safety' },
  ]

  for (let i = 0; i < activities.length; i++) {
    await db.activityLog.create({
      data: {
        userId: user.id,
        ...activities[i],
        createdAt: new Date(Date.now() - i * 3600 * 1000 * (2 + Math.random() * 4)),
      },
    })
  }

  console.log(`  ✓ ${activities.length} activity logs created`)

  // Create career map
  const careerMap = await db.careerMap.create({
    data: {
      userId: user.id,
      title: 'Path to VP of Product',
      currentRole: 'Senior Product Manager',
      targetRole: 'VP of Product, AI',
      timeline: JSON.stringify({ totalMonths: 36 }),
      nodes: {
        create: [
          { type: 'current', label: 'Senior PM', description: 'Current role at TechNova AI', status: 'completed', orderIndex: 0 },
          { type: 'skill', label: 'ML/AI Fundamentals', description: 'Deep learning, NLP, computer vision basics', status: 'in_progress', orderIndex: 1 },
          { type: 'certification', label: 'AWS ML Specialty', description: 'AWS Machine Learning Specialty Certification', status: 'pending', orderIndex: 2 },
          { type: 'milestone', label: 'Lead 0→1 Product Launch', description: 'Ship a new AI product from scratch', status: 'in_progress', orderIndex: 3 },
          { type: 'skill', label: 'Executive Communication', description: 'Board presentations, investor relations', status: 'pending', orderIndex: 4 },
          { type: 'milestone', label: 'Manage PM Team', description: 'Hire and lead a team of 3+ PMs', status: 'pending', orderIndex: 5 },
          { type: 'target', label: 'VP of Product', description: 'VP of Product at an AI-first company', status: 'pending', orderIndex: 6 },
        ],
      },
    },
  })

  console.log('  ✓ Career map created')

  // Create a completed analysis
  await db.resumeAnalysis.create({
    data: {
      resumeId: resume.id,
      userId: user.id,
      targetRole: 'Senior Product Manager',
      status: 'completed',
      atsScore: 87,
      strengths: JSON.stringify(['Strong quantifiable achievements with metrics', 'Clear progression in responsibilities', 'Relevant technical skills listed', 'Good use of action verbs']),
      weaknesses: JSON.stringify(['Summary could be more targeted to specific role', 'Missing some industry-standard ATS keywords', 'Education section lacks GPA or honors']),
      missingKeywords: JSON.stringify(['Product-Led Growth', 'Cross-functional leadership', 'Data-driven decision making', 'Customer discovery', 'Product-market fit', 'KPIs', 'ROI', 'Stakeholder management']),
      rewrittenBullets: JSON.stringify([
        { original: 'Led cross-functional team of 12 engineers and designers to launch AI-powered analytics platform', rewritten: 'Directed a cross-functional squad of 12 engineers and designers through the end-to-end product lifecycle, launching an AI-powered analytics platform that captured $4.2M in first-year revenue' },
        { original: 'Increased user engagement by 65% through personalized ML-driven feature recommendations', rewritten: 'Drove a 65% increase in daily active engagement by architecting and deploying an ML-driven personalization engine serving 50K+ users' },
      ]),
      roleFitAssessment: 'Strong candidate for Senior PM roles. Experience aligns well with AI/ML product management. Recommended to emphasize quantifiable business impact and leadership scope.',
      actionChecklist: JSON.stringify(['Add specific KPIs and revenue impact to each bullet', 'Include Product-Led Growth and cross-functional leadership keywords', 'Tailor summary to each specific job description', 'Add a quantifiable outcome to every experience bullet', 'Consider adding a certifications or publications section']),
    },
  })

  console.log('  ✓ Resume analysis created')

  console.log('\n✅ Seed complete! Login with: demo@hydrahunt.ai')
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })