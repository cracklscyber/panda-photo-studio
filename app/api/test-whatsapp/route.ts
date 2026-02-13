import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import twilio from 'twilio'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Comprehensive test of the WhatsApp image generation pipeline
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    steps: {}
  }

  // Step 1: Test environment
  results.steps['1_environment'] = {
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  // Step 2: Test Gemini text model
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: 'Say OK' }],
    })
    results.steps['2_gemini_text'] = {
      success: true,
      response: response.candidates?.[0]?.content?.parts?.[0]?.text
    }
  } catch (e: any) {
    results.steps['2_gemini_text'] = { success: false, error: e.message }
  }

  // Step 3: Test Gemini image generation (without input image)
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: 'Generate a simple red circle on white background' }],
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    })
    const parts = response.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p.inlineData)
    results.steps['3_gemini_image_gen'] = {
      success: !!imagePart,
      hasImage: !!imagePart,
      imageSize: imagePart?.inlineData?.data?.length || 0,
      hasText: parts.some((p: any) => p.text),
    }
  } catch (e: any) {
    results.steps['3_gemini_image_gen'] = { success: false, error: e.message }
  }

  // Step 4: Test Supabase connection
  let supabase: any = null
  try {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Try to list buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      results.steps['4_supabase'] = { success: false, error: bucketsError.message }
    } else {
      results.steps['4_supabase'] = {
        success: true,
        buckets: buckets?.map((b: any) => b.name) || [],
        hasGeneratedImagesBucket: buckets?.some((b: any) => b.name === 'generated-images')
      }
    }
  } catch (e: any) {
    results.steps['4_supabase'] = { success: false, error: e.message }
  }

  // Step 5: Test image upload to Supabase
  try {
    // Create a simple test image (1x1 red pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
    const buffer = Buffer.from(testImageBase64, 'base64')
    const fileName = `test-${Date.now()}.png`

    // Try upload with upsert to avoid conflicts
    const { data, error } = await supabase.storage
      .from('generated-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      results.steps['5_supabase_upload'] = {
        success: false,
        error: error.message,
        hint: error.message.includes('security')
          ? 'Go to Supabase → Storage → generated-images → Policies → Add INSERT policy for anon'
          : undefined
      }
    } else {
      const { data: urlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(data.path)

      results.steps['5_supabase_upload'] = {
        success: true,
        path: data.path,
        publicUrl: urlData.publicUrl
      }

      // Clean up test file
      await supabase.storage.from('generated-images').remove([fileName])
    }
  } catch (e: any) {
    results.steps['5_supabase_upload'] = { success: false, error: e.message }
  }

  // Step 6: Test Twilio client
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    // Just verify credentials work by checking account
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch()
    results.steps['6_twilio'] = {
      success: true,
      accountStatus: account.status,
      friendlyName: account.friendlyName
    }
  } catch (e: any) {
    results.steps['6_twilio'] = { success: false, error: e.message }
  }

  // Summary
  const allSteps = Object.values(results.steps)
  const successCount = allSteps.filter((s: any) => s.success === true).length
  const failCount = allSteps.filter((s: any) => s.success === false).length

  results.summary = {
    total: allSteps.length,
    success: successCount,
    failed: failCount,
    allPassing: failCount === 0
  }

  // Identify the problem
  if (failCount > 0) {
    const failedSteps = Object.entries(results.steps)
      .filter(([_, v]: [string, any]) => v.success === false)
      .map(([k, v]: [string, any]) => ({ step: k, error: v.error }))
    results.problems = failedSteps
  }

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  })
}
