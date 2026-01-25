'use client'

export default function PandaMascot({ size = 'large' }: { size?: 'small' | 'large' }) {
  const sizeClasses = size === 'large' ? 'w-24 h-24' : 'w-10 h-10'

  return (
    <div className={`${sizeClasses} panda-bounce mx-auto`}>
      {/* Placeholder Panda - Simple CSS Panda Face */}
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Face */}
        <circle cx="50" cy="50" r="45" fill="white" stroke="#1a1a1a" strokeWidth="2"/>

        {/* Ears */}
        <circle cx="20" cy="20" r="15" fill="#1a1a1a"/>
        <circle cx="80" cy="20" r="15" fill="#1a1a1a"/>

        {/* Eye patches */}
        <ellipse cx="35" cy="45" rx="12" ry="15" fill="#1a1a1a"/>
        <ellipse cx="65" cy="45" rx="12" ry="15" fill="#1a1a1a"/>

        {/* Eyes */}
        <circle cx="35" cy="45" r="5" fill="white"/>
        <circle cx="65" cy="45" r="5" fill="white"/>
        <circle cx="36" cy="44" r="2" fill="#1a1a1a"/>
        <circle cx="66" cy="44" r="2" fill="#1a1a1a"/>

        {/* Nose */}
        <ellipse cx="50" cy="60" rx="6" ry="4" fill="#1a1a1a"/>

        {/* Mouth */}
        <path d="M 42 68 Q 50 75 58 68" stroke="#1a1a1a" strokeWidth="2" fill="none"/>

        {/* Blush */}
        <circle cx="25" cy="60" r="5" fill="#ffb6c1" opacity="0.6"/>
        <circle cx="75" cy="60" r="5" fill="#ffb6c1" opacity="0.6"/>
      </svg>
    </div>
  )
}
