import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { createHmac, timingSafeEqual } from 'crypto'
import { routeMessage } from '@/lib/romy-router'
import { runRomyCoder, sanitizeReply } from '@/lib/romy-coder'
import { detectImageIntent, isFeatureEnabled as imageFeatureEnabled } from '@/lib/romy-image-intent'
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
import { downloadSiteFile, sitePreviewUrl } from '@/lib/supabase-storage'
import { transcribeAudio } from '@/lib/gemini-audio'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const STRIPE_URL = 'https://buy.stripe.com/eVq00k0jc2r4251cZl7EQ00'
const CAL_URL = 'https://cal.com/luna.ai/30min'

const ACK_FIRST =
  'Alles klar, ich leg jetzt los. Beim ersten Mal kann es ein paar Minuten dauern. Um die Feinheiten kümmern wir uns danach.'
const ACK_FOLLOWUP =
  'Ich setze das jetzt um. Einen Moment.'

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
              'Begrüße sie nicht wie eine neue Kundin. Frage kurz, was an der bestehenden Seite geändert werden soll.',
          },
        ]
      : history
  const storedUserMessage = imageUrl
    ? `[Bild erhalten]${text ? `\n${text}` : ''}`
    : text || '(leer)'
  await appendUserOnly(phone, storedUserMessage).catch((err) =>
    console.error('appendUserOnly failed:', err)
  )

  // Step 0: explicit image generation / iteration / confirmation.
  // This must run before the website-build classifier, otherwise requests like
  // "Generiere mir Nagel Design Bilder" get misrouted into the coder.
  const imageIntent = detectImageIntent(text || '', history)
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

    if (imageIntent.kind === 'confirm') {
      imageResult = confirmDraftImage(history)
    } else if (imageIntent.kind === 'cancel') {
      imageResult = cancelDraftImage()
    } else {
      imageResult = await generateDraftImage({
        sessionKey: phone,
        userMessage: imageIntent.rawPrompt,
        history,
        isIteration: imageIntent.kind === 'iterate',
      })
    }

    const userVisibleReply =
      stripImageMarkers(imageResult.reply) ||
      'Ich habe dir einen Bildvorschlag erstellt. Sag mir, ob es so passt.'

    if (imageResult.url && imageResult.status === 'draft') {
      await sendWhatsAppImage(metaFrom, imageResult.url, userVisibleReply).catch(async (err) => {
        console.error('image send failed, falling back to text:', err)
        await sendWhatsAppMessage(metaFrom, `${userVisibleReply}\n${imageResult.url}`)
      })
    } else {
      await sendWhatsAppMessage(metaFrom, userVisibleReply)
    }
    await appendAssistantOnly(phone, imageResult.reply).catch(() => {})
    return
  }

  // Step 1: classify intent (cheap Haiku call)
  const routed = await routeMessage(routedHistory, text || '(leer)', !!imageUrl)

  // Step 2: chat → just send reply, persist, done
  if (routed.intent === 'chat') {
    const raw = routed.chat_reply || 'Sag mir einfach, was ich für deine Seite machen soll.'
    const reply = sanitizeReply(raw) || 'Sag mir einfach, was ich für deine Seite machen soll.'
    await sendWhatsAppMessage(metaFrom, reply)
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
    imageUrl,
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
    const previewUrl = sitePreviewUrl(site.slug)
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
