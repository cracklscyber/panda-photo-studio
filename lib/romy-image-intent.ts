// Detects explicit user requests to generate / iterate images via Gemini.
// Pure heuristics — no LLM call — so detection adds zero latency.
//
// SAFETY: callers should handle image intents before the website-build path.
// If image generation is unavailable, answer with a clear image-specific
// fallback instead of letting the request fall through to the site coder.

import type { ChatMessage } from './romy-chat'

export const IMAGE_DRAFT_MARKER = '[ROMY_IMAGE_DRAFT:'
export const IMAGE_CONFIRMED_MARKER = '[ROMY_IMAGE_CONFIRMED:'
export const USER_IMAGE_MARKER = '[ROMY_USER_IMAGE:'

const GENERATE_TRIGGERS: RegExp[] = [
  /\b(generier|erstell|mach|erzeug|kreier)[a-zäöüß]*\s+(mir\s+)?(ein|nen|noch|bitte|doch)?\s*(eigenes?|individuelles?|neues?|extra)?\s*(bild(?:er)?|foto(?:s)?|hero|grafik(?:en)?|illustration(?:en)?)/i,
  /\b(bild(?:er)?|foto(?:s)?|grafik(?:en)?)\s+(generieren|erstellen|machen|erzeugen|kreieren|gestalten)/i,
  /\b(kannst\s+du|könntest\s+du)\s+.*(bild(?:er)?|foto(?:s)?|grafik(?:en)?)/i,
  /\b(create|generate|make)\s+(an?\s+)?(image|picture|photo)/i,
  /\bgeneriere?\s+/i,
  /\bAI[-\s]?Bild/i,
  /\bKI[-\s]?Bild/i,
]

const IMAGE_PROBLEM_TRIGGERS: RegExp[] = [
  /\b(ich\s+)?(sehe|seh|bekomme|finde)\s+(keine|kein)\s+(bild(?:er)?|foto(?:s)?|grafik(?:en)?)/i,
  /\b(bild(?:er)?|foto(?:s)?)\s+(fehlen|sind nicht da|kommen nicht|wurden nicht geschickt)/i,
]

// "Schwache" Trigger - werden nur erkannt, wenn das Wort Bild/Foto auch fällt.
const STRONG_GENERATE_TRIGGERS: RegExp[] = [
  /\beigene?s? bild/i,
  /\beigene?s? foto/i,
  /\bindividuelle?s? bild/i,
  /\bindividuelle?s? foto/i,
]

const ITERATION_TRIGGERS: RegExp[] = [
  /\bnochmal\b/i,
  /\bnoch\s*ein(mal|s)?\b/i,
  /\bandere?s?\b/i,
  /\banders\b/i,
  /\bdunkler\b/i,
  /\bheller\b/i,
  /\bwärmer\b/i,
  /\bkälter\b/i,
  /\bbunter\b/i,
  /\bweniger\b/i,
  /\bmehr\b/i,
  /\bversuch.+nochmal/i,
  /\b(mach|probier).*(anders|nochmal)/i,
]

const CONFIRM_TRIGGERS: RegExp[] = [
  /\b(perfekt|passt|super|ja\s+gut|gefällt mir|behalten|nimm das|nimm es|nimm deinen vorschlag|nimm den vorschlag|das ist es|ja\s+das|so ist es gut)\b/i,
  /^\s*(ja|jo|jep|jap|okay|ok)\s*[.!?]*\s*$/i,
  /\b(füg|einbau|einfüg|hinzufüg|add|insert|nehm|übernehm)[a-zäöüß]*\s*(es|das|bild|foto)?\s*(ein|hinzu|in die|zur)?\b/i,
  /\b(in die|auf die|zur)\s*(website|seite|web)/i,
  /\b(bitte\s+)?(einbauen|einfügen|hinzufügen|integrieren|verwenden|verwende|benutzen|benutze|nutzen|nutze|nutz)\b/i,
  /\b(ok|okay|ja)?\s*(benutze|nutze|nutz|verwende|nimm)\s+(das|es|den|deinen|deinen vorschlag|vorschlag|bild|foto)\b/i,
]

const CANCEL_TRIGGERS: RegExp[] = [
  /\b(abbrechen|stop|stopp|vergiss|lass|doch nicht|nein lass|nicht generieren)\b/i,
]

const REJECT_TRIGGERS: RegExp[] = [
  /^\s*(nein|nee|nö|nope)\s*[.!?]*\s*$/i,
  /\b(gefällt mir nicht|nicht gut|sieht.*nicht.*gut|nicht das richtige|falsch|passt nicht|ist nicht|nicht was ich)\b/i,
  /\b(mag ich nicht|will ich nicht|so nicht)\b/i,
]

export type ImageIntent =
  | { kind: 'generate'; rawPrompt: string }
  | { kind: 'iterate'; rawPrompt: string }
  | { kind: 'confirm' }
  | { kind: 'cancel' }
  | { kind: 'reject' }
  | { kind: 'none' }

/** True when the user's request is just a trigger phrase with no actual description.
 *  In that case the caller should ask what to generate instead of guessing.
 *  HARD RULE: if no concrete subject/scene remains after stripping all meta-words,
 *  always ask. Better to ask once too often than to generate random images. */
export function needsImagePrompt(rawPrompt: string): boolean {
  const stripped = rawPrompt
    .toLowerCase()
    // All trigger/meta verbs (conjugated)
    .replace(/\b(generier\w*|erstell\w*|mach\w*|erzeug\w*|kreier\w*|schick\w*|send\w*|zeig\w*|gib|geben|haben|hätte\w*|möchte\w*|brauche?\w*|will|woll\w*|könn\w*|kann\w*|würd\w*|wär\w*)\b/g, ' ')
    // Pronouns, articles, names
    .replace(/\b(ich|du|sie|er|es|wir|ihr|luna|hallo|hi|hey|mir|mich|mein\w*|dein\w*|ein\w*|nen|kein\w*|den|dem|die|das|der|des)\b/g, ' ')
    // Filler / adverbs
    .replace(/\b(bitte|danke|mal|noch|auch|einfach|schnell|kurz|nochmal\w*|vielleicht|doch|eben|erst|gerne|okay|ok|ja|nein|bitte|doch|paar|weitere?|neue?s?|extra|mehr|wenig\w*|etwas|so|sehr|bitte)\b/g, ' ')
    // Image-related nouns (they describe the ACT not the subject)
    .replace(/\b(bild\w*|foto\w*|grafik\w*|image\w*|picture\w*|photo\w*|ai[\s-]?bild|ki[\s-]?bild|illustration\w*|vorschlag\w*|entwurf\w*)\b/g, ' ')
    // Prepositions / conjunctions
    .replace(/\b(für|von|mit|aus|auf|an|in|zu|bei|nach|über|unter|zwischen|und|oder|aber|weil|da|als|wie|wenn|ob)\b/g, ' ')
    .replace(/[?!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Needs at least 12 chars of real content (a subject/scene description)
  return stripped.length < 12
}

// Purely social messages that can never be an image request regardless of history
const CONVERSATIONAL_ONLY = /^\s*(ja\s+danke([,\s]+luna)?|danke([,\s]+luna|[,\s]+dir|[,\s]+schön)?|herzlichen\s+dank|sehr\s+gut|toll|super|wunderbar|prima|schön|great|thanks|thank\s+you|tschüss|auf\s+wiedersehen|bye|ciao|ok(ay)?|perfekt|alles\s+klar|verstanden|klar|passt|ja([,\s]+gerne)?|gerne)\s*[!.?]*\s*$/i

export function detectImageIntent(
  userMessage: string,
  history: ChatMessage[]
): ImageIntent {
  const text = userMessage.trim()
  if (!text) return { kind: 'none' }

  // Short social/ack messages → never image intent, even if history has image context
  if (CONVERSATIONAL_ONLY.test(text)) return { kind: 'none' }

  const inDraftMode = history.length > 0 && hasActiveDraft(history)

  // Cancel takes priority when iterating
  if (inDraftMode && CANCEL_TRIGGERS.some((r) => r.test(text))) {
    return { kind: 'cancel' }
  }

  // Confirmation only counts when there's an active draft (otherwise "ja" means something else)
  if (inDraftMode && CONFIRM_TRIGGERS.some((r) => r.test(text))) {
    return { kind: 'confirm' }
  }

  // Rejection: user says "nein" → ask what to change, don't auto-generate
  if (inDraftMode && REJECT_TRIGGERS.some((r) => r.test(text))) {
    return { kind: 'reject' }
  }

  // Iteration only counts when there's an active draft AND user gives modification words
  if (inDraftMode && ITERATION_TRIGGERS.some((r) => r.test(text))) {
    return { kind: 'iterate', rawPrompt: text }
  }

  // Generation trigger — strong words always; "eigenes bild" only with bild/foto
  const triggered =
    GENERATE_TRIGGERS.some((r) => r.test(text)) ||
    IMAGE_PROBLEM_TRIGGERS.some((r) => r.test(text)) ||
    STRONG_GENERATE_TRIGGERS.some((r) => r.test(text))
  if (triggered) {
    return { kind: 'generate', rawPrompt: text }
  }

  // Context-aware: if Luna just asked "welches Motiv / welche Richtung" and the
  // user replies with a description (without explicit trigger words), treat it as
  // an image generation request.
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant')
  if (lastAssistant) {
    const promptedForDesc =
      /welches Motiv|welche Richtung|Motiv oder welche Richtung|wenn es um Bilder geht|was (für|möchtest) du (sehen|als Bild)|sag mir.*Motiv|beschreib.*Bild|beschreib.*vorstell/i.test(
        lastAssistant.content
      )
    if (promptedForDesc && !needsImagePrompt(text) && text.length > 8) {
      return { kind: 'generate', rawPrompt: text }
    }
    // "Wo bleiben die Bilder?" or "Und?" after Luna promised images
    const userFrustrated = /wo\s+bleiben|wann\s+komm|noch\s+nicht|hab.*nichts.*bekommen|und\s*\?|die\s+bilder/i.test(text)
    const lunaPromisedImages = /erstell.*bilder.*chat|bilder.*separat|schick.*bilder/i.test(lastAssistant.content)
    if (userFrustrated && lunaPromisedImages) {
      return { kind: 'generate', rawPrompt: text }
    }
  }

  return { kind: 'none' }
}

export function hasActiveDraft(history: ChatMessage[]): boolean {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]
    if (m.role !== 'assistant') continue
    if (m.content.includes(IMAGE_DRAFT_MARKER)) return true
    // If the latest assistant message has no draft marker, no active draft.
    return false
  }
  return false
}

export function extractLatestDraftUrl(history: ChatMessage[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]
    if (m.role !== 'assistant') continue
    const match = m.content.match(/\[ROMY_IMAGE_DRAFT:([^\]]+)\]/)
    if (match) return match[1]
    return null
  }
  return null
}

export function extractDraftPromptContext(history: ChatMessage[]): string {
  // Pull the last user message that triggered the current draft, plus
  // any iteration tweaks since then. Used to compose a richer prompt
  // for Gemini on iteration.
  const out: string[] = []
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]
    if (m.role === 'user') out.unshift(m.content)
    if (m.role === 'assistant' && m.content.includes(IMAGE_DRAFT_MARKER)) {
      // Stop walking back further: this assistant turn is the draft anchor.
      break
    }
  }
  return out.join(' | ')
}

export function extractConfirmedImageUrls(history: ChatMessage[]): string[] {
  const urls: string[] = []
  const seen = new Set<string>()
  for (const m of history) {
    if (m.role !== 'assistant') continue
    const re = /\[ROMY_IMAGE_CONFIRMED:([^\]]+)\]/g
    let match: RegExpExecArray | null
    while ((match = re.exec(m.content)) !== null) {
      const url = match[1]
      if (!seen.has(url)) {
        seen.add(url)
        urls.push(url)
      }
    }
  }
  return urls
}

export function isFeatureEnabled(): boolean {
  const flag = (process.env.ROMY_GEMINI_IMAGES || '').trim().toLowerCase()
  if (flag === 'off') return false
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) || flag === 'true'
}
