import Link from 'next/link'

export const metadata = {
  title: 'Impressum — Luna AI',
  robots: {
    index: false,
    follow: false,
  },
}

export default function Impressum() {
  return (
    <main className="min-h-screen bg-[#faf9f6] text-neutral-900">
      <header className="border-b border-neutral-200/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Hallo Luna
          </Link>
          <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">← Zurück</Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-10 text-4xl font-semibold tracking-tight">Impressum</h1>

        <Section title="Angaben gemäß § 5 TMG">
          <p>
            <strong>Luna AI</strong><br />
            Inhaberin: Z. Christiansen<br />
            Steinstr. 13<br />
            10119 Berlin<br />
            Deutschland
          </p>
        </Section>

        <Section title="Kontakt">
          <p>
            Telefon: +49 172 9256983<br />
            E-Mail: <a href="mailto:halloluna.ai@gmail.com" className="underline">halloluna.ai@gmail.com</a>
          </p>
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
          <p>
            Z. Christiansen<br />
            Steinstr. 13<br />
            10119 Berlin
          </p>
        </Section>

        <Section title="Hinweis">
          <p>
            Diese Website wird betrieben von Luna AI, einem Einzelunternehmen mit Sitz in Berlin.
            Luna AI entwickelt KI-gestützte Lösungen für kleine und mittelständische Unternehmen.
          </p>
        </Section>

        <Section title="Streitschlichtung">
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="underline">
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="mt-3">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </Section>
      </article>

      <footer className="border-t border-neutral-200/60">
        <div className="mx-auto max-w-3xl px-6 py-8 text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-900">Zur Startseite</Link>
        </div>
      </footer>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 text-neutral-700 leading-relaxed">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  )
}
