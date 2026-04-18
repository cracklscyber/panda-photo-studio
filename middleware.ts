import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: '/site/:path*',
}

export async function middleware(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean)
  if (parts.length < 2 || parts[0] !== 'site') return NextResponse.next()
  const slug = parts[1]
  const rest = parts.slice(2)

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '')
  if (!base) return NextResponse.next()
  const indexUrl = `${base}/storage/v1/object/public/customer-sites/${encodeURIComponent(
    slug
  )}/index.html`

  try {
    const head = await fetch(indexUrl, { method: 'HEAD', cache: 'no-store' })
    if (!head.ok) return NextResponse.next()
  } catch {
    return NextResponse.next()
  }

  const rewritePath =
    rest.length > 0 ? `/custom-site/${slug}/${rest.join('/')}` : `/custom-site/${slug}`

  const url = req.nextUrl.clone()
  url.pathname = rewritePath
  return NextResponse.rewrite(url)
}
