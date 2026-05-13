import Link from 'next/link'
import Image from 'next/image'
import { BookingModal } from '@/components/booking-modal'
import { WebsiteChat } from '@/components/website-chat'
import { AccountMenu } from '@/components/account-menu'
import { AuthReturnGuard } from '@/components/auth-return-guard'

const CAL_BOOKING_URL = 'https://cal.com/romy.ai'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#1a1714]">
      <AuthReturnGuard />
      {/* Nav */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-black/8 bg-white/65 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] backdrop-blur-xl">
              <Image
                src="/romy-avatar.png"
                alt="Romy"
                width={580}
                height={580}
                className="h-full w-full object-cover"
                priority
              />
            </span>
            <div className="text-lg font-semibold tracking-tight text-[#1a1714]">Romy<span className="text-[#1a1714]/45">.ai</span></div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#1a1714]/70 md:flex">
            <a href="#how" className="transition hover:text-[#1a1714]">Wie funktioniert's</a>
            <a href="#chat" className="transition hover:text-[#1a1714]">Chat</a>
            <a href="#presence" className="transition hover:text-[#1a1714]">Online-Präsenz</a>
            <AccountMenu variant="light" />
          </nav>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <AccountMenu variant="light" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-16 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-16 lg:pb-24">
          <div className="text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1a1714]/55 sm:text-[13px]">
              Deine persönliche Website-Assistentin
            </p>

            <h1 className="mt-6 text-balance text-5xl font-bold leading-[0.98] tracking-[-0.035em] text-[#1a1714] sm:text-6xl md:text-[5rem]">
              Deine Website.
              <br />
              <span className="bg-gradient-to-br from-[#1a3a22] via-[#1ad063] to-[#21e66b] bg-clip-text text-transparent">
                Per Chat.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-xl text-balance text-base leading-relaxed text-[#1a1714]/65 sm:text-lg lg:mx-0">
              Romy übernimmt Konzept, Aufbau und Updates deiner Website. Schreib ihr eine Nachricht, den Rest macht sie.
            </p>

            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:gap-5 lg:items-start lg:justify-start">
              <a
                href="#chat"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1a1714] px-8 py-4 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(26,23,20,0.35)] transition hover:bg-[#2a2522]"
              >
                Jetzt kostenlos testen
                <span aria-hidden>→</span>
              </a>
              <BookingModal
                url={CAL_BOOKING_URL}
                className="inline-flex items-center gap-2 rounded-xl border border-[#1a1714]/15 bg-white px-7 py-4 text-base font-semibold text-[#1a1714] shadow-sm transition hover:border-[#1a1714]/30 hover:bg-[#1a1714]/[0.04]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Beratung buchen
              </BookingModal>
            </div>

            <ul className="mt-10 grid gap-5 text-left sm:grid-cols-2 lg:max-w-xl">
              {[
                { label: 'Updates per Chat', text: 'Änderungen sofort live, kein Tech-Setup' },
                { label: 'Texte & Design', text: 'schreibt deine Inhalte, wählt ein passendes Layout' },
                { label: 'Bilder', text: 'hochladen, generieren oder bestehende auffrischen lassen' },
                { label: 'Live in Minuten', text: 'eigene Domain möglich, Hosting in Deutschland (DSGVO)' },
              ].map((item) => (
                <li key={item.label} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#21e66b]" />
                  <div>
                    <p className="text-sm font-semibold text-[#1a1714]">{item.label}</p>
                    <p className="mt-0.5 text-sm leading-snug text-[#1a1714]/60">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-7 text-xs text-[#1a1714]/45 lg:text-left">
              Made with care in Berlin · DSGVO-konform · Hosting in Deutschland
            </p>
          </div>

          <div
            className="relative overflow-hidden rounded-[2rem] border border-white/10 p-7 shadow-[0_40px_80px_-30px_rgba(15,30,45,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] sm:p-8"
            style={{
              background:
                'radial-gradient(ellipse 100% 60% at 12% 0%, rgba(45,108,108,0.85), transparent 60%), radial-gradient(ellipse 90% 70% at 90% 100%, rgba(80,40,130,0.9), transparent 65%), linear-gradient(155deg, #0e2828 0%, #161a36 50%, #2a1650 100%)',
            }}
          >
            <div className="flex items-center gap-4">
              <span
                className="relative inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] backdrop-blur-xl"
                aria-hidden
              >
                <Image
                  src="/romy-avatar.png"
                  alt="Romy"
                  width={580}
                  height={580}
                  className="h-full w-full object-cover"
                />
              </span>
              <div>
                <p className="text-base font-semibold leading-tight text-white">Romy</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-[#21e66b] opacity-60 [animation:ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <span className="relative h-2 w-2 rounded-full bg-[#21e66b]" />
                  </span>
                  Online · antwortet in Sekunden
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-2.5">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-white/95 px-4 py-2.5 text-sm leading-snug text-[#1a1714] shadow-sm">
                Hi Romy, ich brauche eine Seite für mein Café Mira in München.
              </div>
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-md border border-[#21e66b]/30 bg-[#21e66b]/[0.16] px-4 py-2.5 text-sm leading-snug text-white shadow-[0_2px_12px_-4px_rgba(33,230,107,0.25)] backdrop-blur-sm">
                Klar. Erzähl mir noch kurz: was macht euer Café besonders, und welche Stimmung soll die Seite haben?
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-white/95 px-4 py-2.5 text-sm leading-snug text-[#1a1714] shadow-sm">
                Specialty Coffee, hand-geröstet. Modern, viel Holz, warm. Adresse: Sonnenstraße 14.
              </div>
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-md border border-[#21e66b]/30 bg-[#21e66b]/[0.16] px-4 py-2.5 text-sm leading-snug text-white shadow-[0_2px_12px_-4px_rgba(33,230,107,0.25)] backdrop-blur-sm">
                Verstanden, hier ist mein erster Vorschlag:
              </div>
              <div className="mr-auto w-[85%] overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="ml-2 truncate text-[10px] text-white/45">cafemira.halloromy.com</span>
                </div>
                <Image
                  src="/cafe-site.png"
                  alt="Vorschau der von Romy gebauten Café-Website"
                  width={800}
                  height={1200}
                  className="h-44 w-full object-cover object-top"
                />
                <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-[11px] text-white/70">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 rounded-full bg-[#21e66b] opacity-60 [animation:ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-[#21e66b]" />
                    </span>
                    Veröffentlicht
                  </span>
                  <span className="rounded-full bg-[#21e66b]/20 px-2 py-0.5 text-[10px] font-medium text-[#21e66b]">Live</span>
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur-sm">
              <a
                href="#chat"
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#21e66b] px-5 py-3.5 text-sm font-semibold text-[#07120c] shadow-[0_10px_28px_-8px_rgba(33,230,107,0.5)] transition hover:bg-[#1ad063]"
              >
                <span>Jetzt mit Romy chatten</span>
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <WebsiteChat />

      <section id="how" className="mx-auto max-w-5xl px-6 py-20 text-[#1a1714]">
        <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight">So funktioniert's</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: '1',
              title: 'Du schreibst',
              text: 'Erzähl Romy kurz, was du anbietest, was wichtig ist und wie dein Auftritt wirken soll. Kein Formular, keine Menüs, kein technisches Setup.',
            },
            {
              n: '2',
              title: 'Romy baut',
              text: 'Romy erstellt daraus eine klare Website mit den richtigen Inhalten: Angebot, Bilder, Kontakt, Öffnungszeiten und allem, was dein Geschäft online braucht.',
            },
            {
              n: '3',
              title: 'Bilder dazu',
              text: 'Du hast eigene Fotos? Schick sie Romy direkt im Chat. Keine eigenen? Sie generiert dir welche oder frischt deine bestehenden auf, ganz nebenbei.',
            },
            {
              n: '4',
              title: 'Du bleibst aktuell',
              text: 'Neue Öffnungszeiten, neues Angebot, anderes Bild oder ein frischer Text? Schreib Romy eine Nachricht und deine Website wird weiter gepflegt.',
            },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-black/[0.06] bg-white p-7 shadow-[0_2px_8px_-4px_rgba(26,23,20,0.06),0_12px_32px_-18px_rgba(26,23,20,0.12)]">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1714] text-sm font-bold text-[#f5efe2]">{s.n}</div>
              <h3 className="mb-2 text-lg font-semibold text-[#1a1714]">{s.title}</h3>
              <p className="text-sm leading-relaxed text-[#1a1714]/60">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="presence" className="mx-auto max-w-3xl px-6 py-20 text-center text-[#1a1714]">
        <h2 className="mb-6 text-3xl font-semibold tracking-tight">Schreiben statt klicken.</h2>
        <p className="mb-10 text-lg text-[#1a1714]/65">
          Keine Tools, keine Templates, keine Briefings. Du erzählst Romy was du machst, sie baut deine Seite. Willst du später was ändern, schreibst du ihr eine Nachricht. So einfach wie eine WhatsApp.
        </p>
        <a
          href="#chat"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a1714] px-7 py-3 text-base font-bold text-[#f5efe2] transition hover:bg-[#2a2522]"
        >
          Jetzt kostenlos testen
        </a>
      </section>

      <footer className="mt-20 bg-[#1a1714] text-[#f5efe2]">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-sm font-semibold">Romy AI</div>
              <p className="mt-1 text-xs text-[#f5efe2]/55">
                Betrieben von Zoe Christiansen · Berlin
              </p>
            </div>
            <nav className="flex flex-wrap gap-5 text-xs text-[#f5efe2]/55">
              <a href="#chat" className="hover:text-[#f5efe2]">Chat</a>
              <Link href="/impressum" className="hover:text-[#f5efe2]">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-[#f5efe2]">Datenschutz</Link>
              <Link href="/agb" className="hover:text-[#f5efe2]">Nutzungsbedingungen</Link>
            </nav>
          </div>
          <p className="mt-8 text-[11px] leading-relaxed text-[#f5efe2]/35">
            © {new Date().getFullYear()} Romy AI. Alle Rechte vorbehalten. Romy AI ist ein Einzelunternehmen nach § 19 UStG (Kleinunternehmerregelung, keine Umsatzsteuer ausgewiesen).
          </p>
        </div>
      </footer>
    </main>
  )
}
