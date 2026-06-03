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
import { getOrCreateSite } from './romy-sites'
import { IMAGE_DRAFT_MARKER, IMAGE_CONFIRMED_MARKER, extractLatestDraftUrl, extractDraftPromptContext } from './romy-image-intent'
import type { ChatMessage } from './romy-chat'

const MAX_IMAGES_PER_SESSION = 6

export interface ImageActionResult {
  reply: string
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

async function countSessionImages(history: ChatMessage[]): Promise<number> {
  let count = 0
  for (const m of history) {
    if (m.role !== 'assistant') continue
    const drafts = m.content.match(/\[ROMY_IMAGE_DRAFT:/g)
    const confirms = m.content.match(/\[ROMY_IMAGE_CONFIRMED:/g)
    count += (drafts?.length || 0) + (confirms?.length || 0)
  }
  return count
}

export async function generateDraftImage(opts: {
  sessionKey: string
  userMessage: string
  history: ChatMessage[]
  isIteration: boolean
}): Promise<ImageActionResult> {
  const sessionImages = await countSessionImages(opts.history)
  if (sessionImages >= MAX_IMAGES_PER_SESSION) {
    return {
      reply: 'Wir haben jetzt einige Bilder ausprobiert, ich speichere die Variante hier so wie sie ist. Falls du sie tauschen willst, sag Bescheid wenn die Seite steht.',
      status: 'limit',
    }
  }

  const site = await getOrCreateSite(opts.sessionKey, opts.userMessage)
  const prompt = composeGeminiPrompt(opts.userMessage, opts.isIteration, opts.history)
  const aspect = deriveAspect(opts.userMessage)
  const filename = timestampedFilename()

  try {
    const img = await generateImage({
      slug: site.slug,
      prompt,
      aspect,
      filename,
    })
    const intro = opts.isIteration
      ? 'Neuer Versuch 🎨'
      : 'Hier dein Bild! 🎨'
    const tail =
      'Gefällt es dir? Schreib einfach "passt" und ich baue es direkt in deine Website ein. Oder sag mir was anders sein soll.'
    const reply = `${intro}\n\n${tail}\n\n${IMAGE_DRAFT_MARKER}${img.url}]`
    return { reply, url: img.url, status: 'draft' }
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
    reply: `Perfekt! 🔨 Ich baue das Bild jetzt in deine Seite ein.\n\n${IMAGE_CONFIRMED_MARKER}${url}]`,
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
