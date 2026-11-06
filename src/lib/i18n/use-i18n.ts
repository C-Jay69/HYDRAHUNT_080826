'use client'

import { useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { messages, type Messages } from './messages'
import { fill } from './messages'
import { LOCALE_META, type Locale } from './locales'

export interface I18n {
  /** Dictionary for the active locale. */
  m: Messages
  locale: Locale
  dir: 'ltr' | 'rtl'
  setLocale: (locale: Locale) => void
  /** Replace `{name}` placeholders. */
  format: (template: string, vars: Record<string, string | number>) => string
}

/**
 * Reads the active locale from the persisted app store and returns its
 * dictionary. Every translated component uses this hook; no provider needed.
 */
export function useI18n(): I18n {
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)

  const format = useCallback(
    (template: string, vars: Record<string, string | number>) => fill(template, vars),
    [],
  )

  return {
    m: messages[locale] ?? messages.en,
    locale,
    dir: LOCALE_META[locale]?.dir ?? 'ltr',
    setLocale,
    format,
  }
}
