import type { Metadata } from 'next'
import Link from 'next/link'
import { HydraMark } from '@/components/brand/hydra-logo'

export const metadata: Metadata = {
  title: 'Privacy — HydraHunt',
  description: 'What data HydraHunt stores, which third parties process it, and how to have it deleted.',
}

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'What we store',
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Your account details: name, email address, and a hashed password.</li>
        <li>The resumes, application kits, interview transcripts, and tracker entries you create.</li>
        <li>Billing state from Stripe. We never see or store your card number.</li>
        <li>Basic request logs (timestamps, route, status) needed to operate the service.</li>
      </ul>
    ),
  },
  {
    title: 'Who processes it',
    body: (
      <p>
        Resume text, job descriptions, and interview answers you submit to AI features are sent to our AI model
        provider so the feature can generate a response. Payment processing is handled by Stripe. Hosting and
        database infrastructure are provided by our hosting vendor. We do not sell your data or use it to train
        third-party models.
      </p>
    ),
  },
  {
    title: 'How long we keep it',
    body: (
      <p>
        Your content stays in your workspace until you delete it or close your account. Backups are rotated on a
        short schedule. Deleting your account removes your resumes, kits, interview sessions, and tracker records.
      </p>
    ),
  },
  {
    title: 'Your choices',
    body: (
      <p>
        You can export any resume as PDF or DOCX, delete individual records from their module, and request full
        account deletion at any time. To request deletion or a copy of your data, email{' '}
        <a className="text-hydra-purple hover:underline" href="mailto:support@hydrahunt.ai">
          support@hydrahunt.ai
        </a>{' '}
        from the address on your account. We respond within 30 days.
      </p>
    ),
  },
  {
    title: 'Cookies and local storage',
    body: (
      <p>
        We use a session cookie to keep you signed in. Your browser also stores workspace preferences locally.
        We do not use advertising trackers.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen scene scene-navy px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <HydraMark size={32} priority />
          <Link href="/" className="text-sm text-hydra-purple hover:underline">
            ← Back to HydraHunt
          </Link>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-foreground">Privacy</h1>
        <p className="mt-2 text-sm text-hydra-muted">
          Last updated {new Date().getFullYear()}. This page explains what we collect, who processes it, and how
          to remove it.
        </p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              <div className="mt-2 text-sm leading-relaxed text-hydra-muted">{section.body}</div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
