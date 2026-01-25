'use client'

import { useState, useRef, useEffect } from 'react'
import ImageUpload from './ImageUpload'
import PandaMascot from './PandaMascot'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string
  generatedImage?: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hallo! Ich bin Panda, dein Assistent für Produktfotos. Lade ein Bild von deinem Produkt hoch und beschreibe mir, wie das finale Foto aussehen soll!'
    }
  ])
  const [input, setInput] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
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
                <PandaMascot size="small" />
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-2xl p-3 ${
                message.role === 'user'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-800'
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
                    download="panda-product-photo.png"
                    className="inline-block mt-2 text-sm text-green-600 hover:text-green-700"
                  >
                    Bild herunterladen
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 mb-4">
            <div className="flex-shrink-0">
              <PandaMascot size="small" />
            </div>
            <div className="bg-gray-100 rounded-2xl p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Image Preview */}
      {uploadedImage && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="relative inline-block">
            <img
              src={uploadedImage}
              alt="Preview"
              className="h-20 rounded-lg object-contain"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <ImageUpload onImageUpload={handleImageUpload} />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Beschreibe dein Wunschbild..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-green-500"
            disabled={isLoading}
          />

          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && !uploadedImage)}
            className="px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  )
}
