import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import './globals.css'
import { MetaPixelConsent } from '@/components/meta-pixel-consent'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

export const metadata: Metadata = {
  title: 'Romy AI — Deine Website per Chat',
  description: 'Romy baut und pflegt deine Website direkt im Chat. Kein Code, keine Vorlagen zum Ausfüllen, einfach schreiben.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className={dmSans.className}>
        {PIXEL_ID && <MetaPixelConsent pixelId={PIXEL_ID} />}
        {children}
      </body>
    </html>
  )
}
