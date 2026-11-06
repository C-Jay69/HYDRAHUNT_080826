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

  // Fail closed. stripe-node will happily verify an HMAC made with an empty
  // secret, so an unset STRIPE_WEBHOOK_SECRET would make every event forgeable.
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set; refusing to process webhook payloads.')
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 503 })
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
    payment_status?: string
    current_period_start?: number
    current_period_end?: number
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Do not grant entitlements for a checkout that has not been paid for.
        // Subscriptions can legitimately report `no_payment_required`.
        if (
          object.payment_status &&
          object.payment_status !== 'paid' &&
          object.payment_status !== 'no_payment_required'
        ) {
          break
        }

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
        await recordBillingEvent(
          object,
          event.type === 'invoice.payment_succeeded' ? 'payment_succeeded' : 'payment_failed',
        )
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

  // On lifecycle events the payload may not carry the price. Resolve the plan
  // from Stripe so upgrades/downgrades made in the portal are reflected.
  let plan: string | undefined
  if (!sub) {
    const stripe = getStripe()
    if (stripe && object.id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(object.id)
        plan = planFromStripe(stripeSub.items.data[0]?.price?.id || '')
      } catch (err) {
        console.error('Failed to retrieve subscription for plan sync:', err)
      }
    }
  }

  const status = object.status === 'active' || object.status === 'trialing' ? 'active' : 'canceled'

  await db.subscription.upsert({
    where: { id: sub?.id || `${userId}-${object.id || 'sub'}` },
    update: {
      status,
      stripeSubId: object.id,
      ...(plan && plan !== 'free' ? { plan } : {}),
      currentPeriodStart: object.current_period_start ? new Date(object.current_period_start * 1000) : null,
      currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000) : null,
    },
    create: {
      id: `${userId}-${object.id || 'sub'}`,
      userId,
      plan: plan || 'free',
      status,
      stripeSubId: object.id,
    },
  })
}

async function syncSubscription(userId: string, object: {
  subscription?: string
  amount_total?: number
  currency?: string
  metadata?: Record<string, string>
}) {
  // For checkout.session.completed, fetch the subscription to learn the plan.
  const stripe = getStripe()
  let plan = 'free'
  if (stripe && object.subscription) {
    const sub = await stripe.subscriptions.retrieve(object.subscription)
    plan = planFromStripe(sub.items.data[0]?.price?.id || '')
  } else if (object.metadata?.plan) {
    // One-time purchases (Boost Pack / Lifetime Founder Deal) carry their plan in session metadata.
    // The lifetime deal grants permanent Apex-tier access.
    plan = object.metadata.plan === 'lifetime_founder_deal' ? 'beastmaster' : object.metadata.plan
  } else if (object.amount_total && object.currency) {
    // Legacy one-time Mission Pack sessions without metadata.
    plan = 'mission_pack'
  }

  const existing = await db.subscription.findFirst({ where: { userId } })
  const stripeSubId = object.subscription || undefined
  if (existing) {
    await db.subscription.update({
      where: { id: existing.id },
      data: {
        plan,
        status: 'active',
        // Persist the Stripe subscription id so later lifecycle events
        // (updated/deleted/invoice.*) can resolve this user.
        ...(stripeSubId ? { stripeSubId } : {}),
      },
    })
  } else {
    await db.subscription.create({
      data: { userId, plan, status: 'active', stripeSubId: stripeSubId || null },
    })
  }

  await db.activityLog.create({
    data: { userId, action: `Subscribed to ${plan} plan`, category: 'billing' },
  })
}

async function recordBillingEvent(
  object: {
    id?: string
    amount?: number
    currency?: string
    subscription?: string
    status?: string
    metadata?: Record<string, string>
  },
  eventType: 'payment_succeeded' | 'payment_failed',
) {
  const sub = object.subscription
  if (!sub) return

  let subscription = await db.subscription.findFirst({ where: { stripeSubId: sub } })

  // Invoices can arrive before checkout.session.completed has persisted
  // stripeSubId. Resolve the owner from the subscription metadata set at
  // checkout time so early payment events are not silently dropped.
  if (!subscription) {
    const stripe = getStripe()
    let userId = object.metadata?.userId
    if (!userId && stripe) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub)
        userId = stripeSub.metadata?.userId
      } catch (err) {
        console.error('Failed to resolve subscription for billing event:', err)
      }
    }
    if (!userId) return

    subscription = await db.subscription.findFirst({ where: { userId } })
    if (!subscription) return
    if (subscription.stripeSubId !== sub) {
      subscription = await db.subscription.update({
        where: { id: subscription.id },
        data: { stripeSubId: sub },
      })
    }
  }

  await db.billingEvent.create({
    data: {
      subscriptionId: subscription.id,
      eventType,
      amount: object.amount ? Math.round(object.amount / 100) : null,
      currency: object.currency,
    },
  })
}
