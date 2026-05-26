import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { createHmac, timingSafeEqual } from 'crypto'
import { routeMessage } from '@/lib/romy-router'
import { runRomyCoder, sanitizeReply } from '@/lib/romy-coder'
import {
  getOrCreateSite,
  updateSiteSandboxId,
  incrementBuildCount,
  markCallbackRequested,
  FREE_BUILD_LIMIT,
} from '@/lib/romy-sites'
import { loadHistory, appendAssistantOnly, appendUserOnly } from '@/lib/romy-chat'
import { logBuild } from '@/lib/romy-costs'
import { downloadSiteFile, sitePreviewUrl } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ACK_FIRST =
  'Alles klar, ich leg jetzt los. Beim ersten Mal kann es ein paar Minuten dauern. Um die Feinheiten kümmern wir uns danach.'
const ACK_FOLLOWUP =
  'Alles klar, ich schau es mir an. Einen Moment.'

function buildLimitMessage(_phone: string): string {
  return [
    'Du hast deine kostenlosen Änderungen aufgebraucht. Deine Seite bleibt natürlich erhalten.',
    '',
    'Wenn ich weiter für dich bauen und Änderungen umsetzen soll, aktiviere Hallo Luna für 29€/Monat. Das ist jederzeit kündbar.',
    '',
    'Ich leite das an mein Team weiter, dann bekommst du den nächsten Schritt sauber zugeschickt.',
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
  } else if (message.type === 'document' || message.type === 'video') {
    text = '[Dokument/Video erhalten — bitte sende Bilder oder Text]'
  } else {
    text = message.text?.body || ''
  }

  const history = await loadHistory(phone)
  const storedUserMessage = imageUrl
    ? `[Bild erhalten]${text ? `\n${text}` : ''}`
    : text || '(leer)'
  await appendUserOnly(phone, storedUserMessage).catch((err) =>
    console.error('appendUserOnly failed:', err)
  )

  // Step 1: classify intent (cheap Haiku call)
  const routed = await routeMessage(history, text || '(leer)', !!imageUrl)

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
    const limitMessage = buildLimitMessage(phone)
    await sendWhatsAppMessage(metaFrom, limitMessage).catch((err) =>
      console.error('limit message send failed:', err)
    )
    if (!site.callback_requested_at) {
      await markCallbackRequested(phone).catch((err) =>
        console.error('markCallbackRequested failed:', err)
      )
    }
    await appendAssistantOnly(phone, limitMessage).catch(() => {})
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

  return `data:${mimeType};base64,${base64}`
}
