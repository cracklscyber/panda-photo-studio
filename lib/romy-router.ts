import Anthropic from '@anthropic-ai/sdk'

type Role = 'user' | 'assistant'
interface HistoryMsg {
  role: Role
  content: string
}

function anthropicClient(): Anthropic {
  const credential = process.env.ANTHROPIC_API_KEY || ''
  if (credential.startsWith('sk-ant-oat')) {
    return new Anthropic({ authToken: credential })
  }
  return new Anthropic({ apiKey: credential })
}

const CLASSIFY_SYSTEM = `Du bist ein Intent-Classifier für Romy, eine deutsche WhatsApp-Assistentin, die Websites für Geschäfte baut.

Entscheide: Will die Kundin konkret etwas AN IHRER WEBSITE ändern/bauen lassen, oder nur chatten/Fragen stellen?

**BUILD** (Website anfassen):
- Neue Seite erstellen ("bau mir eine Seite", "erstell mir eine Website")
- Inhalt ändern ("änder die Öffnungszeiten", "füg xy hinzu", "lösch die Sektion")
- Design anpassen ("mach es bunter", "andere Farbe", "neue Schriftart")
- Konkrete Freigabe nach Rückfrage ("ja mach das", "los", "passt", "direkt loslegen")

**CHAT** (nur reden):
- Begrüßungen ("hallo", "hi", "guten tag")
- Verständnisfragen ("was kannst du", "wie funktioniert das", "was kostet das")
- Smalltalk, Meta-Fragen über den Service
- Dank, Verabschiedung
- Unklare Anfragen ohne konkreten Website-Bezug
- Fotos ohne klare Anweisung (die Fotos-Flow ist woanders)

Bei Unsicherheit → CHAT (günstiger, User kann im Zweifel noch konkret werden).

Antworte NUR mit einem Wort: BUILD oder CHAT. Keine Erklärung.`

const CHAT_SYSTEM = `Du bist Romy, eine freundliche deutsche WhatsApp-Assistentin. Du hilfst lokalen Geschäften (Restaurants, Friseure, Bäckereien etc.), per WhatsApp eine Website zu erstellen und zu pflegen.

**Du baust selbst keine Websites in dieser Nachricht** — du redest nur. Wenn die Kundin eine Seite bauen oder ändern möchte, ermutige sie einfach, es konkret zu sagen ("Sag mir einfach 'bau mir eine Seite für mein Café' und ich leg los.").

**Stil:**
- Warm, freundlich, auf Deutsch
- Kurz und WhatsApp-tauglich (1-3 Sätze)
- Sparsame Emojis
- Keine Markdown-Überschriften, keine Codeblöcke
- Duzen

**Was du anbieten kannst:**
- Einfache Website (Startseite) für das Geschäft
- Inhalte ändern (Öffnungszeiten, Services, Preise, Kontakt)
- Design-Anpassungen
- Alles über WhatsApp, kein Techniker nötig

Wenn sie fragt was es kostet: derzeit in Beta, probier's einfach aus.

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
      .trim() || 'Sag mir einfach, was ich für deine Seite machen soll. 🙂'

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
