import Image from 'next/image'
import { cn } from '@/lib/utils'

interface HydraMarkProps {
  size?: number
  className?: string
  priority?: boolean
  /** Use "" when the mark sits next to a visible "HydraHunt" wordmark. */
  alt?: string
}

/** The supplied logo artwork is a light tile — round it into a badge so it sits
 *  cleanly on the dark UI instead of reading as a pasted square. */
export function HydraMark({
  size = 32,
  className,
  priority = false,
  alt = 'HydraHunt',
}: HydraMarkProps) {
  return (
    <Image
      src="/brand/logo-mark.webp"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 rounded-lg object-cover ring-1 ring-white/15', className)}
      style={{ width: size, height: size }}
    />
  )
}

interface HydraLogoProps {
  markSize?: number
  className?: string
  wordmarkClassName?: string
  priority?: boolean
}

export function HydraLogo({
  markSize = 30,
  className,
  wordmarkClassName,
  priority = false,
}: HydraLogoProps) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <HydraMark size={markSize} priority={priority} alt="" />
      <span className={cn('font-bold tracking-tight gradient-text', wordmarkClassName)}>
        HydraHunt
      </span>
    </span>
  )
}
