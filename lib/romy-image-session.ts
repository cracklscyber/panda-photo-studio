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

function composeGeminiPrompt(rawUserPrompt: string, isIteration: boolean, history: ChatMessage[]): string {
  if (!isIteration) {
    return `${rawUserPrompt}. Photo-realistic, high detail, natural daylight, clean composition, no text in image, no watermark.`
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
      ? 'Anderer Versuch:'
      : 'Hier ein erster Vorschlag:'
    const tail =
      'Sag mir, ob es so passt, oder beschreib was anders soll. Wenn alles gut ist, schreib einfach "passt" und ich nutze es beim nächsten Build.'
    const reply = `${intro} ${img.url}\n\n${tail}\n\n${IMAGE_DRAFT_MARKER}${img.url}]`
    return { reply, url: img.url, status: 'draft' }
  } catch (err) {
    console.error('generateDraftImage failed:', err)
    return {
      reply:
        'Da hat die Bild-Generierung gerade gehakt. Lass uns ohne eigenes Bild weitermachen, ich nehme erstmal ein passendes Stock-Foto. Du kannst es später jederzeit austauschen.',
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
    reply: `Alles klar, ich merke mir das Bild. Beim nächsten Build baue ich es ein.\n\n${IMAGE_CONFIRMED_MARKER}${url}]`,
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
