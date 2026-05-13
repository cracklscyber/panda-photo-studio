'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AuthModal } from './auth-modal'

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
  paymentUrl?: string
  bookingUrl?: string
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const INITIAL_MESSAGE: Message = {
  id: 'romy-hello',
  role: 'assistant',
  content:
    'Hey, ich bin Romy, deine persönliche Website-Assistentin. Zusammen bauen wir gemeinsam deine Seite. Wir fangen an mit einem groben Layout. Möchtest du starten?\n\n[ROMY_QUICK_REPLIES:Ja,Nein]',
}

type WebsiteChatProps = {
  className?: string
}

function parseAssistantMessage(content: string): {
  text: string
  imageUrl?: string
  siteUrl?: string
  quickReplies?: string[]
} {
  const markerRe = /\[ROMY_IMAGE_(?:DRAFT|CONFIRMED):([^\]]+)\]/
  const match = content.match(markerRe)
  let imageUrl = match ? match[1] : undefined
  let text = content.replace(markerRe, '').trim()

  if (imageUrl) {
    const urlEsc = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text.replace(new RegExp(`\\s*${urlEsc}\\s*`, 'g'), ' ').trim()
  }

  const quickRe = /\[ROMY_QUICK_REPLIES:([^\]]+)\]/
  const quickMatch = text.match(quickRe)
  let quickReplies: string[] | undefined
  if (quickMatch) {
    quickReplies = quickMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    text = text.replace(quickRe, '').trim()
  }

  const siteUrlRe = /https?:\/\/(?:[a-z0-9-]+\.)?halloromy\.com\/(?:site\/)?[a-z0-9-]+/i
  const siteMatch = text.match(siteUrlRe)
  const siteUrl = siteMatch ? siteMatch[0] : undefined
  if (siteUrl) {
    text = text.replace(siteUrl, '').trim()
  }

  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return { text, imageUrl, siteUrl, quickReplies }
}

function parseUserMessage(content: string): { text: string; imageUrl?: string } {
  // Strip [ROMY_USER_IMAGE:url] marker that the server adds for user-uploaded
  // images so the chat shows the image inline (from Supabase) instead of the
  // raw marker text. Falls back to plain content when no marker exists.
  const markerRe = /\[ROMY_USER_IMAGE:([^\]]+)\]/
  const match = content.match(markerRe)
  const imageUrl = match ? match[1] : undefined
  const text = content.replace(markerRe, '').replace(/\n{3,}/g, '\n\n').trim()
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

    function appendAssistant(
      content: string,
      extras: { siteUrl?: string; paymentUrl?: string; bookingUrl?: string } = {}
    ) {
      setMessages((current) => [
        ...current,
        {
          id: `romy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content,
          siteUrl: extras.siteUrl,
          paymentUrl: extras.paymentUrl,
          bookingUrl: extras.bookingUrl,
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
            paymentUrl?: string
            bookingUrl?: string
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
            appendAssistant(event.text, {
              paymentUrl: event.paymentUrl,
              bookingUrl: event.bookingUrl,
            })
            waitingOnBuild = false
            setIsBuilding(false)
          } else if (event.type === 'final' && event.text) {
            appendAssistant(event.text, { siteUrl: event.siteUrl })
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
        <div className="border-b border-neutral-200 bg-white/80 backdrop-blur px-3 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 sm:gap-4">
            <button
              type="button"
              onClick={closeChat}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Zurück zur Startseite</span>
              <span className="sm:hidden">Zurück</span>
            </button>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-neutral-900 leading-tight">Romy</p>
                <p className="hidden text-xs text-neutral-500 sm:block">Website-Assistentin</p>
              </div>
              <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] sm:h-11 sm:w-11">
                <Image
                  src="/romy-logo.png"
                  alt="Romy"
                  width={583}
                  height={1000}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-label="Online" />
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="chat-container flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
            {messages.map((message) => {
              const parsed: { text: string; imageUrl?: string; siteUrl?: string } =
                message.role === 'assistant'
                  ? parseAssistantMessage(message.content)
                  : parseUserMessage(message.content)
              return (
              <div
                key={message.id}
                className={`message-fade-in flex items-end gap-2.5 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <span
                    aria-hidden
                    className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm"
                  >
                    <Image
                      src="/romy-avatar.png"
                      alt=""
                      width={72}
                      height={72}
                      className="h-full w-full object-cover"
                    />
                  </span>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[70%] ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-neutral-900 text-white'
                      : 'rounded-bl-md border border-neutral-200 bg-white text-neutral-800'
                  }`}
                >
                  {message.imageDataUrl && (
                    <img
                      src={message.imageDataUrl}
                      alt="Vom Kunden hochgeladenes Bild"
                      className="mb-2 max-h-48 w-auto rounded-lg"
                    />
                  )}
                  {parsed.imageUrl && !message.imageDataUrl && (
                    <a href={parsed.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        src={parsed.imageUrl}
                        alt={message.role === 'user' ? 'Vom Kunden hochgeladenes Bild' : 'Generiertes Bild'}
                        className={`mb-2 w-auto rounded-lg ${message.role === 'user' ? 'max-h-48' : 'max-h-72'}`}
                      />
                    </a>
                  )}
                  <p className="whitespace-pre-wrap">{parsed.text}</p>
                  {(message.siteUrl || parsed.siteUrl) && (
                    <a
                      href={(message.siteUrl || parsed.siteUrl) as string}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700"
                    >
                      {((message.siteUrl || parsed.siteUrl) as string).includes('/site/') ? 'Entwurf ansehen' : 'Website ansehen'}
                    </a>
                  )}
                  {(message.paymentUrl || message.bookingUrl) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.paymentUrl && (
                        <a
                          href={message.paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700"
                        >
                          Stripe Checkout
                        </a>
                      )}
                      {message.bookingUrl && (
                        <a
                          href={message.bookingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 transition hover:border-neutral-900 hover:text-neutral-950"
                        >
                          Beratung buchen
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )
            })}
            {(() => {
              if (isSending) return null
              const lastMsg = messages[messages.length - 1]
              if (!lastMsg || lastMsg.role !== 'assistant') return null
              const parsed = parseAssistantMessage(lastMsg.content)
              if (!parsed.quickReplies?.length) return null
              const isInitial = lastMsg.id === INITIAL_MESSAGE.id
              return (
                <div className="message-fade-in flex flex-wrap gap-2 pl-[46px] pt-1">
                  {parsed.quickReplies.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => sendMessage(label, { isOnboarding: isInitial })}
                      disabled={isSending || !sessionId}
                      className="rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-900 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )
            })()}
            {isSending && (
              <div className="message-fade-in flex items-end gap-2.5 justify-start">
                <span
                  aria-hidden
                  className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm"
                >
                  <Image
                    src="/romy-avatar.png"
                    alt=""
                    width={72}
                    height={72}
                    className="h-full w-full object-cover"
                  />
                </span>
                <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
                  <span className="relative flex h-2 w-2 shrink-0">
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
