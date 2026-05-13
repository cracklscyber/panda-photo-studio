import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
}

const APEX = (process.env.ROMY_APEX_DOMAIN || 'halloromy.com')
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '')
  .toLowerCase()
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'app', 'mail', 'ftp'])

function extractSlug(host: string | null): string | null {
  if (!host) return null
  const h = host.split(':')[0].toLowerCase()
  if (h === APEX || !h.endsWith(`.${APEX}`)) return null
  const label = h.slice(0, h.length - APEX.length - 1)
  if (!label || label.includes('.')) return null
  if (RESERVED_SUBDOMAINS.has(label)) return null
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) return null
  return label
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')
  const hostname = host?.split(':')[0].toLowerCase() || ''
  const slug = extractSlug(host)

  if (slug) {
    const url = req.nextUrl.clone()
    const path = req.nextUrl.pathname
    url.pathname =
      path === '/' ? `/custom-site/${slug}` : `/custom-site/${slug}${path}`
    return NextResponse.rewrite(url)
  }

  const parts = req.nextUrl.pathname.split('/').filter(Boolean)

  if (hostname === APEX && parts.length >= 2 && parts[0] === 'custom-site') {
    const legacySlug = parts[1]
    const rest = parts.slice(2).join('/')
    const target = new URL(
      `https://${legacySlug}.${APEX}${rest ? '/' + rest : '/'}`
    )
    target.search = req.nextUrl.search
    return NextResponse.redirect(target, 301)
  }

  if (parts.length >= 2 && parts[0] === 'site') {
    const aliasSlug = parts[1]
    const rest = parts.slice(2)
    const url = req.nextUrl.clone()
    url.pathname =
      rest.length > 0
        ? `/custom-site/${aliasSlug}/${rest.join('/')}`
        : `/custom-site/${aliasSlug}`
    url.searchParams.set('preview', '1')
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}
