import Link from 'next/link'
import Image from 'next/image'
import { BookingModal } from '@/components/booking-modal'
import { AccountMenu } from '@/components/account-menu'
import { WhatsAppLink } from '@/components/whatsapp-link'

const CAL_BOOKING_URL = 'https://cal.com/romy.ai'
const WHATSAPP_URL = 'https://wa.me/4915229227823'

const industries = [
  {
    label: 'Autohaus & KFZ',
    description:
      'Fahrzeugbestand, Sonderangebote, Öffnungszeiten — alles per Chat aktuell halten. Keine Agentur, keine Wartezeit.',
    tag: 'Spezialisiert',
  },
  {
    label: 'Café & Restaurant',
    description:
      'Warme Bildwelt, Speisekarte und Öffnungszeiten — einladend und ohne Baukasten.',
    tag: null,
  },
  {
    label: 'Friseur & Beauty',
    description:
      'Editorialer Look, Leistungsübersicht und Terminanfrage — hochwertig und schnell.',
    tag: null,
  },
  {
    label: 'Handwerk & Service',
    description:
      'Vertrauen, Kontaktformular und lokale Sichtbarkeit — fertig in wenigen Minuten.',
    tag: null,
  },
  {
    label: 'Boutique & Mode',
    description:
      'Hochwertige Bildwelt, Kollektion und Öffnungszeiten — individuell, kein Template.',
    tag: null,
  },
  {
    label: 'Praxis & Therapie',
    description:
      'Seröser Auftritt, Leistungen und Terminanfrage — ruhig, klar und mobil.',
    tag: null,
  },
]

const comparison = [
  {
    label: 'Baukasten',
    sub: 'Wix, Jimdo, Squarespace',
    rows: [
      { key: 'Kosten', value: '€30 – 100 / Monat' },
      { key: 'Setup', value: 'Stundenlang, alles selbst' },
      { key: 'Änderungen', value: 'Du machst alles selbst' },
      { key: 'Ergebnis', value: 'Sieht nach Vorlage aus' },
    ],
    highlight: false,
  },
  {
    label: 'Luna',
    sub: 'Deine KI-Assistentin',
    rows: [
      { key: 'Kosten', value: 'Kostenlos starten' },
      { key: 'Setup', value: 'Erster Entwurf in Minuten' },
      { key: 'Änderungen', value: 'Per Chat, sofort live' },
      { key: 'Ergebnis', value: 'Individuell, kein Template' },
    ],
    highlight: true,
  },
  {
    label: 'Webdesigner',
    sub: 'Agentur oder Freelancer',
    rows: [
      { key: 'Kosten', value: '€2.000 – 5.000+' },
      { key: 'Setup', value: 'Wochen Wartezeit' },
      { key: 'Änderungen', value: 'Jede Kleinigkeit kostet extra' },
      { key: 'Ergebnis', value: 'Gut, aber teuer und langsam' },
    ],
    highlight: false,
  },
]

const features = [
  {
    title: 'Komplette Website',
    body: 'Aus einer kurzen Beschreibung baut Luna eine fertige Seite — kein Template, kein Baukastengefühl.',
  },
  {
    title: 'Echte Texte',
    body: 'Keine Platzhalter. Luna schreibt Texte, die dein Geschäft wirklich beschreiben.',
  },
  {
    title: 'Passende Bilder',
    body: 'Hochwertige Bilder werden automatisch gewählt oder deine eigenen eingebaut.',
  },
  {
    title: 'Per Chat ändern',
    body: 'Schreib Luna einfach, was sich geändert hat. Sie setzt es sofort um — kein Editor nötig.',
  },
  {
    title: 'Mobil-optimiert',
    body: 'Jede Seite sieht auf dem Handy genauso gut aus wie am Desktop.',
  },
  {
    title: 'Dein Design',
    body: 'Farben, Schrift, Layout — du entscheidest per Chat. So individuell wie du willst.',
  },
]

const examples = [
  {
    title: 'Autohaus & KFZ',
    image: '/template-images/autohaus-kfz.jpg',
    text: 'Fahrzeugbestand, Angebote und Kontakt — seriös, modern und ohne Agentur.',
  },
  {
    title: 'Beauty & Studio',
    image: '/template-images/friseur-beauty.jpg',
    text: 'Editorialer Look, hochwertige Bilder und einfache Termin-Anfrage.',
  },
  {
    title: 'Handwerk & Service',
    image: '/template-images/handwerk-werkstatt.jpg',
    text: 'Vertrauen, lokale Sichtbarkeit und klare Anfrage statt alter Visitenkarte.',
  },
]

const outcomes = [
  ['1', 'Erzähl Luna kurz von deinem Geschäft.'],
  ['2', 'Dein erster Entwurf ist sofort sichtbar.'],
  ['3', 'Texte, Bilder und Design feinerst du danach per Chat.'],
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#edf2eb] text-[#11110f]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18%] h-[760px] w-[1200px] -translate-x-1/2 rounded-full bg-[#e8ff8e]/28 blur-[150px]" />
        <div className="absolute right-[-12%] top-[12%] h-[600px] w-[600px] rounded-full bg-[#caffed]/35 blur-[140px]" />
        <div className="absolute left-[12%] top-[46%] h-[640px] w-[760px] rounded-full bg-white/70 blur-[130px]" />
      </div>

      <header className="relative z-40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white/70 shadow-[0_18px_44px_-30px_rgba(25,31,20,0.5)] backdrop-blur-2xl">
              <Image
                src="/romy-avatar.png"
                alt="Luna"
                width={640}
                height={640}
                className="h-full w-full object-cover"
                priority
              />
            </span>
            <div className="text-lg font-black tracking-tight">Luna</div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-bold text-[#11110f]/54 md:flex">
            <a href="#branchen" className="transition hover:text-[#11110f]">Branchen</a>
            <a href="#vergleich" className="transition hover:text-[#11110f]">Vergleich</a>
            <a href="#examples" className="transition hover:text-[#11110f]">Beispiele</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-[#11110f]">Starten</a>
            <AccountMenu variant="light" />
          </nav>

          <a
            href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="hidden rounded-full bg-[#11110f] px-5 py-2.5 text-sm font-black text-white shadow-[0_20px_48px_-30px_rgba(22,26,18,0.7)] transition hover:bg-[#2e302a] sm:inline-flex"
          >
            Kostenlos testen
          </a>
          <div className="md:hidden">
            <AccountMenu variant="light" />
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="px-5 pb-16 pt-6 sm:px-6 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl text-center">
            <p className="mx-auto inline-flex items-center rounded-full border border-black/[0.06] bg-white/55 px-4 py-2 text-[0.7rem] font-black uppercase tracking-[0.3em] text-[#6f8000] shadow-sm backdrop-blur">
              Deine Website-Assistentin
            </p>

            <h1 className="mx-auto mt-7 max-w-5xl text-balance text-[3.2rem] font-black leading-[0.88] tracking-[-0.065em] sm:text-7xl lg:text-[6.2rem]">
              Kein Designer.{' '}
              <br className="hidden sm:block" />
              Kein Baukasten.{' '}
              <br className="hidden sm:block" />
              <span className="text-[#6f8000]">Deine Website per Chat.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-9 text-[#11110f]/55 sm:text-xl">
              Luna baut aus wenigen Nachrichten eine fertige Website — mit echten Texten, passenden Bildern
              und einem Design, das zu deinem Geschäft passt. Du änderst alles jederzeit per Chat.
              Luna programmiert für dich.
            </p>

            <div className="mx-auto mt-9 flex max-w-xl flex-col gap-3 rounded-full border border-black/[0.08] bg-white/70 p-2 shadow-[0_28px_80px_-62px_rgba(25,31,20,0.5)] backdrop-blur-2xl sm:flex-row">
              <a
                href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-[#11110f] px-6 py-4 text-base font-black text-white transition hover:bg-[#2e302a]"
              >
                Kostenlosen Entwurf erstellen
              </a>
              <BookingModal
                url={CAL_BOOKING_URL}
                className="inline-flex items-center justify-center rounded-full px-6 py-4 text-base font-black text-[#11110f]/74 transition hover:bg-[#11110f]/[0.04] hover:text-[#11110f]"
              >
                Beratung buchen
              </BookingModal>
            </div>

            <p className="mt-4 text-sm font-medium text-[#11110f]/42">
              Erst Entwurf ansehen. Danach entscheiden.
            </p>
          </div>

          {/* Workspace mockup */}
          <div className="mx-auto mt-14 max-w-6xl rounded-[2.4rem] border border-white/90 bg-white/56 p-3 shadow-[0_42px_120px_-82px_rgba(25,31,20,0.6),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl sm:p-5">
            <div className="overflow-hidden rounded-[1.8rem] border border-black/[0.06] bg-[#fbfbf6]">
              <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#11110f]/18" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#11110f]/18" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#a6bd00]" />
                </div>
                <p className="text-xs font-bold text-[#11110f]/34">luna workspace</p>
              </div>

              <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="border-b border-black/[0.06] bg-white/60 p-5 lg:border-b-0 lg:border-r">
                  <div className="flex items-center gap-3">
                    <span className="relative inline-flex h-12 w-12 overflow-hidden rounded-full border border-black/[0.08] bg-white">
                      <Image
                        src="/romy-avatar.png"
                        alt="Luna"
                        width={640}
                        height={640}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <div>
                      <p className="font-black">Luna</p>
                      <p className="text-xs font-semibold text-[#11110f]/40">online · antwortet in Sekunden</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="rounded-2xl rounded-tr-md bg-[#f4f5ef] px-4 py-3 text-sm leading-snug text-[#11110f]">
                      Ich brauche eine moderne Seite für mein Cafe in München.
                    </div>
                    <div className="rounded-2xl rounded-tl-md bg-[#e9ff83] px-4 py-3 text-sm font-semibold leading-snug text-[#11110f]">
                      Klar. Ich baue einen ersten Entwurf mit Texten, Struktur und passenden Bildern.
                    </div>
                    <div className="rounded-2xl rounded-tr-md bg-[#f4f5ef] px-4 py-3 text-sm leading-snug text-[#11110f]">
                      Bitte hochwertig, hell, warm und nicht nach Vorlage.
                    </div>
                    <div className="rounded-2xl rounded-tl-md bg-[#11110f] px-4 py-3 text-sm font-semibold leading-snug text-white">
                      Verstanden. Hier ist die erste Version.
                    </div>
                  </div>
                </div>

                <div className="bg-[#f5f1e8] p-4 sm:p-6">
                  <div className="overflow-hidden rounded-[1.4rem] border border-black/[0.08] bg-white shadow-[0_34px_80px_-62px_rgba(25,31,20,0.45)]">
                    <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#f7f1e4] px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#11110f]/38">Cafe Mira</p>
                      <p className="text-xs font-bold text-[#11110f]/34">cafemira.halloluna.net</p>
                    </div>
                    <div className="bg-[#f8f3ea] p-4 sm:p-6">
                      <div className="overflow-hidden rounded-[1.15rem] border border-black/[0.08] bg-white shadow-[0_24px_70px_-54px_rgba(25,31,20,0.45)]">
                        <div
                          className="relative min-h-[250px] overflow-hidden bg-cover bg-center p-7 sm:min-h-[330px] sm:p-10"
                          style={{
                            backgroundImage:
                              "linear-gradient(90deg, rgba(30,24,18,0.74), rgba(30,24,18,0.18)), url('/template-images/cafe-bistro.jpg')",
                          }}
                        >
                          <div className="relative max-w-[20rem] text-white">
                            <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/70">Cafe Mira · München</p>
                            <h3 className="mt-5 text-4xl font-black leading-[0.92] tracking-[-0.04em] sm:text-6xl">
                              Kaffee, Kuchen und ruhige Morgen.
                            </h3>
                            <p className="mt-5 text-sm font-medium leading-6 text-white/78">
                              Ein heller Ort für Frühstück, kurze Pausen und gute Gespräche.
                            </p>
                            <div className="mt-6 inline-flex rounded-full bg-[#e9ff83] px-5 py-3 text-xs font-black text-[#11110f]">
                              Tisch anfragen
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 bg-white p-4 sm:grid-cols-3 sm:p-5">
                          {['Frühstück', 'Hausgemachte Kuchen', 'Kaffee aus München'].map((item) => (
                            <div key={item} className="rounded-2xl bg-[#f4f1ea] p-4">
                              <p className="text-xs font-black text-[#11110f]">{item}</p>
                              <p className="mt-2 h-2 w-2/3 rounded-full bg-[#11110f]/12" />
                              <p className="mt-2 h-2 w-1/2 rounded-full bg-[#11110f]/10" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BRANCHEN ── */}
      <section id="branchen" className="bg-white px-5 py-24 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-[#6f8000]">Branchen</p>
            <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-[4.4rem]">
              Für jede Branche. Sofort loslegen.
            </h2>
            <p className="mt-6 text-lg leading-9 text-[#11110f]/55">
              Luna kennt deine Branche und baut passend dazu — kein generisches Template,
              sondern eine Seite, die wirklich zu deinem Geschäft passt.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((ind) => (
              <a
                key={ind.label}
                href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="group relative rounded-[1.8rem] border border-black/[0.07] bg-[#f7f8f3] p-7 transition hover:border-[#6f8000]/30 hover:bg-[#f2f7e4]"
              >
                {ind.tag && (
                  <span className="mb-4 inline-flex rounded-full bg-[#6f8000] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-white">
                    {ind.tag}
                  </span>
                )}
                {!ind.tag && <div className="mb-4 h-[1.625rem]" />}
                <h3 className="text-xl font-black tracking-tight">{ind.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#11110f]/55">{ind.description}</p>
                <p className="mt-5 text-sm font-black text-[#6f8000] opacity-0 transition group-hover:opacity-100">
                  Jetzt starten →
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── VERGLEICH (dark) ── */}
      <section id="vergleich" className="bg-[#11110f] px-5 py-24 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-[#a6bd00]">Warum Luna?</p>
            <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-[4.4rem]">
              Baukasten kostet Zeit.{' '}
              <br className="hidden sm:block" />
              Designer kosten Geld.
            </h2>
            <p className="mt-6 text-lg leading-9 text-white/45">
              Luna gibt dir beides: eine individuelle Website sofort —
              und Änderungen wann immer du willst, per Chat.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {comparison.map((item) => (
              <div
                key={item.label}
                className={`rounded-[1.8rem] p-8 ${
                  item.highlight
                    ? 'bg-[#e9ff83] text-[#11110f]'
                    : 'border border-white/[0.08] bg-white/[0.04]'
                }`}
              >
                <p className={`text-2xl font-black tracking-tight ${item.highlight ? 'text-[#11110f]' : 'text-white'}`}>
                  {item.label}
                </p>
                <p className={`mt-1 text-sm font-semibold ${item.highlight ? 'text-[#11110f]/50' : 'text-white/30'}`}>
                  {item.sub}
                </p>

                <div className="mt-8 space-y-5">
                  {item.rows.map((row) => (
                    <div key={row.key}>
                      <p className={`text-[0.65rem] font-black uppercase tracking-[0.18em] ${item.highlight ? 'text-[#6f8000]' : 'text-white/30'}`}>
                        {row.key}
                      </p>
                      <p className={`mt-1 text-base font-bold ${item.highlight ? 'text-[#11110f]' : 'text-white/65'}`}>
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>

                {item.highlight && (
                  <a
                    href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                    className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#11110f] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#2e302a]"
                  >
                    Kostenlos starten
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-5 py-24 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-[#6f8000]">Was Luna baut</p>
            <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-[4.4rem]">
              Alles was eine Website braucht —{' '}
              <span className="text-[#6f8000]">nichts was du selbst tun musst.</span>
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-[1.8rem] border border-black/[0.07] bg-white/60 p-7 backdrop-blur"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e9ff83]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6f8000]" />
                </div>
                <h3 className="text-lg font-black tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#11110f]/55">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXAMPLES ── */}
      <section id="examples" className="bg-white px-5 py-24 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-[#6f8000]">Website-Beispiele</p>
            <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-[4.4rem]">
              Bilder, Texte und Stil werden passend zur Branche.
            </h2>
            <p className="mt-6 text-lg leading-9 text-[#11110f]/55">
              Genau das muss die Seite verkaufen: Luna macht aus wenig Material
              einen hochwertigen ersten Eindruck.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {examples.map((example) => (
              <article
                key={example.title}
                className="group overflow-hidden rounded-[2rem] border border-black/[0.07] bg-[#f7f8f3] shadow-[0_30px_90px_-70px_rgba(25,31,20,0.5)]"
              >
                <div className="overflow-hidden">
                  <Image
                    src={example.image}
                    alt={`${example.title} Website-Beispiel`}
                    width={1200}
                    height={900}
                    className="h-80 w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-black tracking-tight">{example.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#11110f]/55">{example.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABLAUF ── */}
      <section id="how" className="px-5 py-24 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1fr] lg:items-center lg:gap-20">
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-[#6f8000]">Ablauf</p>
              <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-[4.4rem]">
                Kein Editor. Kein leeres Template.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-9 text-[#11110f]/55">
                Du beschreibst dein Geschäft — Luna programmiert deine Website.
                Danach kannst du alles per Chat anpassen: Texte, Bilder, Farben, Inhalte.
                Ganz ohne Technik-Kenntnisse.
              </p>
            </div>

            <div className="grid gap-4">
              {outcomes.map(([n, text]) => (
                <div
                  key={n}
                  className="flex items-center gap-6 rounded-[1.7rem] border border-white/55 bg-white/40 p-7 shadow-[0_34px_100px_-80px_rgba(25,31,20,0.45)] backdrop-blur-xl"
                >
                  <span className="text-4xl font-black tabular-nums text-[#6f8000]">{n}</span>
                  <p className="text-xl font-black leading-tight tracking-tight">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="starten" className="px-5 pb-24 sm:px-6 lg:pb-36">
        <div className="mx-auto max-w-5xl rounded-[2.4rem] border border-white/55 bg-white/42 px-6 py-20 text-center shadow-[0_48px_130px_-90px_rgba(25,31,20,0.45)] backdrop-blur-xl sm:px-12">
          <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-[#6f8000]">Jetzt starten</p>
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-[4.6rem]">
            Starte mit deinem kostenlosen Entwurf.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-9 text-[#11110f]/55">
            Schreib Luna kurz, wer du bist und was dein Geschäft macht.
            Dein erster Entwurf ist in Minuten fertig — kostenlos, ohne Kreditkarte.
          </p>
          <a
            href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="mt-9 inline-flex rounded-full bg-[#11110f] px-7 py-4 text-base font-black text-white shadow-[0_24px_58px_-36px_rgba(22,26,18,0.7)] transition hover:bg-[#2e302a]"
          >
            Kostenlosen Entwurf erstellen
          </a>
          <p className="mt-5 text-sm font-medium text-[#11110f]/42">
            Erst Entwurf ansehen. Danach entscheiden.
          </p>
        </div>
      </section>

      <footer className="border-t border-black/[0.06] bg-white/70 text-[#11110f]">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-sm font-black">Luna</div>
              <p className="mt-1 text-xs text-[#11110f]/40">Berlin</p>
            </div>
            <nav className="flex flex-wrap gap-5 text-xs font-medium text-[#11110f]/45">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#11110f]">WhatsApp</a>
              <a href="mailto:halloluna.ai@gmail.com" className="hover:text-[#11110f]">Support</a>
              <Link href="/datenschutz" className="hover:text-[#11110f]">Datenschutz</Link>
              <Link href="/agb" className="hover:text-[#11110f]">Nutzungsbedingungen</Link>
              <Link href="/impressum" className="hover:text-[#11110f]">Impressum</Link>
            </nav>
          </div>
          <p className="mt-8 text-[11px] leading-relaxed text-[#11110f]/30">
            © {new Date().getFullYear()} Luna AI. Alle Rechte vorbehalten. Luna AI ist ein Einzelunternehmen nach § 19 UStG.
          </p>
        </div>
      </footer>
    </main>
  )
}
