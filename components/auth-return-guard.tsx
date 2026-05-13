'use client'

import { useEffect } from 'react'

function hasAuthReturn(location: Location): boolean {
  const hash = location.hash || ''
  const search = location.search || ''
  return (
    hash.includes('access_token=') ||
    hash.includes('refresh_token=') ||
    search.includes('code=') ||
    search.includes('error=') ||
    hash.includes('error=')
  )
}

export function AuthReturnGuard() {
  useEffect(() => {
    if (!hasAuthReturn(window.location)) return
    if (window.location.pathname.startsWith('/auth/callback')) return
    if (window.location.pathname.startsWith('/reset-password')) return

    const current = new URL(window.location.href)
    const target = new URL('/auth/callback', 'https://halloromy.com')
    const sessionId =
      current.searchParams.get('sessionId') ||
      window.localStorage.getItem('romy-web-session')

    if (sessionId) target.searchParams.set('sessionId', sessionId)
    Array.from(current.searchParams.entries()).forEach(([key, value]) => {
      if (key !== 'sessionId') target.searchParams.set(key, value)
    })
    target.hash = current.hash
    window.location.replace(target.toString())
  }, [])

  return null
}
