import { NextRequest, NextResponse } from 'next/server'
import { handleLunaMessage } from '@/lib/luna-agent'

export const dynamic = 'force-dynamic'

// ── Meta Cloud API: Webhook verification (GET) ──
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── Meta Cloud API: Incoming messages (POST) ──
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Meta sends various webhook events — only process messages
  const entry = body.entry?.[0]
  const changes = entry?.changes?.[0]
  const value = changes?.value

  // Ignore status updates (delivered, read, etc.)
  if (!value?.messages?.length) {
    return NextResponse.json({ status: 'ok' })
  }

  const message = value.messages[0]
  const phone = message.from // e.g. "491729256983"
  const phoneFormatted = '+' + phone

  // Extract text and/or image
  let text = ''
  let imageUrl: string | undefined

  if (message.type === 'text') {
    text = message.text?.body || ''
  } else if (message.type === 'image') {
    // Download image from Meta
    imageUrl = await getMediaUrl(message.image.id)
    text = message.image?.caption || ''
  } else if (message.type === 'document' || message.type === 'video') {
    text = '[Dokument/Video erhalten — bitte sende Bilder oder Text]'
  } else {
    text = message.text?.body || ''
  }

  if (!phone) {
    return NextResponse.json({ status: 'ok' })
  }

  try {
    // Process with Luna agent
    const response = await handleLunaMessage(phoneFormatted, text, imageUrl)

    // Send response via Meta Cloud API
    await sendWhatsAppMessage(phone, response)
  } catch (error) {
    console.error('Luna agent error:', error)
    await sendWhatsAppMessage(phone, 'Entschuldigung, es gab einen Fehler. Bitte versuche es nochmal!')
  }

  return NextResponse.json({ status: 'ok' })
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
