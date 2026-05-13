'use client'

import { useEffect, useRef, useState } from 'react'

export const QUALIFIED_STORAGE_KEY = 'romy-qualified'
export const BUSINESS_NAME_STORAGE_KEY = 'romy-business-name'

export function isAlreadyQualified(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(QUALIFIED_STORAGE_KEY) === '1'
}

export function getStoredBusinessName(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(BUSINESS_NAME_STORAGE_KEY) || ''
}

type Step = 'business' | 'name' | 'declined'

interface QualificationModalProps {
  open: boolean
  onQualified: (businessName: string) => void
  onClose: () => void
}

export function QualificationModal({
  open,
  onQualified,
  onClose,
}: QualificationModalProps) {
  const [step, setStep] = useState<Step>('business')
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setStep('business')
    setName('')
  }, [open])

  useEffect(() => {
    if (step === 'name') {
      const id = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [step])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'declined') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, step])

  if (!open) return null

  function handleYes() {
    setStep('name')
  }

  function handleNo() {
    setStep('declined')
  }

  function handleSubmitName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(QUALIFIED_STORAGE_KEY, '1')
      window.localStorage.setItem(BUSINESS_NAME_STORAGE_KEY, trimmed)
      try {
        window.fbq?.('track', 'Lead', {
          content_name: 'qualified_business',
          content_category: 'Romy Qualification',
        })
      } catch {
        // pixel optional
      }
    }
    onQualified(trimmed)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qualification-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1a1714]/55 px-4 py-8 backdrop-blur-sm"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-[#f5efe2] shadow-[0_40px_120px_-30px_rgba(26,23,20,0.6)]">
        {step === 'business' && (
          <div className="px-7 py-9 sm:px-9 sm:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#1a1714]/55">
              Romy
            </p>
            <h2
              id="qualification-title"
              className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-[1.05] tracking-tight text-[#1a1714] sm:text-[34px]"
            >
              Hast du ein Unternehmen?
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1a1714]/65">
              Romy baut Websites für lokale Geschäfte und Selbständige.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleYes}
                className="w-full rounded-2xl bg-[#1a1714] px-5 py-4 text-[15px] font-semibold text-[#f5efe2] shadow-[0_12px_28px_-12px_rgba(26,23,20,0.5)] transition hover:bg-[#2a2522]"
              >
                Ja
              </button>
              <button
                type="button"
                onClick={handleNo}
                className="w-full rounded-2xl border border-[#1a1714]/15 bg-white/70 px-5 py-4 text-[15px] font-medium text-[#1a1714]/80 transition hover:border-[#1a1714]/30 hover:bg-white"
              >
                Nein
              </button>
            </div>
          </div>
        )}

        {step === 'name' && (
          <form onSubmit={handleSubmitName} className="px-7 py-9 sm:px-9 sm:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#1a1714]/55">
              Romy
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-[1.05] tracking-tight text-[#1a1714] sm:text-[34px]">
              Wie heißt es?
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1a1714]/65">
              Name deines Geschäfts oder Projekts.
            </p>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Café Sonnenblume"
              maxLength={80}
              required
              className="mt-6 w-full rounded-2xl border border-[#1a1714]/15 bg-white px-4 py-3.5 text-[15px] text-[#1a1714] placeholder:text-[#1a1714]/35 focus:border-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#1a1714]/10"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="mt-3 w-full rounded-2xl bg-[#1a1714] px-5 py-4 text-[15px] font-semibold text-[#f5efe2] shadow-[0_12px_28px_-12px_rgba(26,23,20,0.5)] transition hover:bg-[#2a2522] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Weiter zum Chat
            </button>
            <button
              type="button"
              onClick={() => setStep('business')}
              className="mt-2 w-full rounded-2xl px-5 py-2.5 text-[13px] font-medium text-[#1a1714]/55 transition hover:text-[#1a1714]"
            >
              Zurück
            </button>
          </form>
        )}

        {step === 'declined' && (
          <div className="px-7 py-9 sm:px-9 sm:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#1a1714]/55">
              Romy
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-[1.05] tracking-tight text-[#1a1714] sm:text-[34px]">
              Danke, dass du vorbeischaust.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1a1714]/65">
              Romy ist aktuell für Unternehmen und Selbständige gebaut. Wenn sich
              das mal ändert, freuen wir uns, wenn du wiederkommst.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 w-full rounded-2xl border border-[#1a1714]/15 bg-white/70 px-5 py-4 text-[15px] font-medium text-[#1a1714]/80 transition hover:border-[#1a1714]/30 hover:bg-white"
            >
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
