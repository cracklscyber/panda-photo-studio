import Link from 'next/link'

const WHATSAPP_NUMBER = '+491636623276'
const WHATSAPP_NUMBER_DISPLAY = '+49 163 66 23 276'
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent('Hi Romy, ich hätte gern eine Website.')}`

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf9f6] text-neutral-900">
      {/* Nav */}
      <header className="border-b border-neutral-200/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="text-lg font-semibold tracking-tight">Romy<span className="text-neutral-400">.ai</span></div>
          <a
            href={WHATSAPP_LINK}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            Auf WhatsApp starten
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-neutral-500">Website per WhatsApp</p>
        <h1 className="mb-6 text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
          Deine eigene Website.<br />
          <span className="text-neutral-500">Einfach per Chat.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg text-neutral-600">
          Romy ist eine KI-Assistentin, die per WhatsApp mit dir eine individuelle Website für dein Geschäft baut und pflegt — ohne Baukasten, ohne Vorlagen, ohne Code.
        </p>
        <a
          href={WHATSAPP_LINK}
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-[#1da851]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Auf WhatsApp starten
        </a>
        <p className="mt-4 text-sm text-neutral-500">
          oder direkt schreiben an <span className="font-medium text-neutral-700">{WHATSAPP_NUMBER_DISPLAY}</span>
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight">So funktioniert's</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              n: '1',
              title: 'Schreib Romy',
              text: 'Sag Romy auf WhatsApp was du machst. Ein Café? Eine Frisör-Lounge? Ein Online-Shop mit Filter? Romy fragt nach, was dir wichtig ist.',
            },
            {
              n: '2',
              title: 'Romy baut',
              text: 'Romy stellt deine Website individuell zusammen: Hero, Galerie, Buchung, Menü, FAQ, Kontakt — nur was du wirklich brauchst. Design passt zu deiner Branche.',
            },
            {
              n: '3',
              title: 'Du änderst per Chat',
              text: 'Neue Öffnungszeiten? Anderes Angebot? Bild austauschen? Schreib Romy eine Nachricht. Änderung in Sekunden live.',
            },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">{s.n}</div>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-neutral-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For who */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="mb-6 text-3xl font-semibold tracking-tight">Für lokale Geschäfte</h2>
        <p className="mb-10 text-lg text-neutral-600">
          Romy ist gemacht für Menschen, die kein Interesse an Website-Baukästen haben. Frisör:innen, Cafés, Werkstätten, Coaches, Yoga-Studios, Online-Shops. Du sprichst, Romy baut.
        </p>
        <a
          href={WHATSAPP_LINK}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-base font-medium text-white transition hover:bg-neutral-700"
        >
          Jetzt ausprobieren
        </a>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t border-neutral-200/60">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-sm font-semibold">Romy AI</div>
              <p className="mt-1 text-xs text-neutral-500">
                Betrieben von Zoe Christiansen · Berlin
              </p>
            </div>
            <nav className="flex flex-wrap gap-5 text-xs text-neutral-500">
              <a href={WHATSAPP_LINK} className="hover:text-neutral-900">WhatsApp</a>
              <Link href="/impressum" className="hover:text-neutral-900">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-neutral-900">Datenschutz</Link>
            </nav>
          </div>
          <p className="mt-8 text-[11px] leading-relaxed text-neutral-400">
            © {new Date().getFullYear()} Romy AI. Alle Rechte vorbehalten. Romy AI ist ein Einzelunternehmen nach § 19 UStG (Kleinunternehmerregelung, keine Umsatzsteuer ausgewiesen).
          </p>
        </div>
      </footer>
    </main>
  )
}
