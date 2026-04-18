import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'customer-sites'

let _sb: SupabaseClient | null = null
function sb(): SupabaseClient {
  if (_sb) return _sb
  _sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  )
  return _sb
}

export function sitePublicUrl(slug: string, path = 'index.html'): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/${BUCKET}/${slug}/${path}`
}

export async function listSiteFiles(slug: string): Promise<Array<{ name: string; size: number }>> {
  const out: Array<{ name: string; size: number }> = []
  async function walk(prefix: string) {
    const { data, error } = await sb().storage.from(BUCKET).list(prefix, { limit: 1000 })
    if (error) throw new Error(`list ${prefix}: ${error.message}`)
    for (const entry of data || []) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) {
        await walk(full)
      } else {
        const size = (entry.metadata as { size?: number } | null)?.size ?? 0
        out.push({ name: full.slice(slug.length + 1), size })
      }
    }
  }
  await walk(slug)
  return out
}

export async function downloadSiteFile(slug: string, path: string): Promise<Buffer | null> {
  const key = `${slug}/${path}`
  const { data, error } = await sb().storage.from(BUCKET).download(key)
  if (error) {
    const msg = (error as Error).message || ''
    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('object not found')) {
      return null
    }
    throw new Error(`download ${key}: ${msg}`)
  }
  const ab = await data.arrayBuffer()
  return Buffer.from(ab)
}

export async function uploadSiteFile(
  slug: string,
  path: string,
  content: string | Buffer,
  contentType?: string
): Promise<void> {
  const key = `${slug}/${path}`
  const body = typeof content === 'string' ? Buffer.from(content) : content
  const type = contentType || guessContentType(path)
  const { error } = await sb().storage.from(BUCKET).upload(key, body, {
    contentType: type,
    upsert: true,
  })
  if (error) throw new Error(`upload ${key}: ${error.message}`)
}

export async function deleteSiteFile(slug: string, path: string): Promise<void> {
  const key = `${slug}/${path}`
  const { error } = await sb().storage.from(BUCKET).remove([key])
  if (error) throw new Error(`delete ${key}: ${error.message}`)
}

export async function deleteAllSiteFiles(slug: string): Promise<number> {
  const files = await listSiteFiles(slug)
  if (files.length === 0) return 0
  const keys = files.map((f) => `${slug}/${f.name}`)
  const { error } = await sb().storage.from(BUCKET).remove(keys)
  if (error) throw new Error(`delete all for ${slug}: ${error.message}`)
  return keys.length
}

const MIME: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  mjs: 'application/javascript',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  txt: 'text/plain',
}

function guessContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return MIME[ext] || 'application/octet-stream'
}
