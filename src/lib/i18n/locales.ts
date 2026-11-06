export const LOCALES = ['en', 'es', 'zh', 'fr'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

interface LocaleMeta {
  /** Name of the language in that language. */
  nativeName: string
  /** Short badge shown in the switcher. */
  short: string
  /** Value used for <html lang>. */
  htmlLang: string
  dir: 'ltr' | 'rtl'
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { nativeName: 'English', short: 'EN', htmlLang: 'en', dir: 'ltr' },
  es: { nativeName: 'Español', short: 'ES', htmlLang: 'es', dir: 'ltr' },
  zh: { nativeName: '简体中文', short: '中文', htmlLang: 'zh-CN', dir: 'ltr' },
  fr: { nativeName: 'Français', short: 'FR', htmlLang: 'fr', dir: 'ltr' },
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
