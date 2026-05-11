import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ensureCustomer,
  linkAuthUser,
  findCustomerByAuthUserId,
  findCustomerByEmail,
  findCustomer,
  hasCompletedFirstBuild,
} from '@/lib/romy-customers'

export const dynamic = 'force-dynamic'

function cleanSessionId(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
}

function stripWebPrefix(sessionKey: string): string {
  return sessionKey.startsWith('web:') ? sessionKey.slice(4) : sessionKey
}

function serviceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  )
}

async function mergeSessionIntoCanonical(sourceSession: string, canonicalSession: string) {
  if (sourceSession === canonicalSession) return
  const sb = serviceSupabase()

  const { data: sourceConvo } = await sb
    .from('romy_conversations')
    .select('messages, updated_at')
    .eq('phone', sourceSession)
    .maybeSingle()
  if (sourceConvo) {
    await sb
      .from('romy_conversations')
      .upsert(
        {
          phone: canonicalSession,
          messages: sourceConvo.messages,
          updated_at: sourceConvo.updated_at || new Date().toISOString(),
        },
        { onConflict: 'phone' }
      )
    await sb.from('romy_conversations').delete().eq('phone', sourceSession)
  }

  const { data: sourceSite } = await sb
    .from('romy_sites')
    .select('*')
    .eq('phone', sourceSession)
    .maybeSingle()
  if (sourceSite) {
    await sb.from('romy_sites').delete().eq('phone', canonicalSession)
    await sb
      .from('romy_sites')
      .update({ phone: canonicalSession, updated_at: new Date().toISOString() })
      .eq('phone', sourceSession)
  }

  await sb
    .from('romy_build_logs')
    .update({ phone: canonicalSession })
    .eq('phone', sourceSession)

  const sourceCustomer = await findCustomer(sourceSession)
  if (sourceCustomer?.first_build_at) {
    await sb
      .from('romy_customers')
      .update({
        first_build_at: sourceCustomer.first_build_at,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', canonicalSession)
      .is('first_build_at', null)
  }
  await sb.from('romy_customers').delete().eq('session_id', sourceSession)
}

export async function POST(req: NextRequest) {
  let body: {
    sessionId?: unknown
    email?: unknown
    name?: unknown
    provider?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = cleanSessionId(body.sessionId)
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : null
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  )
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 })
  }

  const sessionKey = `web:${sessionId}`
  const authUserId = data.user.id
  const email = data.user.email?.trim().toLowerCase() || null
  const provider =
    typeof data.user.app_metadata?.provider === 'string'
      ? data.user.app_metadata.provider.slice(0, 32)
      : 'oauth'

  const existing =
    (await findCustomerByAuthUserId(authUserId)) ||
    (email ? await findCustomerByEmail(email) : null)
  if (existing && existing.session_id !== sessionKey) {
    await mergeSessionIntoCanonical(sessionKey, existing.session_id)
    await linkAuthUser(existing.session_id, {
      authUserId,
      email,
      name: name || existing.name || null,
      provider,
    })
    const merged = await findCustomer(existing.session_id)
    return NextResponse.json({
      ok: true,
      canonicalSessionId: stripWebPrefix(existing.session_id),
      hadFirstBuild: hasCompletedFirstBuild(merged || existing),
    })
  }

  await ensureCustomer(sessionKey)
  await linkAuthUser(sessionKey, {
    authUserId,
    email,
    name: name || null,
    provider,
  })

  const linked = await findCustomer(sessionKey)
  return NextResponse.json({
    ok: true,
    canonicalSessionId: sessionId,
    hadFirstBuild: hasCompletedFirstBuild(linked),
  })
}
