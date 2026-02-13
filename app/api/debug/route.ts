import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {}

  // Test 1: Environment variables
  results.env = {
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  }

  // Test 2: Supabase connection
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

  // Test 3: Gemini models
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })

  // Test text models
  const textModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
  results.text_models = {}

  for (const model of textModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ text: 'Say OK' }],
      })
      results.text_models[model] = {
        working: true,
        response: response.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 30)
      }
      break // Stop after first working model
    } catch (e: any) {
      results.text_models[model] = { working: false, error: e.message?.slice(0, 80) }
    }
  }

  // Test image generation models
  const imageModels = ['gemini-2.0-flash-exp', 'imagen-3.0-generate-002', 'gemini-2.0-flash-thinking-exp']
  results.image_models = {}

  for (const model of imageModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ text: 'Create a simple red circle' }],
        config: { responseModalities: ['Text', 'Image'] },
      })
      const parts = response.candidates?.[0]?.content?.parts || []
      results.image_models[model] = {
        working: true,
        hasImage: parts.some((p: any) => p.inlineData),
        hasText: parts.some((p: any) => p.text),
      }
    } catch (e: any) {
      results.image_models[model] = { working: false, error: e.message?.slice(0, 80) }
    }
  }

  return NextResponse.json(results, { status: 200 })
}
