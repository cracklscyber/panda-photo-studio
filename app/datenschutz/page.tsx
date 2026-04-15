import Link from 'next/link'

export const metadata = { title: 'Datenschutzerklärung — Romy AI' }

export default function Datenschutz() {
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
        <h1 className="mb-3 text-4xl font-semibold tracking-tight">Datenschutzerklärung</h1>
        <p className="mb-10 text-sm text-neutral-500">Stand: {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })}</p>

        <Section title="1. Verantwortliche">
          <p>
            Verantwortlich für die Datenverarbeitung auf dieser Website und im Zusammenhang mit dem WhatsApp-Service „Romy" ist:
          </p>
          <p className="mt-3">
            Zoe Christiansen<br />
            Steinstraße 15<br />
            10119 Berlin<br />
            Deutschland<br />
            E-Mail: <a href="mailto:halloromy.ai@gmail.com" className="underline">halloromy.ai@gmail.com</a>
          </p>
        </Section>

        <Section title="2. Allgemeines zur Datenverarbeitung">
          <p>
            Wir verarbeiten personenbezogene Daten unserer Nutzer:innen grundsätzlich nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie des WhatsApp-Services erforderlich ist. Die Verarbeitung erfolgt regelmäßig nur nach Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) oder zur Vertragserfüllung bzw. Durchführung vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO).
          </p>
        </Section>

        <Section title="3. Hosting der Website">
          <p>
            Diese Website wird bei Vercel Inc. (USA) gehostet. Beim Aufruf der Seite werden durch den Browser technische Zugriffsdaten übertragen (IP-Adresse, Zeitpunkt, User-Agent, Referrer), die in Server-Logs temporär gespeichert werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an stabilem Betrieb).
          </p>
          <p className="mt-3">
            Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln sowie der Zertifizierung unter dem EU-U.S. Data Privacy Framework.
          </p>
        </Section>

        <Section title="4. WhatsApp-Kommunikation mit Romy">
          <p>
            Wenn Sie Romy über WhatsApp kontaktieren (Nummer +49 163 66 23 276), verarbeiten wir die von Ihnen gesendeten Nachrichteninhalte, Bilder sowie Ihre WhatsApp-Telefonnummer. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung/Anfragebearbeitung) bzw. Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktive Kontaktaufnahme).
          </p>
          <p className="mt-3">
            WhatsApp-Nachrichten werden technisch über die <strong>WhatsApp Business Platform (Cloud API)</strong> der Meta Platforms Ireland Ltd. abgewickelt. Dabei können Metadaten (Telefonnummer, Zeitpunkt, Zustellstatus) auch an Meta Platforms Inc. in die USA übertragen werden. Weitere Informationen: <a href="https://www.whatsapp.com/legal/privacy-policy-eea" target="_blank" rel="noopener noreferrer" className="underline">WhatsApp Datenschutzerklärung</a>.
          </p>
          <p className="mt-3">
            Nachrichteninhalte werden zur Bearbeitung Ihrer Anfrage sowie zur Pflege Ihrer Website gespeichert, solange dies für die Leistungserbringung erforderlich ist. Sie können jederzeit die Löschung Ihrer Daten verlangen (siehe Abschnitt 10).
          </p>
        </Section>

        <Section title="5. Verarbeitung durch KI-Dienste">
          <p>
            Zur Beantwortung Ihrer Nachrichten und zur Erstellung/Pflege Ihrer Website werden Ihre Nachrichteninhalte an Dienste künstlicher Intelligenz übermittelt:
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-2">
            <li><strong>Anthropic PBC</strong> (USA) — Claude-Sprachmodell. Datenverarbeitung nach EU-Standardvertragsklauseln. Anthropic verwendet API-Eingaben nicht zum Training der Modelle.</li>
            <li><strong>Google LLC / Google Ireland Ltd.</strong> — Gemini-Sprach- und Bildgenerierungsmodelle, sofern genutzt.</li>
          </ul>
          <p className="mt-3">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Die Übermittlung in Drittländer ist durch Standardvertragsklauseln und/oder DPF-Zertifizierung abgesichert.
          </p>
        </Section>

        <Section title="6. Speicherung der Website-Daten">
          <p>
            Die von Romy für Sie erstellte Website sowie Ihre Nachrichtenhistorie werden in einer Supabase-Datenbank (Supabase Inc.) gespeichert. Supabase hostet personenbezogene Daten auf Servern in der EU (Frankfurt). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            Diese Website setzt keine Tracking-Cookies und keine Analyse-Tools ein. Technisch notwendige Sitzungs-Cookies können gesetzt werden, soweit Sie sich in einen Administrationsbereich einloggen. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TTDSG.
          </p>
        </Section>

        <Section title="8. Kontakt per E-Mail">
          <p>
            Wenn Sie per E-Mail Kontakt aufnehmen, werden Ihre Angaben zur Bearbeitung der Anfrage und für mögliche Anschlussfragen verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>
        </Section>

        <Section title="9. Empfänger der Daten">
          <p>Wir geben personenbezogene Daten ausschließlich an folgende Auftragsverarbeiter weiter:</p>
          <ul className="mt-3 list-disc pl-5 space-y-1">
            <li>Meta Platforms Ireland Ltd. (WhatsApp Business Platform)</li>
            <li>Vercel Inc. (Hosting)</li>
            <li>Supabase Inc. (Datenbank, EU-Hosting)</li>
            <li>Anthropic PBC (KI-Verarbeitung)</li>
            <li>Google LLC / Google Ireland Ltd. (KI-Verarbeitung)</li>
          </ul>
          <p className="mt-3">
            Mit allen Auftragsverarbeitern bestehen bzw. werden Verträge gemäß Art. 28 DSGVO geschlossen.
          </p>
        </Section>

        <Section title="10. Ihre Rechte">
          <p>Sie haben nach der DSGVO folgende Rechte:</p>
          <ul className="mt-3 list-disc pl-5 space-y-1">
            <li>Auskunft (Art. 15 DSGVO)</li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch (Art. 21 DSGVO)</li>
            <li>Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
          </ul>
          <p className="mt-3">
            Anfragen richten Sie bitte an <a href="mailto:halloromy.ai@gmail.com" className="underline">halloromy.ai@gmail.com</a>.
          </p>
        </Section>

        <Section title="11. Beschwerderecht">
          <p>
            Sie haben das Recht, sich bei einer Aufsichtsbehörde für den Datenschutz zu beschweren. Zuständig ist die:
          </p>
          <p className="mt-3">
            Berliner Beauftragte für Datenschutz und Informationsfreiheit<br />
            Alt-Moabit 59–61, 10555 Berlin<br />
            <a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener noreferrer" className="underline">www.datenschutz-berlin.de</a>
          </p>
        </Section>

        <Section title="12. Änderungen dieser Erklärung">
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder Änderungen unserer Leistungen umzusetzen. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
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
