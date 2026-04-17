import { NextRequest } from 'next/server'
import { downloadSiteFile } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
}

function guessContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return MIME[ext] || 'application/octet-stream'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; path?: string[] } }
) {
  const { slug } = params
  const relPath = (params.path && params.path.length > 0) ? params.path.join('/') : 'index.html'
  const buf = await downloadSiteFile(slug, relPath).catch(() => null)
  if (!buf) {
    return new Response('Not Found', { status: 404 })
  }
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      'content-type': guessContentType(relPath),
      'cache-control': 'public, max-age=60, must-revalidate',
    },
  })
}
