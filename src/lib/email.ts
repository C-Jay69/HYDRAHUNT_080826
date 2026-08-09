/**
 * Minimal Sender.net transactional email client.
 * Docs: https://api.sender.net/transactional-campaigns/send-transactional
 */

interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
}

/** Parses "Name <email>" into the Sender { email, name } shape. */
function parseFrom(from: string): { email: string; name: string } {
  const match = /^(.*?)\s*<([^>]+)>$/.exec(from.trim())
  if (match) {
    return { email: match[2], name: match[1].trim() }
  }
  return { email: from.trim(), name: '' }
}

/** Returns true when a Sender API key is configured. */
export function senderConfigured(): boolean {
  return Boolean(process.env.SENDER_API_KEY)
}

/**
 * Sends an email via Sender.net. Throws on non-2xx responses so callers can
 * decide how to surface failures.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.SENDER_API_KEY
  if (!apiKey) {
    throw new Error('SENDER_API_KEY is not configured')
  }

  const fromRaw = process.env.MAIL_FROM || 'HydraHunt <no-reply@hydrahunt.online>'
  const from = parseFrom(fromRaw)

  const body: Record<string, unknown> = {
    from,
    to: { email: params.to, name: params.toName || '' },
    subject: params.subject,
  }
  if (params.text) body.text = params.text
  if (params.html) body.html = params.html
  if (params.replyTo) body.headers = { 'Reply-To': params.replyTo }

  const res = await fetch('https://api.sender.net/v2/message/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Sender email failed (${res.status}): ${detail}`)
  }
}
