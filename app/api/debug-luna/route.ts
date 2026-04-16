import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {}

  results.env = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    WHATSAPP_TOKEN: !!process.env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await sb.from('luna_websites').select('id').limit(1)
    results.supabase = error ? { ok: false, error: error.message } : { ok: true }
  } catch (e) {
    results.supabase = { ok: false, error: (e as Error).message }
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const a = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const r = await a.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'say ok' }],
    })
    const text = r.content[0]?.type === 'text' ? r.content[0].text : 'no-text'
    results.anthropic = { ok: true, text }
  } catch (e) {
    results.anthropic = { ok: false, error: (e as Error).message }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    )
    const data = await res.json()
    results.whatsapp = res.ok ? { ok: true, data } : { ok: false, status: res.status, error: data }
  } catch (e) {
    results.whatsapp = { ok: false, error: (e as Error).message }
  }

  return NextResponse.json(results)
}
