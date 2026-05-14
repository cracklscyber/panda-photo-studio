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

let bucketChecked = false
async function ensureBucket(client: SupabaseClient): Promise<void> {
  if (bucketChecked) return
  const { data, error } = await client.storage.listBuckets()
  if (error) return
  if (!data.find((b) => b.name === BUCKET)) {
    await client.storage.createBucket(BUCKET, { public: false }).catch(() => {})
  }
  bucketChecked = true
}

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
    await ensureBucket(client)

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
    if (error) return null
    return objectPath
  } catch {
    return null
  }
}
