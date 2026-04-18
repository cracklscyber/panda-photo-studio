import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { runRomyCoder } from '@/lib/romy-coder'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CONVO_PHONE_PREFIX = 'v2:'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function logWebhookHit(kind: string, detail: unknown) {
  try {
    const c = sb()
    const entry = {
      role: 'user' as const,
      content: JSON.stringify({ ts: new Date().toISOString(), kind, detail }),
    }
    const key = '__hook_v2__'
    const { data } = await c
      .from('luna_conversations')
      .select('messages')
      .eq('phone', key)
      .single()
    const existing = (data?.messages || []) as { role: string; content: string }[]
    const next = [...existing, entry].slice(-50)
    await c
      .from('luna_conversations')
      .upsert(
        { phone: key, messages: next, updated_at: new Date().toISOString() },
        { onConflict: 'phone' }
      )
  } catch {
    // swallow
  }
}

async function loadHistory(phone: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  try {
    const c = sb()
    const { data } = await c
      .from('luna_conversations')
      .select('messages')
      .eq('phone', CONVO_PHONE_PREFIX + phone)
      .single()
    const msgs = (data?.messages || []) as Array<{ role: string; content: string }>
    return msgs
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  } catch {
    return []
  }
}

async function saveExchange(
  phone: string,
  userMsg: string,
  botReply: string
): Promise<void> {
  try {
    const c = sb()
    const key = CONVO_PHONE_PREFIX + phone
    const { data } = await c
      .from('luna_conversations')
      .select('messages')
      .eq('phone', key)
      .single()
    const existing = (data?.messages || []) as Array<{ role: string; content: string }>
    const next = [
      ...existing,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: botReply },
    ].slice(-40)
    await c.from('luna_conversations').upsert(
      { phone: key, messages: next, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    )
  } catch {
    // swallow
  }
}

function phoneToSlug(phone: string): string {
  return phone.replace(/\D/g, '') || 'unknown'
}

// ── Meta Cloud API: Webhook verification (GET) ──
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  const tokenMatch = token === process.env.WHATSAPP_VERIFY_TOKEN
  await logWebhookHit('verify', {
    mode,
    token_match: tokenMatch,
    has_token_env: !!process.env.WHATSAPP_VERIFY_TOKEN,
  })

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
    await logWebhookHit('post_parse_fail', {})
    return NextResponse.json({ status: 'ok' })
  }

  const b = body as {
    entry?: Array<{
      changes?: Array<{
        field?: string
        value?: {
          messaging_product?: string
          metadata?: { display_phone_number?: string; phone_number_id?: string }
          messages?: Array<{ type: string; from: string; text?: { body?: string }; image?: { id: string; caption?: string } }>
          statuses?: Array<{ status: string }>
        }
      }>
    }>
  }

  const change = b.entry?.[0]?.changes?.[0]
  const value = change?.value
  await logWebhookHit('post', {
    field: change?.field,
    messaging_product: value?.messaging_product,
    display_phone_number: value?.metadata?.display_phone_number,
    phone_number_id: value?.metadata?.phone_number_id,
    message_type: value?.messages?.[0]?.type,
    from: value?.messages?.[0]?.from,
    statuses: value?.statuses?.map((s) => s.status),
  })

  const message = value?.messages?.[0]
  if (!message?.from) {
    return NextResponse.json({ status: 'ok' })
  }

  waitUntil(
    processMessage(message).catch(async (err) => {
      console.error('v2 processMessage error:', err)
      await logWebhookHit('process_error', {
        from: message?.from,
        error: (err as Error).message,
        stack: (err as Error).stack?.split('\n').slice(0, 5),
      })
    })
  )

  return NextResponse.json({ status: 'ok' })
}

async function processMessage(message: {
  type: string
  from: string
  text?: { body?: string }
  image?: { id: string; caption?: string }
}) {
  const phone = message.from
  let text = ''
  let imageUrl: string | undefined

  if (message.type === 'text') {
    text = message.text?.body || ''
  } else if (message.type === 'image') {
    try {
      imageUrl = await getMediaDataUrl(message.image!.id)
    } catch (err) {
      console.error('getMediaDataUrl failed:', err)
    }
    text = message.image?.caption || ''
  } else {
    text = '[Nur Text und Bilder werden unterstützt — bitte sende Text oder ein Bild]'
  }

  const slug = phoneToSlug(phone)
  const history = await loadHistory(phone)

  let reply: string
  try {
    const result = await runRomyCoder({
      slug,
      userMessage: text || '(leere Nachricht)',
      imageUrl,
      history,
    })
    reply = result.reply
    await logWebhookHit('coder_result', {
      phone,
      slug,
      ok: result.ok,
      files_changed: result.files_changed,
      cost_usd: result.cost_usd,
      duration_ms: result.duration_ms,
      error: result.error,
    })
  } catch (err) {
    console.error('runRomyCoder error:', err)
    reply = 'Entschuldigung, es gab einen Fehler. Bitte versuche es nochmal!'
  }

  await saveExchange(phone, text, reply)

  try {
    await sendWhatsAppMessage(phone, reply)
  } catch (err) {
    console.error('sendWhatsAppMessage v2 failed:', err)
  }
}

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
    console.error('WhatsApp send error (v2):', err)
    throw new Error(`WhatsApp API error: ${res.status}`)
  }
}

async function getMediaDataUrl(mediaId: string): Promise<string> {
  const token = process.env.WHATSAPP_TOKEN
  const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = (await res.json()) as { url: string; mime_type?: string }
  const mediaRes = await fetch(data.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const buffer = await mediaRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = data.mime_type || 'image/jpeg'
  return `data:${mimeType};base64,${base64}`
}
