'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { browserSupabase } from '@/lib/supabase-browser'

type Me = {
  authenticated: boolean
  name?: string | null
  email?: string | null
  provider?: string | null
}

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('romy-web-session')
}

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/eVq00k0jc2r4251cZl7EQ00'

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  async function openPortal() {
    const sessionId = getSessionId()
    if (!sessionId || portalBusy) return
    setPortalBusy(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        url?: string
        error?: string
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Konnte das Abo-Center nicht öffnen.')
      }
      window.location.href = data.url
    } catch (err) {
      setPortalError((err as Error).message)
      setPortalBusy(false)
    }
  }

  function startSubscription() {
    const sessionId = getSessionId()
    if (!sessionId) return
    const ref = encodeURIComponent(`web:${sessionId}`)
    window.location.href = `${STRIPE_PAYMENT_URL}?client_reference_id=${ref}`
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const sessionId = getSessionId()
      if (!sessionId) {
        if (!cancelled) {
          setMe({ authenticated: false })
          setLoading(false)
        }
        return
      }
      try {
        const { data: sessionData } = await browserSupabase().auth.getSession()
        const token = sessionData.session?.access_token
        const res = await fetch(`/api/customer/me?sessionId=${encodeURIComponent(sessionId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = (await res.json()) as Me
        if (!cancelled) {
          setMe(data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setMe({ authenticated: false })
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#1a1714]">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#1a1714]/60 transition hover:text-[#1a1714]"
        >
          <span aria-hidden>←</span> Zurück zur Startseite
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Mein Konto</h1>

        {loading && (
          <p className="mt-8 text-sm text-[#1a1714]/60">Lade Konto…</p>
        )}

        {!loading && !me?.authenticated && (
          <div className="mt-8 rounded-2xl border border-black/[0.08] bg-white p-6">
            <p className="text-sm text-[#1a1714]/70">
              Du bist gerade nicht angemeldet. Starte einen Chat mit Romy, dort kannst
              du dich anmelden.
            </p>
            <Link
              href="/#chat"
              className="mt-4 inline-flex rounded-xl bg-[#1a1714] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a2522]"
            >
              Zum Chat
            </Link>
          </div>
        )}

        {!loading && me?.authenticated && (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-black/[0.08] bg-white p-6">
              <h2 className="text-base font-semibold">Profil</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#1a1714]/55">Name</dt>
                  <dd className="text-right text-[#1a1714]">{me.name || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#1a1714]/55">E-Mail</dt>
                  <dd className="truncate text-right text-[#1a1714]">{me.email || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#1a1714]/55">Anmeldung über</dt>
                  <dd className="text-right text-[#1a1714] capitalize">
                    {me.provider || '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              id="mitgliedschaft"
              className="rounded-2xl border border-black/[0.08] bg-white p-6"
            >
              <h2 className="text-base font-semibold">Mitgliedschaft</h2>
              <p className="mt-2 text-sm text-[#1a1714]/65">
                Romy.ai Beta — 29 €/Monat, monatlich kündbar, keine Mindestlaufzeit.
                Hast du schon ein Abo, kannst du es im Abo-Center kündigen, deine
                Karte ändern oder Rechnungen einsehen.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={portalBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/[0.12] bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1714] transition hover:bg-[#1a1714]/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {portalBusy ? 'Öffne…' : 'Abo verwalten'}
                </button>
                <button
                  type="button"
                  onClick={startSubscription}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a1714] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a2522]"
                >
                  Abo abschließen
                </button>
              </div>
              {portalError && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {portalError}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-black/[0.08] bg-white p-6">
              <h2 className="text-base font-semibold">Abmelden</h2>
              <p className="mt-2 text-sm text-[#1a1714]/65">
                Du wirst aus diesem Browser abgemeldet. Deine Website und dein
                Chatverlauf bleiben erhalten.
              </p>
              <button
                type="button"
                onClick={signOut}
                className="mt-4 inline-flex rounded-xl border border-black/[0.12] bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1714] transition hover:bg-[#1a1714]/[0.04]"
              >
                Abmelden
              </button>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
