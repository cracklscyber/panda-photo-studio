'use client'

import { FormEvent, useEffect, useState } from 'react'
import { browserSupabase } from '@/lib/supabase-browser'

type Status = 'loading' | 'ready' | 'saving' | 'done' | 'error'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState<string>('Wir prüfen deinen Link...')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const supabase = browserSupabase()
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw new Error(error.message)
        }

        const { data, error } = await supabase.auth.getSession()
        if (error) throw new Error(error.message)
        if (!data.session) {
          throw new Error('Reset-Link ist abgelaufen oder ungültig. Fordere bitte einen neuen an.')
        }

        if (cancelled) return
        setStatus('ready')
        setMessage('')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setMessage((err as Error).message || 'Reset-Link konnte nicht verarbeitet werden.')
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (status === 'saving') return
    if (password.length < 8) {
      setMessage('Passwort muss mindestens 8 Zeichen haben.')
      return
    }
    if (password !== confirm) {
      setMessage('Die Passwörter stimmen nicht überein.')
      return
    }
    setStatus('saving')
    setMessage('')
    try {
      const supabase = browserSupabase()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      setStatus('done')
      setMessage('Passwort gespeichert. Wir leiten dich zurück zum Chat...')
      setTimeout(() => {
        const sessionId = new URLSearchParams(window.location.search).get('sessionId')
        const target = sessionId
          ? `/auth/callback?sessionId=${encodeURIComponent(sessionId)}`
          : '/auth/callback'
        window.location.href = target
      }, 900)
    } catch (err) {
      setStatus('ready')
      setMessage((err as Error).message || 'Speichern fehlgeschlagen.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
        {status === 'loading' && (
          <div className="text-center">
            <div className="mb-4 inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            <h1 className="text-lg font-semibold text-neutral-900">Einen Moment</h1>
            <p className="mt-2 text-sm text-neutral-600">{message}</p>
          </div>
        )}

        {(status === 'ready' || status === 'saving') && (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">Neues Passwort setzen</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Wähle ein neues Passwort. Mindestens 8 Zeichen.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <div>
                <label htmlFor="new-password" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Neues Passwort
                </label>
                <div className="relative mt-1">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Mindestens 8 Zeichen"
                    disabled={status === 'saving'}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 pr-10 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Passwort bestätigen
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Nochmal eingeben"
                  disabled={status === 'saving'}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'saving'}
                className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {status === 'saving' ? 'Speichere...' : 'Passwort speichern'}
              </button>

              {message && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {message}
                </p>
              )}
            </form>
          </>
        )}

        {status === 'done' && (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-neutral-900">Geschafft</h1>
            <p className="mt-2 text-sm text-neutral-600">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-neutral-900">Hoppla</h1>
            <p className="mt-2 text-sm text-neutral-600">{message}</p>
            <a
              href="/#chat"
              className="mt-5 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              Zurück zum Chat
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
