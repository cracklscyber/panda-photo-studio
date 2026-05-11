'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { browserSupabase } from '@/lib/supabase-browser'
import { AuthModal } from './auth-modal'

type Variant = 'light' | 'dark'

type Props = {
  variant?: Variant
}

type Me = {
  authenticated: boolean
  name?: string | null
  email?: string | null
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'romy-web-session'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(key, next)
  return next
}

function initialFrom(name?: string | null, email?: string | null): string {
  const source = (name || email || '').trim()
  if (!source) return '·'
  return source.charAt(0).toUpperCase()
}

export function AccountMenu({ variant = 'light' }: Props) {
  const [me, setMe] = useState<Me | null>(null)
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  async function refreshMe() {
    const sid = getOrCreateSessionId()
    if (!sid) {
      setMe({ authenticated: false })
      return
    }
    try {
      const { data: sessionData } = await browserSupabase().auth.getSession()
      const token = sessionData.session?.access_token
      const res = await fetch(`/api/customer/me?sessionId=${encodeURIComponent(sid)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const meData = (await res.json()) as Me
      setMe(meData)
    } catch {
      setMe({ authenticated: false })
    }
  }

  useEffect(() => {
    refreshMe()

    const { data } = browserSupabase().auth.onAuthStateChange(() => {
      refreshMe()
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(event: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function signOut() {
    try {
      await browserSupabase().auth.signOut()
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('romy-web-session')
      window.location.href = '/'
    }
  }

  if (me === null) return null

  if (!me.authenticated) {
    const linkClass =
      variant === 'dark'
        ? 'border-white/15 bg-white/5 text-white/75 hover:border-white/25 hover:bg-white/10 hover:text-white'
        : 'border-black/[0.08] bg-white/40 text-[#1a1714]/55 hover:border-black/[0.14] hover:bg-white hover:text-[#1a1714]/80'
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${linkClass}`}
        >
          Anmelden
        </button>
        {authOpen && sessionId && (
          <AuthModal
            sessionId={sessionId}
            onSuccess={() => {
              setAuthOpen(false)
              refreshMe()
            }}
            onClose={() => setAuthOpen(false)}
          />
        )}
      </>
    )
  }

  const initial = initialFrom(me.name, me.email)
  const buttonClass =
    variant === 'dark'
      ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
      : 'border-black/8 bg-white text-[#1a1714] hover:bg-[#1a1714]/[0.04]'

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Konto-Menü öffnen"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${buttonClass}`}
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]"
        >
          <div className="border-b border-black/[0.06] px-4 py-3">
            <p className="truncate text-sm font-semibold text-[#1a1714]">
              {me.name || 'Mein Konto'}
            </p>
            {me.email && (
              <p className="mt-0.5 truncate text-xs text-[#1a1714]/60">{me.email}</p>
            )}
          </div>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-[#1a1714] transition hover:bg-[#1a1714]/[0.04]"
          >
            Mein Konto
          </Link>
          <Link
            href="/account#mitgliedschaft"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-[#1a1714] transition hover:bg-[#1a1714]/[0.04]"
          >
            Mitgliedschaft
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="block w-full border-t border-black/[0.06] px-4 py-2.5 text-left text-sm text-[#1a1714] transition hover:bg-[#1a1714]/[0.04]"
          >
            Abmelden
          </button>
        </div>
      )}
    </div>
  )
}
