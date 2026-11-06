'use client'

import { Check, ChevronDown, Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LOCALES, LOCALE_META, useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  /** `full` shows the language badge; `compact` is icon-only. */
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * Language picker for English, Spanish, Simplified Chinese and French.
 * The choice is stored in the persisted app store and applies immediately.
 */
export function LanguageSwitcher({ variant = 'full', className }: LanguageSwitcherProps) {
  const { m, locale, setLocale } = useI18n()
  const active = LOCALE_META[locale] ?? LOCALE_META.en

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={m.language.change}
          title={m.language.change}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm',
            'text-muted-foreground transition-colors hover:bg-hydra-surface-2 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-hydra-purple/50',
            className,
          )}
        >
          <Globe className="h-4 w-4" />
          <span
            className={cn(
              'font-medium',
              variant === 'compact' && 'sr-only',
            )}
          >
            {active.short}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 border-hydra-border bg-hydra-surface-2"
      >
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          {m.language.label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-hydra-border" />
        {LOCALES.map((loc) => {
          const meta = LOCALE_META[loc]
          const isActive = loc === locale
          return (
            <DropdownMenuItem
              key={loc}
              onSelect={() => setLocale(loc)}
              className={cn(
                'cursor-pointer gap-2 text-sm',
                'focus:bg-hydra-purple/10 focus:text-hydra-purple',
                isActive && 'text-hydra-purple',
              )}
            >
              <span className="flex-1">{meta.nativeName}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-hydra-purple" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
