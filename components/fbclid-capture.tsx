'use client'

import { useEffect } from 'react'

export function FbclidCapture() {
  useEffect(() => {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid')
    if (!fbclid) return
    const fbc = `fb.1.${Date.now()}.${fbclid}`
    document.cookie = `_fbc=${fbc}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`
    try {
      localStorage.setItem('_fbc', fbc)
    } catch {}
  }, [])
  return null
}
