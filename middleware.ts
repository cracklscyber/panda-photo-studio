import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: '/site/:path*',
}

function pass(reason: string) {
  const res = NextResponse.next()
  res.headers.set('x-romy-mw', reason)
  return res
}

export async function middleware(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean)
  if (parts.length < 2 || parts[0] !== 'site') return pass('no-slug')
  const slug = parts[1]
  const rest = parts.slice(2)

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '')
  if (!base) return pass('no-supabase-url')
  const indexUrl = `${base}/storage/v1/object/public/customer-sites/${encodeURIComponent(
    slug
  )}/index.html`

  let status: number | string = 'unset'
  try {
    const head = await fetch(indexUrl, { method: 'HEAD', cache: 'no-store' })
    status = head.status
    if (!head.ok) return pass(`head-${status}`)
  } catch (e) {
    return pass(`head-error-${(e as Error).message.slice(0, 40)}`)
  }

  const rewritePath =
    rest.length > 0 ? `/custom-site/${slug}/${rest.join('/')}` : `/custom-site/${slug}`

  const url = req.nextUrl.clone()
  url.pathname = rewritePath
  const res = NextResponse.rewrite(url)
  res.headers.set('x-romy-mw', `rewrite-${status}-to-${rewritePath}`)
  return res
}
