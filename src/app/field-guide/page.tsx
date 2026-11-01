import { redirect } from 'next/navigation'

/**
 * Shareable entry point for the Field Guide. The guide lives on the landing
 * page as an anchored section, so this route sends visitors straight to it.
 */
export default function FieldGuidePage() {
  redirect('/#field-manual')
}
