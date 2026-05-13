'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { browserSupabase } from '@/lib/supabase-browser'

type Props = {
  sessionId: string
  onSuccess: () => void
  onClose: () => void
}

export function AuthModal({ sessionId, onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<'choose' | 'email'>('choose')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function authCallbackUrl(): string {
    return `https://halloromy.com/auth/callback?sessionId=${encodeURIComponent(sessionId)}`
  }

  function redirectLocalLoginToLive(): boolean {
    if (typeof window === 'undefined') return false
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'
    if (!isLocal) return false

    const target = new URL('https://halloromy.com/')
    target.hash = 'chat'
    window.localStorage.setItem('romy-login-return-session', sessionId)
    window.location.href = target.toString()
    return true
  }

  async function signInWithGoogle() {
    if (redirectLocalLoginToLive()) return
    setBusy(true)
    setError(null)
    try {
      const supabase = browserSupabase()
      const redirectTo = authCallbackUrl()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (authError) {
        setError('Google-Login ist im System noch nicht konfiguriert. Probier so lange E-Mail.')
        setBusy(false)
      }
    } catch (err) {
      setError((err as Error).message || 'Anmeldung fehlgeschlagen.')
      setBusy(false)
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (redirectLocalLoginToLive()) return
    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const supabase = browserSupabase()
      const cleanPhone = phone.trim()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: authCallbackUrl(),
          data: {
            name: name.trim() || null,
            phone: cleanPhone || null,
          },
        },
      })
      if (authError) throw new Error(authError.message)
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/45 px-4 py-10"
      onClick={onClose}
    >
      <div
        className="relative mx-auto w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-neutral-900">Anmelden oder Konto erstellen</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Damit deine Seite und alle Änderungen erhalten bleiben, und ich dich beim nächsten Mal wiedererkenne. Geht in Sekunden.
        </p>

        {mode === 'choose' && (
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.84-.08-1.65-.22-2.43H12v4.6h6.45a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.57-5.16 3.57-8.79z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.86-3c-1.08.72-2.45 1.16-4.09 1.16-3.14 0-5.81-2.12-6.76-4.97H1.27v3.12A11.99 11.99 0 0 0 12 24z"/>
                <path fill="#FBBC04" d="M5.24 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.61H1.27a11.99 11.99 0 0 0 0 10.78l3.97-3.12z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.27 6.61l3.97 3.12C6.19 6.87 8.86 4.75 12 4.75z"/>
              </svg>
              Mit Google anmelden
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setMode('email')
              }}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9z" />
                <path d="m3.5 7.5 8.5 6 8.5-6" />
              </svg>
              Mit E-Mail anmelden
            </button>
          </div>
        )}

        {mode === 'email' && (
          sent ? (
            <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Wir haben dir einen Login-Link geschickt. Öffne den Link in deiner E-Mail, dann ist dein Konto verbunden.
            </div>
          ) : (
          <form onSubmit={submitEmail} className="mt-6 space-y-3">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                E-Mail
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@beispiel.de"
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                disabled={busy}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Username (optional)
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vorname, Spitzname oder Firma"
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="auth-phone" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Telefonnummer (optional)
              </label>
              <input
                id="auth-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 ..."
                autoComplete="tel"
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                disabled={busy}
              />
              <p className="mt-1 text-[11px] text-neutral-500">Damit wir dich für Beratung oder Support direkt erreichen können.</p>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {busy ? 'Sende Link...' : 'Login-Link senden'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('choose')
                setError(null)
              }}
              className="w-full text-xs text-neutral-500 transition hover:text-neutral-800"
            >
              ← Zurück zur Auswahl
            </button>
          </form>
          )
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}
