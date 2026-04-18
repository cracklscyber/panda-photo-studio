import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listSiteFilesVerbose } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || 'finaltest-01'
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  )

  const bucket = 'customer-sites'

  const listSlug = await sb.storage.from(bucket).list(slug, { limit: 100 })

  // Inline reproduction of the helper: same construction, same call, same args.
  const sb2 = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  )
  const listInline = await sb2.storage.from(bucket).list(slug, { limit: 1000 })

  // Raw HTTP replica of what SDK sends with limit:100 — to prove it's an SDK/fetch issue
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  let raw100: { status: number; len: number; first?: string; body?: string } = {
    status: 0,
    len: 0,
  }
  try {
    const res = await fetch(`${baseUrl}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        prefix: slug,
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      }),
      cache: 'no-store',
    })
    const txt = await res.text()
    let arr: unknown[] = []
    try {
      arr = JSON.parse(txt)
    } catch {}
    raw100 = {
      status: res.status,
      len: Array.isArray(arr) ? arr.length : -1,
      first: Array.isArray(arr) && arr[0] ? ((arr[0] as { name?: string }).name ?? '?') : undefined,
      body: txt.slice(0, 200),
    }
  } catch (e) {
    raw100 = { status: -1, len: -1, body: (e as Error).message }
  }

  let helperResult: { ok: boolean; files?: unknown; debug?: unknown; error?: string }
  try {
    const verbose = await listSiteFilesVerbose(slug)
    helperResult = { ok: true, files: verbose.files, debug: verbose.debug }
  } catch (e) {
    helperResult = { ok: false, error: (e as Error).message }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  return NextResponse.json({
    env_inspection: {
      url_length: url.length,
      url_trimmed_length: url.trim().length,
      url_starts_with: url.slice(0, 30),
      url_ends_with: JSON.stringify(url.slice(-5)),
      key_length: key.length,
      key_trimmed_length: key.trim().length,
      key_ends_with: JSON.stringify(key.slice(-5)),
    },
    bucket,
    slug,
    fresh_client_list: {
      count: listSlug.data?.length || 0,
      error: listSlug.error?.message,
      first_name: listSlug.data?.[0]?.name,
    },
    inline_second_client_list_1000: {
      count: listInline.data?.length || 0,
      error: listInline.error?.message,
      first_name: listInline.data?.[0]?.name,
    },
    helper_listSiteFiles: helperResult,
    raw_fetch_limit_100: raw100,
  })
}
