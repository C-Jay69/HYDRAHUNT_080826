import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { contactSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Name, email, and message are required' },
        { status: 400 },
      )
    }

    // No DB storage needed — just return success.
    // Optional: forward to email provider when configured.
    if (process.env.CONTACT_EMAIL_TO) {
      try {
        await sendEmail({
          to: process.env.CONTACT_EMAIL_TO,
          subject: `[HydraHunt Contact] ${parsed.data.subject}`,
          text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\n\n${parsed.data.message}`,
          replyTo: parsed.data.email,
        })
      } catch (err) {
        console.error('Contact email send failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Signal received. We will get back to you soon.',
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
