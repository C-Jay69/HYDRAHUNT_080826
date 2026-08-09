import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: '2025-04-18' })
  }
  return stripeClient
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

/** Price IDs for each plan/tier (populated from env). */
export const PRICE_IDS = {
  missionPack: process.env.STRIPE_PRICE_MISSION_PACK || '',
  hunterMonthly: process.env.STRIPE_PRICE_HUNTER_MONTHLY || '',
  hunterYearly: process.env.STRIPE_PRICE_HUNTER_YEARLY || '',
  beastmasterMonthly: process.env.STRIPE_PRICE_BEASTMASTER_MONTHLY || '',
  beastmasterYearly: process.env.STRIPE_PRICE_BEASTMASTER_YEARLY || '',
}

export function planFromStripe(priceId: string): string {
  if (priceId === PRICE_IDS.missionPack) return 'mission_pack'
  if (priceId === PRICE_IDS.hunterMonthly || priceId === PRICE_IDS.hunterYearly) return 'hunter'
  if (priceId === PRICE_IDS.beastmasterMonthly || priceId === PRICE_IDS.beastmasterYearly) return 'beastmaster'
  return 'free'
}
