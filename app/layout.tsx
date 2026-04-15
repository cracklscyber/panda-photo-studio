import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Romy AI — Deine Website per WhatsApp',
  description: 'Romy baut und pflegt deine Website per WhatsApp-Chat. Kein Code, keine Vorlagen zum Ausfüllen — einfach schreiben.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={dmSans.className}>{children}</body>
    </html>
  )
}
