import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

// Test endpoint to debug WhatsApp image generation issues
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {}

  // Test 1: Check environment variables
  results.env = {
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'SET (' + process.env.GOOGLE_API_KEY.slice(0, 10) + '...)' : 'MISSING',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  }

  // Test 2: Check Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.storage.listBuckets()
    results.supabase = {
      connected: !error,
      buckets: data?.map(b => b.name) || [],
      error: error?.message
    }
  } catch (e: any) {
    results.supabase = { connected: false, error: e.message }
  }

  // Test 3: Check Gemini connection and image generation capability
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })

    // Test text model
    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ text: 'Say "OK" in one word' }],
    })
    results.gemini_text = {
      working: true,
      response: textResponse.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 50)
    }

    // Test image generation model
    try {
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ text: 'Generate a simple red circle on white background' }],
        config: {
          responseModalities: ['Text', 'Image'],
        },
      })

      const parts = imageResponse.candidates?.[0]?.content?.parts || []
      const hasImage = parts.some((p: any) => p.inlineData)
      const hasText = parts.some((p: any) => p.text)

      results.gemini_image = {
        working: hasImage,
        hasText,
        hasImage,
        partsCount: parts.length,
        partTypes: parts.map((p: any) => p.text ? 'text' : p.inlineData ? 'image' : 'unknown')
      }
    } catch (imgErr: any) {
      results.gemini_image = {
        working: false,
        error: imgErr.message,
        code: imgErr.code || imgErr.status
      }
    }
  } catch (e: any) {
    results.gemini_text = { working: false, error: e.message }
  }

  // Test 4: List available models
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
    // Check specific models
    results.models = {
      note: 'Testing model availability',
      'gemini-2.0-flash-exp': 'checking...',
      'gemini-2.5-flash': 'checking...',
    }
  } catch (e: any) {
    results.models = { error: e.message }
  }

  return NextResponse.json(results, { status: 200 })
}
