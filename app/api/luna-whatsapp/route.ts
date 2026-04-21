import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { routeMessage } from '@/lib/romy-router'
import { runRomyCoder } from '@/lib/romy-coder'
import { getOrCreateSite, updateSiteSandboxId } from '@/lib/romy-sites'
import { loadHistory, appendTurn } from '@/lib/romy-chat'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ACK_FIRST =
  'Ich leg los 💭 Das erste Mal dauert ein paar Minuten, danach geht\'s viel schneller.'
const ACK_FOLLOWUP = 'Moment, schau\'s mir an 💭'

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
  let body: unknown
  try {
    body = await req.json()
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

  // Step 1: classify intent (cheap Haiku call)
  const routed = await routeMessage(history, text || '(leer)', !!imageUrl)

  // Step 2: chat → just send reply, persist, done
  if (routed.intent === 'chat') {
    const reply = routed.chat_reply || 'Sag mir einfach, was ich für deine Seite machen soll. 🙂'
    await sendWhatsAppMessage(metaFrom, reply)
    await appendTurn(phone, text || '[Bild]', reply).catch(() => {})
    return
  }

  // Step 3: build → ack first, then run coder, then send final reply
  const site = await getOrCreateSite(phone, text || 'Neue Website')
  const ack = site.last_sandbox_id ? ACK_FOLLOWUP : ACK_FIRST
  await sendWhatsAppMessage(metaFrom, ack).catch((err) => {
    console.error('ack send failed:', err)
  })

  const coderResult = await runRomyCoder({
    slug: site.slug,
    userMessage: text || 'Hallo',
    imageUrl,
    history,
  })

  if (coderResult.sandbox_id) {
    await updateSiteSandboxId(phone, coderResult.sandbox_id).catch(() => {})
  }

  const finalReply =
    coderResult.reply ||
    (coderResult.ok
      ? `Fertig! Schau mal: ${coderResult.site_url}`
      : 'Ups, da ist was schiefgelaufen. Magst du es nochmal versuchen?')

  await sendWhatsAppMessage(metaFrom, finalReply)
  await appendTurn(phone, text || '[Bild]', finalReply).catch(() => {})
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
