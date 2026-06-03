import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Onest } from 'next/font/google'
import './globals.css'
import { MetaPixelConsent } from '@/components/meta-pixel-consent'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['700', '800'],
  display: 'swap',
})

const onest = Onest({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

export const metadata: Metadata = {
  title: 'Luna.ai — Deine individuelle Website per WhatsApp',
  description: 'Luna baut deine Website aus wenigen Nachrichten. Mit echten Texten, passenden Bildern und individuellem Design. Änderungen jederzeit per WhatsApp.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={`${bricolage.variable} ${onest.variable}`}>
      <body className={onest.className}>
        {PIXEL_ID && <MetaPixelConsent pixelId={PIXEL_ID} />}
        {children}
      </body>
    </html>
  )
}
