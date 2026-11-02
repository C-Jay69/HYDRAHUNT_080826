import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: '2026-07-29.dahlia' })
  }
  return stripeClient
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

/**
 * Price IDs for each plan/tier (populated from env).
 * Keys match the plan identifiers used by the checkout API and pricing UI.
 */
export const PRICE_IDS = {
  mission_pack: process.env.STRIPE_PRICE_MISSION_PACK || '',
  hunter_monthly: process.env.STRIPE_PRICE_HUNTER_MONTHLY || '',
  hunter_yearly: process.env.STRIPE_PRICE_HUNTER_YEARLY || '',
  beastmaster_monthly: process.env.STRIPE_PRICE_BEASTMASTER_MONTHLY || '',
  beastmaster_yearly: process.env.STRIPE_PRICE_BEASTMASTER_YEARLY || '',
  lifetime_founder_deal: process.env.STRIPE_PRICE_LIFETIME_FOUNDER_DEAL || '',
}

/** Plans billed once instead of as a recurring subscription. */
export const ONE_TIME_PLANS = ['mission_pack', 'lifetime_founder_deal'] as const

export function planFromStripe(priceId: string): string {
  if (!priceId) return 'free'
  if (priceId === PRICE_IDS.lifetime_founder_deal) return 'beastmaster'
  if (priceId === PRICE_IDS.mission_pack) return 'mission_pack'
  if (priceId === PRICE_IDS.hunter_monthly || priceId === PRICE_IDS.hunter_yearly) return 'hunter'
  if (priceId === PRICE_IDS.beastmaster_monthly || priceId === PRICE_IDS.beastmaster_yearly) return 'beastmaster'
  return 'free'
}
