import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { handleLunaMessage } from '@/lib/luna-agent'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function logWebhookHit(kind: string, detail: unknown) {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const entry = {
      role: 'user' as const,
      content: JSON.stringify({ ts: new Date().toISOString(), kind, detail }),
    }
    const { data } = await sb
      .from('luna_conversations')
      .select('messages')
      .eq('phone', '__hook__')
      .single()
    const existing = (data?.messages || []) as { role: string; content: string }[]
    const next = [...existing, entry].slice(-50)
    await sb
      .from('luna_conversations')
      .upsert(
        { phone: '__hook__', messages: next, updated_at: new Date().toISOString() },
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
  let body: any
  try {
    body = await req.json()
  } catch {
    await logWebhookHit('post_parse_fail', {})
    return NextResponse.json({ status: 'ok' })
  }

  // Log EVERY incoming POST so we can see what Meta actually sends
  const change = body?.entry?.[0]?.changes?.[0]
  const value = change?.value
  await logWebhookHit('post', {
    field: change?.field,
    messaging_product: value?.messaging_product,
    display_phone_number: value?.metadata?.display_phone_number,
    phone_number_id: value?.metadata?.phone_number_id,
    message_type: value?.messages?.[0]?.type,
    from: value?.messages?.[0]?.from,
    statuses: value?.statuses?.map((s: { status: string }) => s.status),
  })

  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message?.from) {
    return NextResponse.json({ status: 'ok' })
  }

  // waitUntil keeps the container alive after the response so the AI call + send actually completes.
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

async function processMessage(message: any) {
  const phone = message.from as string
  const phoneFormatted = '+' + phone

  let text = ''
  let imageUrl: string | undefined

  if (message.type === 'text') {
    text = message.text?.body || ''
  } else if (message.type === 'image') {
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

  let reply: string
  try {
    reply = await handleLunaMessage(phoneFormatted, text, imageUrl)
  } catch (err) {
    console.error('Luna agent error:', err)
    reply = 'Entschuldigung, es gab einen Fehler. Bitte versuche es nochmal!'
  }

  try {
    await sendWhatsAppMessage(phone, reply)
  } catch (err) {
    console.error('sendWhatsAppMessage failed:', err)
  }
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

  // Step 1: Get media URL from Meta
  const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()

  // Step 2: Download the actual media and convert to base64 data URL
  // (Meta media URLs require auth, so we fetch and convert)
  const mediaRes = await fetch(data.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const buffer = await mediaRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = data.mime_type || 'image/jpeg'

  return `data:${mimeType};base64,${base64}`
}
