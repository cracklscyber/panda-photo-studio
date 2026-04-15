import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { handleLunaMessage } from '@/lib/luna-agent'

export const dynamic = 'force-dynamic'

function getTwilio() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  )
}

export async function POST(req: NextRequest) {
  const twilioClient = getTwilio()
  const formData = await req.formData()
  const body = formData.get('Body') as string || ''
  const from = formData.get('From') as string || ''
  const numMedia = parseInt(formData.get('NumMedia') as string || '0')

  // Extract phone number (remove "whatsapp:" prefix)
  const phone = from.replace('whatsapp:', '')

  if (!phone) {
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  // Check for image
  let imageUrl: string | undefined
  if (numMedia > 0) {
    imageUrl = formData.get('MediaUrl0') as string || undefined
  }

  try {
    // Process with Luna agent
    const response = await handleLunaMessage(phone, body, imageUrl)

    // Send response via Twilio
    await twilioClient.messages.create({
      body: response,
      from: process.env.TWILIO_WHATSAPP_NUMBER!,
      to: from,
    })
  } catch (error) {
    console.error('Luna agent error:', error)

    // Send error message
    await twilioClient.messages.create({
      body: 'Entschuldigung, es gab einen Fehler. Bitte versuche es nochmal!',
      from: process.env.TWILIO_WHATSAPP_NUMBER!,
      to: from,
    })
  }

  // Return empty TwiML response (we send via API instead)
  return new NextResponse('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}
