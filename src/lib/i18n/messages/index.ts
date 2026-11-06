import type { Locale } from '../locales'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { zh } from './zh'

/** Shape every locale must satisfy. Derived from the English source of truth. */
export type Messages = typeof en

export const messages: Record<Locale, Messages> = {
  en,
  es,
  zh,
  fr,
}

/**
 * Fill `{name}` placeholders in a translated string.
 * Unknown placeholders are left untouched so a missing value is visible.
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  )
}
