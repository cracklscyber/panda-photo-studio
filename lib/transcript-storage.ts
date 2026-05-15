import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'romy-transcripts'
const MAX_STDOUT_BYTES = 800_000
const MAX_STDERR_BYTES = 200_000

function sb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  )
}

// Der Bucket existiert in Prod längst. Der frühere listBuckets()-Roundtrip
// lief bei jedem Cold-Start (also bei jedem Build) und kostete im knappen
// Cleanup-Fenster nach einem Timeout wertvolle Sekunden — wodurch der
// Transcript-Save oft gar nicht mehr fertig wurde. Wir verzichten auf den
// Check; ein fehlender Bucket würde ohnehin beim upload() einen Fehler
// werfen, den wir jetzt loggen.

export interface BuildTranscript {
  slug: string
  phone: string | null
  ok: boolean
  was_warm: boolean
  is_first_build: boolean
  duration_ms: number
  cost_usd: number | null
  user_message: string | null
  history_summary?: Array<{ role: string; text: string }>
  log: Array<{ step: string; ms: number; detail?: unknown }>
  agent: {
    exit_code: number | null
    parsed: unknown
    assistant_text: string | null
    stdout: string
    stderr: string
  }
  error_step?: string | null
  error_msg?: string | null
  request_id?: string | null
}

function truncate(s: string, max: number): string {
  if (!s || s.length <= max) return s || ''
  const head = s.slice(0, Math.floor(max * 0.7))
  const tail = s.slice(-Math.floor(max * 0.3))
  return `${head}\n\n…[${s.length - max} bytes elided]…\n\n${tail}`
}

export async function saveBuildTranscript(t: BuildTranscript): Promise<string | null> {
  try {
    const client = sb()

    const safe: BuildTranscript = {
      ...t,
      agent: {
        ...t.agent,
        stdout: truncate(t.agent.stdout || '', MAX_STDOUT_BYTES),
        stderr: truncate(t.agent.stderr || '', MAX_STDERR_BYTES),
      },
    }

    const now = new Date()
    const day = now.toISOString().slice(0, 10)
    const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const tag = t.ok ? 'ok' : 'fail'
    const rid = t.request_id ? `-${t.request_id.slice(0, 8)}` : ''
    const objectPath = `${t.slug}/${day}/${stamp}-${tag}${rid}.json`

    const body = new TextEncoder().encode(JSON.stringify(safe, null, 2))
    const { error } = await client.storage.from(BUCKET).upload(objectPath, body, {
      contentType: 'application/json',
      upsert: false,
    })
    if (error) {
      console.error('saveBuildTranscript upload failed:', error.message, objectPath)
      return null
    }
    return objectPath
  } catch (e) {
    console.error('saveBuildTranscript threw:', (e as Error).message)
    return null
  }
}
