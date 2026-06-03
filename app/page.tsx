import Link from 'next/link'
import Image from 'next/image'
import { BookingModal } from '@/components/booking-modal'
import { AccountMenu } from '@/components/account-menu'

const WHATSAPP_URL =
  'https://wa.me/4915229227823?text=Hallo%20Luna!%20Ich%20bin%20selbstst%C3%A4ndig%20und%20brauche%20eine%20Website%20f%C3%BCr%20mein%20Unternehmen.'
const CAL_BOOKING_URL = 'https://cal.com/luna.ai/15min'

const featureCards = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Deine Website entsteht im Chat',
    body: 'Du schreibst, gibst Feedback und entscheidest mit. So entsteht Schritt für Schritt dein Design.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    title: 'Änderungen? Einfach schreiben.',
    body: 'Neue Preise, neue Fotos oder andere Texte? Eine WhatsApp genügt.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
    title: 'Professionelle Bilder inklusive',
    body: 'Luna erstellt oder verbessert Bilder, damit dein Business hochwertig aussieht.',
  },
]

const industries = [
  {
    label: 'Autohaus & KFZ',
    description:
      'Fahrzeugbestand, Sonderangebote und Öffnungszeiten. Alles per Chat aktuell halten. Keine Agentur, keine Wartezeit.',
    tag: 'Spezialisiert',
  },
  {
    label: 'Café & Restaurant',
    description:
      'Warme Bildwelt, Speisekarte und Öffnungszeiten. Einladend und ohne Baukasten.',
    tag: null,
  },
  {
    label: 'Friseur & Beauty',
    description:
      'Editorialer Look, Leistungsübersicht und Terminanfrage. Hochwertig und schnell.',
    tag: null,
  },
  {
    label: 'Handwerk & Service',
    description:
      'Vertrauen, Kontaktformular und lokale Sichtbarkeit. Fertig in wenigen Minuten.',
    tag: null,
  },
  {
    label: 'Yoga & Wellness',
    description:
      'Ruhige Atmosphäre, Kursübersicht und Terminanfrage. Hochwertig, klar und einladend.',
    tag: null,
  },
  {
    label: 'Praxis & Therapie',
    description:
      'Seriöser Auftritt, Leistungen und Terminanfrage. Ruhig, klar und mobil.',
    tag: null,
  },
]

const plans = [
  {
    label: 'Gratis',
    sub: 'Ohne Kreditkarte',
    price: null,
    rows: [
      'Erster Entwurf in Minuten',
      'Individuell, kein Template',
      'Subdomain von halloluna.net',
    ],
    highlight: false,
    cta: 'Jetzt testen',
  },
  {
    label: 'Pro',
    sub: '€35 pro Monat',
    price: '€35',
    rows: [
      'Unbegrenzte Design-Änderungen',
      'Custom Domain möglich',
      'Monatlich kündbar',
    ],
    highlight: true,
    cta: 'Pro starten',
  },
]

const examples = [
  {
    title: 'Autohaus & KFZ',
    url: 'autohaus-mayer.halloluna.net',
    image: '/template-images/autohaus-kfz.jpg',
    tag: 'Autohaus',
  },
  {
    title: 'Restaurant & Fine Dining',
    url: 'restaurant-noir.halloluna.net',
    image: '/template-images/restaurant-fine.jpg',
    tag: 'Gastronomie',
  },
  {
    title: 'Blumen & Floristik',
    url: 'blumen-eden.halloluna.net',
    image: '/showroom/nachher-blumen.png',
    tag: 'Floristik',
  },
]

const steps = [
  ['1', 'Schreib Luna kurz, was dein Geschäft macht.'],
  ['2', 'Dein erster Entwurf ist sofort sichtbar.'],
  ['3', 'Texte, Bilder und Design feinerst du danach per Chat.'],
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden text-[#0b0b13]" style={{ background: '#f1f2f9' }}>

      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute rounded-full" style={{
          width: 960, height: 780, top: '-22%', left: '-12%',
          background: 'radial-gradient(ellipse, rgba(145,175,255,0.50) 0%, rgba(190,160,255,0.24) 45%, transparent 72%)',
          filter: 'blur(80px)',
        }} />
        <div className="absolute rounded-full" style={{
          width: 680, height: 620, top: '8%', right: '-10%',
          background: 'radial-gradient(ellipse, rgba(115,210,195,0.24) 0%, rgba(135,175,255,0.16) 50%, transparent 72%)',
          filter: 'blur(88px)',
        }} />
        <div className="absolute rounded-full" style={{
          width: 560, height: 520, bottom: '-5%', left: '36%',
          background: 'radial-gradient(ellipse, rgba(200,185,255,0.30) 0%, transparent 68%)',
          filter: 'blur(92px)',
        }} />
      </div>

      {/* Nav */}
      <header className="relative z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-5 sm:px-10">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-[0_4px_14px_rgba(91,142,248,0.22)]">
              <Image
                src="/romy-assistant.png"
                alt="Luna"
                width={120}
                height={120}
                className="h-full w-full object-cover"
                priority
              />
            </span>
            <span className="text-[17px] font-black tracking-[-0.04em]" style={{ fontFamily: 'var(--font-display)' }}>
              Luna<span style={{ color: '#5b8ef8' }}>.ai</span>
            </span>
          </div>

          <nav className="hidden items-center gap-7 text-[13px] font-medium text-[#0b0b13]/45 md:flex">
            <a href="#branchen" className="transition hover:text-[#0b0b13]">Branchen</a>
            <a href="#examples" className="transition hover:text-[#0b0b13]">Beispiele</a>
            <a href="#vergleich" className="transition hover:text-[#0b0b13]">Preise</a>
            <AccountMenu variant="light" />
          </nav>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-[#0b0b13] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_8px_24px_-8px_rgba(11,11,19,0.40)] transition hover:bg-[#1e1e2e] sm:inline-flex"
          >
            Kostenlos testen
          </a>
          <div className="md:hidden">
            <AccountMenu variant="light" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pb-10 pt-20 sm:px-10 sm:pt-24">
        <div className="mx-auto max-w-[780px] text-center">
          <p className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/62 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-[#0b0b13]/45 shadow-sm backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'linear-gradient(135deg,#5b8ef8,#8b6af5)' }} />
            Website-Assistentin für lokale Geschäfte
          </p>

          <h1
            className="mb-6 text-balance text-[clamp(46px,7vw,74px)] font-black leading-[0.97] tracking-[-0.065em] text-[#0b0b13]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Deine individuelle Website.{' '}
            <br className="hidden sm:block" />
            <span style={{
              background: 'linear-gradient(130deg,#5b8ef8 0%,#8b6af5 50%,#b05cf0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Per WhatsApp. Fertig in Minuten.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-[500px] text-balance text-[17px] leading-[1.75] text-[#0b0b13]/44">
            Luna baut aus wenigen Nachrichten eine fertige Website. Mit echten Texten, passenden Bildern und individuellem Design. Du änderst alles jederzeit per Chat.
          </p>

          <div className="mb-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-[#0b0b13] px-8 py-4 text-[15px] font-black text-white shadow-[0_10px_28px_-8px_rgba(11,11,19,0.40)] transition hover:bg-[#1e1e2e]"
            >
              <svg className="mr-2 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.345.223-.643.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.149-.172.198-.296.298-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              Website für mein Geschäft erstellen
            </a>
            <BookingModal
              url={CAL_BOOKING_URL}
              className="inline-flex items-center justify-center rounded-full border border-[#0b0b13]/12 bg-white/50 px-7 py-4 text-[15px] font-semibold text-[#0b0b13]/55 backdrop-blur-sm transition hover:border-[#0b0b13]/22 hover:text-[#0b0b13]"
            >
              Beratung buchen
            </BookingModal>
          </div>

          <p className="text-[12px] font-medium text-[#0b0b13]/30">
            Für Selbstständige und lokale Unternehmen. Kostenlos starten.
          </p>
        </div>
      </section>

      {/* Glass Feature Cards */}
      <section className="px-5 pb-16 pt-14 sm:px-10">
        <div className="mx-auto grid max-w-[1120px] gap-3.5 sm:grid-cols-3">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="rounded-[22px] border border-white/[0.88] p-7"
              style={{
                background: 'rgba(255,255,255,0.46)',
                backdropFilter: 'blur(22px) saturate(1.5)',
                WebkitBackdropFilter: 'blur(22px) saturate(1.5)',
                boxShadow: '0 20px 50px -18px rgba(80,80,200,0.10), 0 4px 14px rgba(11,11,19,0.05), inset 0 1px 0 rgba(255,255,255,0.96)',
              }}
            >
              <div
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[11px] text-[#5b8ef8]"
                style={{
                  background: 'linear-gradient(135deg,rgba(91,142,248,0.13),rgba(139,106,245,0.10))',
                  border: '1px solid rgba(91,142,248,0.16)',
                }}
              >
                {card.icon}
              </div>
              <h3 className="mb-2.5 text-[17px] font-black leading-snug tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {card.title}
              </h3>
              <p className="text-[13px] leading-[1.7] text-[#0b0b13]/44">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Branchen */}
      <section id="branchen" className="bg-white px-5 py-24 sm:px-10 lg:py-32">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#8b6af5]">Branchen</p>
            <h2 className="text-[clamp(34px,4.5vw,52px)] font-black leading-[0.97] tracking-[-0.055em]" style={{ fontFamily: 'var(--font-display)' }}>
              Für jede Branche. Sofort loslegen.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.7] text-[#0b0b13]/44">
              Luna kennt deine Branche und baut passend dazu. Kein generisches Template, sondern eine Seite, die wirklich zu deinem Geschäft passt.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((ind) => (
              <a
                key={ind.label}
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-[20px] border border-[#0b0b13]/07 bg-[#f7f8fd] p-6 transition hover:border-[#8b6af5]/25 hover:bg-[#f3f0ff]"
              >
                {ind.tag ? (
                  <span
                    className="mb-3 inline-block rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white"
                    style={{ background: 'linear-gradient(135deg,#5b8ef8,#8b6af5)' }}
                  >
                    {ind.tag}
                  </span>
                ) : (
                  <div className="mb-3 h-[22px]" />
                )}
                <h3 className="mb-2 text-[17px] font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  {ind.label}
                </h3>
                <p className="text-[13px] leading-[1.65] text-[#0b0b13]/44">{ind.description}</p>
                <p className="mt-4 text-[13px] font-black text-[#8b6af5] opacity-0 transition group-hover:opacity-100">
                  Jetzt starten
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Preise */}
      <section id="vergleich" className="bg-[#0b0b13] px-5 py-24 sm:px-10 lg:py-32">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#8b6af5]">Preise</p>
            <h2 className="text-[clamp(34px,4.5vw,52px)] font-black leading-[0.97] tracking-[-0.055em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Einfach. Transparent.{' '}
              <br className="hidden sm:block" />
              Ohne Überraschungen.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.7] text-white/44">
              Starte kostenlos und wechsle ins Pro-Abo, wenn deine Website live gehen soll.
            </p>
          </div>

          <div className="mx-auto grid max-w-[780px] gap-3.5 sm:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.label}
                className={`rounded-[22px] p-8 ${plan.highlight ? '' : 'border border-white/[0.08] bg-white/[0.04]'}`}
                style={plan.highlight ? { background: 'linear-gradient(135deg,#e8f0fe 0%,#ede8ff 100%)' } : {}}
              >
                <div className="mb-6">
                  <p className={`text-[22px] font-black tracking-tight ${plan.highlight ? 'text-[#0b0b13]' : 'text-white'}`} style={{ fontFamily: 'var(--font-display)' }}>
                    {plan.label}
                  </p>
                  <p className={`mt-1 text-[13px] font-medium ${plan.highlight ? 'text-[#0b0b13]/50' : 'text-white/30'}`}>
                    {plan.sub}
                  </p>
                  {plan.price && (
                    <div className="mt-4 flex items-end gap-1.5">
                      <span className={`text-[42px] font-black leading-none tracking-[-0.04em] ${plan.highlight ? 'text-[#0b0b13]' : 'text-white'}`} style={{ fontFamily: 'var(--font-display)' }}>
                        {plan.price}
                      </span>
                      <span className={`mb-1.5 text-[14px] font-medium ${plan.highlight ? 'text-[#0b0b13]/50' : 'text-white/40'}`}>
                        / Monat
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {plan.rows.map((row) => (
                    <div key={row} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 shrink-0 text-[13px] font-black"
                        style={{ color: plan.highlight ? '#8b6af5' : 'rgba(139,106,245,0.7)' }}
                      >
                        ✓
                      </span>
                      <p className={`text-[14px] font-medium leading-snug ${plan.highlight ? 'text-[#0b0b13]' : 'text-white/65'}`}>
                        {row}
                      </p>
                    </div>
                  ))}
                </div>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[13px] font-black transition ${
                    plan.highlight
                      ? 'bg-[#0b0b13] text-white hover:bg-[#1e1e2e]'
                      : 'border border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beispiele */}
      <section id="examples" className="bg-white px-5 py-24 sm:px-10 lg:py-32">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#8b6af5]">Von Luna gebaut</p>
            <h2 className="text-[clamp(34px,4.5vw,52px)] font-black leading-[0.97] tracking-[-0.055em]" style={{ fontFamily: 'var(--font-display)' }}>
              Echte Websites. Individuell für jede Branche.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.7] text-[#0b0b13]/44">
              Jede Seite entsteht komplett neu. Kein Template, kein Baukasten.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">

            {/* Beispiel 1: Autohaus — cinematic, Porsche-Stil */}
            <article className="overflow-hidden rounded-[18px]" style={{ boxShadow: '0 40px 100px -20px rgba(8,8,12,0.45)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#0d0d0f', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex flex-1 items-center justify-center rounded-md px-3 py-1" style={{ background: 'rgba(255,255,255,0.04)', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.02em' }}>
                  autohaus-mayer.halloluna.net
                </div>
              </div>

              <div style={{ background: '#0d0d0f' }}>
                {/* Nav — ultra minimal, spaced */}
                <div className="flex items-center justify-between px-8 py-5">
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
                    Autohaus Mayer
                  </span>
                  <div className="flex gap-6" style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>
                    <span>Fahrzeuge</span><span>Service</span><span>Kontakt</span>
                  </div>
                </div>

                {/* Car image — the star, full width, generous height */}
                <div className="relative mx-5 overflow-hidden rounded-[12px]" style={{ height: 240 }}>
                  <Image
                    src="/template-images/autohaus-kfz.jpg"
                    alt="Autohaus Mayer"
                    width={900} height={520}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: 'center 48%', opacity: 0.88 }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(13,13,15,0.55) 100%)' }} />
                  {/* Pill inside image */}
                  <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'inline-block' }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>Neufahrzeuge 2025</span>
                  </div>
                </div>

                {/* Text section below image */}
                <div className="px-8 pb-5 pt-6 text-center">
                  <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', lineHeight: 1.05, marginBottom: 12 }}>
                    <div style={{ fontSize: 34, fontWeight: 300, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.01em' }}>
                      Das Auto, das{' '}
                      <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#a8c0d4' }}>wartet</span>
                      {' '}auf Sie.
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', lineHeight: 1.7, maxWidth: 300, margin: '0 auto 20px', letterSpacing: '0.01em' }}>
                    Neuwagen, Gebrauchtwagen und Werkstatt aus einer Hand.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span style={{ border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)', padding: '8px 22px', borderRadius: 999, fontSize: 10, letterSpacing: '0.08em' }}>
                      Fahrzeuge entdecken
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, letterSpacing: '0.06em' }}>
                      Probefahrt anfragen
                    </span>
                  </div>
                </div>

                {/* Glass cards — ultra subtle, no icons */}
                <div className="grid grid-cols-3 gap-2.5 px-5 pb-5">
                  {[
                    { title: 'Gebrauchtwagen', desc: 'Geprüft, mit Garantie' },
                    { title: 'Finanzierung', desc: 'Flexible Raten' },
                    { title: 'Werkstatt', desc: 'Zertifizierter Service' },
                  ].map((card) => (
                    <div key={card.title} className="rounded-[12px] px-4 py-4" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: 5, letterSpacing: '0.02em' }}>{card.title}</div>
                      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5, letterSpacing: '0.01em' }}>{card.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#0d0d0f', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>Autohaus & KFZ</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.03em' }}>Von Luna gebaut</span>
              </div>
            </article>

            {/* Beispiel 2: Blumenladen — weißes Layout, Text links, Bild rechts */}
            <article className="overflow-hidden rounded-[18px]" style={{ boxShadow: '0 40px 100px -20px rgba(8,8,12,0.10)', border: '1px solid rgba(180,160,140,0.18)' }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#fff', borderBottom: '1px solid rgba(180,160,140,0.12)' }}>
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex flex-1 items-center justify-center rounded-md px-3 py-1" style={{ background: 'rgba(180,160,140,0.08)', fontSize: 10, color: 'rgba(90,65,45,0.4)', letterSpacing: '0.02em' }}>
                  blumen-eden.halloluna.net
                </div>
              </div>

              <div style={{ background: '#ffffff' }}>
                {/* Nav */}
                <div className="flex items-center justify-between px-7 py-4" style={{ borderBottom: '1px solid rgba(180,160,140,0.1)' }}>
                  <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400, fontStyle: 'italic', fontSize: 16, color: '#5a4130', letterSpacing: '0.02em' }}>
                    Blumen Eden
                  </span>
                  <div className="flex gap-5" style={{ fontSize: 9.5, color: 'rgba(90,65,45,0.42)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    <span>Sträuße</span><span>Hochzeit</span><span>Atelier</span><span>Kontakt</span>
                  </div>
                </div>

                {/* Hero: text left / image right */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', minHeight: 300, overflow: 'hidden' }}>
                  {/* Left: text on white */}
                  <div className="flex flex-col justify-center px-8 py-8" style={{ position: 'relative' }}>
                    {/* Soft highlight blob behind text */}
                    <div style={{ position: 'absolute', top: '10%', left: '-20%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,220,200,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    <p style={{ fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(90,65,45,0.38)', marginBottom: 14, position: 'relative' }}>
                      Handgebundene Sträuße · Berlin
                    </p>
                    <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 30, fontWeight: 300, lineHeight: 1.12, color: '#5a4130', marginBottom: 12, position: 'relative' }}>
                      Schöne Blumen<br />
                      für jeden <span style={{ fontStyle: 'italic', fontWeight: 400 }}>Anlass.</span>
                    </div>
                    <p style={{ fontSize: 10.5, color: 'rgba(90,65,45,0.48)', lineHeight: 1.7, marginBottom: 20, maxWidth: 200, position: 'relative' }}>
                      Frische Arrangements, handgefertigt mit Liebe. Täglich neu.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#5a4130', color: 'rgba(255,252,248,0.92)', padding: '9px 20px', borderRadius: 6, fontSize: 9.5, letterSpacing: '0.08em', fontWeight: 500, textTransform: 'uppercase' }}>
                        Jetzt entdecken
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(90,65,45,0.18)', color: 'rgba(90,65,45,0.5)', padding: '9px 20px', borderRadius: 6, fontSize: 9.5, letterSpacing: '0.06em' }}>
                        Atelier ansehen
                      </span>
                    </div>
                  </div>

                  {/* Right: large flower image with soft glow */}
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    {/* Soft pink glow highlight */}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 30%, rgba(255,210,190,0.30) 0%, transparent 65%)', zIndex: 1, pointerEvents: 'none' }} />
                    <Image
                      src="/showroom/nachher-blumen.png"
                      alt="Blumen Eden"
                      width={600} height={700}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: '48% 28%' }}
                    />
                  </div>
                </div>

                {/* Category strip */}
                <div style={{ borderTop: '1px solid rgba(180,160,140,0.12)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {[
                    { name: 'Hochzeit', sub: 'Bridal' },
                    { name: 'Saisonal', sub: 'Marktfrisch' },
                    { name: 'Trauerflor', sub: 'Persönlich' },
                    { name: 'Geburtstag', sub: 'Individuell' },
                  ].map((cat, i) => (
                    <div key={cat.name} className="py-4 text-center" style={{ borderLeft: i > 0 ? '1px solid rgba(180,160,140,0.1)' : undefined }}>
                      <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 12, color: 'rgba(90,65,45,0.65)', marginBottom: 2 }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: 8.5, color: 'rgba(90,65,45,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {cat.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#fdfaf7', borderTop: '1px solid rgba(180,160,140,0.1)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, color: 'rgba(90,65,45,0.6)', letterSpacing: '-0.02em' }}>Blumen & Floristik</span>
                <span style={{ fontSize: 10, color: 'rgba(90,65,45,0.28)', letterSpacing: '0.03em' }}>Von Luna gebaut</span>
              </div>
            </article>

          </div>
        </div>
      </section>


      {/* Final CTA */}
      <section className="px-5 pb-28 sm:px-10">
        <div
          className="mx-auto max-w-[1000px] rounded-[32px] border border-white/55 px-8 py-20 text-center backdrop-blur-xl sm:px-14"
          style={{
            background: 'rgba(255,255,255,0.44)',
            boxShadow: '0 40px 100px -60px rgba(80,80,200,0.16)',
          }}
        >
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#8b6af5]">Jetzt starten</p>
          <h2 className="mx-auto mb-5 max-w-3xl text-[clamp(32px,4.5vw,52px)] font-black leading-[0.97] tracking-[-0.055em]" style={{ fontFamily: 'var(--font-display)' }}>
            Starte mit deinem kostenlosen Entwurf.
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-[16px] leading-[1.7] text-[#0b0b13]/44">
            Schreib Luna kurz, wer du bist und was dein Geschäft macht. Dein erster Entwurf ist in Minuten fertig. Kostenlos, ohne Kreditkarte.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full bg-[#0b0b13] px-8 py-4 text-[15px] font-black text-white shadow-[0_12px_32px_-10px_rgba(11,11,19,0.45)] transition hover:bg-[#1e1e2e]"
          >
            Website für mein Geschäft erstellen
          </a>
          <p className="mt-5 text-[12px] font-medium text-[#0b0b13]/30">
            Für Selbstständige und lokale Unternehmen. Kostenlos starten.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#0b0b13]/06 bg-white/70 text-[#0b0b13]">
        <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-[8px]"
                style={{ background: 'linear-gradient(135deg,#5b8ef8,#8b6af5)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </span>
              <div>
                <div className="text-[13px] font-black">Luna.ai</div>
                <p className="text-[11px] text-[#0b0b13]/40">Berlin</p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-5 text-[12px] font-medium text-[#0b0b13]/45">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#0b0b13]">WhatsApp</a>
              <a href="mailto:halloluna.ai@gmail.com" className="hover:text-[#0b0b13]">Support</a>
              <Link href="/datenschutz" className="hover:text-[#0b0b13]">Datenschutz</Link>
              <Link href="/agb" className="hover:text-[#0b0b13]">Nutzungsbedingungen</Link>
              <Link href="/impressum" className="hover:text-[#0b0b13]">Impressum</Link>
            </nav>
          </div>
          <p className="mt-8 text-[11px] leading-relaxed text-[#0b0b13]/28">
            © {new Date().getFullYear()} Luna AI. Alle Rechte vorbehalten. Luna AI ist ein Einzelunternehmen nach § 19 UStG.
          </p>
        </div>
      </footer>

    </main>
  )
}
