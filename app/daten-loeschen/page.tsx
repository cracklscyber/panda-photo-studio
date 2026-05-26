import Link from 'next/link'

export const metadata = { title: 'Daten löschen — Hallo Luna' }

export default function DatenLoeschen() {
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

      <article className="mx-auto max-w-2xl px-6 py-16 prose-neutral">
        <h1 className="mb-3 text-4xl font-semibold tracking-tight">Daten löschen</h1>
        <p className="mb-10 text-sm text-neutral-500">Anleitung zur Löschung deiner persönlichen Daten</p>

        <Section title="Was wir speichern">
          <p>
            Im Rahmen des Hallo Luna Services speichern wir folgende Daten:
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-1">
            <li>Deine WhatsApp-Telefonnummer oder Website-Chat-Sitzungskennung</li>
            <li>Gesprächsverlauf mit Luna</li>
            <li>Die für dich erstellte Website (HTML-Dateien)</li>
          </ul>
        </Section>

        <Section title="So beantragst du die Löschung">
          <p>
            Um alle deine Daten löschen zu lassen, schreib uns eine E-Mail an:
          </p>
          <p className="mt-3 font-medium">
            <a href="mailto:halloluna.ai@gmail.com" className="underline">halloluna.ai@gmail.com</a>
          </p>
          <p className="mt-3">
            Betreff: <strong>Datenlöschung</strong><br />
            Inhalt: Deine WhatsApp-Nummer oder die E-Mail-Adresse mit der du dich registriert hast.
          </p>
          <p className="mt-3">
            Wir bestätigen den Eingang und löschen deine Daten innerhalb von <strong>14 Tagen</strong>. Nach der Löschung erhältst du eine Bestätigung.
          </p>
        </Section>

        <Section title="Was nach der Löschung passiert">
          <ul className="list-disc pl-5 space-y-1">
            <li>Dein gesamter Gesprächsverlauf wird gelöscht</li>
            <li>Deine erstellte Website wird entfernt</li>
            <li>Deine Telefonnummer oder Kennung wird aus unserer Datenbank gelöscht</li>
            <li>Eine Wiederherstellung ist danach nicht möglich</li>
          </ul>
        </Section>

        <Section title="Weitere Datenschutzinformationen">
          <p>
            Ausführliche Informationen zur Datenverarbeitung findest du in unserer{' '}
            <Link href="/datenschutz" className="underline hover:text-neutral-900">Datenschutzerklärung</Link>.
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
