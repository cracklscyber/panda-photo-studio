'use client'

import { useState } from 'react'
import { signIn, signUp, resetPassword } from '@/lib/auth'

interface AuthModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    if (mode === 'forgot') {
      const { error } = await resetPassword(email)
      if (error) {
        setError(error)
      } else {
        setSuccessMessage('Wir haben dir eine Email mit einem Link zum Zurücksetzen geschickt!')
      }
    } else if (mode === 'login') {
      const { user, error } = await signIn(email, password)
      if (error) {
        setError(error)
      } else if (user) {
        onSuccess()
      }
    } else {
      const { user, error } = await signUp(email, password, name)
      if (error) {
        setError(error)
      } else if (user) {
        onSuccess()
      }
    }

    setLoading(false)
  }

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode)
    setError('')
    setSuccessMessage('')
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold gradient-text text-center mb-2">
          {mode === 'login' ? 'Willkommen zurück!' : mode === 'register' ? 'Account erstellen' : 'Passwort vergessen?'}
        </h2>
        <p className="text-gray-400 text-center mb-6">
          {mode === 'login' ? 'Logge dich ein um fortzufahren' : mode === 'register' ? 'Erstelle deinen Lumino Account' : 'Wir schicken dir einen Reset-Link'}
        </p>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-2 rounded-lg mb-4 text-sm">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                placeholder="Dein Name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
              placeholder="deine@email.de"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Passwort</label>
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
          )}

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
            >
              Passwort vergessen?
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-button text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Laden...' : mode === 'login' ? 'Einloggen' : mode === 'register' ? 'Registrieren' : 'Link senden'}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-gray-400 mt-6">
          {mode === 'login' ? 'Noch kein Account?' : 'Bereits registriert?'}
          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-purple-400 hover:text-purple-300 ml-2 transition-colors"
          >
            {mode === 'login' ? 'Registrieren' : 'Einloggen'}
          </button>
        </p>
      </div>
    </div>
  )
}
