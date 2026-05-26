'use client'

import { useEffect, useState } from 'react'

type Props = {
  url: string
  className?: string
  children: React.ReactNode
}

export function BookingModal({ url, className, children }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 md:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Schließen"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow ring-1 ring-neutral-200 transition hover:bg-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            {url ? (
              <iframe
                src={url}
                className="h-full w-full"
                title="Beratungsgespräch buchen"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <div className="max-w-sm">
                  <p className="text-lg font-medium text-neutral-900">Buchungssystem wird gerade eingerichtet</p>
                  <p className="mt-3 text-sm text-neutral-600">
                    In der Zwischenzeit kannst du Luna direkt im Website-Chat schreiben.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
