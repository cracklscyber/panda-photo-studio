'use client'

import { useState, FormEvent } from 'react'

export default function LunaLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/luna-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Etwas ist schiefgelaufen')
        setFormState('error')
        return
      }

      setFormState('success')
    } catch {
      setErrorMsg('Verbindungsfehler. Bitte versuche es erneut.')
      setFormState('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center font-bold text-sm">
              L
            </div>
            <span className="text-xl font-bold">Luna</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">So funktioniert&apos;s</a>
            <a href="#pricing" className="hover:text-white transition-colors">Preise</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="#start"
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold py-2.5 px-6 rounded-full text-sm transition-all hover:shadow-lg hover:shadow-violet-500/25"
            >
              Jetzt starten
            </a>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0A0A0F]/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-4">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>So funktioniert&apos;s</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(false)}>Preise</a>
            <a
              href="#start"
              className="bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold py-2.5 px-6 rounded-full text-sm text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Jetzt starten
            </a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Per WhatsApp. Ohne Technik-Stress.
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
            Deine Website.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              Per WhatsApp verwaltet.
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Luna erstellt und verwaltet deine Website, schreibt Angebote und generiert PDFs —
            alles per WhatsApp-Nachricht. Du schreibst, Luna macht den Rest.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#start"
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold py-4 px-10 rounded-full text-lg transition-all hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5"
            >
              Kostenlos testen
            </a>
            <a
              href="#how-it-works"
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-4 px-10 rounded-full text-lg transition-all"
            >
              So funktioniert&apos;s
            </a>
          </div>

          {/* Mock WhatsApp Chat */}
          <div className="mt-16 max-w-md mx-auto">
            <div className="bg-[#111118] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* WhatsApp header */}
              <div className="bg-[#1A1A25] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center font-bold text-sm">
                  L
                </div>
                <div>
                  <div className="font-semibold text-sm">Luna</div>
                  <div className="text-xs text-green-400">online</div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3">
                <div className="flex justify-end">
                  <div className="bg-[#5B4A8A] rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[80%] text-sm">
                    Ändere die Öffnungszeiten auf Mo-Fr 9-18 Uhr
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-[#1E1E2E] rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[80%] text-sm text-gray-200">
                    Erledigt! Deine Website zeigt jetzt die neuen Öffnungszeiten: Mo-Fr 9:00 - 18:00 Uhr.
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-[#5B4A8A] rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[80%] text-sm">
                    Schreib ein Angebot: 20% Rabatt auf Blumensträuße zum Muttertag
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-[#1E1E2E] rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[80%] text-sm text-gray-200">
                    Angebot ist live auf deiner Website und die PDF schicke ich dir gleich mit!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">
              Deine Website. Immer aktuell.
              <br />
              <span className="text-gray-500">Per WhatsApp-Nachricht.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1: Website */}
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-8 hover:border-violet-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-6 group-hover:bg-violet-500/20 transition-colors">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Website erstellen & verwalten</h3>
              <p className="text-gray-400 leading-relaxed">
                Luna baut deine professionelle Website. Öffnungszeiten ändern, neues Bild hochladen,
                Text anpassen — einfach per WhatsApp schreiben.
              </p>
            </div>

            {/* Feature 2: Angebote */}
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-8 hover:border-blue-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Angebote auf deiner Website</h3>
              <p className="text-gray-400 leading-relaxed">
                &quot;20% auf alle Rosen diese Woche&quot; —
                Luna schreibt den Text, veröffentlicht das Angebot auf deiner Website und hält alles aktuell.
              </p>
            </div>

            {/* Feature 3: PDF */}
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">PDF generieren</h3>
              <p className="text-gray-400 leading-relaxed">
                Angebotsflyer, Preislisten, Aktionen — Luna erstellt professionelle PDFs
                die du direkt an Kunden verschicken kannst.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">
              3 Schritte. Fertig.
            </h2>
            <p className="text-gray-400 mt-4 text-lg">Kein technisches Wissen nötig.</p>
          </div>

          <div className="space-y-12">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Trag dich ein</h3>
                <p className="text-gray-400 leading-relaxed">
                  Name und Handynummer — mehr braucht Luna nicht.
                  Du bekommst sofort eine WhatsApp-Nachricht von Luna.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Erzähl Luna von deinem Geschäft</h3>
                <p className="text-gray-400 leading-relaxed">
                  Luna fragt per WhatsApp nach deinem Geschäftsnamen, Angeboten,
                  Öffnungszeiten und Kontaktdaten. Du antwortest einfach per Chat.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Deine Website ist live</h3>
                <p className="text-gray-400 leading-relaxed">
                  In wenigen Minuten steht deine professionelle Website.
                  Änderungen? Schreib Luna einfach eine Nachricht.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gray-500 text-sm uppercase tracking-wider font-semibold">Für jede Branche</p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-gray-500">
            <span className="text-lg">Autohäuser</span>
            <span className="text-white/10">|</span>
            <span className="text-lg">Restaurants</span>
            <span className="text-white/10">|</span>
            <span className="text-lg">Frisöre</span>
            <span className="text-white/10">|</span>
            <span className="text-lg">Handwerker</span>
            <span className="text-white/10">|</span>
            <span className="text-lg">Ärzte</span>
            <span className="text-white/10">|</span>
            <span className="text-lg">Einzelhandel</span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ein Preis. Alles drin.
            </h2>
            <p className="text-gray-400 mt-4 text-lg">Keine versteckten Kosten. Jederzeit kündbar.</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-[#111118] border border-violet-500/20 rounded-2xl p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-blue-600" />

              <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold mb-4">Monatlich</p>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold">99</span>
                <span className="text-2xl text-gray-400">€</span>
              </div>
              <p className="text-gray-500 mb-8">pro Monat, zzgl. MwSt.</p>

              <ul className="text-left space-y-4 mb-10">
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Professionelle Website inkl. Hosting
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unbegrenzte Änderungen per WhatsApp
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Angebote & Aktionen auf deiner Website
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  PDF-Flyer & Preislisten
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Eigene Domain möglich
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  SSL & DSGVO-konform
                </li>
              </ul>

              <a
                href="#start"
                className="block w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold py-4 rounded-full text-lg transition-all hover:shadow-lg hover:shadow-violet-500/25"
              >
                14 Tage kostenlos testen
              </a>
              <p className="text-gray-500 text-sm mt-4">Keine Kreditkarte nötig</p>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Form CTA */}
      <section id="start" className="py-20 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-lg mx-auto relative">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Jetzt loslegen.
            </h2>
            <p className="text-gray-400 text-lg">
              Trag dich ein und Luna meldet sich sofort bei dir auf WhatsApp.
            </p>
          </div>

          {formState === 'success' ? (
            <div className="bg-[#111118] border border-green-500/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Geschafft!</h3>
              <p className="text-gray-400">
                Luna meldet sich gleich bei dir auf WhatsApp. Schau auf dein Handy!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-[#111118] border border-white/10 rounded-2xl p-8">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">
                    Dein Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Max Mustermann"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                    Handynummer (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0170 1234567"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-colors"
                  />
                </div>

                {formState === 'error' && (
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={formState === 'loading'}
                  className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full text-lg transition-all hover:shadow-lg hover:shadow-violet-500/25 flex items-center justify-center gap-3"
                >
                  {formState === 'loading' ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Luna auf WhatsApp starten
                    </>
                  )}
                </button>
              </div>

              <p className="text-gray-600 text-xs text-center mt-4">
                Mit dem Absenden stimmst du unseren <a href="#" className="text-gray-500 underline">AGB</a> und <a href="#" className="text-gray-500 underline">Datenschutzbestimmungen</a> zu.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center font-bold text-xs">
              L
            </div>
            <span className="font-semibold">Luna</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">Impressum</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Datenschutz</a>
            <a href="#" className="hover:text-gray-300 transition-colors">AGB</a>
          </div>

          <p className="text-gray-600 text-sm">
            &copy; 2026 Luna. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  )
}
