import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import twilio from 'twilio'

export const dynamic = 'force-dynamic'

// Simulates the exact WhatsApp image generation flow
export async function GET(request: NextRequest) {
  const results: Record<string, any> = { timestamp: new Date().toISOString() }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })

  // Step 1: Generate an image with Gemini (simulating product photo editing)
  console.log('Step 1: Generating image...')
  let generatedImageBase64: string | null = null

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: 'Create a professional product photo of a coffee mug on a natural wooden background with plants. High quality, commercial style.' }],
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    })

    const parts = response.candidates?.[0]?.content?.parts || []
    for (const part of parts as any[]) {
      if (part.inlineData) {
        generatedImageBase64 = part.inlineData.data
        results.step1_image_gen = {
          success: true,
          imageSize: generatedImageBase64?.length || 0,
          mimeType: part.inlineData.mimeType
        }
      }
    }

    if (!generatedImageBase64) {
      results.step1_image_gen = { success: false, error: 'No image in response', parts: parts.length }
      return NextResponse.json(results)
    }
  } catch (e: any) {
    results.step1_image_gen = { success: false, error: e.message }
    return NextResponse.json(results)
  }

  // Step 2: Upload to Supabase
  console.log('Step 2: Uploading to Supabase...')
  let publicUrl: string | null = null

  try {
    const buffer = Buffer.from(generatedImageBase64, 'base64')
    const fileName = `flow-test-${Date.now()}.png`

    const { data, error } = await supabase.storage
      .from('generated-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      results.step2_upload = { success: false, error: error.message }
      return NextResponse.json(results)
    }

    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(data.path)

    publicUrl = urlData.publicUrl
    results.step2_upload = { success: true, publicUrl }
  } catch (e: any) {
    results.step2_upload = { success: false, error: e.message }
    return NextResponse.json(results)
  }

  // Step 3: Verify the URL is accessible
  console.log('Step 3: Verifying URL...')
  try {
    const response = await fetch(publicUrl!)
    results.step3_verify_url = {
      success: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type')
    }
  } catch (e: any) {
    results.step3_verify_url = { success: false, error: e.message }
  }

  // Step 4: Test Twilio can send (dry run - don't actually send)
  console.log('Step 4: Testing Twilio...')
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Just verify we can access the API
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch()
    results.step4_twilio = {
      success: true,
      status: account.status,
      note: 'Would send image to WhatsApp',
      imageUrl: publicUrl
    }
  } catch (e: any) {
    results.step4_twilio = { success: false, error: e.message }
  }

  // Summary
  const steps = [results.step1_image_gen, results.step2_upload, results.step3_verify_url, results.step4_twilio]
  results.summary = {
    allPassing: steps.every(s => s?.success),
    message: steps.every(s => s?.success)
      ? 'Flow works! WhatsApp should receive images.'
      : 'Flow has issues - check failed steps'
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'no-store' }
  })
}
