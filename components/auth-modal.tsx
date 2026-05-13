'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Session } from '@supabase/supabase-js'
import { browserSupabase } from '@/lib/supabase-browser'

type Props = {
  sessionId: string
  onSuccess: () => void
  onClose: () => void
}

type Mode = 'login' | 'register' | 'forgot' | 'forgotSent' | 'confirmSent'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

const PROD_ORIGIN = 'https://halloromy.com'

export function AuthModal({ sessionId, onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function callbackUrl(path = '/auth/callback'): string {
    return `${PROD_ORIGIN}${path}?sessionId=${encodeURIComponent(sessionId)}`
  }

  function redirectLocalLoginToLive(): boolean {
    if (typeof window === 'undefined') return false
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'
    if (!isLocal) return false

    const target = new URL(`${PROD_ORIGIN}/`)
    target.hash = 'chat'
    window.localStorage.setItem('romy-login-return-session', sessionId)
    window.location.href = target.toString()
    return true
  }

  function mapAuthError(message: string): string {
    const m = message.toLowerCase()
    if (m.includes('invalid login credentials')) return 'E-Mail oder Passwort ist falsch.'
    if (m.includes('user already registered')) return 'Diese E-Mail ist schon registriert. Bitte einloggen.'
    if (m.includes('email not confirmed')) return 'E-Mail noch nicht bestätigt. Schau in dein Postfach.'
    if (m.includes('password should be at least')) return 'Passwort muss mindestens 8 Zeichen lang sein.'
    if (m.includes('rate limit')) return 'Zu viele Versuche. Bitte kurz warten und nochmal probieren.'
    if (m.includes('weak password')) return 'Passwort ist zu schwach. Bitte länger oder komplexer wählen.'
    return message
  }

  async function linkAuthAndFinish(session: Session) {
    const callbackSessionId = sessionId
    const storedSessionId = window.localStorage.getItem('romy-web-session') || callbackSessionId
    if (!storedSessionId) throw new Error('Browser-Session nicht gefunden.')
    window.localStorage.setItem('romy-web-session', storedSessionId)

    const meta = (session.user.user_metadata || {}) as Record<string, unknown>
    const userName =
      (typeof meta.name === 'string' && meta.name) ||
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.display_name === 'string' && meta.display_name) ||
      null

    const res = await fetch('/api/customer/link-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        sessionId: storedSessionId,
        email: session.user.email || null,
        name: userName,
        provider: 'email',
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error || 'Konto-Verknüpfung fehlgeschlagen.')
    }

    const linkData = (await res.json().catch(() => ({}))) as {
      canonicalSessionId?: string
      hadFirstBuild?: boolean
      isNewAccountLink?: boolean
    }
    if (linkData.canonicalSessionId && linkData.canonicalSessionId !== storedSessionId) {
      window.localStorage.setItem('romy-web-session', linkData.canonicalSessionId)
    }

    const trackingSessionId = linkData.canonicalSessionId || storedSessionId
    const trackingKey = `romy-registration-tracked:${trackingSessionId}`
    if (
      linkData.hadFirstBuild &&
      linkData.isNewAccountLink &&
      !window.localStorage.getItem(trackingKey) &&
      window.fbq
    ) {
      window.localStorage.setItem(trackingKey, '1')
      window.fbq?.('track', 'Lead', {
        content_name: 'account_after_website_build',
        content_category: 'Romy Qualified Lead',
        method: 'email',
      })
      window.fbq?.('track', 'CompleteRegistration', {
        content_name: 'account_after_website_build',
        method: 'email',
      })
    }

    onSuccess()
  }

  async function signInWithGoogle() {
    if (redirectLocalLoginToLive()) return
    setBusy(true)
    setError(null)
    try {
      const supabase = browserSupabase()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl() },
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

  function validateEmail(value: string): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Bitte eine gültige E-Mail-Adresse eingeben.'
    return null
  }

  function validatePassword(value: string): string | null {
    if (value.length < 8) return 'Passwort muss mindestens 8 Zeichen haben.'
    return null
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const cleanEmail = email.trim().toLowerCase()
    const emailErr = validateEmail(cleanEmail)
    if (emailErr) {
      setError(emailErr)
      return
    }
    if (!password) {
      setError('Bitte Passwort eingeben.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const supabase = browserSupabase()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (authError) throw new Error(authError.message)
      if (!data.session) throw new Error('Anmeldung fehlgeschlagen — keine Sitzung erhalten.')
      await linkAuthAndFinish(data.session)
    } catch (err) {
      setError(mapAuthError((err as Error).message))
      setBusy(false)
    }
  }

  async function submitRegister(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const cleanEmail = email.trim().toLowerCase()
    const emailErr = validateEmail(cleanEmail)
    if (emailErr) {
      setError(emailErr)
      return
    }
    const pwErr = validatePassword(password)
    if (pwErr) {
      setError(pwErr)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const supabase = browserSupabase()
      const cleanName = name.trim()
      const cleanPhone = phone.trim()
      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName || null,
            phone: cleanPhone || null,
          },
          emailRedirectTo: callbackUrl(),
        },
      })
      if (authError) throw new Error(authError.message)
      if (data.session) {
        await linkAuthAndFinish(data.session)
      } else {
        setMode('confirmSent')
        setBusy(false)
      }
    } catch (err) {
      setError(mapAuthError((err as Error).message))
      setBusy(false)
    }
  }

  async function submitForgot(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (redirectLocalLoginToLive()) return
    const cleanEmail = email.trim().toLowerCase()
    const emailErr = validateEmail(cleanEmail)
    if (emailErr) {
      setError(emailErr)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const supabase = browserSupabase()
      const { error: authError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: callbackUrl('/reset-password'),
      })
      if (authError) throw new Error(authError.message)
      setMode('forgotSent')
    } catch (err) {
      setError(mapAuthError((err as Error).message))
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: Mode) {
    setError(null)
    setMode(next)
  }

  if (!mounted) return null

  const isRegister = mode === 'register'
  const isLogin = mode === 'login'
  const isForgot = mode === 'forgot'

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

        <h2 className="text-xl font-semibold text-neutral-900">
          {mode === 'forgotSent'
            ? 'Mail unterwegs'
            : mode === 'confirmSent'
            ? 'Bestätigung gesendet'
            : isForgot
            ? 'Passwort zurücksetzen'
            : 'Anmelden oder Konto erstellen'}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          {mode === 'forgotSent'
            ? 'Wir haben dir einen Link zum Zurücksetzen geschickt. Schau in dein Postfach.'
            : mode === 'confirmSent'
            ? 'Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben.'
            : isForgot
            ? 'Trag deine E-Mail ein, wir schicken dir einen Link zum neuen Passwort.'
            : 'Damit deine Seite und alle Änderungen erhalten bleiben, und ich dich beim nächsten Mal wiedererkenne.'}
        </p>

        {(isLogin || isRegister) && (
          <>
            {/* Tab toggle */}
            <div className="mt-5 flex rounded-xl bg-neutral-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${
                  isLogin ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Einloggen
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${
                  isRegister ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Registrieren
              </button>
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.84-.08-1.65-.22-2.43H12v4.6h6.45a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.57-5.16 3.57-8.79z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.86-3c-1.08.72-2.45 1.16-4.09 1.16-3.14 0-5.81-2.12-6.76-4.97H1.27v3.12A11.99 11.99 0 0 0 12 24z"/>
                <path fill="#FBBC04" d="M5.24 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.61H1.27a11.99 11.99 0 0 0 0 10.78l3.97-3.12z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.27 6.61l3.97 3.12C6.19 6.87 8.86 4.75 12 4.75z"/>
              </svg>
              Mit Google {isLogin ? 'anmelden' : 'registrieren'}
            </button>

            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              oder mit E-Mail
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <form onSubmit={isLogin ? submitLogin : submitRegister} className="space-y-3">
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
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                  disabled={busy}
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="auth-password" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Passwort
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-medium text-neutral-500 transition hover:text-neutral-900"
                    >
                      Vergessen?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegister ? 'Mindestens 8 Zeichen' : '••••••••'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 pr-10 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                    disabled={busy}
                    minLength={isRegister ? 8 : undefined}
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

              {isRegister && (
                <>
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
                </>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {busy
                  ? isLogin
                    ? 'Melde an...'
                    : 'Lege Konto an...'
                  : isLogin
                  ? 'Einloggen'
                  : 'Konto erstellen'}
              </button>
            </form>
          </>
        )}

        {isForgot && (
          <form onSubmit={submitForgot} className="mt-6 space-y-3">
            <div>
              <label htmlFor="auth-forgot-email" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                E-Mail
              </label>
              <input
                id="auth-forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@beispiel.de"
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                disabled={busy}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {busy ? 'Sende Link...' : 'Reset-Link senden'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-xs text-neutral-500 transition hover:text-neutral-800"
            >
              ← Zurück zum Einloggen
            </button>
          </form>
        )}

        {mode === 'forgotSent' && (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Link gesendet an <strong>{email}</strong>. Öffne ihn, um ein neues Passwort zu setzen.
            </div>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-xs text-neutral-500 transition hover:text-neutral-800"
            >
              ← Zurück zum Einloggen
            </button>
          </div>
        )}

        {mode === 'confirmSent' && (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Wir haben dir eine Bestätigungs-Mail an <strong>{email}</strong> geschickt.
              Bitte klick auf den Link, dann ist dein Konto aktiv.
            </div>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-xs text-neutral-500 transition hover:text-neutral-800"
            >
              ← Zurück zum Einloggen
            </button>
          </div>
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
