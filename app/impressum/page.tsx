import Link from 'next/link'

export const metadata = { title: 'Impressum — Romy AI' }

export default function Impressum() {
  return (
    <main className="min-h-screen bg-[#faf9f6] text-neutral-900">
      <header className="border-b border-neutral-200/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Romy<span className="text-neutral-400">.ai</span>
          </Link>
          <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">← Zurück</Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-10 text-4xl font-semibold tracking-tight">Impressum</h1>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Angaben gemäß § 5 TMG</h2>
          <address className="not-italic text-neutral-700 leading-relaxed">
            Zoe Christiansen<br />
            Steinstraße 15<br />
            10119 Berlin<br />
            Deutschland
          </address>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Kontakt</h2>
          <p className="text-neutral-700 leading-relaxed">
            E-Mail: <a href="mailto:halloromy.ai@gmail.com" className="underline hover:text-neutral-900">halloromy.ai@gmail.com</a><br />
            WhatsApp: +49 163 66 23 276
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Umsatzsteuer</h2>
          <p className="text-neutral-700 leading-relaxed">
            Gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer erhoben und ausgewiesen.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p className="text-neutral-700 leading-relaxed">
            Zoe Christiansen<br />
            Steinstraße 15<br />
            10119 Berlin
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">EU-Streitschlichtung</h2>
          <p className="text-neutral-700 leading-relaxed">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-900">
              https://ec.europa.eu/consumers/odr/
            </a>
            . Meine E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
          <p className="text-neutral-700 leading-relaxed">
            Ich bin nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Haftung für Inhalte</h2>
          <p className="text-neutral-700 leading-relaxed">
            Als Diensteanbieterin bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich als Diensteanbieterin jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Haftung für Links</h2>
          <p className="text-neutral-700 leading-relaxed">
            Mein Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Deshalb kann ich für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Urheberrecht</h2>
          <p className="text-neutral-700 leading-relaxed">
            Die durch die Seitenbetreiberin erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung der jeweiligen Autorin bzw. Erstellerin.
          </p>
        </section>
      </article>

      <footer className="border-t border-neutral-200/60">
        <div className="mx-auto max-w-3xl px-6 py-8 text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-900">Zur Startseite</Link>
        </div>
      </footer>
    </main>
  )
}
