'use client'

import { useState, useRef, useEffect } from 'react'
import ImageUpload from './ImageUpload'
import Lumino from './Lumino'
import { saveImageToGallery, saveChatMessage, getChatHistory, clearChatHistory } from '@/lib/database'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string
  generatedImage?: string
}

interface ChatProps {
  initialImage?: string | null
  onClearInitialImage?: () => void
  userId?: string
}

export default function Chat({ initialImage, onClearInitialImage, userId }: ChatProps) {
  const getWelcomeMessage = (): Message => ({
    id: '1',
    role: 'assistant',
    content: initialImage
      ? 'Ich sehe, du möchtest dieses Bild bearbeiten! Beschreibe mir, welche Änderungen du dir wünschst.'
      : 'Hallo! Ich bin Lumino, dein Assistent für Produktfotos. Lade ein Bild von deinem Produkt hoch und beschreibe mir, wie das finale Foto aussehen soll!'
  })

  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()])
  const [input, setInput] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialImage || null)
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load chat history from database
  useEffect(() => {
    const loadHistory = async () => {
      if (!userId || historyLoaded) return

      const history = await getChatHistory(userId)
      if (history.length > 0) {
        const loadedMessages: Message[] = history.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          image: msg.image_url,
          generatedImage: msg.generated_image_url
        }))
        setMessages([getWelcomeMessage(), ...loadedMessages])
      }
      setHistoryLoaded(true)
    }
    loadHistory()
  }, [userId])

  // Clear the initial image from parent after it's been loaded
  useEffect(() => {
    if (initialImage && onClearInitialImage) {
      onClearInitialImage()
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleImageUpload = (imageData: string) => {
    setUploadedImage(imageData)
  }

  const removeImage = () => {
    setUploadedImage(null)
  }

  const sendMessage = async () => {
    // Allow sending with just an image (no text required)
    if (!input.trim() && !uploadedImage) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: uploadedImage || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setUploadedImage(null)
    setIsLoading(true)

    // Save user message to database
    if (userId) {
      saveChatMessage('user', input, uploadedImage || undefined, undefined, userId)
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          image: uploadedImage,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        generatedImage: data.generatedImage
      }

      // Save generated image to gallery (Supabase)
      if (data.generatedImage) {
        saveImageToGallery(data.generatedImage, userId)
      }

      // Save assistant message to database
      if (userId) {
        saveChatMessage('assistant', data.message, undefined, data.generatedImage, userId)
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ups, da ist etwas schiefgelaufen. Bitte versuche es nochmal!'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Quick reply function for button clicks
  const sendQuickReply = async (text: string) => {
    if (isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      image: uploadedImage || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setUploadedImage(null)
    setIsLoading(true)

    // Save user message to database
    if (userId) {
      saveChatMessage('user', text, uploadedImage || undefined, undefined, userId)
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          image: uploadedImage,
          history: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        generatedImage: data.generatedImage
      }

      if (data.generatedImage) {
        saveImageToGallery(data.generatedImage, userId)
      }

      // Save assistant message to database
      if (userId) {
        saveChatMessage('assistant', data.message, undefined, data.generatedImage, userId)
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ups, da ist etwas schiefgelaufen. Bitte versuche es nochmal!'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Check if last message offers options
  const lastMessage = messages[messages.length - 1]
  const showOptionButtons = lastMessage?.role === 'assistant' &&
    (lastMessage.content.includes('Direkt loslegen') ||
     lastMessage.content.includes('Rückfragen') ||
     lastMessage.content.includes('zwei Wege') ||
     lastMessage.content.includes('Was ist dir lieber'))

  // Clear chat history
  const handleClearChat = async () => {
    if (userId) {
      await clearChatHistory(userId)
    }
    setMessages([getWelcomeMessage()])
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Chat Header */}
      {messages.length > 1 && (
        <div className="px-4 py-2 border-b border-white/10 flex justify-end">
          <button
            onClick={handleClearChat}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Chat löschen
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="h-[500px] overflow-y-auto p-4 chat-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 mb-4 message-fade-in ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <Lumino size="small" />
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-2xl p-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                  : 'bg-white/10 text-gray-200 backdrop-blur-sm border border-white/10'
              }`}
            >
              {message.image && (
                <img
                  src={message.image}
                  alt="Uploaded"
                  className="rounded-lg mb-2 max-h-48 object-contain"
                />
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.generatedImage && (
                <div className="mt-3">
                  <img
                    src={message.generatedImage}
                    alt="Generated"
                    className="rounded-lg max-h-64 object-contain"
                  />
                  <a
                    href={message.generatedImage}
                    download="lumino-product-photo.png"
                    className="inline-block mt-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    ↓ Bild herunterladen
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 mb-4">
            <div className="flex-shrink-0">
              <Lumino size="small" />
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Reply Buttons */}
        {showOptionButtons && !isLoading && (
          <div className="flex gap-2 mb-4 ml-12">
            <button
              onClick={() => sendQuickReply('Direkt loslegen!')}
              className="gradient-button px-4 py-2 text-white rounded-full text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Direkt loslegen
            </button>
            <button
              onClick={() => sendQuickReply('Stell mir ein paar Fragen!')}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 text-white rounded-full text-sm border border-white/20 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Rückfragen stellen
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Image Preview */}
      {uploadedImage && (
        <div className="px-4 py-2 border-t border-white/10 bg-white/5">
          <div className="relative inline-block">
            <img
              src={uploadedImage}
              alt="Preview"
              className="h-20 rounded-lg object-contain"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <ImageUpload onImageUpload={handleImageUpload} />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Beschreibe dein Wunschbild..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full focus:outline-none focus:border-purple-500 text-white placeholder-gray-400 backdrop-blur-sm"
            disabled={isLoading}
          />

          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && !uploadedImage)}
            className="gradient-button px-6 py-2 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  )
}
