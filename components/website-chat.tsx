'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AuthModal } from './auth-modal'
import { AccountMenu } from './account-menu'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  siteUrl?: string
  imageDataUrl?: string
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const INITIAL_MESSAGE: Message = {
  id: 'romy-hello',
  role: 'assistant',
  content:
    'Hi, ich bin Romy — deine persönliche Website-Assistentin. Wir starten mit einem groben Layout, danach machen wir die Feinheiten zusammen. Dafür brauche ich kurz ein paar Infos von dir: Was machst du, wie heißt dein Geschäft, wo bist du, und in welchem Stil hättest du es gerne (modern, klassisch, verspielt, minimal)?',
}

const ONBOARDING_QUICK_REPLIES = ['Ja', 'Nein']

type WebsiteChatProps = {
  className?: string
}

function parseAssistantMessage(content: string): { text: string; imageUrl?: string } {
  // Pull out the [ROMY_IMAGE_DRAFT:url] / [ROMY_IMAGE_CONFIRMED:url] marker
  // so the user never sees it and we can render the image inline.
  const markerRe = /\[ROMY_IMAGE_(?:DRAFT|CONFIRMED):([^\]]+)\]/
  const match = content.match(markerRe)
  let imageUrl = match ? match[1] : undefined
  let text = content.replace(markerRe, '').trim()

  // Also: strip the raw URL from the visible body if it appears in plain
  // text (the reply currently contains both the URL inline and the marker).
  // We keep the URL hidden because the image itself is shown above the text.
  if (imageUrl) {
    const urlEsc = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text.replace(new RegExp(`\\s*${urlEsc}\\s*`, 'g'), ' ').trim()
  }

  // Collapse double blank lines that may remain after stripping
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return { text, imageUrl }
}

function getSessionId(): string {
  const key = 'romy-web-session'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(key, next)
  return next
}

function chatStorageKey(sessionId: string): string {
  return `romy-chat-messages:${sessionId}`
}

function historyToMessages(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Message[] {
  if (history.length === 0) return [INITIAL_MESSAGE]
  return [
    INITIAL_MESSAGE,
    ...history.map((m, index) => ({
      id: `history-${index}-${m.role}`,
      role: m.role,
      content: m.content,
    })),
  ]
}

function loadCachedMessages(sessionId: string): Message[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(chatStorageKey(sessionId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Message[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

function trackCompleteRegistration(method: string) {
  if (typeof window === 'undefined') return
  const key = `romy-registration-tracked:${getSessionId()}`
  if (window.localStorage.getItem(key)) return
  if (!window.fbq) return
  window.localStorage.setItem(key, '1')
  window.fbq?.('track', 'Lead', {
    content_name: 'account_after_website_build',
    content_category: 'Romy Qualified Lead',
    method,
  })
  window.fbq?.('track', 'CompleteRegistration', {
    content_name: 'account_after_website_build',
    method,
  })
}

export function WebsiteChat({ className = '' }: WebsiteChatProps) {
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sid = getSessionId()
    setSessionId(sid)
    const cached = loadCachedMessages(sid)
    if (cached) setMessages(cached)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    try {
      window.localStorage.setItem(chatStorageKey(sessionId), JSON.stringify(messages))
    } catch {
      // ignore storage limits
    }
  }, [messages, sessionId])

  useEffect(() => {
    if (!open || !sessionId) return
    let cancelled = false
    async function loadStoredHistory() {
      try {
        const res = await fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        })
        const data = (await res.json()) as {
          messages?: Array<{ role: 'user' | 'assistant'; content: string }>
        }
        if (cancelled || !Array.isArray(data.messages)) return
        const serverMessages = historyToMessages(data.messages)
        setMessages((current) => {
          const currentReal = current.filter((m) => m.id !== INITIAL_MESSAGE.id).length
          const serverReal = serverMessages.filter((m) => m.id !== INITIAL_MESSAGE.id).length
          return serverReal > currentReal ? serverMessages : current
        })
      } catch {
        // keep local messages
      }
    }
    loadStoredHistory()
    return () => {
      cancelled = true
    }
  }, [open, sessionId])

  useEffect(() => {
    function syncFromHash() {
      setOpen(window.location.hash === '#chat')
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeChat()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isSending, open])

  function closeChat() {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#chat') {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setOpen(false)
  }

  const userHasReplied = messages.some((m) => m.role === 'user')

  function handleFileChosen(file: File | null) {
    setImageError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('Bitte ein Bild auswählen.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Bild ist zu groß (max. 4 MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setPendingImage({ dataUrl: result, name: file.name })
      }
    }
    reader.onerror = () => setImageError('Bild konnte nicht gelesen werden.')
    reader.readAsDataURL(file)
  }

  async function sendMessage(text: string, options: { isOnboarding?: boolean } = {}) {
    if ((!text && !pendingImage) || !sessionId || isSending) return

    const attachedImage = pendingImage
    const messageText = text || (attachedImage ? 'Hier ist ein Foto für meine Seite.' : '')
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      imageDataUrl: attachedImage?.dataUrl,
    }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setPendingImage(null)
    setIsSending(true)

    function appendAssistant(content: string, siteUrl?: string) {
      setMessages((current) => [
        ...current,
        {
          id: `romy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content,
          siteUrl,
        },
      ])
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: messageText,
          isOnboarding: options.isOnboarding === true,
          imageDataUrl: attachedImage?.dataUrl,
        }),
      })

      if (!res.ok || !res.body) {
        appendAssistant(
          'Entschuldige, beim Erstellen deiner Website ist ein technischer Fehler passiert. Ich habe das Problem an mein Team weitergeleitet. Wir beheben das in Kürze.'
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let receivedAny = false
      let waitingOnBuild = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl: number
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line) continue
          let event: {
            type: string
            text?: string
            siteUrl?: string
          } | null = null
          try {
            event = JSON.parse(line)
          } catch {
            continue
          }
          if (!event) continue
          receivedAny = true
          if (event.type === 'ack' && event.text) {
            appendAssistant(event.text)
            waitingOnBuild = true
            setIsBuilding(true)
          } else if (event.type === 'reply' && event.text) {
            appendAssistant(event.text)
            waitingOnBuild = false
            setIsBuilding(false)
          } else if (event.type === 'final' && event.text) {
            appendAssistant(event.text, event.siteUrl)
            waitingOnBuild = false
            setIsBuilding(false)
          } else if (event.type === 'error' && event.text) {
            appendAssistant(event.text)
            waitingOnBuild = false
            setIsBuilding(false)
          } else if (event.type === 'auth_required' && event.text) {
            appendAssistant(event.text)
            setAuthModalOpen(true)
            waitingOnBuild = false
            setIsBuilding(false)
          } else if (event.type === 'auth_prompt') {
            setAuthModalOpen(true)
            waitingOnBuild = false
            setIsBuilding(false)
          }
        }
      }

      if (!receivedAny) {
        appendAssistant('Sag mir einfach, was ich für deine Seite machen soll.')
      } else if (waitingOnBuild) {
        appendAssistant(
          'Entschuldige, beim Erstellen deiner Website ist ein technischer Fehler passiert. Ich habe das Problem an mein Team weitergeleitet. Wir beheben das in Kürze.'
        )
      }
    } catch {
      appendAssistant(
        'Entschuldige, die Verbindung ist gerade abgebrochen. Ich habe das Problem an mein Team weitergeleitet. Wir beheben das in Kürze.'
      )
    } finally {
      setIsSending(false)
      setIsBuilding(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim() || inputRef.current?.value.trim() || ''
    await sendMessage(text)
  }

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#faf9f6] ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label="Chat mit Romy"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-neutral-200 bg-white/80 backdrop-blur px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={closeChat}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              Zurück zur Startseite
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-neutral-900">Romy</p>
                <p className="text-xs text-neutral-500">Website-Assistentin</p>
              </div>
              <span className="relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]">
                <Image
                  src="/romy-logo.png"
                  alt="Romy"
                  width={583}
                  height={1000}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-label="Online" />
              <AccountMenu variant="light" />
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="chat-container flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
            {messages.map((message) => {
              const parsed =
                message.role === 'assistant'
                  ? parseAssistantMessage(message.content)
                  : { text: message.content, imageUrl: undefined as string | undefined }
              return (
              <div
                key={message.id}
                className={`message-fade-in flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[74%] ${
                    message.role === 'user'
                      ? 'bg-neutral-900 text-white'
                      : 'border border-neutral-200 bg-white text-neutral-800'
                  }`}
                >
                  {message.imageDataUrl && (
                    <img
                      src={message.imageDataUrl}
                      alt="Vom Kunden hochgeladenes Bild"
                      className="mb-2 max-h-48 w-auto rounded-lg"
                    />
                  )}
                  {parsed.imageUrl && (
                    <a href={parsed.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        src={parsed.imageUrl}
                        alt="Generiertes Bild"
                        className="mb-2 max-h-72 w-auto rounded-lg"
                      />
                    </a>
                  )}
                  <p className="whitespace-pre-wrap">{parsed.text}</p>
                  {message.siteUrl && (
                    <a
                      href={message.siteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700"
                    >
                      {message.siteUrl.includes('/site/') ? 'Entwurf ansehen' : 'Website ansehen'}
                    </a>
                  )}
                </div>
              </div>
              )
            })}
            {!userHasReplied && (
              <div className="message-fade-in flex flex-wrap gap-2 pt-1">
                {ONBOARDING_QUICK_REPLIES.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => sendMessage(label, { isOnboarding: true })}
                    disabled={isSending || !sessionId}
                    className="rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-900 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {isSending && (
              <div className="message-fade-in flex justify-start">
                <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
                  <span className="flex h-2 w-2 shrink-0">
                    <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {isBuilding
                    ? 'Romy programmiert gerade deine Website. Einen Moment Geduld, das kann ein paar Minuten dauern.'
                    : 'Romy schreibt gerade...'}
                </div>
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-neutral-200 bg-white/80 backdrop-blur p-3 sm:p-4"
        >
          <div className="mx-auto max-w-5xl space-y-2">
            {(pendingImage || imageError) && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2">
                {pendingImage ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={pendingImage.dataUrl}
                      alt={pendingImage.name}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                    <span className="truncate text-xs text-neutral-700">{pendingImage.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-red-700">{imageError}</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPendingImage(null)
                    setImageError(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="shrink-0 text-xs text-neutral-500 transition hover:text-neutral-900"
                >
                  Entfernen
                </button>
              </div>
            )}
            <div className="flex gap-2 rounded-full border border-neutral-200 bg-white p-2 shadow-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleFileChosen(event.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                aria-label="Foto anhängen"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onInput={(event) => setInput(event.currentTarget.value)}
                placeholder={pendingImage ? 'Optional: was sollen wir damit machen?' : 'Schreib Romy...'}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || (!input.trim() && !pendingImage)}
                className="shrink-0 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Senden
              </button>
            </div>
          </div>
        </form>
      </div>
      {authModalOpen && sessionId && (
        <AuthModal
          sessionId={sessionId}
          onSuccess={() => {
            trackCompleteRegistration('email')
            setAuthModalOpen(false)
            setMessages((current) => [
              ...current,
              {
                id: `romy-${Date.now()}`,
                role: 'assistant',
                content: 'Danke! Du bist jetzt angemeldet, wir machen direkt weiter. Was soll ich an deiner Seite ändern?',
              },
            ])
          }}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  )
}
