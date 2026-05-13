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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-consent-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.5)] sm:p-8">
            <h2
              id="cookie-consent-title"
              className="text-xl font-semibold text-[#1a1714] sm:text-2xl"
            >
              Cookies & Messung
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#1a1714]/70 sm:text-base">
              Wir nutzen Meta Pixel, um Werbeanzeigen zu messen und Romy stetig zu verbessern.
              Bitte triff eine Auswahl, bevor du fortfährst.
            </p>
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => choose('declined')}
                className="rounded-xl border border-black/10 px-5 py-3 text-sm font-medium text-[#1a1714] transition hover:bg-black/[0.04]"
              >
                Ablehnen
              </button>
              <button
                type="button"
                onClick={() => choose('accepted')}
                className="rounded-xl bg-[#1a1714] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2522]"
              >
                Akzeptieren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
