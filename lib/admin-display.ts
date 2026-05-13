// Display helpers for the admin dashboard.

export interface DisplayPersonInput {
  phone: string
  customerName?: string | null
  customerEmail?: string | null
  anonymousNumber?: number | null
}

export interface DisplayPerson {
  primary: string // e.g. "Lena Schulz" or "User 42"
  secondary: string | null // e.g. "lena@example.com"
  isAnonymous: boolean
  isWhatsapp: boolean
}

// Turn a raw phone/session identifier into something a human wants to read.
// - Registered customers → name (or email) shown directly.
// - Real phone numbers → formatted with a leading +.
// - Web sessions → "User N" using a stable sequence number assigned by the caller.
export function displayPerson(input: DisplayPersonInput): DisplayPerson {
  const { phone, customerName, customerEmail, anonymousNumber } = input
  const clean = phone.replace(/^web:/, '')
  const looksLikePhone = /^\+?\d{6,}$/.test(clean)

  if (customerName && customerName.trim()) {
    return {
      primary: customerName.trim(),
      secondary: customerEmail || null,
      isAnonymous: false,
      isWhatsapp: looksLikePhone,
    }
  }
  if (customerEmail && customerEmail.trim()) {
    return {
      primary: customerEmail.trim(),
      secondary: null,
      isAnonymous: false,
      isWhatsapp: looksLikePhone,
    }
  }

  if (looksLikePhone) {
    const formatted = clean.startsWith('+') ? clean : `+${clean}`
    return {
      primary: formatted,
      secondary: 'WhatsApp',
      isAnonymous: false,
      isWhatsapp: true,
    }
  }

  return {
    primary: anonymousNumber != null ? `User ${anonymousNumber}` : 'User',
    secondary: null,
    isAnonymous: true,
    isWhatsapp: false,
  }
}

// Count generated image markers inside a conversation.
// Drafts = candidates shown to the user, Confirmed = picked for the build.
export function countGeneratedImages(messages: Array<{ content: string }>): {
  drafts: number
  confirmed: number
  total: number
} {
  let drafts = 0
  let confirmed = 0
  for (const m of messages) {
    const c = typeof m.content === 'string' ? m.content : ''
    drafts += (c.match(/\[ROMY_IMAGE_DRAFT:/g) || []).length
    confirmed += (c.match(/\[ROMY_IMAGE_CONFIRMED:/g) || []).length
  }
  return { drafts, confirmed, total: drafts + confirmed }
}
