'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { FbclidCapture } from './fbclid-capture'

type MetaPixelConsentProps = {
  pixelId: string
}

export function MetaPixelConsent({ pixelId }: MetaPixelConsentProps) {
  const [consent, setConsent] = useState<'unknown' | 'accepted' | 'declined'>('unknown')

  useEffect(() => {
    const saved = window.localStorage.getItem('luna-meta-consent')
    if (saved === 'accepted' || saved === 'declined') setConsent(saved)
  }, [])

  const saveConsent = (value: 'accepted' | 'declined') => {
    window.localStorage.setItem('luna-meta-consent', value)
    setConsent(value)
  }

  return (
    <>
      {consent === 'accepted' && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
          </Script>
          <FbclidCapture />
        </>
      )}
      {consent === 'unknown' && (
        <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-black/[0.08] bg-white/95 p-4 text-[#11110f] shadow-[0_24px_70px_-42px_rgba(17,17,15,0.45)] backdrop-blur-xl">
          <p className="text-sm font-semibold">Cookies & Messung</p>
          <p className="mt-1 text-xs leading-5 text-[#11110f]/60">
            Wir nutzen optionale Messung, um zu verstehen, ob unsere Seite funktioniert. Du kannst ablehnen und die Seite trotzdem normal nutzen.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => saveConsent('declined')}
              className="rounded-full border border-black/[0.12] px-4 py-2 text-sm font-semibold text-[#11110f]/70 transition hover:bg-black/[0.04]"
            >
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => saveConsent('accepted')}
              className="rounded-full bg-[#11110f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2e302a]"
            >
              Akzeptieren
            </button>
          </div>
        </div>
      )}
    </>
  )
}
