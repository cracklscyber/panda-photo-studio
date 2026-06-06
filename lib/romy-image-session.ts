// Gemini image generation flow that runs alongside (but never inside) the
// Claude build loop. The chat route delegates to handleImageIntent only when
// detectImageIntent returns a non-"none" intent AND the feature flag is on.
//
// Storage convention:
//   customer-sites/{slug}/user-images/img-<timestamp>.png
//
// History markers (written into the assistant reply content):
//   [ROMY_IMAGE_DRAFT:<url>]       — current iteration candidate, awaiting feedback
//   [ROMY_IMAGE_CONFIRMED:<url>]   — user said yes; will be passed to Claude on next build
//
// The markers are invisible to the user — the chat UI in app/chat already
// renders assistant message content as plain text, so the marker is
// effectively a stable token only the backend reads. (No UI changes needed.)

import { generateImage } from './gemini-images'
import { findSiteByPhone } from './romy-sites'
import { IMAGE_DRAFT_MARKER, IMAGE_CONFIRMED_MARKER, extractLatestDraftUrl, extractDraftPromptContext } from './romy-image-intent'
import type { ChatMessage } from './romy-chat'

export interface ImageActionResult {
  reply: string
  /** Short text sent as WhatsApp image caption — never explanatory, just a question. */
  caption?: string
  url?: string
  status: 'draft' | 'confirmed' | 'cancelled' | 'limit' | 'error'
}

function timestampedFilename(): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 7)
  return `user-images/img-${ts}-${rand}`
}

function deriveAspect(userMessage: string): '16:9' | '4:3' | '1:1' | '9:16' | '3:4' {
  const t = userMessage.toLowerCase()
  if (/\bhero\b|\bbanner\b|\bquer\b|\bwide\b|\bbreit\b/i.test(t)) return '16:9'
  if (/\bportrait\b|\bhochkant\b|\bvertical\b/i.test(t)) return '3:4'
  if (/\bquadrat\b|\bsquare\b|\bsymbol\b|\blogo\b/i.test(t)) return '1:1'
  return '4:3'
}

function extractRecentContext(history: ChatMessage[]): string {
  return history
    .slice(-10)
    .filter((m) => m.content && !m.content.includes(IMAGE_DRAFT_MARKER))
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Luna'}: ${m.content.replace(/\[[^\]]+\]/g, '').slice(0, 220)}`)
    .join(' | ')
}

function composeGeminiPrompt(rawUserPrompt: string, isIteration: boolean, history: ChatMessage[]): string {
  if (!isIteration) {
    const ctx = extractRecentContext(history)
    const contextPrefix = ctx ? `Context from the website chat: ${ctx}. ` : ''
    return `${contextPrefix}Current image request: ${rawUserPrompt}. Create an image that fits the customer's business, website style, and latest request. Photo-realistic, high detail, natural daylight, clean composition, no text in image, no watermark.`
  }
  const ctx = extractDraftPromptContext(history)
  return `${ctx}. ${rawUserPrompt}. Photo-realistic, high detail, no text in image, no watermark.`
}

export async function generateDraftImage(opts: {
  sessionKey: string
  userMessage: string
  history: ChatMessage[]
  isIteration: boolean
}): Promise<ImageActionResult> {
  const site = await findSiteByPhone(opts.sessionKey).catch(() => null)
  const fallbackSlug = `image-${opts.sessionKey.replace(/\D/g, '').slice(-8) || 'session'}`
  const storageSlug = site?.slug || fallbackSlug
  const prompt = composeGeminiPrompt(opts.userMessage, opts.isIteration, opts.history)
  const aspect = deriveAspect(opts.userMessage)
  const filename = timestampedFilename()

  try {
    const img = await generateImage({
      slug: storageSlug,
      prompt,
      aspect,
      filename,
    })
    // Full reply stored in history (with marker for state tracking)
    const reply = `${IMAGE_DRAFT_MARKER}${img.url}]`
    // Caption sent on WhatsApp: just a short question, no explanation
    const caption = 'Gefällt dir das Foto?'
    return { reply, caption, url: img.url, status: 'draft' }
  } catch (err) {
    console.error('generateDraftImage failed:', err)
    return {
      reply:
        'Die Bildgenerierung hat gerade technisch nicht geklappt. Ich habe das an mein Team weitergeleitet, damit die Bilder manuell erstellt oder die Funktion geprüft wird. Ich ändere deine Website deshalb nicht ungefragt.',
      status: 'error',
    }
  }
}

export function confirmDraftImage(history: ChatMessage[]): ImageActionResult {
  const url = extractLatestDraftUrl(history)
  if (!url) {
    return {
      reply:
        'Ich habe gerade keinen aktiven Bild-Entwurf. Sag mir kurz, welches Bild ich generieren soll.',
      status: 'error',
    }
  }
  return {
    reply: `Perfekt, ich merke mir dieses Bild für deine Seite.\n\n${IMAGE_CONFIRMED_MARKER}${url}]`,
    url,
    status: 'confirmed',
  }
}

export function cancelDraftImage(): ImageActionResult {
  return {
    reply:
      'Okay, dann lass uns das Bild erstmal weglassen. Sag einfach Bescheid, wenn du was generiert haben möchtest.',
    status: 'cancelled',
  }
}
