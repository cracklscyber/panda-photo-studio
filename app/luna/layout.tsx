import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Romy — Dein Business per WhatsApp verwaltet',
  description: 'Romy erstellt deine Website, schreibt Angebote und generiert PDFs — alles per WhatsApp-Nachricht.',
}

export default function LunaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.className}>
      {children}
    </div>
  )
}
