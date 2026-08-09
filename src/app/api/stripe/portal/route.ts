import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { requireUser } from '@/lib/auth'

// POST /api/stripe/portal — create or retrieve the Stripe customer portal session
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured.' },
        { status: 503 },
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    // Resolve the customer by email.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 })
    const customerId = customers.data[0]?.id

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'No active billing customer found. Subscribe first.' },
        { status: 404 },
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/?billing=return`,
    })

    return NextResponse.json({ success: true, url: session.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json({ success: false, error: 'Failed to open billing portal' }, { status: 500 })
  }
}
