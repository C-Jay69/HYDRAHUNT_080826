import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PRICE_IDS } from '@/lib/stripe'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const checkoutSchema = z.object({
  plan: z.enum(['mission_pack', 'hunter_monthly', 'hunter_yearly', 'beastmaster_monthly', 'beastmaster_yearly']),
})

// POST /api/stripe/checkout — create a Stripe Checkout Session
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 })
    }

    const priceId = PRICE_IDS[parsed.data.plan]
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: `No Stripe price configured for plan "${parsed.data.plan}". Add STRIPE_PRICE_${parsed.data.plan.toUpperCase()} to env.` },
        { status: 400 },
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    const session = await stripe.checkout.sessions.create({
      mode: parsed.data.plan === 'mission_pack' ? 'payment' : 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?billing=cancelled`,
      metadata: { userId: user.id },
    })

    return NextResponse.json({ success: true, url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create checkout session' }, { status: 500 })
  }
}
