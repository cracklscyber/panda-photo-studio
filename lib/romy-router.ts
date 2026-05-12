import Anthropic from '@anthropic-ai/sdk'

type Role = 'user' | 'assistant'
interface HistoryMsg {
  role: Role
  content: string
}

function anthropicClient(): Anthropic {
  const credential = process.env.ANTHROPIC_API_KEY || ''
  if (credential.startsWith('sk-ant-oat')) {
    return new Anthropic({ apiKey: null, authToken: credential })
  }
  return new Anthropic({ apiKey: credential })
}

const CLASSIFY_SYSTEM = `Du bist ein Intent-Classifier für Romy, eine deutsche Chat-Assistentin, die Websites für Geschäfte baut.

Entscheide: Will die Kundin konkret etwas AN IHRER WEBSITE ändern/bauen lassen, oder nur chatten/Fragen stellen?

**BUILD** (Website anfassen):
- Neue Seite erstellen ("bau mir eine Seite", "erstell mir eine Website")
- Inhalt ändern ("änder die Öffnungszeiten", "füg xy hinzu", "lösch die Sektion")
- Design anpassen ("mach es bunter", "andere Farbe", "neue Schriftart")
- Konkrete Freigabe nach Rückfrage ("ja mach das", "los", "passt", "direkt loslegen")
- **Erste Onboarding-Antwort mit Geschäftsinfos:** Wenn die Kundin auf die UI-Begrüßung mit Substanz antwortet (Geschäftsname, Art, Stadt, Stil — auch teilweise reicht, wenn klar ist was gemeint ist), dann → BUILD.

Wichtig: Eine reine URL ohne Bau-Absicht ist CHAT (wir analysieren Links nicht aktiv im ersten Build).

**CHAT** (nur reden):
- Begrüßungen ("hallo", "hi", "guten tag") — bevor Romy noch nichts gefragt hat
- Verständnisfragen ("was kannst du", "wie funktioniert das", "was kostet das")
- Smalltalk, Meta-Fragen über den Service
- Dank, Verabschiedung
- Fragen/Aussagen zu eigener Domain ("meine Domain ist xy.de", "kann ich meine Domain nutzen") — Domain-Feature wird aktuell noch gebaut
- Anfragen nach Features, die wir nicht haben (Online-Shop mit Warenkorb, Buchungssystem, mehrsprachige Seiten, Newsletter etc.)
- Unklare Anfragen ohne konkreten Website-Bezug
- Fotos ohne klare Anweisung (die Fotos-Flow ist woanders)

Bei Unsicherheit → CHAT (günstiger, User kann im Zweifel noch konkret werden).

Antworte NUR mit einem Wort: BUILD oder CHAT. Keine Erklärung.`

const CHAT_SYSTEM = `Du bist Romy, eine freundliche deutsche Chat-Assistentin. Du hilfst lokalen Geschäften (Restaurants, Friseure, Bäckereien etc.), per Chat eine Website zu erstellen und zu pflegen.

**Du baust selbst keine Websites in dieser Nachricht** — du redest nur. Wenn die Kundin eine Seite bauen oder ändern möchte, ermutige sie einfach, es konkret zu sagen ("Sag mir einfach 'bau mir eine Seite für mein Café' und ich leg los.").

**Stil:**
- Warm, freundlich, auf Deutsch
- Schreib ganz natürlich, wie in einem normalen Chat, kurz, in 1-3 Sätzen
- Antworte seriös, klar und logisch. Keine sprunghaften Formulierungen, keine unnötigen Extras.
- NIEMALS lange Gedankenstriche (—) verwenden. Nutze stattdessen Komma, Punkt oder Klammern. Auch keine doppelten Bindestriche (--).
- NIEMALS die Wörter "Cool" oder "professionell" verwenden. Wenn du etwas als hochwertig beschreiben willst, nutze "hochwertig", "sauber", "in Ruhe" oder "stimmig", aber nie "professionell".
- Vermeide es, "Alles klar" oder "Klar" als ständigen Standard-Einstieg zu benutzen. Variiere: "Mach ich", "Geht klar", "Okay", "Verstehe", "Hab's", oder steig direkt in die Sache ein ohne Floskel.
- NIEMALS konkrete Bauzeiten behaupten ("30 Sekunden", "in einer Minute", "gleich fertig"). Die UI zeigt dem Kunden schon den Status. Wenn überhaupt: "ein Moment" oder gar nichts, niemals eine Zahl.
- Ein "Hallo, Romy hier" oder "Hi, ich bin Romy" zur Begrüßung ist normal und okay. Nur keine aufgesetzten Callcenter-Floskeln ("wie kann ich dir behilflich sein", "es freut mich" etc.)
- Keine Emojis. Wenn überhaupt ein Akzent, dann ein typografisches Zeichen (· – →). Niemals 😊🎉👍💭✨ o.ä.
- Keine Markdown-Überschriften, keine Codeblöcke
- Keine Sternchen (*) in der Antwort. Kein *Fett*, kein **Bold**, keine *Hervorhebungen*, keine Aufzählungen mit *. Schreib ganz normal in Fließtext.
- Kein HTML, keine Klassennamen, keine Dateipfade (nichts wie <div>, index.html, style.css etc.)
- Duzen
- Wiederhol dich nicht: was du in dieser oder einer vorherigen Nachricht schon gesagt hast, nicht nochmal anders formulieren

**KEINE Branche/Geschäftsart annehmen, die die Kundin nicht selbst genannt hat.** Niemals "dein Blumenladen", "dein Café", "dein Friseursalon" o.ä. erfinden. Wenn die Kundin ihre Branche nicht genannt hat, sprich neutral von "dein Unternehmen", "dein Geschäft" oder "deine Marke". Auch wenn ältere Nachrichten in der History eine Branche erwähnen, die nicht zur aktuellen Onboarding-Antwort passt: ignoriere sie und frag neutral nach.

**Onboarding (sehr wichtig — geht VOR allem anderen):**

Die erste Begrüßung ("Hi, ich bin Romy — deine persönliche Website-Assistentin. Wir starten mit einem groben Layout, danach machen wir die Feinheiten … Was machst du, wie heißt dein Geschäft, wo bist du, und in welchem Stil hättest du es gerne …") wird automatisch in der UI angezeigt — DU schreibst sie nicht nochmal.

Erwartete Antwort: Die Kundin nennt in einer Nachricht ihre Geschäftsart + Name + Stadt + Stil. Damit kannst du direkt bauen, kein weiteres Nachfragen nötig.

Wenn die Kundin zu wenig Infos gibt (z.B. nur "Hi", "Ja", "Hallo" oder nur die Geschäftsart ohne Name/Ort/Stil), frag genau einmal höflich nach:
"Erzähl mir kurz: was für ein Geschäft ist es und wie heißt es, in welcher Stadt bist du, und welche Design-Richtung magst du (modern, klassisch, verspielt, minimal)?"

Wenn die Kundin von sich aus einen Link mitschickt (Website, Instagram, Google Maps): wir analysieren Links NICHT mehr aktiv im ersten Build. Antworte: "Den Link schau ich mir gerne nach dem ersten Entwurf an. Erzähl mir trotzdem kurz in eigenen Worten: was du machst, wie es heißt, in welcher Stadt und welcher Stil." Sag NICHT, du würdest den Link analysieren oder daraus bauen.

NIEMALS aktiv nach einer bestehenden Website, Social-Media-Profilen, Instagram-Handles oder Google-Einträgen fragen. Das Onboarding ist eine reine Selbstbeschreibung in eigenen Worten.

**Was du anbieten kannst:**
- Einfache Website (Startseite) für das Geschäft
- Inhalte ändern (Öffnungszeiten, Services, Preise, Kontakt)
- Design-Anpassungen
- Alles über den Chat, kein Techniker nötig

Wenn sie fragt was es kostet: derzeit in Beta, probier's einfach aus.

**Eigene Domain (z.B. mein-cafe.de):** WICHTIG — das Feature ist NOCH NICHT fertig. Sag ehrlich: eigene Domains gehen aktuell noch NICHT, wir bauen das gerade. In ein paar Tagen verfügbar. Bis dahin läuft ihre Seite unter einer Subdomain auf halloromy.com (z.B. deinname.halloromy.com). Verspreche NICHTS über Zuverlässigkeit, verbinde nichts, sag nicht "wir verbinden die einfach". Wenn sie ihre Domain nennt: sag "notier ich mir, meld mich sobald es live ist" — OHNE Deadline. Beispiel-Antwort: "Eigene Domain ist bei uns noch in Arbeit, in ein paar Tagen startklar. Für jetzt läuft deine Seite unter deinname.halloromy.com. Magst du mir trotzdem schon deine Domain nennen? Dann meld ich mich, sobald's geht."

**Features, die ich (noch) nicht habe:** Wenn die Kundin nach etwas fragt, was du nicht eingebaut hast (Online-Shop mit Warenkorb, Buchungssystem, mehrsprachige Seiten, eigener E-Mail-Versand, Newsletter, Blog mit CMS, Kundenkonten etc.) — sag ehrlich und freundlich: "Das Feature habe ich aktuell noch nicht. Mein Team arbeitet daran und meldet sich, sobald es verfügbar ist." Verspreche keine Deadline. Erfinde keine Features.

**Beschwerden, technische Fehler, oder Fragen die du nicht beantworten kannst:** Sag ruhig und kurz: "Tut mir leid, ich leite das an mein Team weiter — jemand meldet sich in Kürze bei dir." KEINEN Link schicken, keine Termine vorschlagen — das Team meldet sich direkt. Versuche nicht, das Problem selbst zu lösen, wenn du unsicher bist.

Wenn sie ein Foto schickt ohne klare Anweisung: frag freundlich nach, was du damit tun sollst (auf die Website packen? Produktfoto bearbeiten?).`

export interface RouterResult {
  intent: 'build' | 'chat'
  classify_ms: number
  chat_reply?: string
  chat_ms?: number
  classify_usage?: { input: number; output: number }
  chat_usage?: { input: number; output: number }
}

function formatHistory(history: HistoryMsg[], maxTurns = 8): HistoryMsg[] {
  return history.slice(-maxTurns).filter((m) => m.content && m.content.trim().length > 0)
}


export async function classifyIntent(
  history: HistoryMsg[],
  userMessage: string,
  hasImage: boolean
): Promise<{ intent: 'build' | 'chat'; ms: number; usage: { input: number; output: number } }> {
  const t0 = Date.now()
  const client = anthropicClient()

  const lines: string[] = []
  for (const m of formatHistory(history)) {
    lines.push(`${m.role === 'user' ? 'Kundin' : 'Romy'}: ${m.content}`)
  }
  lines.push(`Kundin: ${userMessage}${hasImage ? ' [+ hat ein Bild geschickt]' : ''}`)
  lines.push('')
  lines.push('Intent:')

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: 'user', content: lines.join('\n') }],
  })

  const text = res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .toUpperCase()
  const intent: 'build' | 'chat' = text.includes('BUILD') ? 'build' : 'chat'

  return {
    intent,
    ms: Date.now() - t0,
    usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
  }
}

export async function generateChatReply(
  history: HistoryMsg[],
  userMessage: string,
  hasImage: boolean
): Promise<{ reply: string; ms: number; usage: { input: number; output: number } }> {
  const t0 = Date.now()
  const client = anthropicClient()

  const msgs: Array<{ role: Role; content: string }> = []
  for (const m of formatHistory(history)) msgs.push({ role: m.role, content: m.content })
  msgs.push({
    role: 'user',
    content: userMessage + (hasImage ? '\n[Die Kundin hat ein Bild mitgeschickt.]' : ''),
  })

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: CHAT_SYSTEM,
    messages: msgs,
  })

  const reply =
    res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim() || 'Sag mir einfach, was ich für deine Seite machen soll.'

  return {
    reply,
    ms: Date.now() - t0,
    usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
  }
}

export async function routeMessage(
  history: HistoryMsg[],
  userMessage: string,
  hasImage: boolean
): Promise<RouterResult> {
  const cls = await classifyIntent(history, userMessage, hasImage)
  if (cls.intent === 'chat') {
    const chat = await generateChatReply(history, userMessage, hasImage)
    return {
      intent: 'chat',
      classify_ms: cls.ms,
      classify_usage: cls.usage,
      chat_reply: chat.reply,
      chat_ms: chat.ms,
      chat_usage: chat.usage,
    }
  }
  return {
    intent: 'build',
    classify_ms: cls.ms,
    classify_usage: cls.usage,
  }
}
