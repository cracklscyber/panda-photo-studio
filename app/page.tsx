'use client'

import { useState, useRef, useEffect } from 'react'
import Chat from '@/components/Chat'
import PandaMascot from '@/components/PandaMascot'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header with Panda */}
        <div className="text-center mb-6">
          <PandaMascot />
          <h1 className="text-3xl font-bold text-gray-800 mt-4">
            Panda Photo Studio
          </h1>
          <p className="text-gray-600 mt-2">
            Lade dein Produktfoto hoch und ich erstelle dir ein professionelles Bild!
          </p>
        </div>

        {/* Chat Interface */}
        <Chat />
      </div>
    </main>
  )
}
