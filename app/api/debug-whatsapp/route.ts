import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const GRAPH = 'https://graph.facebook.com/v21.0'

async function graphGet(path: string, token: string) {
  const res = await fetch(`${GRAPH}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

export async function GET() {
  const token = process.env.WHATSAPP_TOKEN!
  const configuredPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!

  // Phone IDs we know about: the one in Vercel env + the one from the user's screenshot
  const phoneIdsToCheck = [
    { label: 'vercel_env', id: configuredPhoneId },
    { label: 'ui_screenshot', id: '1095817496945002' },
  ]

  const phones: Record<string, unknown> = {}
  const wabaIds: string[] = []

  for (const { label, id } of phoneIdsToCheck) {
    const r = await graphGet(
      `${id}?fields=display_phone_number,verified_name,whatsapp_business_account,quality_rating,status`,
      token
    )
    phones[label] = { id, ...r }
    const wabaId = (r.body as { whatsapp_business_account?: { id: string } })
      ?.whatsapp_business_account?.id
    if (wabaId && !wabaIds.includes(wabaId)) wabaIds.push(wabaId)
  }

  // For each WABA we discovered, list subscribed apps (the webhook targets)
  const wabas: Record<string, unknown> = {}
  for (const wabaId of wabaIds) {
    const r = await graphGet(`${wabaId}/subscribed_apps`, token)
    wabas[wabaId] = r
  }

  // Also list the debug_token info - tells us the app_id + expiry of the token
  const tokenDebug = await graphGet(
    `debug_token?input_token=${encodeURIComponent(token)}`,
    token
  )

  // Check recent webhook deliveries in luna_conversations (phone='__hook__')
  let recentHooks: unknown = null
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await sb
      .from('luna_conversations')
      .select('messages,updated_at')
      .eq('phone', '__hook__')
      .single()
    const msgs = (data?.messages || []) as { role: string; content: string }[]
    recentHooks = {
      count: msgs.length,
      last_updated: data?.updated_at || null,
      last_3: msgs.slice(-3),
    }
  } catch (e) {
    recentHooks = { error: (e as Error).message }
  }

  return NextResponse.json({
    configured_phone_id: configuredPhoneId,
    phones,
    wabas,
    token_debug: tokenDebug,
    recent_webhook_hits: recentHooks,
  })
}
