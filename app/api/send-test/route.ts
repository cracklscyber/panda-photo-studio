import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import twilio from 'twilio'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Direct test: Generate image and send to WhatsApp
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone')

  if (!phone) {
    return NextResponse.json({ error: 'Add ?phone=+49XXXXXXXXX to URL' })
  }

  const results: any = { phone, steps: [] }

  try {
    // Step 1: Generate image
    results.steps.push({ step: 1, action: 'Generating image...' })

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: 'Create a professional product photo of a coffee cup on marble background, studio lighting' }],
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    })

    const parts = response.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p.inlineData)

    if (!imagePart) {
      results.error = 'No image generated'
      return NextResponse.json(results)
    }

    results.steps.push({ step: 1, status: 'OK', imageSize: imagePart.inlineData.data.length })

    // Step 2: Upload to Supabase
    results.steps.push({ step: 2, action: 'Uploading to Supabase...' })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const buffer = Buffer.from(imagePart.inlineData.data, 'base64')
    const fileName = `direct-test-${Date.now()}.png`

    const { data, error } = await supabase.storage
      .from('generated-images')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: true })

    if (error) {
      results.error = 'Upload failed: ' + error.message
      return NextResponse.json(results)
    }

    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(data.path)

    const publicUrl = urlData.publicUrl
    results.steps.push({ step: 2, status: 'OK', url: publicUrl })

    // Step 3: Send via WhatsApp
    results.steps.push({ step: 3, action: 'Sending via WhatsApp...' })

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const toNumber = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`

    const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: toNumber,
      body: 'Test Produktfoto von Lumino!',
      mediaUrl: [publicUrl]
    })

    results.steps.push({ step: 3, status: 'OK', messageSid: msg.sid, messageStatus: msg.status })
    results.success = true
    results.message = 'Check WhatsApp!'

  } catch (e: any) {
    results.error = e.message
    results.stack = e.stack?.split('\n').slice(0, 3)
  }

  return NextResponse.json(results)
}
