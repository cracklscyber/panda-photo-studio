'use client'

export default function Lumino({ size = 'large' }: { size?: 'small' | 'large' }) {
  const sizeClasses = size === 'large' ? 'w-32 h-32' : 'w-12 h-12'

  return (
    <div className={`${sizeClasses} lumino-float lumino-glow mx-auto`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          {/* Gradient for body */}
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Gradient for glow */}
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>

          {/* Lens gradient */}
          <radialGradient id="lensGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>

          {/* Inner lens rings */}
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Outer glow */}
        <circle cx="50" cy="50" r="48" fill="url(#glowGradient)" />

        {/* Main body - soft rounded shape */}
        <ellipse cx="50" cy="52" rx="32" ry="35" fill="url(#bodyGradient)" />

        {/* Ears - small and pointy */}
        <path d="M 25 25 Q 20 15 30 20 Q 35 25 30 30 Z" fill="url(#bodyGradient)" />
        <path d="M 75 25 Q 80 15 70 20 Q 65 25 70 30 Z" fill="url(#bodyGradient)" />

        {/* Ear inner */}
        <path d="M 27 24 Q 24 18 31 21" stroke="#c4b5fd" strokeWidth="1.5" fill="none" />
        <path d="M 73 24 Q 76 18 69 21" stroke="#c4b5fd" strokeWidth="1.5" fill="none" />

        {/* Main eye/lens - camera-like */}
        <circle cx="50" cy="48" r="18" fill="#1e1e2e" stroke="url(#ringGradient)" strokeWidth="2" />
        <circle cx="50" cy="48" r="14" fill="url(#lensGradient)" />

        {/* Lens rings (aperture effect) */}
        <circle cx="50" cy="48" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <circle cx="50" cy="48" r="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

        {/* Pupil */}
        <circle cx="50" cy="48" r="5" fill="#0f172a" />

        {/* Eye shine */}
        <circle cx="45" cy="44" r="3" fill="white" opacity="0.9" />
        <circle cx="54" cy="51" r="1.5" fill="white" opacity="0.6" />

        {/* Cute small smile */}
        <path d="M 42 68 Q 50 74 58 68" stroke="#e9d5ff" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Floating tail/wisp - ethereal trail */}
        <path
          d="M 50 87 Q 55 92 60 88 Q 70 82 75 90 Q 80 95 85 88"
          stroke="url(#ringGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M 50 87 Q 45 92 40 88 Q 35 85 30 90"
          stroke="url(#bodyGradient)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Small sparkles around */}
        <circle cx="22" cy="45" r="1.5" fill="#67e8f9" opacity="0.8" />
        <circle cx="78" cy="40" r="1" fill="#a78bfa" opacity="0.8" />
        <circle cx="75" cy="65" r="1.5" fill="#22d3ee" opacity="0.6" />
      </svg>
    </div>
  )
}
