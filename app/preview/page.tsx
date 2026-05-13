import Link from 'next/link'
import Image from 'next/image'
import { Schibsted_Grotesk, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import { BookingModal } from '@/components/booking-modal'
import { WebsiteChat } from '@/components/website-chat'
import { AccountMenu } from '@/components/account-menu'
import { AuthReturnGuard } from '@/components/auth-return-guard'

const sans = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans-preview',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-preview',
})

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic', 'normal'],
  variable: '--font-serif-preview',
})

const CAL_BOOKING_URL = 'https://cal.com/romy.ai'

const STEPS = [
  {
    n: '01',
    title: 'Du schreibst',
    text: 'Erzähl Romy kurz, was du anbietest, was wichtig ist und wie dein Auftritt wirken soll. Kein Formular, keine Menüs, kein technisches Setup.',
  },
  {
    n: '02',
    title: 'Romy baut',
    text: 'Romy erstellt daraus eine klare Website mit den richtigen Inhalten: Angebot, Bilder, Kontakt, Öffnungszeiten und allem, was dein Geschäft online braucht.',
  },
  {
    n: '03',
    title: 'Bilder dazu',
    text: 'Eigene Fotos? Schick sie Romy im Chat. Keine eigenen? Sie generiert dir welche oder frischt deine bestehenden auf, ganz nebenbei.',
  },
  {
    n: '04',
    title: 'Du bleibst aktuell',
    text: 'Neue Öffnungszeiten, neues Angebot, anderes Bild oder ein frischer Text? Schreib Romy eine Nachricht und deine Website wird weiter gepflegt.',
  },
]

export default function PreviewHome() {
  return (
    <main
      className={`${sans.variable} ${mono.variable} ${serif.variable} min-h-screen bg-[#fafaf9] text-[#0a0a0a]`}
      style={{ fontFamily: 'var(--font-sans-preview), system-ui, sans-serif' }}
    >
      <AuthReturnGuard />

      {/* Preview-Banner */}
      <div
        className="border-b border-black/10 bg-black text-white"
        style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-[11px] uppercase tracking-[0.2em]">
          <span className="text-white/70">Preview · Redesign-Entwurf · nicht live</span>
          <Link href="/" className="text-white/70 transition hover:text-white">
            ← zurück zur Live-Seite
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-black/[0.08]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/preview" className="flex items-center gap-3">
            <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-black/10">
              <Image src="/romy-avatar.png" alt="Romy" width={120} height={120} className="h-full w-full object-cover" priority />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Romy<span className="text-black/40">.ai</span>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-9 text-[13px] font-medium text-black/65 md:flex"
            style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
          >
            <a href="#how" className="uppercase tracking-[0.15em] transition hover:text-black">
              Funktion
            </a>
            <a href="#chat" className="uppercase tracking-[0.15em] transition hover:text-black">
              Chat
            </a>
            <AccountMenu variant="light" />
          </nav>
          <div className="md:hidden">
            <AccountMenu variant="light" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-black/[0.08]">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-20 sm:pt-28 lg:pt-32">
          {/* Eyebrow row */}
          <div
            className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-black/55"
            style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
          >
            <span>Index / 001</span>
            <span className="hidden sm:inline-flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-[#21e66b] opacity-60 [animation:ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-[#21e66b]" />
              </span>
              Online · Berlin
            </span>
          </div>

          {/* Headline */}
          <h1 className="mt-10 max-w-5xl text-balance text-[3.5rem] font-semibold leading-[0.94] tracking-[-0.04em] text-[#0a0a0a] sm:text-[5rem] md:text-[6.5rem] lg:text-[7.5rem]">
            Deine Website.
            <br />
            <span
              className="font-normal italic text-black/70"
              style={{ fontFamily: 'var(--font-serif-preview), serif' }}
            >
              Per Chat.
            </span>
          </h1>

          {/* Subheadline + CTAs in 2-col row */}
          <div className="mt-14 grid gap-10 border-t border-black/[0.08] pt-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
            <p className="max-w-xl text-balance text-[17px] leading-relaxed text-black/65 sm:text-[19px]">
              Romy übernimmt Konzept, Aufbau und Updates deiner Website. Schreib ihr eine Nachricht — den Rest macht sie.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#chat"
                className="group inline-flex items-center justify-between gap-6 rounded-md bg-[#0a0a0a] px-6 py-4 text-[14px] font-semibold text-white transition hover:bg-[#0a0a0a]/90"
              >
                <span>Jetzt kostenlos testen</span>
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </a>
              <BookingModal
                url={CAL_BOOKING_URL}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-black/15 bg-transparent px-6 py-4 text-[14px] font-semibold text-[#0a0a0a] transition hover:border-black/40 hover:bg-black/[0.03]"
              >
                Beratung buchen
              </BookingModal>
            </div>
          </div>

          {/* Spec row */}
          <dl
            className="mt-16 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-black/[0.08] pt-10 md:grid-cols-4"
            style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
          >
            {[
              ['Chat-basiert', 'kein Tech-Setup'],
              ['Live in', 'Minuten'],
              ['Hosting', 'Deutschland'],
              ['DSGVO', 'konform'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-black/45">{label}</dt>
                <dd
                  className="mt-2 text-[15px] font-medium text-[#0a0a0a]"
                  style={{ fontFamily: 'var(--font-sans-preview), system-ui, sans-serif' }}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Product showcase — refined chat mockup */}
      <section className="border-b border-black/[0.08] bg-[#f5f4f1]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div
            className="mb-12 flex items-end justify-between text-[11px] uppercase tracking-[0.22em] text-black/55"
            style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
          >
            <span>Index / 002 — Demo</span>
            <span className="hidden sm:inline">So sieht ein Chat aus</span>
          </div>

          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            {/* Chat side */}
            <div className="space-y-3">
              <div className="ml-auto max-w-[88%] rounded-md rounded-tr-sm bg-[#0a0a0a] px-5 py-3 text-[14px] leading-snug text-white">
                Hi Romy, ich brauche eine Seite für mein Café Mira in München.
              </div>
              <div className="mr-auto max-w-[88%] rounded-md rounded-tl-sm border border-black/[0.08] bg-white px-5 py-3 text-[14px] leading-snug text-[#0a0a0a]">
                Klar. Erzähl mir noch kurz: was macht euer Café besonders, und welche Stimmung soll die Seite haben?
              </div>
              <div className="ml-auto max-w-[88%] rounded-md rounded-tr-sm bg-[#0a0a0a] px-5 py-3 text-[14px] leading-snug text-white">
                Specialty Coffee, hand-geröstet. Modern, viel Holz, warm. Adresse: Sonnenstraße 14.
              </div>
              <div className="mr-auto max-w-[88%] rounded-md rounded-tl-sm border border-black/[0.08] bg-white px-5 py-3 text-[14px] leading-snug text-[#0a0a0a]">
                Verstanden — hier ist mein erster Vorschlag:
              </div>
            </div>

            {/* Site preview side */}
            <div className="self-start">
              <div className="overflow-hidden rounded-md border border-black/[0.12] bg-white">
                <div
                  className="flex items-center gap-1.5 border-b border-black/[0.08] bg-[#fafaf9] px-3 py-2"
                  style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
                >
                  <span className="h-2 w-2 rounded-full bg-black/15" />
                  <span className="h-2 w-2 rounded-full bg-black/15" />
                  <span className="h-2 w-2 rounded-full bg-black/15" />
                  <span className="ml-3 truncate text-[10px] tracking-wider text-black/45">
                    cafemira.halloromy.com
                  </span>
                </div>
                <Image
                  src="/cafe-site.png"
                  alt="Vorschau der von Romy gebauten Café-Website"
                  width={1200}
                  height={1600}
                  className="h-72 w-full object-cover object-top md:h-96"
                />
                <div
                  className="flex items-center justify-between border-t border-black/[0.08] px-4 py-2.5 text-[11px] uppercase tracking-[0.2em]"
                  style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
                >
                  <span className="inline-flex items-center gap-2 text-black/55">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 rounded-full bg-[#21e66b] opacity-60 [animation:ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-[#21e66b]" />
                    </span>
                    Veröffentlicht
                  </span>
                  <span className="text-black/45">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Echter Chat */}
      <section id="chat" className="border-b border-black/[0.08] bg-[#fafaf9]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div
            className="mb-12 flex items-end justify-between text-[11px] uppercase tracking-[0.22em] text-black/55"
            style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
          >
            <span>Index / 003 — Chat</span>
            <span className="hidden sm:inline">Jetzt selbst probieren</span>
          </div>
          <WebsiteChat />
        </div>
      </section>

      {/* So funktioniert's */}
      <section id="how" className="border-b border-black/[0.08]">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <div
            className="mb-16 flex items-end justify-between text-[11px] uppercase tracking-[0.22em] text-black/55"
            style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
          >
            <span>Index / 004 — Ablauf</span>
            <span className="hidden sm:inline">Vier Schritte</span>
          </div>

          <h2 className="mb-20 max-w-3xl text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[3.5rem] md:text-[4rem]">
            Schreiben statt klicken.
          </h2>

          <div>
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`grid grid-cols-[auto_1fr] gap-8 border-t border-black/[0.08] py-10 lg:grid-cols-[80px_220px_1fr] lg:gap-16 lg:py-14 ${
                  i === STEPS.length - 1 ? 'border-b' : ''
                }`}
              >
                <div
                  className="text-[28px] font-medium tracking-tight text-black/35 lg:text-[34px]"
                  style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
                >
                  {s.n}
                </div>
                <h3 className="text-[20px] font-semibold tracking-tight text-[#0a0a0a] lg:text-[24px]">
                  {s.title}
                </h3>
                <p className="col-span-2 max-w-2xl text-[15px] leading-relaxed text-black/65 lg:col-span-1 lg:text-[17px]">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark manifesto */}
      <section className="bg-[#0a0a0a] text-white">
        <div className="mx-auto max-w-7xl px-6 py-28 lg:py-40">
          <div
            className="mb-12 flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-white/40"
            style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
          >
            <span className="h-px w-10 bg-white/20" />
            <span>Manifest</span>
          </div>

          <p className="max-w-4xl text-balance text-[2rem] font-medium leading-[1.15] tracking-[-0.02em] text-white sm:text-[2.75rem] md:text-[3.5rem]">
            Keine Tools, keine Templates, keine Briefings. Du erzählst Romy was du machst —
            <span
              className="font-normal italic text-white/70"
              style={{ fontFamily: 'var(--font-serif-preview), serif' }}
            >
              {' '}sie baut deine Seite.
            </span>{' '}
            Willst du später was ändern, schreibst du ihr eine Nachricht. So einfach wie eine WhatsApp.
          </p>

          <div className="mt-16 flex flex-col gap-4 border-t border-white/[0.08] pt-10 sm:flex-row sm:items-center sm:justify-between">
            <span
              className="text-[11px] uppercase tracking-[0.22em] text-white/40"
              style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
            >
              Bereit?
            </span>
            <a
              href="#chat"
              className="group inline-flex items-center justify-between gap-8 rounded-md bg-white px-6 py-4 text-[14px] font-semibold text-[#0a0a0a] transition hover:bg-white/90"
            >
              <span>Jetzt kostenlos testen</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] text-white">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16">
          <div className="grid gap-10 border-t border-white/[0.08] pt-10 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/15">
                  <Image src="/romy-avatar.png" alt="Romy" width={80} height={80} className="h-full w-full object-cover" />
                </span>
                <span className="text-[14px] font-semibold tracking-tight">
                  Romy<span className="text-white/40">.ai</span>
                </span>
              </div>
              <p
                className="mt-6 text-[11px] uppercase tracking-[0.22em] text-white/40"
                style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
              >
                Berlin
              </p>
            </div>
            <nav
              className="flex flex-wrap gap-x-8 gap-y-3 text-[12px] uppercase tracking-[0.18em] text-white/55"
              style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
            >
              <a href="#chat" className="transition hover:text-white">
                Chat
              </a>
              <a href="mailto:halloromy.ai@gmail.com" className="transition hover:text-white">
                Support
              </a>
              <Link href="/datenschutz" className="transition hover:text-white">
                Datenschutz
              </Link>
              <Link href="/agb" className="transition hover:text-white">
                AGB
              </Link>
            </nav>
          </div>
          <p
            className="mt-16 max-w-3xl text-[11px] leading-relaxed text-white/35"
            style={{ fontFamily: 'var(--font-mono-preview), monospace' }}
          >
            © {new Date().getFullYear()} Romy AI · Einzelunternehmen nach § 19 UStG
            (Kleinunternehmerregelung, keine Umsatzsteuer ausgewiesen).
          </p>
        </div>
      </footer>
    </main>
  )
}
