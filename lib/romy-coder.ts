import { Sandbox, type SandboxOpts } from 'e2b'
import {
  listSiteFiles,
  downloadSiteFile,
  uploadSiteFile,
  sitePreviewUrl,
} from './supabase-storage'
import { extractConfirmedImageUrls } from './romy-image-intent'
import { saveBuildTranscript } from './transcript-storage'

const WORKSPACE = '/home/user/workspace'
const CLAUDE_HOME = '/home/user/romy-claude'
const ROMY_E2B_TEMPLATE = process.env.ROMY_E2B_TEMPLATE?.trim() || ''
// Bewusst deutlich unter dem Outer-Race (BUILD_TIMEOUT_MS=295s in
// app/api/chat/route.ts) und dem Vercel-Limit (maxDuration=300s). Der Agent
// muss früh genug aufhören, damit danach noch File-Upload UND der innere
// saveBuildTranscript (mit vollem stdout/stderr/parsed) laufen können, bevor
// irgendein Notnagel-Timeout greift. Bei 285s überholte der Outer-Timeout den
// inneren Save → gar kein Transcript bei Build-Timeouts.
const AGENT_TIMEOUT_MS = 270_000
const NPM_INSTALL_TIMEOUT_MS = 90_000
const AGENT_MAX_TURNS = 6
const REQUIRE_CLAUDE_FRONTEND_DESIGN =
  process.env.ROMY_REQUIRE_CLAUDE_FRONTEND_DESIGN !== '0'
const ALLOW_TEMPLATE_FALLBACK =
  process.env.ROMY_ALLOW_TEMPLATE_FALLBACK !== '0'

const ROMY_CODER_SYSTEM_PROMPT = `Du bist die Claude-Code-Ausführung hinter Luna, einer Chat-Assistentin von Hallo Luna, die Websites für lokale Geschäfte baut. Arbeite im cwd mit Read, Write, Edit, Glob, Grep. Haupt-Datei ist immer index.html. Output: in sich geschlossenes HTML, mobile-first, modernes CSS, Google Fonts via <link> okay, keine Tailwind-CDN, kein React/Next, keine Base64-Bilder, keine relativen ../-Pfade, Deutsch falls nicht anders gewünscht.

## WICHTIGSTE REGEL — TOOL-NUTZUNG
Du MUSST das Write-Tool benutzen, um index.html im cwd zu erstellen (bzw. Edit-Tool für Anpassungen an einer bestehenden index.html). Antworte NIEMALS mit HTML-Code als Text im Chat — das landet nicht auf der Seite des Kunden. Wenn du keine Datei geschrieben hast, ist der Build für den Kunden fehlgeschlagen. Erst Datei schreiben, dann kurze Chat-Antwort.

## ZEITBUDGET — erst Datei sichern, dann verfeinern
Der Sandbox-Lauf hat ein hartes Zeitlimit. Deine allererste produktive Aktion beim ersten Build ist deshalb: schreibe eine vollständige index.html mit Hero, Angebot, Über-uns, Kontakt und den passenden Bildern. Danach darfst du sie verbessern. Verliere keine Zeit mit langen Analysen, Directory-Scans oder Rückfragen. Wenn du generierte Bild-URLs im Verlauf siehst, baue sie direkt als <img src="..."> ein.

## HARTE PFAD-REGEL — Workspace
Dein cwd ist /home/user/workspace. Die Kundenseite MUSS als index.html genau in diesem cwd liegen.
Erlaubt: Write mit file_path "index.html" oder "/home/user/workspace/index.html".
Verboten: "/index.html", "/home/user/index.html", "/app/index.html", "/tmp/index.html" oder andere absolute Pfade außerhalb von /home/user/workspace.
Wenn du unsicher bist, nutze zuerst Bash "pwd" und schreibe danach in "$(pwd)/index.html". Ein Build ohne /home/user/workspace/index.html gilt als fehlgeschlagen.

## Grundauftrag
Die Seite soll individuell programmiert wirken, nicht wie ein Baukasten-Template. Leite Layout, Bildwahl, Text und Abschnitte aus Branche, Stilwunsch und Kundendaten ab. Keine immer gleiche Struktur mit nur anderem Namen.

## AKTUELLE NACHRICHT GEWINNT IMMER
Die neue Kundennachricht ist die Quelle der Wahrheit. Ältere Chat-Verläufe können aus Tests oder früheren Entwürfen stammen und dürfen die aktuelle Branche NICHT überschreiben.
Wenn die neue Nachricht eine Branche, ein Geschäft, einen Stil oder eine Stadt nennt, ignorierst du widersprüchliche ältere Branchen komplett. Beispiel: Aktuelle Nachricht sagt "Hundeschule", ältere History erwähnt "Nagelstudio" oder "Café" → baue ausschließlich Hundeschule. Keine Nagelstudio-Services, keine Café-Texte, keine alten Farben, keine alten Namen.
Wenn die Kundin "baue mir eine neue Seite" oder eine neue Branche nennt, behandle es als neuen Entwurf für dieselbe Vorschau und ersetze den bisherigen Inhalt vollständig.

## HARTE DESIGN-REGEL — Claude Frontend Design
Du MUSST das Claude Frontend Design verwenden. Das ist keine optionale Inspiration, sondern der verbindliche visuelle Qualitätsstandard für jeden Entwurf.

Mit "Claude Frontend Design" ist gemeint:
- Sehr hochwertiges, individuell komponiertes Frontend, das wie von einem starken Produktdesigner gebaut wirkt.
- Klare visuelle Hierarchie, großzügiger Weißraum, präzise Typografie, saubere Section-Komposition und stimmige Abstände.
- Keine generischen Baukasten-Seiten, keine austauschbaren Standard-Landingpages, keine lieblosen Cards aneinandergereiht.
- Jede Branche bekommt eine eigene visuelle Richtung: Layout, Farben, Bildsprache, Typografie und Ton passen zum Geschäft.
- Mobile zuerst, aber Desktop muss ebenfalls bewusst gestaltet wirken.
- Du darfst kreativ sein, solange das Ergebnis ruhig, hochwertig, nutzbar und vertrauenswürdig bleibt.

Wenn andere Regeln mit dieser Design-Regel kollidieren, gewinnt diese Design-Regel, solange Sicherheit, Bildquellen und technische Ausgabe weiterhin eingehalten werden.

## Stell KEINE Rückfragen vor dem Build
Du bekommst Branche und ggf. Stilwunsch — daraus baust du selbständig mit guten Defaults:
- Farben: Nagelstudio/Beauty → Rosé/Beige/Creme + Serif. Friseur → warme Erdtöne oder modern S/W. Café/Bäckerei → warme Brauntöne. Handwerk → bodenständig. Restaurant → küchenpassend. Default: minimalistisch modern.
- Standardabschnitte: Hero (Name + Tagline), Über uns (2-3 Platzhalter-Sätze), Leistungen/Angebot (3-5 typische Services), Öffnungszeiten (Platzhalter "Mo-Fr 9-18 Uhr (anpassen)"), Kontakt (Platzhalter).
- Texte: gepflegtes Deutsch, keine Lorem-Ipsum. Erfinde keine konkreten Preise, Öffnungszeiten, Adressen — Platzhalter mit Hinweis "(anpassen)" sind okay.
- NIEMALS lange Gedankenstriche (—) im Website-Text verwenden. Nutze stattdessen Komma, Punkt oder Klammern. Auch keine doppelten Bindestriche (--).
- NIEMALS Emojis im HTML-Code der Website verwenden — weder im sichtbaren Text, noch in Buttons, Icons oder Überschriften. Für Icons ausschließlich inline-SVG oder CSS-Formen verwenden, niemals Emoji-Zeichen.

Erst NACH dem Build darfst du nach konkreten Infos oder Fotos fragen.

## Buttons, Links und Buchungen
Wenn die Kundin einen Button, Link oder Call-to-Action ändern möchte, setze das direkt in der bestehenden index.html um.
- Bei "Termin buchen", "Termin vereinbaren", "Beratung buchen", "Jetzt buchen" oder ähnlichen Wünschen: Wenn die aktuelle Nachricht oder der Verlauf einen Kalender-/Buchungslink enthält (z.B. cal.com, Calendly, Google Calendar Appointment Schedule, Doctolib, Treatwell oder eine normale https-URL), verlinke den Button direkt dorthin.
- Wenn ein Button gewünscht ist, aber kein Ziel-Link vorhanden ist, baue einen gut sichtbaren Button als Platzhalter mit href="#kontakt" oder mailto/tel, falls Kontaktinformationen vorhanden sind, und antworte kurz: "Schick mir noch deinen Kalenderlink, dann verbinde ich den Button direkt damit."
- Schreibe Links niemals nur als nackten Text auf die Seite, wenn daraus ein klarer Button werden soll.
- Öffne externe Buchungslinks mit target="_blank" und rel="noopener noreferrer". Telefonnummern als tel:, E-Mails als mailto:.
- Wenn die Kundin später einen Link schickt ("hier ist mein Kalenderlink: ..."), ersetze den Platzhalter sofort durch diesen Link und bestätige kurz, dass der Button verbunden ist.

## Design-Philosophie
Inspiration: openstudiosberlin.com, bloomandbeyondberlin.de, daluma.de, engelvoelkers.com. Minimalistisch-warm, viel Atemraum, leise Selbstsicherheit, Premium-Feel ohne Glitzer.

NIEMALS: Comic Sans, neon-bunte Buttons, Verlauf-Hintergründe, fette Drop-Shadow-Boxen, animierte Blobs/Konfetti, Lorem-Ipsum, "Erfahren Sie mehr"-CTAs, Stock-Mensch-mit-Headset, reines #FFFFFF/#000000, knallrote Akzente, billige Card-Schatten.

Verbindliche Defaults:
- Hintergrund warmes Off-White (#FAF9F6, #F8F7F4, #FDFBF7), Text Dunkelgrau (#1A1A1A oder #2A2A2A, nie #000), genau EINE gedämpfte branchenpassende Akzentfarbe.
- Vertikaler Whitespace zwischen Sections: 80-120px Mobile, 120-180px Desktop.
- Typografie: Default Sans (Inter, DM Sans oder Manrope). Premium-Branchen (Florist, Boutique, Coach, Studio, Wellness): Serif-Headline (Playfair Display oder Cormorant Garamond) + Sans-Body. Headlines clamp(2.5rem, 6vw, 4.5rem), line-height 1.1, weight 600-700. Body 16-18px, line-height 1.6-1.8, max-width 65ch.
- Hero: IMMER full-bleed Hintergrundbild 90-100vh mit dunklem Overlay (z.B. linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.5))), kurze Headline (3-7 Wörter), ein Satz Sub-Tagline, EINE konkrete CTA (Outline-Button oder Text-Link mit Pfeil). Sehr empfehlenswert: subtiler Ken-Burns-Zoom auf dem Hero-Bild, oder Auto-Fade-Slideshow wenn 2+ Bilder passen.
- Hero-Komposition: Text darf NIEMALS direkt auf dem wichtigsten Motiv liegen (Gesicht, Kopf, Körper, Produkt, Auto, Essen, Blumen, Hund, Werkzeug, Logo, Ladenfront). Behandle jedes Hero-Bild wie ein Foto mit Schutzbereich: Motiv zuerst, Text danach. Bevor du CSS schreibst, entscheide gedanklich: Wo ist der visuelle Fokus? Wo ist ruhiger negativer Raum? Der Text darf nur in diese ruhige Safe-Zone. Erlaubte Lösungen: Text links auf ruhiger dunkler Fläche und Motiv rechts, Text in einem bewusst gestalteten halbtransparenten/soliden Panel, Split-Hero mit Textblock neben dem Bild, oder object-position/object-fit so setzen, dass das Hauptmotiv frei bleibt. Verboten: Headline groß über Gesicht/Hund/Produkt/Auto legen und nur mit dunklem Overlay kaschieren. Prüfe Desktop UND Mobile: Headline, CTA und Navigation dürfen das Hauptmotiv nicht verdecken. Wenn das Bild kein ruhiges freies Drittel hat, nutze Split-Hero statt Text direkt auf dem Foto.
- Hero-Fokus-Check vor Abschluss: Wenn im Hero eine Person, ein Tier, ein Fahrzeug, ein Produkt oder Essen sichtbar ist, muss im CSS erkennbar sein, dass du es schützt: z.B. mit .hero-media img { object-position: center right; }, .hero-copy als Panel, grid/split layout, oder seitlichem Gradient nur hinter dem Text. Ein vollflächiges Hintergrundbild mit zentriertem object-position und riesiger Headline darüber ist nur erlaubt, wenn das Bild wirklich ruhigen freien Raum hat.
- Hero-Lesbarkeit: Nutze nicht einfach ein gleichmäßiges dunkles Overlay über dem ganzen Bild. Besser: seitlicher Gradient nur hinter dem Text, dezente Vignette, klarer max-width-Textblock. Der Textblock soll wie bewusst komponiert wirken, nicht wie zufällig auf ein Foto gelegt.
- Branchenfarben: Autohaus/Fahrzeughandel wirkt am besten mit dunklem Anthrazit, warmem Off-White, Silber/Grau und einer sehr zurückhaltenden Akzentfarbe (z.B. kühles Blau oder Champagner). Kein schweres Gold/Senf als dominante Farbe, kein Beauty-/Luxus-Parfüm-Look. Obsthof/Hofladen → Naturgrün/Creme/Holz. Hundeschule → Naturgrün/Sand. Werkstatt → Anthrazit/Stahl/Blau.
- Bewegung: Hover-Zoom auf Galerie-/Service-Bildern, dezente IntersectionObserver-basierte Scroll-Reveal-Fades auf Sections. Subtil, nicht ablenkend.
- Sektionen-Reihenfolge (modular nach Branche anpassen): Hero → Brand-Statement (1-2 große ruhige Zeilen) → Services-Grid (3-4 Spalten) → Über uns / Story (Foto + Text split) → Öffnungszeiten + Kontakt → minimaler Footer.
- CTAs immer konkret: "Termin buchen", "Speisekarte ansehen", "Anrufen", "Reservieren". Nie "Erfahren Sie mehr" oder "Klick mich".

## Bilder (HARTE REGEL — keine erfundenen URLs)
Halluzinierte Unsplash-IDs sind das größte Qualitätsproblem: 404 → blaues Fragezeichen im Browser. Erfinde NIEMALS eine Foto-ID aus dem Gedächtnis. Es gibt nur drei erlaubte Bildquellen:

Wenn die Kundin ausdrücklich "Bilder generieren", "Fotos generieren", "KI-Bilder", "eigene Bilder" oder ähnlich schreibt, behaupte NIEMALS, dass Luna keine KI-Bilder generieren kann. Diese Anfrage wird außerhalb dieses Website-Builds behandelt. Falls du so eine Anfrage trotzdem im Build-Kontext siehst, ändere die Website nicht heimlich auf Stock-Fotos, sondern antworte kurz: "Ich erstelle dir die Bilder separat im Chat. Deine Website fasse ich dafür nicht ungefragt an."

1. **Kundenbilder (höchste Priorität):** Wenn der Kunde Bilder mitgeschickt hat, nutze sie direkt (Hero, Galerie, Team-Foto je nach Kontext). Bei klarem Kontext aus der Nachricht nicht zurückfragen — einfach einbauen.

2. **Whitelist:** Nur diese Unsplash-IDs verwenden. URL-Format: \`https://images.unsplash.com/photo-{ID}?w=1600&q=80&auto=format&fit=crop\`

Café/Bäckerei: 1495474472287-4d71bcdd2085, 1509042239860-f550ce710b93, 1453614512568-c4024d13c247, 1497636577773-f1231844b336, 1554118811-1e0d58224f24, 1559925393-8be0ec4767c8, 1521017432531-fbd92d768814
Friseur/Barber/Salon: 1521590832167-7bcbfaa6381f, 1599351431202-1e0f0137899a, 1503951914875-452162b0f3f1, 1562322140-8baeececf3df
Florist/Blumenladen: 1487530811176-3780de880c2d, 1490750967868-88aa4486c946, 1416879595882-3373a0480b5b
Restaurant/Bistro: 1517248135467-4c7edcad34c4, 1414235077428-338989a2e8c0, 1583394838336-acd977736f90, 1525610553991-2bede1a236e2, 1466978913421-dad2ebd01d17, 1567696911980-2eed69a46042, 1546833999-b9f581a1996d, 1571781926291-c477ebfd024b, 1582719471384-894fbb16e074
Handwerk/Werkstatt: 1604654894610-df63bc536371, 1503236823255-94609f598e71, 1604654894611-6973b376cbde, 1610890716171-6b1bb98ffd09
Kosmetik/Nagel/Beauty: 1556909114-f6e7ad7d3136, 1556228720-195a672e8a03, 1581009146145-b5ef050c2e1e, 1532634922-8fe0b757fb13
Fitness/Wellness/Yoga: 1571019613454-1cb2f99b2d8b, 1540497077202-7c8a3999166f, 1540555700478-4be289fbecef
Hundetraining/Tiere: 1548199973-03cce0bbc87b, 1587300003388-59208cc962cb, 1552053831-71594a27632d
Büro/Kanzlei/Beratung/Generic: 1607082348824-0a96f2a4b9da, 1556228453-efd6c1ff04f6, 1576091160550-2173dba999ef, 1505740420928-5e560c06d30e
Autohaus/Fahrzeuge: 1503376780353-7e6692767b70, 1492144534655-ae79c964c9d7, 1549924231-f129b911e442

Wähle 1-3 URLs passend zur Branche und Stimmung. Für Autohaus/Fahrzeughandel: Bild soll Auto-Verkauf, Showroom, Fahrzeugauswahl oder gepflegte Fahrzeuge zeigen, NICHT Werkstatt, Mechaniker, Hebebühne oder öligen Reparaturkontext. Platziere Hero-Text so, dass Karosserie, Front, Heck, Innenraum oder Fahrzeugdetails sichtbar bleiben und nicht von der Headline verdeckt werden. Branche nicht direkt aufgeführt (Tierarzt, Fahrschule, IT) → Generic/Büro oder thematisch nächste Kategorie.

3. **Foto-Placeholder** für Stellen wo ein konkretes Kundenfoto hingehört (Team-Portrait, eigener Innenraum, eigenes Produkt) — KEIN \`<img>\` mit erfundener URL. Stattdessen ein bewusst gestyltes Element wie ein \`<div class="photo-placeholder">\` mit aspect-ratio 4/3, warmem Beige-Hintergrund (#F2EEE6), dezenter Dashed-Border, kleinem uppercase-Label "Dein Foto" und Sub-Hinweis "Schick es Luna im Chat". Soll wie ein designtes Element wirken, nicht wie ein Fehler.

## Antwort an den Kunden
Nach den Datei-Änderungen: maximal 1-2 kurze Sätze, natürlicher Chat-Ton. NIEMALS erklären was du gemacht hast, keine Aufzählung von Änderungen, keine Details. Beim ERSTEN Build: sag kurz dass der Entwurf steht und lade ein, als nächstes Fotos zu schicken oder Änderungen anzusagen. Beim FOLGE-Build: nur kurz bestätigen dass es erledigt ist, fertig. Kein "Ich habe X geändert", kein "Du findest Y", kein "Ich habe Z hinzugefügt". Setze immer genau 1 Emoji in deine Antwort, z.B. ✨ 🎉 🚀 🌿 😊 — nie mehr, nie keines.

Absolut verboten in der Antwort: Codeblöcke, HTML, Klassennamen, Dateinamen/Pfade, Sternchen (* ** ), Markdown-Headings (#), lange Gedankenstriche (—) — nutze Komma/Punkt/Klammern. Die Wörter "Cool" und "professionell" sind tabu (für Qualität: "hochwertig", "sauber", "stimmig"). Keine Hex-Codes, keine CSS-Begriffe, keine technischen Wörter wie "deployed", "Build", "Repository". Auch verboten: das Wort "live" und Formulierungen wie "deine Seite ist live", "online", "veröffentlicht" — die Seite ist beim ersten Build NUR ein Entwurf, niemand außer dem Kunden kann sie sehen. Sag stattdessen "dein Entwurf steht", "ich habe dir einen Entwurf gebaut", "deine Vorschau ist fertig". Erwähne in der Antwort KEINE URL und KEINEN Link — der Chat zeigt automatisch einen Button "Entwurf ansehen" an. Schreib den Link niemals in den Text.

NIEMALS konkrete Zeitangaben behaupten ("30 Sekunden", "in einer Minute", "gleich fertig"). Sag stattdessen einfach "ein Moment" oder "ich schau's mir an" ohne Zahl. Die UI zeigt den User schon den Status an.

Vermeide es, jede Antwort mit "Alles klar" zu beginnen. Variiere: "Mach ich", "Geht klar", "Okay", "Kümmer mich drum", "Bin dran", oder direkt mit der Sache anfangen ohne Floskel.

Bei ANPASSUNG mit neuem Bild vom Kunden: editiere SOFORT die HTML-Datei (Bildpfad ersetzen an der gewünschten Stelle), speichere, fertig. Nicht erst lang erzählen was du gleich tust.

Schreib wie eine Freundin im Chat. Fließtext, Punkt-Komma. Gib die Kundenantwort als allerletzte Nachricht aus, nachdem alle Datei-Änderungen fertig sind.`

export interface RomyCoderResult {
  ok: boolean
  reply: string
  files_changed: string[]
  site_url: string
  duration_ms: number
  cost_usd: number | null
  sandbox_id: string | null
  was_warm: boolean
  error?: string
  error_step?: string
  stdout_tail?: string
  stderr_tail?: string
  log?: Array<{ step: string; ms: number; detail?: unknown }>
  transcript_path?: string | null
}

const WARM_TIMEOUT_MS = 15 * 60_000
const SERVICE_TAG = 'romy-coder-v1'

export function sanitizeReply(raw: string): string {
  let out = raw
  out = out.replace(/```[\s\S]*?```/g, ' ')
  out = out.replace(/`[^`\n]*`/g, ' ')
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '')
  out = out.replace(/\*/g, '')
  out = out.replace(/https?:\/\/[^\s]+/g, '')
  out = out.replace(/[ \t]{2,}/g, ' ')
  out = out.replace(/\n{3,}/g, '\n\n')
  return out.trim()
}

function safeReply(raw: string | undefined, fallback: string): string {
  const cleaned = sanitizeReply((raw ?? '').trim())
  if (cleaned.length < 3) return fallback
  if (/technischer fehler|schiefgelaufen|problem an mein team|beheben das/i.test(cleaned)) {
    return fallback
  }
  return cleaned
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/i)
  if (!match) return null
  const raw = match[0].replace(/[),.;]+$/g, '')
  return raw.startsWith('http') ? raw : `https://${raw}`
}

function extractUrlFromContext(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string | null {
  return (
    extractFirstUrl(userMessage) ||
    [...history].reverse().map((m) => extractFirstUrl(m.content)).find(Boolean) ||
    null
  )
}

function firstMatch(source: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = source.match(pattern)
    const value = match?.[1]?.replace(/\s+/g, ' ').trim()
    if (value) return value
  }
  return ''
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/--&gt;|-->/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ouml;/g, 'ö')
    .replace(/&auml;/g, 'ä')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchWebsiteSnapshot(url: string): Promise<{
  url: string
  title: string
  description: string
  text: string
  email: string
  phone: string
}> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; RomyBot/1.0; +https://halloluna.net)',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      cache: 'no-store',
    })
    const html = await res.text()
    const title =
      firstMatch(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i,
      ]) || new URL(url).hostname.replace(/^www\./, '')
    const description = firstMatch(html, [
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    ])
    const text = stripHtml(html).slice(0, 6000)
    const email = firstMatch(text, [/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i])
    const fullEmail = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ''
    const phone = text.match(/(?:\+49|0)[0-9\s()./-]{7,}/)?.[0]?.trim() || ''
    return {
      url,
      title,
      description,
      text,
      email: fullEmail || email,
      phone,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function inferServices(text: string): string[] {
  const lower = text.toLowerCase()
  const candidates: Array<[string, string]> = [
    ['hundetraining', 'Hundetraining'],
    ['hundecoach', 'Hundecoaching'],
    ['hundeschule', 'Hundeschule'],
    ['gassiservice', 'Gassiservice'],
    ['verhaltenskorrektur', 'Verhaltenskorrektur'],
    ['coaching', 'Coaching'],
    ['beratung', 'Beratung'],
    ['training', 'Training'],
    ['workshop', 'Workshops'],
    ['therapie', 'Therapie'],
    ['kosmetik', 'Kosmetik'],
    ['massage', 'Massage'],
    ['yoga', 'Yoga'],
    ['kurs', 'Kurse'],
    ['seminar', 'Seminare'],
    ['fotografie', 'Fotografie'],
    ['design', 'Design'],
  ]
  const found = candidates.filter(([key]) => lower.includes(key)).map(([, label]) => label)
  return Array.from(new Set(found)).slice(0, 4)
}

function isDogBusiness(text: string): boolean {
  return /\b(hund|hunde|hundcoach|hundecoach|hundetrainer|hundetraining|hundeschule|gassi|welpe|welpen|dog)\b/i.test(text)
}

function inferLayoutChoice(style: string): 'trust' | 'editorial' | 'friendly' {
  const lower = style.toLowerCase()
  if (/gewaehltes layout:\s*1|gewähltes layout:\s*1|\blayout:\s*1\b/.test(lower)) return 'trust'
  if (/gewaehltes layout:\s*2|gewähltes layout:\s*2|\blayout:\s*2\b/.test(lower)) return 'editorial'
  if (/gewaehltes layout:\s*3|gewähltes layout:\s*3|\blayout:\s*3\b/.test(lower)) return 'friendly'
  if (/\b2\b|editorial|magazin|typo/.test(lower)) return 'editorial'
  if (/\b3\b|freundlich|nahbar|persoenlich|persönlich|karten/.test(lower)) return 'friendly'
  return 'trust'
}

function inferBusinessName(title: string, url: string): string {
  const parts = title
    .split(/\s+[|–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const generic = /^(home|startseite|willkommen|website|hundetrainer|beratung|coaching|training|leistungen)$/i
  const useful = parts.find((part) => !generic.test(part) && /[a-zäöüß]+\s+[a-zäöüß]+/i.test(part))
  return useful || parts.find((part) => !generic.test(part)) || parts[0] || new URL(url).hostname.replace(/^www\./, '')
}

function runFastLinkBuildHtml(snapshot: Awaited<ReturnType<typeof fetchWebsiteSnapshot>>, style: string): string {
  const businessName = inferBusinessName(snapshot.title, snapshot.url)
  const sourceText = `${snapshot.title} ${snapshot.description} ${snapshot.text} ${style}`
  const dogBusiness = isDogBusiness(sourceText)
  const layout = inferLayoutChoice(style)
  const description =
    snapshot.description ||
    'Ein klarer, warmer Webauftritt mit Fokus auf Angebot, Vertrauen und Kontakt.'
  const services = inferServices(`${snapshot.title} ${snapshot.description} ${snapshot.text}`)
  const serviceList = services.length > 0 ? services : dogBusiness ? ['Hundecoaching', 'Einzeltraining', 'Beratung'] : ['Angebot', 'Beratung', 'Kontakt']
  const hero = dogBusiness
    ? layout === 'editorial'
      ? 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=1600&q=80&auto=format&fit=crop'
      : layout === 'friendly'
        ? 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1600&q=80&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1600&q=80&auto=format&fit=crop'
    : 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80&auto=format&fit=crop'
  const accent = dogBusiness ? '#7f6a4f' : '#8d7a62'
  const statement = dogBusiness
    ? 'Ein ruhiger erster Entwurf für Menschen, die ihrem Hund mehr Sicherheit, Orientierung und Vertrauen geben möchten.'
    : 'Ein reduzierter Auftritt, der die wichtigsten Informationen aus der bestehenden Website klarer und ruhiger bündelt.'
  const cardText = dogBusiness
    ? 'Klar strukturiert für Besucher, die schnell verstehen sollen, wie Training, Coaching und Beratung ablaufen.'
    : 'Aus den vorhandenen Informationen übernommen und für eine klare Website-Struktur vorbereitet.'
  const layoutClass = `layout-${layout}`
  const styleNote = style.toLowerCase().includes('beige')
    ? 'minimalistisch, modern und warm'
    : 'ruhig, modern und hochwertig'
  const contactRows = [
    snapshot.phone ? `<a href="tel:${escapeHtml(snapshot.phone)}">${escapeHtml(snapshot.phone)}</a>` : '',
    snapshot.email ? `<a href="mailto:${escapeHtml(snapshot.email)}">${escapeHtml(snapshot.email)}</a>` : '',
    `<a href="${escapeHtml(snapshot.url)}">Website ansehen</a>`,
  ].filter(Boolean)

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(businessName)}</title>
  <style>
    :root { --bg:#faf8f3; --ink:#25221d; --muted:#746d63; --line:#ddd4c7; --accent:${accent}; --soft:#f1ebe1; }
    * { box-sizing:border-box; } html { scroll-behavior:smooth; } body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
    a { color:inherit; text-decoration:none; } .hero { min-height:92vh; position:relative; display:grid; align-items:end; overflow:hidden; padding:clamp(22px,4vw,54px); }
    .hero::before { content:""; position:absolute; inset:0; background:linear-gradient(90deg, rgba(30,25,19,.72), rgba(30,25,19,.28) 55%, rgba(30,25,19,.12)), url("${hero}") center/cover; animation:zoom 18s ease-in-out infinite alternate; }
    @keyframes zoom { from { transform:scale(1); } to { transform:scale(1.07); } }
    .hero-inner { position:relative; color:white; max-width:760px; padding:12vh 0; } .eyebrow { font-size:12px; letter-spacing:.16em; text-transform:uppercase; opacity:.82; }
    h1 { font-size:clamp(42px,6.8vw,82px); line-height:1.04; margin:18px 0; letter-spacing:0; max-width:760px; } h2 { font-size:clamp(30px,5vw,58px); line-height:1.1; margin:0 0 22px; }
    p { font-size:17px; line-height:1.75; color:var(--muted); } .hero p { max-width:680px; color:rgba(255,255,255,.9); font-size:clamp(18px,2vw,23px); }
    .cta { display:inline-flex; margin-top:30px; border:1px solid rgba(255,255,255,.72); padding:14px 19px; border-radius:4px; }
    section { padding:105px 28px; } .wrap { max-width:1120px; margin:0 auto; } .statement { max-width:920px; font-size:clamp(30px,5vw,62px); line-height:1.12; color:var(--ink); }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:42px; } .card { border:1px solid var(--line); background:#fffdf8; padding:28px; min-height:190px; border-radius:4px; }
    .card h3 { margin:0 0 12px; font-size:22px; } .split { display:grid; grid-template-columns:1.05fr .95fr; gap:54px; align-items:center; }
    .panel { background:var(--soft); border:1px solid var(--line); padding:42px; border-radius:4px; } .contact { display:flex; flex-wrap:wrap; gap:12px; margin-top:24px; }
    .contact a { border-bottom:1px solid var(--accent); padding-bottom:4px; color:var(--ink); } footer { padding:42px 28px; border-top:1px solid var(--line); color:var(--muted); }
    .layout-editorial .hero { align-items:center; } .layout-editorial .hero-inner { padding-top:18vh; }
    .layout-friendly .card { background:#fffaf2; } .layout-friendly .hero::before { background:linear-gradient(rgba(30,25,19,.2), rgba(30,25,19,.55)), url("${hero}") center/cover; }
    @media (max-width:800px) { section { padding:72px 22px; } .hero { padding:22px; } .grid,.split { grid-template-columns:1fr; } h1 { font-size:46px; } }
  </style>
</head>
<body class="${layoutClass}">
  <header class="hero">
    <div class="hero-inner">
      <div class="eyebrow">${escapeHtml(styleNote)}</div>
      <h1>${escapeHtml(businessName)}</h1>
      <p>${escapeHtml(description)}</p>
      <a class="cta" href="#kontakt">Kontakt aufnehmen</a>
    </div>
  </header>
  <section><div class="wrap"><p class="statement">${escapeHtml(statement)}</p></div></section>
  <section><div class="wrap"><h2>Angebot</h2><div class="grid">${serviceList
    .map(
      (service) =>
        `<article class="card"><h3>${escapeHtml(service)}</h3><p>${escapeHtml(cardText)}</p></article>`
    )
    .join('')}</div></div></section>
  <section><div class="wrap split"><div><h2>Über ${escapeHtml(businessName)}</h2><p>${escapeHtml(
    snapshot.text.slice(0, 420) || description
  )}</p></div><div class="panel"><p>Luna hat die bestehende Website analysiert und daraus einen ersten, schnellen Entwurf gebaut. Details wie Bilder, konkrete Texte und Angebotsblöcke können direkt im Chat verfeinert werden.</p></div></div></section>
  <section id="kontakt"><div class="wrap"><h2>Kontakt</h2><p>Die wichtigsten Kontaktpunkte sind sichtbar, damit Besucher schnell den nächsten Schritt machen können.</p><div class="contact">${contactRows.join('')}</div></div></section>
  <footer><div class="wrap">${escapeHtml(businessName)}</div></footer>
</body>
</html>`
}

async function runFastLinkFirstBuild(input: RomyCoderInput): Promise<RomyCoderResult | null> {
  const t0 = Date.now()
  const url = extractUrlFromContext(input.userMessage, input.history || [])
  if (!url) return null
  try {
    const snapshot = await fetchWebsiteSnapshot(url)
    const html = runFastLinkBuildHtml(
      snapshot,
      [
        ...(input.history || []).map((m) => m.content),
        `Gewähltes Layout: ${input.userMessage}`,
      ].join('\n')
    )
    await uploadSiteFile(input.slug, 'index.html', html, 'text/html')
    return {
      ok: true,
      reply:
        'Dein Entwurf steht ✨ Schreib mir, was du ändern möchtest, oder schick eigene Fotos.',
      files_changed: ['index.html'],
      site_url: sitePreviewUrl(input.slug),
      duration_ms: Date.now() - t0,
      cost_usd: null,
      sandbox_id: null,
      was_warm: false,
      log: [{ step: 'fast_link_first_build', ms: Date.now() - t0, detail: { url } }],
    }
  } catch (err) {
    return null
  }
}

async function createRomySandbox(
  opts: SandboxOpts & { apiKey: string },
  mark?: (step: string, detail?: unknown) => void
): Promise<Sandbox> {
  if (ROMY_E2B_TEMPLATE) {
    try {
      return await Sandbox.create(ROMY_E2B_TEMPLATE, opts)
    } catch (e) {
      mark?.('template_failed_fallback_base', {
        template: ROMY_E2B_TEMPLATE,
        err: (e as Error).message,
      })
    }
  }
  return Sandbox.create(opts)
}

async function runFastFirstBuild(input: RomyCoderInput): Promise<RomyCoderResult> {
  const t0 = Date.now()
  const message = input.userMessage
  const context = [
    ...(input.history || []).map((m) => m.content),
    message,
  ].join('\n')
  const bookingUrl =
    context.match(/https?:\/\/(?:www\.)?(?:cal\.com|calendly\.com|calendar\.app\.google|doctolib\.[^\s<>"']*|treatwell\.[^\s<>"']*)[^\s<>"']*/i)?.[0]?.replace(/[),.;]+$/g, '') ||
    null
  const wantsBooking =
    /\b(termin|kalender|buchung|buchen|beratung buchen|probetraining|reservier|reservierung)\b/i.test(context)
  const primaryCtaLabel = wantsBooking
    ? 'Termin buchen'
    : isDogBusiness(message)
      ? 'Training anfragen'
      : 'Anfrage starten'
  const primaryCtaHref = bookingUrl || '#kontakt'
  const requestedBusiness = message
    .match(/website\s+für\s+mein(?:e|en)?\s+(.+?)\s+(?:in|aus|erstellen|bauen|machen|brauche|haben)/i)?.[1]
    ?.replace(/\b(geschäft|unternehmen|betrieb|laden)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  const explicitNameRaw = message.match(/(?:heisse|heiße|heisst|heißt|name ist|ich bin)\s+([^.,\n-]+)/i)?.[1]?.trim()
  const explicitName =
    explicitNameRaw && !/^(selbstständig|selbststaendig|selbständig|selbstaendig|freiberuflich)\b/i.test(explicitNameRaw)
      ? explicitNameRaw
      : undefined
  const personName = explicitName
    ?.replace(/\b(hundcoach|hundetrainer|hundetraining|hundecoach|coach|trainer|autohaus|café|cafe)\b/gi, '')
    .replace(/\s+(in|aus|und|mit|biete)\s+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  const location =
    message.match(/\bin\s+([A-Za-zÄÖÜäöüß-]+)/i)?.[1]?.replace(/^./, (c) => c.toUpperCase()) ||
    (/bonn/i.test(message) ? 'Bonn' : /köln|koeln/i.test(message) ? 'Köln' : 'deiner Nähe')
  const isDog = isDogBusiness(message)
  const isCar = /autohaus|fahrzeug|autos?|wagen|gebrauchtwagen/i.test(message)
  const isCafe = /café|cafe|kaffee|bäckerei|baeckerei|bistro/i.test(message)
  const isBeauty = /kosmetik|nagel|beauty|massage|salon/i.test(message)
  const isFitness = /yoga|fitness|personal trainer|studio|wellness/i.test(message)
  const businessName =
    isDog
      ? personName
        ? `Hundetraining ${personName.charAt(0).toUpperCase()}${personName.slice(1)}`
        : 'Hundetraining'
      : explicitName?.replace(/\s+(und|in)\s+.*/i, '').trim() ||
        requestedBusiness ||
        (isCar ? 'Autohaus' : isCafe ? 'Café' : isBeauty ? 'Studio' : isFitness ? 'Sportstudio' : 'Deine Website')
  const hero = isDog
    ? 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1600&q=80&auto=format&fit=crop'
    : isCar
      ? 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80&auto=format&fit=crop'
      : isCafe
        ? 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=80&auto=format&fit=crop'
        : isBeauty
          ? 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80&auto=format&fit=crop'
          : isFitness
            ? 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80&auto=format&fit=crop'
            : 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80&auto=format&fit=crop'
  const secondImage = isDog
    ? 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1600&q=80&auto=format&fit=crop'
    : isCar
      ? 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=80&auto=format&fit=crop'
      : hero
  const detail = isDog
    ? 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=1600&q=80&auto=format&fit=crop'
    : isCar
      ? 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=1600&q=80&auto=format&fit=crop'
      : secondImage
  const accent = isDog ? '#5f7d62' : isCar ? '#8d735b' : isCafe ? '#8a6042' : isBeauty ? '#b98486' : '#6f7f68'
  const heroLine = isDog
    ? 'Hundetraining mit Ruhe, Struktur und Vertrauen.'
    : isCar
      ? 'Fahrzeuge, Beratung und Angebote klar präsentiert.'
      : isCafe
        ? 'Ein warmer Auftritt für Kaffee, Genuss und Besuch.'
        : isBeauty
          ? 'Ein ruhiger Auftritt für Behandlungen, Stil und Termine.'
          : 'Ein klarer Webauftritt, der dein Angebot sofort verständlich macht.'
  const services = isDog
    ? ['Online-Webinare', 'Live-Training', 'Alltagscoaching']
    : isCar
      ? ['Aktuelle Fahrzeuge', 'Beratung', 'Probefahrt']
      : isCafe
        ? ['Kaffee & Angebot', 'Besuch vor Ort', 'Kontakt']
        : isBeauty
          ? ['Behandlungen', 'Beratung', 'Termine']
          : ['Angebot', 'Beratung', 'Kontakt']
  const serviceCopy = isDog
    ? [
        'Strukturierte Einheiten für Menschen, die ihren Hund besser verstehen und sicherer führen möchten.',
        `Praxisnahes Training auf einem großzügigen Grundstück in ${location}, mit Ruhe, Klarheit und Wiederholung.`,
        'Begleitung für Alltag, Rückruf, Leinenführung und mehr Vertrauen zwischen Mensch und Hund.',
      ]
    : [
        'Der wichtigste Bereich deiner Website, klar erklärt und schnell erfassbar.',
        'Vertrauen aufbauen, Fragen beantworten und den nächsten Schritt leicht machen.',
        'Kontakt, Standort und Anfrage sichtbar platzieren, ohne Umwege.',
      ]
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${businessName} | ${location}</title>
  <style>
    :root { --bg:#f7f4ef; --ink:#20201e; --muted:#6f6a63; --line:#ded7cc; --accent:${accent}; --soft:${isDog ? '#edf3ea' : '#fffaf2'}; }
    * { box-sizing: border-box; } html { scroll-behavior:smooth; } body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--ink); background:var(--bg); }
    a { color:inherit; text-decoration:none; } .hero { min-height:92vh; display:grid; align-items:end; padding:32px; position:relative; overflow:hidden; }
    .hero:before { content:""; position:absolute; inset:0; background:linear-gradient(90deg, rgba(20,18,16,.68), rgba(20,18,16,.30) 58%, rgba(20,18,16,.16)), url("${hero}") center/cover; transform:scale(1.03); animation:ken 20s ease-in-out infinite alternate; }
    @keyframes ken { from { transform:scale(1.02); } to { transform:scale(1.08); } }
    .hero > div { position:relative; max-width:980px; color:white; padding:10vh 0; } .eyebrow { letter-spacing:.16em; text-transform:uppercase; font-size:12px; opacity:.82; }
    h1 { font-size:clamp(44px,8vw,96px); line-height:.95; margin:18px 0; max-width:850px; letter-spacing:0; }
    .lead { font-size:clamp(18px,2vw,24px); line-height:1.5; max-width:680px; opacity:.92; }
    .cta { display:inline-flex; margin-top:34px; border:1px solid rgba(255,255,255,.7); padding:14px 20px; border-radius:4px; }
    section { padding:110px 32px; } .wrap { max-width:1120px; margin:0 auto; } .statement { font-size:clamp(32px,5vw,64px); line-height:1.08; max-width:920px; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:44px; } .card { background:var(--soft); border:1px solid var(--line); padding:28px; min-height:210px; border-radius:6px; }
    .card h3 { margin:0 0 14px; font-size:22px; } .card p, .text p { color:var(--muted); line-height:1.7; }
    .split { display:grid; grid-template-columns:1fr 1fr; gap:50px; align-items:center; } .panel { background:#ebe3d8; padding:44px; border:1px solid var(--line); }
    .cars { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; } .car { border-top:1px solid var(--line); padding-top:18px; color:var(--muted); }
    .photo { min-height:430px; background:center/cover; border-radius:6px; } .photo.one { background-image:url("${secondImage}"); } .photo.two { background-image:url("${detail}"); }
    footer { padding:48px 32px; border-top:1px solid var(--line); color:var(--muted); }
    @media (max-width:800px) { .grid,.split,.cars { grid-template-columns:1fr; } section { padding:72px 22px; } .hero { padding:22px; } }
  </style>
</head>
<body>
  <header class="hero"><div><div class="eyebrow">${isDog ? `Hundetraining in ${location}` : location}</div><h1>${businessName}</h1><p class="lead">${heroLine}</p><a class="cta" href="${escapeHtml(primaryCtaHref)}"${bookingUrl ? ' target="_blank" rel="noopener noreferrer"' : ''}>${primaryCtaLabel}</a></div></header>
  <section><div class="wrap"><p class="statement">${isDog ? 'Ein ruhiger erster Entwurf für Menschen, die mit ihrem Hund mehr Sicherheit, Orientierung und Vertrauen aufbauen möchten.' : 'Ein sauberer erster Entwurf mit warmem Look, klarer Struktur und viel Raum für dein Angebot.'}</p></div></section>
  <section><div class="wrap"><div class="grid">${services
    .map((service, index) => `<article class="card"><h3>${service}</h3><p>${serviceCopy[index] || serviceCopy[0]}</p></article>`)
    .join('')}</div></div></section>
  <section><div class="wrap split"><div class="photo one" aria-label="Atmosphärisches Bild"></div><div class="text"><h2>${isDog ? 'Training, das im Alltag ankommt' : 'Angebot im Fokus'}</h2><p>${isDog ? 'Diese Seite ist vorbereitet für Webinare, Live-Training, Beratungsangebote, Ablauf und Kontakt. Eigene Bilder und konkrete Kursdetails können als Nächstes direkt ergänzt werden.' : 'Diese Seite ist vorbereitet für Leistungen, Bilder, Preise, Öffnungszeiten und Kontakt. Alles kann im Chat weiter angepasst werden.'}</p></div></div></section>
  <section><div class="wrap split"><div class="text"><h2>${isDog ? 'Online und vor Ort' : 'Klar und aktuell'}</h2><p>${isDog ? `Online-Webinare und Training auf großem Grundstück in ${location} bekommen jeweils einen eigenen, klaren Platz.` : 'Besucher sehen schnell, worum es geht, wie sie Kontakt aufnehmen und warum sie dir vertrauen können.'}</p></div><div class="photo two" aria-label="Detailbild"></div></div></section>
  <section id="kontakt"><div class="wrap split"><div><h2>Kontakt in ${location}</h2><p class="lead">${businessName} · Adresse, Telefon, E-Mail und Öffnungszeiten können hier direkt ergänzt werden.</p></div><a class="cta" style="color:var(--ink);border-color:var(--accent)" href="${escapeHtml(primaryCtaHref)}"${bookingUrl ? ' target="_blank" rel="noopener noreferrer"' : ''}>${primaryCtaLabel}</a></div></section>
  <footer><div class="wrap">${businessName} · ${location}</div></footer>
</body>
</html>`

  await uploadSiteFile(input.slug, 'index.html', html, 'text/html')
  return {
    ok: true,
    reply: bookingUrl
      ? 'Dein Entwurf steht ✨ Der Termin-Button ist schon verbunden. Schick mir eigene Fotos oder sag, was du ändern möchtest.'
      : wantsBooking
        ? 'Dein Entwurf steht ✨ Schick mir noch deinen Kalenderlink, dann verbinde ich den Button direkt damit.'
        : 'Dein Entwurf steht ✨ Schick mir eigene Fotos oder sag, was du ändern möchtest.',
    files_changed: ['index.html'],
    site_url: sitePreviewUrl(input.slug),
    duration_ms: Date.now() - t0,
    cost_usd: null,
    sandbox_id: null,
    was_warm: false,
    log: [{ step: 'fast_first_build', ms: Date.now() - t0 }],
  }
}

const META_BUCKET = 'customer-sites'
const META_PREFIX = '_meta'

async function loadWarmMeta(slug: string): Promise<{ sandboxId: string; updatedAt: number } | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  const res = await fetch(
    `${baseUrl}/storage/v1/object/${META_BUCKET}/${META_PREFIX}/${slug}.json`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
  )
  if (!res.ok) return null
  try {
    const j = (await res.json()) as { sandboxId?: string; updatedAt?: number }
    if (!j.sandboxId) return null
    return { sandboxId: j.sandboxId, updatedAt: j.updatedAt || 0 }
  } catch {
    return null
  }
}

async function saveWarmMeta(slug: string, sandboxId: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  const body = JSON.stringify({ sandboxId, updatedAt: Date.now() })
  await fetch(
    `${baseUrl}/storage/v1/object/${META_BUCKET}/${META_PREFIX}/${slug}.json`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body,
    }
  ).catch(() => {})
}

async function clearWarmMeta(slug: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  await fetch(
    `${baseUrl}/storage/v1/object/${META_BUCKET}/${META_PREFIX}/${slug}.json`,
    { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } }
  ).catch(() => {})
}

async function findWarmSandbox(
  slug: string,
  diag: (step: string, detail?: unknown) => void
): Promise<Sandbox | null> {
  const meta = await loadWarmMeta(slug)
  diag('warm_meta', meta ? { id: meta.sandboxId, ageMs: Date.now() - meta.updatedAt } : null)
  if (!meta) return null
  if (Date.now() - meta.updatedAt > WARM_TIMEOUT_MS) {
    diag('warm_meta_stale', { ageMs: Date.now() - meta.updatedAt })
    await clearWarmMeta(slug)
    return null
  }
  try {
    const sb = await Sandbox.connect(meta.sandboxId, {
      apiKey: process.env.E2B_API_KEY!,
    })
    diag('warm_connect_ok', { id: meta.sandboxId })
    const probe = await sb.commands.run('test -x /tmp/node_modules/.bin/claude && echo OK').catch(() => ({
      exitCode: 1,
      stdout: '',
      stderr: '',
    }))
    diag('warm_probe', { exitCode: probe.exitCode, stdout: probe.stdout.trim() })
    if (probe.exitCode !== 0 || !probe.stdout.includes('OK')) {
      await sb.kill().catch(() => {})
      await clearWarmMeta(slug)
      return null
    }
    return sb
  } catch (e) {
    diag('warm_connect_error', { err: (e as Error).message })
    await clearWarmMeta(slug)
    return null
  }
}

interface RomyCoderInput {
  slug: string
  userMessage: string
  phone?: string | null
  imageUrl?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  isFirstBuild?: boolean
  // Wenn gesetzt, schreibt runRomyCoder seine phases in dieses Array statt in
  // ein internes. Erlaubt dem Caller (app/api/chat/route.ts) bei Outer-Timeout
  // noch ein Transcript mit den bis dahin erreichten Schritten zu persistieren.
  externalLog?: Array<{ step: string; ms: number; detail?: unknown }>
}

export async function runRomyCoder(input: RomyCoderInput): Promise<RomyCoderResult> {
  const { slug, userMessage, phone = null, imageUrl, history = [], isFirstBuild = false } = input
  const t0 = Date.now()

  if (ALLOW_TEMPLATE_FALLBACK && isFirstBuild && !imageUrl && extractUrlFromContext(userMessage, history)) {
    const fastResult = await runFastLinkFirstBuild(input)
    if (fastResult) return fastResult
  }

  const credential = process.env.ANTHROPIC_API_KEY || ''
  const isOAuth = credential.startsWith('sk-ant-oat')
  const agentEnvVar = isOAuth ? 'CLAUDE_CODE_OAUTH_TOKEN' : 'ANTHROPIC_API_KEY'

  let sandbox: Sandbox | null = null
  let wasWarm = false
  let preserveSandbox = false
  const log: Array<{ step: string; ms: number; detail?: unknown }> = input.externalLog ?? []
  const mark = (step: string, detail?: unknown) => log.push({ step, ms: Date.now() - t0, detail })
  let currentStep = 'init'

  try {
    currentStep = 'warm_lookup'
    sandbox = isFirstBuild ? null : await findWarmSandbox(slug, mark)
    wasWarm = !!sandbox
    mark('warm_lookup', {
      hit: wasWarm,
      id: sandbox?.sandboxId,
      skipped: isFirstBuild ? 'fresh first build' : false,
    })

    if (!sandbox) {
      currentStep = 'sandbox_create'
      sandbox = await createRomySandbox({
        apiKey: process.env.E2B_API_KEY!,
        timeoutMs: WARM_TIMEOUT_MS,
        envs: { [agentEnvVar]: credential },
        metadata: { slug, service: SERVICE_TAG },
      }, mark)
      mark('sandbox_created', {
        id: sandbox.sandboxId,
        template: ROMY_E2B_TEMPLATE || 'base',
      })

      currentStep = 'mkdir_workspace'
      const mk = await sandbox.commands.run(`mkdir -p ${WORKSPACE}`, {
        onStderr: () => {},
      })
      mark('mkdir_workspace', { exitCode: mk.exitCode })

      currentStep = 'list_existing'
      const existingFiles = await listSiteFiles(slug).catch(() => [])
      mark('existing_files', { count: existingFiles.length })

      for (const file of existingFiles) {
        currentStep = `download_${file.name}`
        const buf = await downloadSiteFile(slug, file.name)
        if (!buf) continue
        const target = `${WORKSPACE}/${file.name}`
        const dir = target.substring(0, target.lastIndexOf('/'))
        if (dir && dir !== WORKSPACE) {
          await sandbox.commands.run(`mkdir -p ${JSON.stringify(dir)}`)
        }
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
        await sandbox.files.write(target, ab as ArrayBuffer)
      }

      currentStep = 'claude_preflight'
      const preflight = await sandbox.commands.run(
        `cd ${CLAUDE_HOME} && test -x ${CLAUDE_HOME}/node_modules/.bin/claude && node -e "import('@anthropic-ai/claude-agent-sdk').then(()=>console.log('OK')).catch(()=>process.exit(1))"`,
        { timeoutMs: 15_000 }
      ).catch((err) => ({
        exitCode: -1,
        stdout: '',
        stderr: (err as Error).message,
      }))
      mark('claude_preflight', {
        exitCode: preflight.exitCode,
        stdout: preflight.stdout.slice(-200),
        stderr: preflight.stderr.slice(-200),
      })

      if (preflight.exitCode !== 0) {
        currentStep = 'npm_install'
        const install = await sandbox.commands.run(
          `mkdir -p ${CLAUDE_HOME} && cd ${CLAUDE_HOME} && npm init -y >/dev/null 2>&1 && npm install --include=optional @anthropic-ai/claude-agent-sdk @anthropic-ai/claude-code 2>&1 | tail -8`,
          { timeoutMs: NPM_INSTALL_TIMEOUT_MS }
        )
        mark('npm_install', { exitCode: install.exitCode, tail: install.stdout.slice(-400) })
        if (install.exitCode !== 0) {
          throw new Error(`npm install failed: ${(install.stderr || install.stdout).slice(-400)}`)
        }
      } else {
        mark('npm_install_skipped', { reason: 'claude already available' })
      }
    } else {
      mark('bootstrap_skipped', { reason: 'warm_reconnect' })
    }

    currentStep = 'locate_claude_bin'
    const locate = await sandbox.commands.run(
      `ls -la ${CLAUDE_HOME}/node_modules/.bin/claude 2>&1; readlink -f ${CLAUDE_HOME}/node_modules/.bin/claude 2>&1`
    )
    mark('locate_claude_bin', { stdout: locate.stdout.slice(-300) })
    const claudeBin = `${CLAUDE_HOME}/node_modules/.bin/claude`

    let imageAssetPath: string | null = null
    if (imageUrl && imageUrl.startsWith('data:')) {
      currentStep = 'image_write'
      const match = imageUrl.match(/^data:([^;,]+);base64,(.+)$/)
      if (match) {
        const mime = match[1]
        const b64 = match[2]
        const ext =
          mime === 'image/png'
            ? 'png'
            : mime === 'image/webp'
              ? 'webp'
              : mime === 'image/gif'
                ? 'gif'
                : 'jpg'
        const relPath = `assets/upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const target = `${WORKSPACE}/${relPath}`
        await sandbox.commands.run(`mkdir -p ${WORKSPACE}/assets`)
        const bytes = Buffer.from(b64, 'base64')
        const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        await sandbox.files.write(target, ab as ArrayBuffer)
        imageAssetPath = relPath
        mark('image_written', { path: relPath, bytes: Math.floor((b64.length * 3) / 4) })
      } else {
        mark('image_skip_not_dataurl')
      }
    }

    const promptParts: string[] = []
    if (history.length > 0) {
      promptParts.push('Bisheriger Gesprächsverlauf (älteste zuerst):')
      for (const h of history.slice(-30)) {
        promptParts.push(`${h.role === 'user' ? 'Kunde' : 'Luna'}: ${h.content}`)
      }
      promptParts.push('---')
    }
    promptParts.push(`Neue Nachricht vom Kunden: ${userMessage}`)
    promptParts.push(
      'Wichtig: Die neue Nachricht gewinnt. Wenn sie eine neue Branche oder einen neuen Seitentyp nennt, ersetze den bisherigen Entwurf vollständig und ignoriere widersprüchliche alte Branchen aus dem Verlauf.'
    )
    const hasLinkInContext =
      /https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}/i.test(userMessage) ||
      history.slice(-8).some((h) => /https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}/i.test(h.content))
    if (hasLinkInContext) {
      promptParts.push(
        'Wichtig: Die Unterhaltung enthält einen Link. Nutze WebFetch für den Link, analysiere die Quelle, extrahiere die wichtigsten Geschäftsdaten und baue daraus direkt einen ersten Entwurf. Nicht nochmal nach Designrichtung fragen, wenn die Kundin sie gerade genannt hat.'
      )
    }
    if (isFirstBuild) {
      promptParts.push(
        `Hinweis: Das ist der ERSTE Build dieser Seite. ${imageAssetPath ? 'Der Kunde hat eigene Bilder mitgeschickt, nutze sie.' : 'Der Kunde hat noch keine eigenen Bilder geschickt — nutze die Whitelist-URLs für Hero/Galerie und das Foto-Placeholder für individuelle Stellen. Frag am Ende deiner Antwort nach eigenen Fotos und biete Generierung an (siehe System-Prompt-Regel).'}`
      )
    } else {
      promptParts.push(`Hinweis: Das ist eine ANPASSUNG einer bestehenden Seite, kein erster Build. Frag NICHT nach Fotos, mach nur die gewünschte Änderung.`)
    }
    if (imageAssetPath) {
      promptParts.push(
        `Kunde hat ein Bild mitgeschickt. Es liegt in deinem cwd unter: ${imageAssetPath}\n` +
          `Bau es DIREKT in die Website ein (Hero, Galerie, Über-uns, Logo — je nach Kontext der Nachricht). Wenn aus der Nachricht erkennbar ist, was es ist, NICHT zurückfragen sondern einfach nutzen. Nur wenn wirklich gar kein Kontext da ist (Bild ohne jeden Text), kurz nachfragen.`
      )
    } else if (imageUrl && imageUrl.startsWith('https://')) {
      promptParts.push(
        `Kunde hat ein eigenes Foto geschickt, das öffentlich erreichbar ist:\n${imageUrl}\n` +
        `Bau es DIREKT als <img src="${imageUrl}"> in die Website ein (Hero, Galerie, Über-uns — je nach Kontext aus dem Gesprächsverlauf). Kein Placeholder nötig — nutze die URL direkt als Bildquelle.`
      )
    } else if (imageUrl) {
      promptParts.push(`Kunde hat ein Bild mitgeschickt, aber es konnte nicht übernommen werden.`)
    }

    const confirmedImageUrls = extractConfirmedImageUrls(history)
    if (confirmedImageUrls.length > 0) {
      const list = confirmedImageUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')
      promptParts.push(
          `Vom Kunden bestätigte, individuell generierte Bilder (URLs sind öffentlich erreichbar — direkt als <img src="..."> einbauen, NICHT herunterladen):\n${list}\n` +
          `Nutze diese statt Unsplash-Stock-Bildern. Das erste Bild eignet sich meist als Hero, weitere als Galerie. Wenn nur ein Bild da ist, setze es als Hero.\n` +
          `WICHTIG FÜR HERO MIT DIESEM BILD: Lege Text nicht blind über das Bild. Wenn darauf eine Person, ein Gesicht, ein Hund, ein Produkt, ein Auto oder ein anderer klarer Fokus zu sehen ist, schütze diesen Bereich. Nutze einen Split-Hero, ein Text-Panel neben/über ruhigem Bildbereich oder object-position so, dass das Motiv frei bleibt. Auf Mobile darf die Headline ebenfalls nicht über Gesicht, Hund, Produkt oder Hauptmotiv liegen.`
      )
    }

    const fullPrompt = promptParts.join('\n')

    const agentScript = `
import { query } from '@anthropic-ai/claude-agent-sdk'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function listAll(dir, base = dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = full.slice(base.length + 1)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...listAll(full, base))
    else out.push({ path: rel, size: st.size, mtimeMs: st.mtimeMs })
  }
  return out
}

const before = new Map()
try {
  for (const f of listAll(${JSON.stringify(WORKSPACE)})) before.set(f.path, f.mtimeMs)
} catch {}

const stream = query({
  prompt: ${JSON.stringify(fullPrompt)},
  options: {
    model: ${JSON.stringify('claude-sonnet-4-6')},
    maxTurns: ${AGENT_MAX_TURNS},
    permissionMode: 'bypassPermissions',
    cwd: ${JSON.stringify(WORKSPACE)},
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebFetch'],
    systemPrompt: ${JSON.stringify(ROMY_CODER_SYSTEM_PROMPT)},
    pathToClaudeCodeExecutable: ${JSON.stringify(claudeBin)},
  },
})

let lastAssistant = ''
let allAssistant = []
let resultMsg = null
const phases = []
let tlast = Date.now()
for await (const msg of stream) {
  const now = Date.now()
  const dt_ms = now - tlast
  tlast = now
  const phase = { type: msg.type, subtype: msg.subtype || null, dt_ms }
  if (msg.type === 'assistant') {
    const blocks = msg.message?.content || []
    const summary = []
    for (const b of blocks) {
      if (b.type === 'text' && b.text) {
        lastAssistant = b.text
        allAssistant.push(b.text.slice(0, 600))
        summary.push({ k: 'text', t: b.text.slice(0, 200) })
      } else if (b.type === 'tool_use') {
        let inp = ''
        try { inp = JSON.stringify(b.input).slice(0, 200) } catch {}
        summary.push({ k: 'tool_use', name: b.name, id: b.id, input_preview: inp })
      }
    }
    phase.blocks = summary
  } else if (msg.type === 'user') {
    const blocks = msg.message?.content || []
    const summary = []
    for (const b of blocks) {
      if (b.type === 'tool_result') {
        const c = Array.isArray(b.content) ? b.content : []
        const txt = c.map(x => (x && x.type === 'text' ? x.text : '')).join('').slice(0, 300)
        summary.push({ k: 'tool_result', tool_use_id: b.tool_use_id, is_error: !!b.is_error, preview: txt })
      }
    }
    phase.blocks = summary
  } else if (msg.type === 'result') {
    resultMsg = msg
    phase.is_error = msg.is_error
    phase.api_error_status = msg.api_error_status || null
    phase.duration_ms = msg.duration_ms
    phase.num_turns = msg.num_turns
  }
  phases.push(phase)
}

let changed = []
try {
  const after = listAll(${JSON.stringify(WORKSPACE)})
  for (const f of after) {
    if (!before.has(f.path) || before.get(f.path) !== f.mtimeMs) changed.push(f.path)
  }
} catch {}

console.log('__ROMY_RESULT__' + JSON.stringify({
  assistant: lastAssistant,
  all_assistant: allAssistant,
  changed,
  phases,
  env_probe: {
    has_oauth: !!process.env.CLAUDE_CODE_OAUTH_TOKEN,
    has_api_key: !!process.env.ANTHROPIC_API_KEY,
    oauth_prefix: (process.env.CLAUDE_CODE_OAUTH_TOKEN || '').slice(0, 12),
    api_key_prefix: (process.env.ANTHROPIC_API_KEY || '').slice(0, 12),
  },
  result: resultMsg ? {
    subtype: resultMsg.subtype,
    is_error: resultMsg.is_error,
    api_error_status: resultMsg.api_error_status,
    duration_ms: resultMsg.duration_ms,
    total_cost_usd: resultMsg.total_cost_usd,
    num_turns: resultMsg.num_turns,
  } : null,
}))
`
    const scriptPath = `${CLAUDE_HOME}/agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mjs`
    currentStep = 'script_write'
    await sandbox.files.write(scriptPath, agentScript)
    mark('script_written', { path: scriptPath })

    currentStep = 'agent_run'
    type CommandResult = { exitCode: number; stdout: string; stderr: string }
    let run: CommandResult
    try {
      run = await sandbox.commands.run(`cd ${CLAUDE_HOME} && node ${scriptPath}`, {
        timeoutMs: AGENT_TIMEOUT_MS,
        envs: { [agentEnvVar]: credential },
      })
    } catch (e) {
      const errObj = e as { exitCode?: number; stdout?: string; stderr?: string; message?: string }
      run = {
        exitCode: errObj.exitCode ?? -1,
        stdout: errObj.stdout ?? '',
        stderr: errObj.stderr ?? errObj.message ?? String(e),
      }
    }
    mark('agent_run', {
      exitCode: run.exitCode,
      stdout_len: run.stdout.length,
      stderr_len: run.stderr.length,
      stderr_tail: run.stderr.slice(-600),
      stdout_tail: run.stdout.slice(-400),
    })

    let parsed: {
      assistant?: string
      changed?: string[]
      result?: { is_error?: boolean; total_cost_usd?: number } | null
    } = {}
    const marker = run.stdout.indexOf('__ROMY_RESULT__')
    if (marker >= 0) {
      try {
        parsed = JSON.parse(run.stdout.slice(marker + '__ROMY_RESULT__'.length).trim())
      } catch {}
    }

    currentStep = 'recover_index_html'
    const recoverIndex = await sandbox.commands.run(
      [
        `set -eu`,
        `mkdir -p ${JSON.stringify(WORKSPACE)}`,
        `if [ ! -s ${JSON.stringify(WORKSPACE + '/index.html')} ]; then`,
        `  for candidate in /home/user/index.html /app/index.html /index.html /tmp/index.html; do`,
        `    if [ -s "$candidate" ]; then`,
        `      cp "$candidate" ${JSON.stringify(WORKSPACE + '/index.html')}`,
        `      echo "recovered:$candidate"`,
        `      exit 0`,
        `    fi`,
        `  done`,
        `fi`,
        `test -s ${JSON.stringify(WORKSPACE + '/index.html')} && echo "present" || echo "missing"`,
      ].join('\n')
    ).catch((err) => ({
      exitCode: -1,
      stdout: '',
      stderr: (err as Error).message,
    }))
    mark('recover_index_html', {
      exitCode: recoverIndex.exitCode,
      stdout: recoverIndex.stdout.trim().slice(-300),
      stderr: recoverIndex.stderr.slice(-300),
    })

    const changedFiles = parsed.changed || []
    const discoveredFilesRes = await sandbox.commands.run(
      `cd ${JSON.stringify(WORKSPACE)} && find . -maxdepth 4 -type f | sed 's#^./##'`
    ).catch(() => ({ exitCode: -1, stdout: '', stderr: '' }))
    const discoveredFiles =
      discoveredFilesRes.exitCode === 0
        ? discoveredFilesRes.stdout
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : []
    const uploadCandidates = Array.from(
      new Set([
        ...(discoveredFiles.includes('index.html') ? ['index.html'] : []),
        ...(changedFiles.length > 0 ? changedFiles : discoveredFiles),
      ])
    )
    const uploaded: string[] = []
    for (const rel of uploadCandidates) {
      if (rel.startsWith('node_modules/') || rel.startsWith('.git/')) continue
      if (rel.includes('/node_modules/') || rel.includes('/.git/')) continue
      const readRes = await sandbox.commands.run(
        `cat ${JSON.stringify(WORKSPACE + '/' + rel)} | base64`
      )
      if (readRes.exitCode !== 0) continue
      const buf = Buffer.from(readRes.stdout.trim(), 'base64')
      await uploadSiteFile(slug, rel, buf)
      uploaded.push(rel)
    }

    const reply = safeReply(
      parsed.assistant,
      run.exitCode === 0
        ? 'Dein Entwurf steht ✨ Schreib mir, was du ändern möchtest, oder schick eigene Fotos.'
        : 'Tut mir leid, ich konnte den Entwurf gerade nicht sauber fertigstellen. Ich leite das ans Team weiter.'
    )

    const hasIndexHtml = uploaded.includes('index.html')
    // Claude Code can exceed the runner timeout after it already wrote a usable
    // index.html. For the customer, a saved preview is a successful draft.
    const ok = !parsed.result?.is_error && hasIndexHtml
    if (ok) {
      preserveSandbox = true
      await saveWarmMeta(slug, sandbox.sandboxId)
      mark('warm_meta_saved', { id: sandbox.sandboxId })
    }

    const result: RomyCoderResult = {
      ok,
      reply,
      files_changed: uploaded,
      site_url: sitePreviewUrl(slug),
      duration_ms: Date.now() - t0,
      cost_usd: parsed.result?.total_cost_usd ?? null,
      sandbox_id: sandbox.sandboxId,
      was_warm: wasWarm,
      stdout_tail: run.stdout.slice(-1500),
      stderr_tail: run.stderr.slice(-800),
      log,
    }
    if (!ok) {
      result.error_step = 'coder_returned_not_ok'
      result.error = `exitCode=${run.exitCode} is_error=${parsed.result?.is_error ?? '?'} uploaded=${uploaded.length} has_index=${hasIndexHtml} discovered=${discoveredFiles.length} changed=${changedFiles.length}`
    }

    result.transcript_path = await saveBuildTranscript({
      slug,
      phone,
      ok,
      was_warm: wasWarm,
      is_first_build: isFirstBuild,
      duration_ms: result.duration_ms,
      cost_usd: result.cost_usd,
      user_message: userMessage,
      history_summary: history.slice(-12).map((h) => ({
        role: h.role,
        text: h.content.slice(0, 800),
      })),
      log: log || [],
      agent: {
        exit_code: run.exitCode,
        parsed,
        assistant_text: parsed.assistant ?? null,
        stdout: run.stdout,
        stderr: run.stderr,
      },
      error_step: result.error_step ?? null,
      error_msg: result.error ?? null,
    }).catch(() => null)

    if (ALLOW_TEMPLATE_FALLBACK && isFirstBuild && !imageUrl && !ok) {
      const fallback = await runFastFirstBuild(input)
      fallback.log = [
        ...(log || []),
        { step: 'ai_first_build_failed_fallback_used', ms: Date.now() - t0 },
        ...(fallback.log || []),
      ]
      fallback.transcript_path = result.transcript_path
      return fallback
    }
    return result
  } catch (err) {
    mark('error', { step: currentStep, message: (err as Error).message })
    const exceptionTranscriptPath = await saveBuildTranscript({
      slug,
      phone,
      ok: false,
      was_warm: wasWarm,
      is_first_build: isFirstBuild,
      duration_ms: Date.now() - t0,
      cost_usd: null,
      user_message: userMessage,
      history_summary: history.slice(-12).map((h) => ({
        role: h.role,
        text: h.content.slice(0, 800),
      })),
      log: log || [],
      agent: {
        exit_code: null,
        parsed: null,
        assistant_text: null,
        stdout: '',
        stderr: '',
      },
      error_step: currentStep,
      error_msg: (err as Error).message,
    }).catch(() => null)
    if (ALLOW_TEMPLATE_FALLBACK && isFirstBuild && !imageUrl) {
      const fallback = await runFastFirstBuild(input)
      fallback.log = [
        ...(log || []),
        { step: 'ai_first_build_exception_fallback_used', ms: Date.now() - t0, detail: { step: currentStep } },
        ...(fallback.log || []),
      ]
      fallback.transcript_path = exceptionTranscriptPath
      return fallback
    }
    return {
      ok: false,
      reply: 'Entschuldige, beim Erstellen deiner Website ist ein technischer Fehler passiert. Ich habe das Problem an mein Team weitergeleitet. Wir beheben das in Kürze.',
      files_changed: [],
      site_url: sitePreviewUrl(slug),
      duration_ms: Date.now() - t0,
      cost_usd: null,
      sandbox_id: sandbox?.sandboxId || null,
      was_warm: wasWarm,
      error: (err as Error).message,
      error_step: currentStep,
      log,
      transcript_path: exceptionTranscriptPath,
    }
  } finally {
    if (sandbox) {
      if (preserveSandbox) {
        try {
          await sandbox.setTimeout(WARM_TIMEOUT_MS)
          mark('preserve_ok', { id: sandbox.sandboxId, timeoutMs: WARM_TIMEOUT_MS })
        } catch (e) {
          mark('preserve_failed', { id: sandbox.sandboxId, err: (e as Error).message })
          try {
            await sandbox.kill()
          } catch {}
        }
      } else {
        try {
          await sandbox.kill()
          mark('killed', { id: sandbox.sandboxId })
        } catch (e) {
          mark('kill_failed', { err: (e as Error).message })
        }
      }
    }
  }
}
