'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { FbclidCapture } from './fbclid-capture'

type MetaPixelConsentProps = {
  pixelId: string
}

const CONSENT_KEY = 'romy-meta-pixel-consent'

export function MetaPixelConsent({ pixelId }: MetaPixelConsentProps) {
  const [consent, setConsent] = useState<'unknown' | 'accepted' | 'declined'>('unknown')

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY)
    if (stored === 'accepted' || stored === 'declined') setConsent(stored)
  }, [])

  function choose(next: 'accepted' | 'declined') {
    window.localStorage.setItem(CONSENT_KEY, next)
    setConsent(next)
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
        <div className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-xl rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.35)]">
          <p className="text-sm font-medium text-[#1a1714]">Cookies & Messung</p>
          <p className="mt-1 text-xs leading-relaxed text-[#1a1714]/65">
            Wir nutzen Meta Pixel, um Werbeanzeigen zu messen und Romy zu verbessern.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => choose('declined')}
              className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-[#1a1714] hover:bg-black/[0.03]"
            >
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => choose('accepted')}
              className="rounded-lg bg-[#1a1714] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2a2522]"
            >
              Akzeptieren
            </button>
          </div>
        </div>
      )}
    </>
  )
}
