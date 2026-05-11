'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { browserSupabase } from '@/lib/supabase-browser'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working')
  const [message, setMessage] = useState('Anmeldung wird abgeschlossen...')

  useEffect(() => {
    let cancelled = false

    async function resolveSession(): Promise<Session | null> {
      const supabase = browserSupabase()
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session) return data.session
      }

      const immediate = await supabase.auth.getSession()
      if (immediate.error) throw new Error(immediate.error.message)
      if (immediate.data.session) return immediate.data.session

      return await new Promise<Session | null>((resolve) => {
        let subscription: { unsubscribe: () => void } | null = null
        const timeout = window.setTimeout(() => {
          subscription?.unsubscribe()
          resolve(null)
        }, 2500)

        const authListener = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) return
          window.clearTimeout(timeout)
          subscription?.unsubscribe()
          resolve(session)
        })
        subscription = authListener.data.subscription
      })
    }

    async function finish() {
      try {
        const session = await resolveSession()
        if (!session?.user) throw new Error('Keine Sitzung gefunden.')

        const callbackSessionId = new URLSearchParams(window.location.search).get('sessionId')
        const sessionId = window.localStorage.getItem('romy-web-session') || callbackSessionId
        if (!sessionId) throw new Error('Browser-Session nicht gefunden.')
        window.localStorage.setItem('romy-web-session', sessionId)

        const meta = (session.user.user_metadata || {}) as Record<string, unknown>
        const provider =
          (session.user.app_metadata?.provider as string | undefined) || 'oauth'
        const name =
          (typeof meta.full_name === 'string' && meta.full_name) ||
          (typeof meta.name === 'string' && meta.name) ||
          null

        const res = await fetch('/api/customer/link-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId,
            email: session.user.email || null,
            name,
            provider,
          }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error || 'Konto-Verknüpfung fehlgeschlagen.')
        }

        const linkData = (await res.json().catch(() => ({}))) as {
          canonicalSessionId?: string
          hadFirstBuild?: boolean
        }
        if (
          linkData.canonicalSessionId &&
          linkData.canonicalSessionId !== sessionId
        ) {
          window.localStorage.setItem('romy-web-session', linkData.canonicalSessionId)
        }

        const trackingSessionId = linkData.canonicalSessionId || sessionId
        const trackingKey = `romy-registration-tracked:${trackingSessionId}`
        if (
          linkData.hadFirstBuild &&
          !window.localStorage.getItem(trackingKey) &&
          window.fbq
        ) {
          window.localStorage.setItem(trackingKey, '1')
          window.fbq?.('track', 'Lead', {
            content_name: 'account_after_website_build',
            content_category: 'Romy Qualified Lead',
            method: provider,
          })
          window.fbq?.('track', 'CompleteRegistration', {
            content_name: 'account_after_website_build',
            method: provider,
          })
        }

        if (cancelled) return
        setStatus('done')
        setMessage('Fertig! Wir leiten dich zurück zum Chat...')
        setTimeout(() => {
          window.location.href = '/#chat'
        }, 800)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setMessage((err as Error).message || 'Unbekannter Fehler.')
      }
    }

    finish()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] px-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 text-center shadow-sm">
        {status === 'working' && (
          <div className="mb-4 inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        )}
        <h1 className="text-lg font-semibold text-neutral-900">
          {status === 'done' ? 'Erfolg' : status === 'error' ? 'Hoppla' : 'Einen Moment'}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        {status === 'error' && (
          <a
            href="/#chat"
            className="mt-5 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            Zurück zum Chat
          </a>
        )}
      </div>
    </main>
  )
}
