'use client'

import { useState, useEffect } from 'react'
import { updatePassword } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Lumino from '@/components/Lumino'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben')
      return
    }

    setLoading(true)
    const { error } = await updatePassword(password)

    if (error) {
      setError(error)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 3000)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="glass-card rounded-3xl p-10 max-w-md w-full text-center">
          <Lumino size="medium" />
          <h1 className="text-2xl font-bold gradient-text mt-6">Passwort geändert!</h1>
          <p className="text-gray-400 mt-4">
            Dein Passwort wurde erfolgreich aktualisiert. Du wirst gleich weitergeleitet...
          </p>
          <div className="mt-6">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      <div className="glass-card rounded-3xl p-10 max-w-md w-full text-center">
        <Lumino size="medium" />

        <h1 className="text-2xl font-bold gradient-text mt-6">Neues Passwort</h1>
        <p className="text-gray-400 mt-2 mb-6">
          Gib dein neues Passwort ein
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Neues Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Passwort bestätigen</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-button text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Wird gespeichert...' : 'Passwort ändern'}
          </button>
        </form>

        <button
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-white transition-colors mt-6 text-sm"
        >
          Zurück zur Startseite
        </button>
      </div>
    </main>
  )
}
