import { createClient } from '@supabase/supabase-js'

export interface BuildLogEntry {
  phone: string
  slug: string | null
  ok: boolean
  cost_usd: number | null
  duration_ms: number | null
  was_warm: boolean | null
  user_message: string | null
}

export async function logBuild(entry: BuildLogEntry): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  const sb = createClient(url.trim(), key.trim())
  const trimmedMessage = entry.user_message
    ? entry.user_message.slice(0, 500)
    : null

  await sb.from('romy_build_logs').insert({
    phone: entry.phone,
    slug: entry.slug,
    ok: entry.ok,
    cost_usd: entry.cost_usd,
    duration_ms: entry.duration_ms,
    was_warm: entry.was_warm,
    user_message: trimmedMessage,
  })
}
