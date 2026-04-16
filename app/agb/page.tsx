import Link from 'next/link'

export const metadata = { title: 'Nutzungsbedingungen — Romy AI' }

export default function AGB() {
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

      <article className="mx-auto max-w-2xl px-6 py-16 prose-neutral">
        <h1 className="mb-3 text-4xl font-semibold tracking-tight">Nutzungsbedingungen</h1>
        <p className="mb-10 text-sm text-neutral-500">Stand: {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })}</p>

        <Section title="1. Geltungsbereich">
          <p>
            Diese Nutzungsbedingungen gelten für die Nutzung des WhatsApp-Service &quot;Romy&quot; sowie der Website halloromy.com, betrieben von Zoe Christiansen, Steinstraße 15, 10119 Berlin (&quot;Anbieterin&quot;).
          </p>
        </Section>

        <Section title="2. Leistungsbeschreibung">
          <p>
            Romy ist ein KI-gestützter Assistent, der über WhatsApp erreichbar ist. Romy unterstützt bei der Erstellung professioneller Produktfotos, Marketing-Inhalten und digitalen Services. Die Anbieterin behält sich vor, den Funktionsumfang jederzeit zu ändern oder zu erweitern.
          </p>
        </Section>

        <Section title="3. Nutzungsvoraussetzungen">
          <p>
            Die Nutzung setzt ein aktives WhatsApp-Konto voraus. Nutzer:innen müssen mindestens 16 Jahre alt sein. Mit der Kontaktaufnahme über WhatsApp erklären sich Nutzer:innen mit diesen Nutzungsbedingungen einverstanden.
          </p>
        </Section>

        <Section title="4. Nutzungsrechte an erstellten Inhalten">
          <p>
            Inhalte (z.B. Produktfotos), die durch Romy erstellt werden, dürfen von Nutzer:innen frei für eigene geschäftliche und private Zwecke verwendet werden. Die Anbieterin übernimmt keine Haftung für die Verwendung der erstellten Inhalte durch Dritte.
          </p>
        </Section>

        <Section title="5. Verfügbarkeit">
          <p>
            Die Anbieterin bemüht sich um eine möglichst unterbrechungsfreie Verfügbarkeit des Service. Ein Anspruch auf ständige Verfügbarkeit besteht nicht. Wartungsarbeiten, technische Störungen oder höhere Gewalt können zu vorübergehenden Einschränkungen führen.
          </p>
        </Section>

        <Section title="6. Verbotene Nutzung">
          <p>
            Nutzer:innen verpflichten sich, den Service nicht für rechtswidrige, beleidigende, diskriminierende oder missbräuchliche Zwecke zu nutzen. Insbesondere ist es untersagt, Inhalte zu übermitteln, die gegen geltendes Recht verstoßen oder Rechte Dritter verletzen.
          </p>
        </Section>

        <Section title="7. Haftung">
          <p>
            Die Anbieterin haftet nur für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Schäden, die auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung beruhen. KI-generierte Inhalte werden ohne Gewähr bereitgestellt.
          </p>
        </Section>

        <Section title="8. Datenschutz">
          <p>
            Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer{' '}
            <Link href="/datenschutz" className="underline hover:text-neutral-900">Datenschutzerklärung</Link>.
          </p>
        </Section>

        <Section title="9. Änderungen der Nutzungsbedingungen">
          <p>
            Die Anbieterin behält sich vor, diese Nutzungsbedingungen jederzeit zu ändern. Die aktuelle Fassung ist auf dieser Seite einsehbar.
          </p>
        </Section>

        <Section title="10. Anwendbares Recht">
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Berlin, soweit gesetzlich zulässig.
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
