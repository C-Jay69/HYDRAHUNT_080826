import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { db } from '@/lib/db'
import { planFromStripe } from '@/lib/stripe'

// POST /api/webhooks/stripe — handle Stripe events (checkout, subscription, billing)
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = stripe.webhooks.constructEvent(body, signature || '', STRIPE_WEBHOOK_SECRET) as never
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const object = event.data.object as Record<string, unknown> & {
    id?: string
    customer?: string | { id: string }
    customer_email?: string
    subscription?: string
    metadata?: Record<string, string>
    amount_total?: number
    amount?: number
    currency?: string
    status?: string
    current_period_start?: number
    current_period_end?: number
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = object.metadata?.userId
        if (!userId) {
          // Fall back to matching by email
          const email = object.customer_email
          const user = email ? await db.user.findUnique({ where: { email } }) : null
          if (user) await syncSubscription(user.id, object)
        } else {
          await syncSubscription(userId, object)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        await syncSubscriptionFromEvent(object)
        break
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        await recordBillingEvent(object)
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handling error:', error)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }
}

async function syncSubscriptionFromEvent(object: {
  id?: string
  customer?: string | { id: string }
  metadata?: Record<string, string>
  status?: string
  current_period_start?: number
  current_period_end?: number
}) {
  const customer = object.customer
  const customerId = typeof customer === 'string' ? customer : customer?.id
  if (!customerId) return

  // Find user by Stripe customer metadata (stored as stripeCustomerId on Subscription)
  const sub = await db.subscription.findFirst({
    where: { stripeSubId: object.id },
    include: { user: true },
  })
  const userId = sub?.userId || object.metadata?.userId
  if (!userId) return

  await db.subscription.upsert({
    where: { id: sub?.id || `${userId}-${object.id || 'sub'}` },
    update: {
      status: object.status === 'active' ? 'active' : 'canceled',
      stripeSubId: object.id,
      currentPeriodStart: object.current_period_start ? new Date(object.current_period_start * 1000) : null,
      currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000) : null,
    },
    create: {
      id: `${userId}-${object.id || 'sub'}`,
      userId,
      plan: 'free',
      status: object.status === 'active' ? 'active' : 'canceled',
      stripeSubId: object.id,
    },
  })
}

async function syncSubscription(userId: string, object: {
  subscription?: string
  amount_total?: number
  currency?: string
}) {
  // For checkout.session.completed, fetch the subscription to learn the plan.
  const stripe = getStripe()
  let plan = 'free'
  if (stripe && object.subscription) {
    const sub = await stripe.subscriptions.retrieve(object.subscription)
    plan = planFromStripe(sub.items.data[0]?.price?.id || '')
  } else if (object.amount_total && object.currency) {
    // One-time Mission Pack
    plan = 'mission_pack'
  }

  await db.subscription.upsert({
    where: { userId },
    update: { plan, status: 'active' },
    create: { userId, plan, status: 'active' },
  })

  await db.activityLog.create({
    data: { userId, action: `Subscribed to ${plan} plan`, category: 'billing' },
  })
}

async function recordBillingEvent(object: {
  id?: string
  amount?: number
  currency?: string
  subscription?: string
  status?: string
}) {
  const sub = object.subscription
  if (!sub) return
  const subscription = await db.subscription.findFirst({ where: { stripeSubId: sub } })
  if (!subscription) return

  await db.billingEvent.create({
    data: {
      subscriptionId: subscription.id,
      eventType: object.status === 'paid' ? 'payment_succeeded' : 'payment_failed',
      amount: object.amount ? Math.round(object.amount / 100) : null,
      currency: object.currency,
    },
  })
}
