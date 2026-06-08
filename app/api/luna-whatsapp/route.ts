import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { createHmac, timingSafeEqual } from 'crypto'
import { classifyDraftResponse, routeMessage } from '@/lib/romy-router'
import { runRomyCoder, sanitizeReply } from '@/lib/romy-coder'
import { detectImageIntent, isFeatureEnabled as imageFeatureEnabled, needsImagePrompt } from '@/lib/romy-image-intent'
import {
  cancelDraftImage,
  confirmDraftImage,
  generateDraftImage,
} from '@/lib/romy-image-session'
import {
  getOrCreateSite,
  findSiteByPhone,
  updateSiteSandboxId,
  incrementBuildCount,
  markCallbackRequested,
  FREE_BUILD_LIMIT,
} from '@/lib/romy-sites'
import { loadHistory, appendAssistantOnly, appendUserOnly } from '@/lib/romy-chat'
import { logBuild } from '@/lib/romy-costs'
import { downloadSiteFile, sitePathPreviewUrl, sitePreviewUrl, uploadUserChatImage } from '@/lib/supabase-storage'
import { transcribeAudio } from '@/lib/gemini-audio'
import { ensureVercelSubdomain } from '@/lib/vercel-domains'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const STRIPE_URL = 'https://buy.stripe.com/eVq00k0jc2r4251cZl7EQ00'
const CAL_URL = 'https://cal.com/luna.ai/30min'

const ACK_FIRST =
  'Alles klar, ich leg jetzt los 🚀 Beim ersten Mal kann es ein paar Minuten dauern. Um die Feinheiten kümmern wir uns danach.'
const ACK_FOLLOWUP =
  'Mach ich, ich setze das jetzt um ✨'

const SOCIAL_ACK_RE =
  /^\s*(ja\s+)?(danke|dankeschön|danke\s+schön|vielen\s+dank|herzlichen\s+dank|merci|thanks)(\s+(dir|luna))?\s*[!.?]*\s*$/i
const TEXT_DRAFT_MARKER = '[ROMY_TEXT_DRAFT:'
const CHANGE_DRAFT_MARKER = '[ROMY_CHANGE_DRAFT:'
const REJECTION_RE =
  /\b(nein|nee|ne|anders|nochmal|gefällt nicht|gefaellt nicht|passt nicht|nicht so|änder|aender|umschreib|umformulieren)\b/i
const TEXT_REQUEST_RE =
  /\b(text|texte|copy|formulierung|formulier|schreib|schreibe|headline|überschrift|ueberschrift|beschreibung|über uns|ueber uns|slogan|angebot|aktion|besser|bessern|verbesser|einfügen|einfuegen|einbauen)\b/i
const CHANGE_REQUEST_RE =
  /\b(änder|aender|füge|fuege|einbauen|einfügen|einfuegen|ersetzen|löschen|loeschen|mach|button|link|termin|kalender|farbe|schrift|layout|sektion|bereich|angebot|öffnungszeiten|oeffnungszeiten|preise|adresse|telefon)\b/i

function hasRecentImageDraft(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i]
    if (item.role !== 'assistant') continue
    if (item.content.includes('[ROMY_IMAGE_DRAFT:')) return true
    if (item.content.includes('[ROMY_IMAGE_CONFIRMED:')) return false
    return false
  }
  return false
}

function hasRecentImageContext(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  for (let i = history.length - 1; i >= Math.max(0, history.length - 14); i--) {
    const item = history[i]
    if (
      item.content.includes('[ROMY_USER_IMAGE:') ||
      item.content.includes('[ROMY_IMAGE_DRAFT:') ||
      item.content.includes('[ROMY_IMAGE_CONFIRMED:')
    ) {
      return true
    }
  }
  return false
}

function isImagePlacementRequest(
  text: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  if (!hasRecentImageContext(history)) return false
  const lower = text.toLowerCase()
  const placementSignal =
    /\b(einfüg|einfueg|einbau|platzier|platzieren|hero|galerie|hintergrund|rein|drauf|nutzen|verwenden)\b/i.test(
      lower
    ) ||
    /\b(auf|in)\s+(meine|die|der)?\s*(seite|website|webseite)\b/i.test(lower)
  const imageReference =
    /\b(bild|foto|fotos|motiv|dalmatiner|hund|hundebild|das|es)\b/i.test(lower)
  return placementSignal && imageReference
}

function socialAckReply(
  text: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string | null {
  if (!SOCIAL_ACK_RE.test(text.trim())) return null
  if (hasRecentImageDraft(history)) {
    return 'Sehr gerne! Soll ich das Bild auf deine Website einbauen? 😊'
  }
  return 'Sehr gerne! Sag mir einfach, was du als Nächstes ändern oder ergänzen möchtest 😊'
}

function encodeDraft(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url')
}

function decodeDraft(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

function latestTextDraft(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string | null {
  return latestDraft(history, TEXT_DRAFT_MARKER)
}

function latestChangeDraft(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string | null {
  return latestDraft(history, CHANGE_DRAFT_MARKER)
}

function latestDraft(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  marker: string
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i]
    if (item.role !== 'assistant') continue
    const markerIndex = item.content.indexOf(marker)
    if (markerIndex === -1) {
      if (item.content.includes('[ROMY_SITE:')) return null
      continue
    }
    const start = markerIndex + marker.length
    const end = item.content.indexOf(']', start)
    if (end === -1) return null
    return decodeDraft(item.content.slice(start, end))
  }
  return null
}

function isTextDraftRequest(text: string): boolean {
  if (!TEXT_REQUEST_RE.test(text)) return false
  if (/\b(termin|kalender|calendly|cal\.com|link|button|farbe|schriftart|layout|domain)\b/i.test(text)) {
    return false
  }
  return true
}

function latestAssistantAskedForTextTopic(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  for (let i = history.length - 1; i >= Math.max(0, history.length - 6); i--) {
    const item = history[i]
    if (item.role !== 'assistant') continue
    const lower = item.content.toLowerCase()
    if (
      lower.includes('worum es gehen soll') ||
      lower.includes('wofür der text') ||
      lower.includes('wofuer der text') ||
      lower.includes('welchen text') ||
      lower.includes('welches thema') ||
      lower.includes('welche stimmung')
    ) {
      return true
    }
    if (
      item.content.includes(TEXT_DRAFT_MARKER) ||
      item.content.includes(CHANGE_DRAFT_MARKER) ||
      item.content.includes('[ROMY_SITE:')
    ) {
      return false
    }
  }
  return false
}

function extractTextTopic(text: string): string {
  const cleaned = text
    .replace(/\b(texte?|copy|formulierung(?:en)?|formulier(?:e|en)?|schreib(?:e|en)?|bessern|verbessern|einfügen|einfuegen|einbauen|generier(?:e|en)?|erstell(?:e|en)?|mach(?:e|en)?)\b/gi, ' ')
    .replace(/\b(kannst|könntest|koenntest|würdest|wuerdest|brauch(?:e|en)?|du|mir|mich|mein(?:e|en|er|es)?|einen?|eine|der|die|das|für|fuer|bitte|mal|auch|kurz|gerne|frage)\b/gi, ' ')
    .replace(/\b(z\.?\s*b\.?|zum beispiel|beispielsweise)\b/gi, ' ')
    .replace(/[?.!,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
}

function hasUsableTextTopic(text: string): boolean {
  const topic = extractTextTopic(text)
  if (topic.length < 3) return false
  if (/^(ja|nein|nee|ok|okay|danke|passt|mach|weiter)$/i.test(topic)) return false
  return true
}

function makeTextDraft(text: string): string | null {
  const topic = extractTextTopic(text)
  if (!hasUsableTextTopic(text)) {
    return 'Ja, gerne. Schreib mir kurz, worum es gehen soll, dann formuliere ich dir erst einen Vorschlag für den Chat ✨'
  }

  if (/sommerschule/i.test(text)) {
    return [
      'Ich würde es so schreiben:',
      '',
      'Diesen Sommer bieten wir eine Sommerschule für Hunde und ihre Menschen an. In entspannter Atmosphäre trainieren wir Alltagssicherheit, Orientierung und ein gutes Miteinander. Das Angebot passt für alle, die die Sommerzeit nutzen möchten, um mit ihrem Hund sicherer, klarer und gelassener zu werden.',
      '',
      'Passt das so? Wenn du zustimmst, baue ich den Text auf deine Seite ein ✨',
    ].join('\n')
  }

  return [
    'Ich würde es so schreiben:',
    '',
    `${topic.charAt(0).toUpperCase()}${topic.slice(1)} bekommt auf deiner Seite einen klaren, gut verständlichen Bereich. Der Text erklärt kurz, worum es geht, für wen das Angebot passt und warum Interessierte sich bei dir melden sollten.`,
    '',
    'Passt das so? Wenn du zustimmst, baue ich den Text auf deine Seite ein ✨',
  ].join('\n')
}

function textDraftReply(
  text: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): { reply: string; stored: string } | null {
  const pendingTopic = latestAssistantAskedForTextTopic(history)
  const previousDraft = latestTextDraft(history)
  if (!pendingTopic && previousDraft && REJECTION_RE.test(text)) {
    const reply =
      'Alles gut. Sag mir kurz, was anders klingen soll, zum Beispiel wärmer, kürzer oder konkreter, dann formuliere ich ihn neu ✨'
    return { reply, stored: reply }
  }

  if (!isTextDraftRequest(text) && !(pendingTopic && hasUsableTextTopic(text))) return null

  const reply = makeTextDraft(text)
  if (!reply) return null
  const withoutIntro = reply.replace(/^Ich würde es so schreiben:\n\n/, '')
  const draftBody = withoutIntro.split('\n\nPasst das so?')[0] || withoutIntro
  const marker = `${TEXT_DRAFT_MARKER}${encodeDraft(draftBody)}]`
  return { reply, stored: `${reply}\n${marker}` }
}

function isGenericChangeRequest(text: string): boolean {
  if (!CHANGE_REQUEST_RE.test(text)) return false
  if (isTextDraftRequest(text)) return false
  if (/^\s*(hey|hi|hallo|moin|servus|danke|ja|nein|ok|okay)\b/i.test(text)) return false
  return text.trim().length >= 8
}

function changeDraftReply(
  text: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): { reply: string; stored: string } | null {
  const previousDraft = latestChangeDraft(history)
  if (previousDraft && REJECTION_RE.test(text)) {
    const reply =
      'Kein Problem. Sag mir kurz, was ich daran ändern soll, dann passe ich den Vorschlag an ✨'
    return { reply, stored: reply }
  }

  if (!isGenericChangeRequest(text)) return null

  const request = text.trim()
  const reply = [
    'Ich würde es so umsetzen:',
    '',
    request,
    '',
    'Passt das so? Wenn du zustimmst, ändere ich es auf deiner Seite 🚀',
  ].join('\n')
  const marker = `${CHANGE_DRAFT_MARKER}${encodeDraft(request)}]`
  return { reply, stored: `${reply}\n${marker}` }
}

function stripeCheckoutUrl(phone: string): string {
  const url = new URL(STRIPE_URL)
  url.searchParams.set('client_reference_id', phone)
  return url.toString()
}

function buildLimitMessage(): string {
  return [
    'Deine kostenlosen Änderungen sind aufgebraucht. Für 35 Euro im Monat läuft alles weiter: unbegrenzte Änderungen vornehmen, deine Seite live schalten und eine eigene Domain bekommen. Kein Vertrag, keine Mindestlaufzeit.',
  ].join('\n')
}

function buildLimitFallbackMessage(phone: string): string {
  return [
    buildLimitMessage(),
    '',
    `Direkt starten: ${stripeCheckoutUrl(phone)}`,
    `Termin buchen: ${CAL_URL}`,
  ].join('\n')
}

async function getSafePreviewUrl(slug: string): Promise<string> {
  const ensured = await ensureVercelSubdomain(slug)
  if (ensured) return sitePreviewUrl(slug)
  console.warn(`Preview subdomain not ensured for slug "${slug}", using path fallback`)
  return sitePathPreviewUrl(slug)
}

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) {
    console.warn(
      'WHATSAPP_APP_SECRET not set — skipping signature verification (not safe for prod)'
    )
    return true
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const provided = signatureHeader.slice(7)
  const expected = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex')
  if (provided.length !== expected.length) return false
  try {
    return timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch {
    return false
  }
}

async function logWebhookHit(kind: string, detail: unknown) {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await sb.from('romy_conversations').upsert(
      {
        phone: '__hook__',
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              ts: new Date().toISOString(),
              kind,
              detail,
            }),
          },
        ],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone' }
    )
  } catch {
    // swallow — logging must not break the webhook
  }
}

// ── Meta Cloud API: Webhook verification (GET) ──
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  const tokenMatch = token === process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && tokenMatch) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── Meta Cloud API: Incoming messages (POST) ──
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')
  if (!verifyMetaSignature(rawBody, signature)) {
    console.error('Meta signature verification failed')
    return new NextResponse('Forbidden', { status: 403 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ status: 'ok' })
  }

  const b = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from?: string
            type?: string
            text?: { body?: string }
            image?: { id?: string; caption?: string }
            audio?: { id?: string; mime_type?: string }
          }>
        }
      }>
    }>
  }
  const message = b?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message?.from) {
    return NextResponse.json({ status: 'ok' })
  }

  waitUntil(
    processMessage(message).catch(async (err) => {
      console.error('processMessage error:', err)
      await logWebhookHit('process_error', {
        from: message?.from,
        error: (err as Error).message,
        stack: (err as Error).stack?.split('\n').slice(0, 5),
      }).catch(() => {})
    })
  )

  return NextResponse.json({ status: 'ok' })
}

interface IncomingMessage {
  from?: string
  type?: string
  text?: { body?: string }
  image?: { id?: string; caption?: string }
  audio?: { id?: string; mime_type?: string }
}

async function processMessage(message: IncomingMessage) {
  const phone = '+' + message.from
  const metaFrom = message.from!

  let text = ''
  let imageUrl: string | undefined

  if (message.type === 'text') {
    text = message.text?.body || ''
  } else if (message.type === 'image' && message.image?.id) {
    try {
      imageUrl = await getMediaUrl(message.image.id)
    } catch (err) {
      console.error('getMediaUrl failed:', err)
    }
    text = message.image?.caption || ''
  } else if (message.type === 'audio' && message.audio?.id) {
    try {
      const audio = await getMediaData(message.audio.id)
      text = await transcribeAudio({
        base64: audio.base64,
        mimeType: audio.mimeType,
      })
    } catch (err) {
      console.error('audio transcription failed:', err)
      const reply =
        'Ich konnte die Sprachnachricht gerade nicht sicher verstehen. Schreib mir den Wunsch bitte kurz als Text, dann setze ich ihn direkt um.'
      await sendWhatsAppMessage(metaFrom, reply).catch((sendErr) =>
        console.error('audio fallback send failed:', sendErr)
      )
      await appendAssistantOnly(phone, reply).catch(() => {})
      return
    }
  } else if (message.type === 'document' || message.type === 'video') {
    text = '[Dokument/Video erhalten — bitte sende Bilder oder Text]'
  } else {
    text = message.text?.body || ''
  }

  const history = await loadHistory(phone)
  const existingSite = await findSiteByPhone(phone).catch(() => null)
  const routedHistory =
    existingSite && history.length === 0
      ? [
          {
            role: 'assistant' as const,
            content:
              `Kontext: Diese Kundin hat bereits eine Website-Vorschau (${existingSite.slug}). ` +
              'Begrüße sie herzlich aber kurz — nicht wie beim allerersten Kontakt. Reagiere auf ihre aktuelle Nachricht natürlich und geh nur dann auf die bestehende Seite ein, wenn es passt.',
          },
        ]
      : history
  let publicImageUrl: string | undefined
  if (imageUrl?.startsWith('data:')) {
    const uploadSlug = existingSite?.slug || `tmp-${phone.replace(/[^a-z0-9]/gi, '-')}`
    publicImageUrl = await uploadUserChatImage(uploadSlug, imageUrl).catch((err) => {
      console.error('uploadUserChatImage failed:', err)
      return undefined
    })
  }
  const storedUserMessage = imageUrl
    ? `${publicImageUrl ? `[ROMY_USER_IMAGE:${publicImageUrl}]` : '[Bild erhalten]'}${text ? `\n${text}` : ''}`
    : text || '(leer)'
  await appendUserOnly(phone, storedUserMessage).catch((err) =>
    console.error('appendUserOnly failed:', err)
  )

  const imagePlacementRequest = isImagePlacementRequest(text || '', history)
  if (imagePlacementRequest) {
    text = `Baue das zuletzt bestätigte oder hochgeladene Bild passend in die Website ein. Wunsch der Kundin: ${text || 'Bild einbauen'}`
  }

  const incomingTextDraftRequest =
    isTextDraftRequest(text || '') ||
    (latestAssistantAskedForTextTopic(history) && hasUsableTextTopic(text || ''))
  const approvedTextDraft =
    imagePlacementRequest || incomingTextDraftRequest ? null : latestTextDraft(history)
  if (approvedTextDraft) {
    const decision = await classifyDraftResponse(history, text || '', approvedTextDraft)
    if (decision === 'approve') {
      text = `Baue diesen freigegebenen Textvorschlag in die Website ein. Ändere nichts anderes unnötig:\n\n${approvedTextDraft}`
    } else if (decision === 'revise') {
      const reply =
        'Verstanden. Sag mir kurz, ob es eher kürzer, wärmer, direkter oder konkreter werden soll, dann formuliere ich den Vorschlag neu ✨'
      await sendWhatsAppMessage(metaFrom, reply)
      await appendAssistantOnly(phone, reply).catch(() => {})
      return
    } else if (decision === 'reject') {
      const reply =
        'Alles gut, dann lasse ich diesen Vorschlag weg. Schreib mir einfach, was stattdessen auf die Seite soll 😊'
      await sendWhatsAppMessage(metaFrom, reply)
      await appendAssistantOnly(phone, reply).catch(() => {})
      return
    } else if (!isTextDraftRequest(text || '')) {
      const reply =
        'Soll ich den Textvorschlag so auf deine Website übernehmen oder möchtest du ihn noch ändern? ✨'
      await sendWhatsAppMessage(metaFrom, reply)
      await appendAssistantOnly(phone, reply).catch(() => {})
      return
    }
  }

  if (!imagePlacementRequest && !approvedTextDraft) {
    const draft = textDraftReply(text || '', history)
    if (draft) {
      await sendWhatsAppMessage(metaFrom, draft.reply)
      await appendAssistantOnly(phone, draft.stored).catch(() => {})
      return
    }
  }

  const approvedChangeDraft = imagePlacementRequest ? null : latestChangeDraft(history)
  if (approvedChangeDraft) {
    const decision = await classifyDraftResponse(history, text || '', approvedChangeDraft)
    if (decision === 'approve') {
      text = `Setze diesen freigegebenen Änderungswunsch auf der Website um. Ändere nichts anderes unnötig:\n\n${approvedChangeDraft}`
    } else if (decision === 'revise') {
      const reply =
        'Verstanden. Sag mir kurz, was ich am Vorschlag ändern soll, dann passe ich ihn erst im Chat an ✨'
      await sendWhatsAppMessage(metaFrom, reply)
      await appendAssistantOnly(phone, reply).catch(() => {})
      return
    } else if (decision === 'reject') {
      const reply =
        'Okay, dann setze ich diese Änderung nicht um. Schreib mir einfach, was du stattdessen möchtest 😊'
      await sendWhatsAppMessage(metaFrom, reply)
      await appendAssistantOnly(phone, reply).catch(() => {})
      return
    } else if (!isGenericChangeRequest(text || '')) {
      const reply =
        'Soll ich diese Änderung so auf deiner Website umsetzen oder möchtest du noch etwas anpassen? ✨'
      await sendWhatsAppMessage(metaFrom, reply)
      await appendAssistantOnly(phone, reply).catch(() => {})
      return
    }
  }

  if (!imagePlacementRequest && !approvedChangeDraft) {
    const draft = changeDraftReply(text || '', history)
    if (draft) {
      await sendWhatsAppMessage(metaFrom, draft.reply)
      await appendAssistantOnly(phone, draft.stored).catch(() => {})
      return
    }
  }

  const socialReply = socialAckReply(text || '', history)
  if (socialReply) {
    await sendWhatsAppMessage(metaFrom, socialReply)
    await appendAssistantOnly(phone, socialReply).catch(() => {})
    return
  }

  // Step 0: explicit image generation / iteration / confirmation.
  // This must run before the website-build classifier, otherwise requests like
  // "Generiere mir Nagel Design Bilder" get misrouted into the coder.
  const imageIntent = imagePlacementRequest
    ? { kind: 'none' as const }
    : detectImageIntent(text || '', history)
  if (imageIntent.kind !== 'none') {
    console.log('whatsapp image intent', {
      phone,
      kind: imageIntent.kind,
      featureEnabled: imageFeatureEnabled(),
    })

    if (!imageFeatureEnabled()) {
      const reply =
        'Die Bildgenerierung ist gerade nicht aktiv. Ich leite das ans Team weiter, damit die Bilder manuell erstellt oder die Funktion wieder aktiviert wird. Deine Website fasse ich dadurch nicht ungefragt an.'
      await sendWhatsAppMessage(metaFrom, reply)
      await appendAssistantOnly(phone, reply).catch(() => {})
      return
    }

    let imageResult:
      | Awaited<ReturnType<typeof generateDraftImage>>
      | ReturnType<typeof confirmDraftImage>
      | ReturnType<typeof cancelDraftImage>

    // "Nein" im Draft-Modus → nicht blind neu generieren, erst fragen was geändert werden soll
    if (imageIntent.kind === 'reject') {
      const rejectReply = 'Was soll ich ändern? Beschreib mir kurz, was du dir vorstellst.'
      await sendWhatsAppMessage(metaFrom, rejectReply)
      await appendAssistantOnly(phone, rejectReply).catch(() => {})
      return
    }

    // Vage Anfrage ohne Beschreibung (z.B. "kannst du mehr Bilder generieren") → erst fragen
    if (
      imageIntent.kind === 'generate' &&
      needsImagePrompt(imageIntent.rawPrompt)
    ) {
      const askReply = 'Welches Motiv soll es sein? Beschreib mir kurz, was du dir vorstellst.'
      await sendWhatsAppMessage(metaFrom, askReply)
      await appendAssistantOnly(phone, askReply).catch(() => {})
      return
    }

    if (imageIntent.kind === 'confirm') {
      imageResult = confirmDraftImage(history)
    } else if (imageIntent.kind === 'cancel') {
      imageResult = cancelDraftImage()
    } else {
      try {
        imageResult = await generateDraftImage({
          sessionKey: phone,
          userMessage: imageIntent.rawPrompt,
          history,
          isIteration: imageIntent.kind === 'iterate',
        })
      } catch (err) {
        console.error('generateDraftImage threw:', err)
        const errReply = 'Entschuldigung, da ist etwas schiefgelaufen. Ich leite das an mein Team weiter.'
        await sendWhatsAppMessage(metaFrom, errReply).catch(() => {})
        await appendAssistantOnly(phone, errReply).catch(() => {})
        return
      }
    }

    if (imageResult.url && imageResult.status === 'draft') {
      // Caption: nur kurze Frage, kein Erklärungstext
      const imageCaption = imageResult.caption ?? 'Gefällt dir das Foto?'
      await sendWhatsAppImage(metaFrom, imageResult.url, imageCaption).catch(async (err) => {
        console.error('image send failed, falling back to text:', err)
        await sendWhatsAppMessage(metaFrom, `${imageCaption}\n${imageResult.url}`)
      })
      // Store caption alongside the marker so Claude knows what was asked
      await appendAssistantOnly(phone, `${imageResult.reply}\n${imageCaption}`).catch(() => {})
      return
    }

    const userVisibleReply =
      stripImageMarkers(imageResult.reply) ||
      'Entschuldigung, da ist etwas schiefgelaufen. Ich leite das an mein Team weiter.'

    // Confirmed: send reply, store marker, then auto-trigger the build
    if (imageResult.status === 'confirmed') {
      await sendWhatsAppMessage(metaFrom, userVisibleReply)
      await appendAssistantOnly(phone, imageResult.reply).catch(() => {})
      // Reload history so coder sees the IMAGE_CONFIRMED marker
      const historyWithConfirm = await loadHistory(phone)
      const updatedRoutedHistory = historyWithConfirm.length > 0 ? historyWithConfirm : routedHistory
      // Fall through to build with refreshed history
      const site2 = await getOrCreateSite(phone, text || 'Bild einbauen', historyWithConfirm)
      if ((site2.builds_used ?? 0) < FREE_BUILD_LIMIT || site2.paid) {
        const isFirst2 = !site2.last_sandbox_id
        const ack2 = isFirst2 ? ACK_FIRST : ACK_FOLLOWUP
        await sendWhatsAppMessage(metaFrom, ack2).catch(() => {})
        await appendAssistantOnly(phone, ack2).catch(() => {})
        const coderResult2 = await runRomyCoder({
          slug: site2.slug,
          userMessage: text || 'Bild in Website einbauen',
          phone,
          imageUrl,
          history: updatedRoutedHistory,
          isFirstBuild: isFirst2,
        })
        await logBuild({ phone, slug: site2.slug, ok: coderResult2.ok, cost_usd: coderResult2.cost_usd, duration_ms: coderResult2.duration_ms, was_warm: coderResult2.was_warm, user_message: text, error_step: coderResult2.ok ? null : (coderResult2.error_step ?? 'coder_returned_not_ok'), error_msg: coderResult2.ok ? null : (coderResult2.error ?? null), transcript_path: coderResult2.transcript_path }).catch(() => {})
        if (coderResult2.ok) {
          if (coderResult2.sandbox_id) await updateSiteSandboxId(phone, coderResult2.sandbox_id).catch(() => {})
          await incrementBuildCount(phone).catch(() => {})
          const previewUrl = await getSafePreviewUrl(site2.slug)
          const body2 = (coderResult2.reply || 'Fertig! 🎉').trim()
          await sendWhatsAppCTA(metaFrom, body2, 'Website öffnen', previewUrl).catch(async () => {
            await sendWhatsAppMessage(metaFrom, body2)
          })
          await appendAssistantOnly(phone, `${body2}\n[ROMY_SITE:${previewUrl}]`).catch(() => {})
        } else {
          const failReply = 'Ups, da ist was schiefgelaufen. Ich schaue drüber und versuchs nochmal.'
          await sendWhatsAppMessage(metaFrom, failReply)
          await appendAssistantOnly(phone, failReply).catch(() => {})
        }
      } else {
        const limitMessage = buildLimitMessage()
        await sendLimitUpsell(metaFrom, phone, limitMessage).catch(async (err) => {
          console.error('limit upsell send failed after image confirm:', err)
          await sendWhatsAppMessage(metaFrom, buildLimitFallbackMessage(phone)).catch((fallbackErr) =>
            console.error('limit fallback send failed after image confirm:', fallbackErr)
          )
        })
        if (!site2.callback_requested_at) {
          await markCallbackRequested(phone).catch((err) =>
            console.error('markCallbackRequested after image confirm failed:', err)
          )
        }
        await appendAssistantOnly(
          phone,
          `${limitMessage}\n[ROMY_PAYMENT:${stripeCheckoutUrl(phone)}]\n[ROMY_CALENDAR:${CAL_URL}]`
        ).catch(() => {})
      }
      return
    }

    await sendWhatsAppMessage(metaFrom, userVisibleReply)
    await appendAssistantOnly(phone, imageResult.reply).catch(() => {})
    return
  }

  // If no new image was sent, check if user recently uploaded one (for deferred placement)
  const pendingUserImageUrl = !imageUrl ? extractPendingUserImage(history) : undefined
  const effectiveImageUrl = imageUrl || pendingUserImageUrl

  // Step 1: classify intent (cheap Haiku call)
  const routed = await routeMessage(routedHistory, text || '(leer)', !!effectiveImageUrl)

  // Step 2: chat → just send reply, persist, done
  if (routed.intent === 'chat') {
    const raw = routed.chat_reply || 'Sag mir einfach, was ich für deine Seite machen soll.'
    const reply = sanitizeReply(raw) || 'Sag mir einfach, was ich für deine Seite machen soll.'
    // If reply contains Cal.com link → send as CTA button instead of plain text
    const calMatch = reply.match(/https:\/\/cal\.com\/[^\s\]]+/)
    if (calMatch) {
      const calUrl = calMatch[0]
      const bodyText = reply.replace(calUrl, '').replace(/\s{2,}/g, ' ').trim()
      const sent = await sendWhatsAppCTA(metaFrom, bodyText, 'Termin buchen 📅', calUrl).catch(() => false)
      if (!sent) await sendWhatsAppMessage(metaFrom, reply)
    } else {
      await sendWhatsAppMessage(metaFrom, reply)
    }
    await appendAssistantOnly(phone, reply).catch(() => {})
    return
  }

  // Step 3: build → ack first, then run coder, then send final reply
  const site = await getOrCreateSite(phone, text || 'Neue Website', history)

  // Quota gate: free tier covers FREE_BUILD_LIMIT build events.
  if ((site.builds_used ?? 0) >= FREE_BUILD_LIMIT && !site.paid) {
    const limitMessage = buildLimitMessage()
    await sendLimitUpsell(metaFrom, phone, limitMessage).catch(async (err) => {
      console.error('limit upsell send failed:', err)
      await sendWhatsAppMessage(metaFrom, buildLimitFallbackMessage(phone)).catch((fallbackErr) =>
        console.error('limit fallback send failed:', fallbackErr)
      )
    })
    if (!site.callback_requested_at) {
      await markCallbackRequested(phone).catch((err) =>
        console.error('markCallbackRequested failed:', err)
      )
    }
    await appendAssistantOnly(
      phone,
      `${limitMessage}\n[ROMY_PAYMENT:${stripeCheckoutUrl(phone)}]\n[ROMY_CALENDAR:${CAL_URL}]`
    ).catch(() => {})
    return
  }

  const isFirstBuild = !site.last_sandbox_id
  const ack = isFirstBuild ? ACK_FIRST : ACK_FOLLOWUP
  await sendWhatsAppMessage(metaFrom, ack).catch((err) => {
    console.error('ack send failed:', err)
  })
  await appendAssistantOnly(phone, ack).catch((err) =>
    console.error('append ack failed:', err)
  )

  const coderResult = await runRomyCoder({
    slug: site.slug,
    userMessage: text || 'Hallo',
    phone,
    imageUrl: effectiveImageUrl,
    history,
    isFirstBuild,
  })

  await logBuild({
    phone,
    slug: site.slug,
    ok: coderResult.ok,
    cost_usd: coderResult.cost_usd,
    duration_ms: coderResult.duration_ms,
    was_warm: coderResult.was_warm,
    user_message: text,
    error_step: coderResult.ok ? null : (coderResult.error_step ?? 'coder_returned_not_ok'),
    error_msg: coderResult.ok ? null : (coderResult.error ?? null),
    transcript_path: coderResult.transcript_path,
  }).catch((err) => console.error('logBuild failed:', err))

  if (coderResult.ok) {
    const indexHtml = await downloadSiteFile(site.slug, 'index.html').catch((err) => {
      console.error('downloadSiteFile index.html after WhatsApp build failed:', err)
      return null
    })
    if (!indexHtml) {
      const failureReply =
        'Tut mir wirklich sehr leid, da ist gerade was schiefgelaufen. Ich hab das meinem Team gemeldet. Du musst nichts weiter machen.'
      await sendWhatsAppMessage(metaFrom, failureReply)
      await appendAssistantOnly(phone, failureReply).catch(() => {})
      return
    }
    if (coderResult.sandbox_id) {
      await updateSiteSandboxId(phone, coderResult.sandbox_id).catch(() => {})
    }
    await incrementBuildCount(phone).catch((err) =>
      console.error('incrementBuildCount failed:', err)
    )
    const body = (coderResult.reply || 'Fertig!').trim()
    const previewUrl = await getSafePreviewUrl(site.slug)
    const sent = await sendWhatsAppCTA(
      metaFrom,
      body,
      'Entwurf ansehen',
      previewUrl
    ).catch((err) => {
      console.error('cta send failed, falling back to text:', err)
      return false
    })
    if (!sent) {
      await sendWhatsAppMessage(
        metaFrom,
        `${body}\n\nDein Entwurf ist fertig. Ich konnte den Vorschau-Button gerade nicht sauber senden und leite das ans Team weiter.`
      )
    }
    await appendAssistantOnly(
      phone,
      `${body}\n[ROMY_SITE:${previewUrl}]`
    ).catch(() => {})
    return
  }

  const failureReply =
    coderResult.reply ||
    'Tut mir wirklich sehr leid, da ist gerade was schiefgelaufen. Ich hab das meinem Team gemeldet — sie kümmern sich darum und beheben es manuell. Du musst nichts weiter machen, ich melde mich, sobald es wieder läuft.'
  await sendWhatsAppMessage(metaFrom, failureReply)
  await appendAssistantOnly(phone, failureReply).catch(() => {})
}

// ── Send a text message via Meta Cloud API ──
async function sendWhatsAppMessage(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('WhatsApp send error:', err)
    throw new Error(`WhatsApp API error: ${res.status}`)
  }
}

function stripImageMarkers(text: string): string {
  return sanitizeReply(
    text
      .replace(/\[ROMY_(?:USER_IMAGE|IMAGE_DRAFT|IMAGE_CONFIRMED):[^\]]+\]/g, '')
      .trim()
  )
}

function extractPendingUserImage(history: Array<{ role: string; content: string }>, windowSize = 8): string | undefined {
  const recent = history.slice(-windowSize)
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i]
    if (m.role === 'user') {
      const match = m.content.match(/\[ROMY_USER_IMAGE:([^\]]+)\]/)
      if (match) return match[1]
    }
  }
  return undefined
}

async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN
  const safeCaption = caption && caption.length > 1024 ? caption.slice(0, 1020) + '…' : caption

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: {
          link: imageUrl,
          ...(safeCaption ? { caption: safeCaption } : {}),
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('WhatsApp image send error:', err)
    throw new Error(`WhatsApp image API error: ${res.status}`)
  }
}

async function sendLimitUpsell(to: string, phone: string, body: string) {
  const paymentSent = await sendWhatsAppCTA(
    to,
    body,
    'Jetzt starten',
    stripeCheckoutUrl(phone)
  )
  if (!paymentSent) {
    throw new Error('payment CTA failed')
  }

  const bookingSent = await sendWhatsAppCTA(
    to,
    'Oder wenn du vorher kurz sprechen möchtest, kannst du dir hier einen Termin für die Beratung buchen.',
    'Termin buchen',
    CAL_URL
  )
  if (!bookingSent) {
    throw new Error('booking CTA failed')
  }
}

// ── Send a CTA URL button via Meta Cloud API ──
// body.text max 1024 chars, display_text max 20 chars.
async function sendWhatsAppCTA(
  to: string,
  body: string,
  displayText: string,
  url: string
): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN

  const trimmedBody = body.length > 1024 ? body.slice(0, 1020) + '…' : body
  const trimmedDisplay =
    displayText.length > 20 ? displayText.slice(0, 20) : displayText

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          body: { text: trimmedBody },
          action: {
            name: 'cta_url',
            parameters: { display_text: trimmedDisplay, url },
          },
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('WhatsApp CTA send error:', err)
    return false
  }
  return true
}

// ── Download media (images) from Meta ──
async function getMediaUrl(mediaId: string): Promise<string> {
  const data = await getMediaData(mediaId)
  return `data:${data.mimeType};base64,${data.base64}`
}

async function getMediaData(mediaId: string): Promise<{
  base64: string
  mimeType: string
}> {
  const token = process.env.WHATSAPP_TOKEN

  const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()

  const mediaRes = await fetch(data.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const buffer = await mediaRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = data.mime_type || 'image/jpeg'

  return { base64, mimeType }
}
