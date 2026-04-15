import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! })

// Available fonts for Luna to suggest
const AVAILABLE_FONTS: Record<string, string> = {
  inter: 'Modern & clean — für Tech, Startups',
  playfair: 'Elegant & klassisch — für Frisöre, Hotels, Restaurants',
  poppins: 'Freundlich & rund — für Cafés, Kinderläden',
  cormorant: 'Edel & dünn — für Luxus, Schmuck, Mode',
  lora: 'Warm & einladend — für Bäckereien, Buchläden',
  montserrat: 'Stark & professionell — für Handwerker, Autohäuser',
  raleway: 'Leicht & luftig — für Yoga, Wellness, Blumenläden',
  caveat: 'Handschriftlich & persönlich — für Kreative, Künstler',
  dm_sans: 'Schlicht & minimal — für Ärzte, Anwälte',
  space_grotesk: 'Technisch & kantig — für Werkstätten, IT',
}

const SYSTEM_PROMPT = `Du bist Luna, ein freundlicher WhatsApp-Assistent der Websites für lokale Geschäfte erstellt und verwaltet.

## Deine Persönlichkeit
- Du sprichst Deutsch, freundlich aber professionell
- Du bist hilfsbereit und proaktiv — schlage Verbesserungen vor
- Halte Antworten kurz und klar (WhatsApp-Format, keine langen Texte)
- Nutze Emojis sparsam aber passend

## Onboarding (Neue Kunden — status: "onboarding")
Wenn ein neuer Kunde schreibt, frag Schritt für Schritt:
1. Geschäftsname
2. Branche (Frisör, Restaurant, Autohaus, etc.)
3. Kurze Beschreibung / Was bietest du an?
4. Adresse
5. Telefonnummer (für die Website)
6. E-Mail
7. Öffnungszeiten
8. Farbwunsch (oder schlage passende Farben vor basierend auf der Branche)
9. Schriftstil (zeige Optionen oder schlage basierend auf Branche vor)
10. Welche Buttons? (WhatsApp, Termin buchen, Anrufen)
11. Hast du ein Logo oder Bilder? (Können per WhatsApp geschickt werden)

Frag NICHT alles auf einmal. Maximal 2-3 Fragen pro Nachricht. Sei natürlich.
Wenn du genug Infos hast, erstelle die Website und setze status auf "published".

## Website verwalten (Bestehende Kunden — status: "published")
Der Kunde kann jederzeit Änderungen per WhatsApp schicken:
- Texte ändern
- Farben ändern
- Buttons hinzufügen/entfernen
- Angebote erstellen/entfernen
- Leistungen bearbeiten
- Bilder hinzufügen
- Öffnungszeiten ändern
- Schrift ändern

Bestätige jede Änderung kurz: "Erledigt! [Was geändert wurde]"

## Verfügbare Schriften
${Object.entries(AVAILABLE_FONTS).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

## Verfügbare Button-Typen
- whatsapp: WhatsApp-Kontakt-Button
- booking: Termin buchen (braucht eine URL wie Calendly, Booksy, etc.)
- call: Direkt anrufen
- custom: Beliebiger Link (z.B. Online-Shop)

## Verfügbare Styles
- dark: Dunkler Hintergrund (modern, elegant)
- light: Heller Hintergrund (freundlich, klassisch)

## Wichtig
- Wenn der Kunde ein Bild schickt, speichere es in der Galerie oder als Logo/Cover
- Schlage proaktiv Verbesserungen vor: "Willst du auch einen Termin-Button? Das nutzen viele Frisöre."
- Wenn du Farben vorschlägst, nutze HEX-Codes
- Die Website-URL ist: [slug].luna.site (in Zukunft auch eigene Domain möglich)`

interface ConversationMessage {
  role: 'user' | 'model'
  content: string
}

// Tool definitions for Gemini
const TOOLS = [
  {
    name: 'update_website',
    description: 'Aktualisiert ein einzelnes Feld der Website. Nutze dies für: business_name, hero_title, hero_subtitle, about_text, address, phone_display, email, description, color_primary, color_secondary, font, style, slug',
    parameters: {
      type: 'object',
      properties: {
        field: { type: 'string', description: 'Der Feldname (z.B. hero_title, color_primary, font, style)' },
        value: { type: 'string', description: 'Der neue Wert' },
      },
      required: ['field', 'value'],
    },
  },
  {
    name: 'set_opening_hours',
    description: 'Setzt die Öffnungszeiten der Website',
    parameters: {
      type: 'object',
      properties: {
        hours: {
          type: 'object',
          description: 'Öffnungszeiten als Key-Value Paare, z.B. {"Montag - Freitag": "9:00 - 18:00", "Samstag": "10:00 - 14:00", "Sonntag": "Geschlossen"}',
        },
      },
      required: ['hours'],
    },
  },
  {
    name: 'add_service',
    description: 'Fügt eine neue Leistung/Service hinzu',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name der Leistung' },
        price: { type: 'string', description: 'Preis (z.B. "25 €" oder "ab 35 €")' },
        description: { type: 'string', description: 'Kurze Beschreibung' },
      },
      required: ['name'],
    },
  },
  {
    name: 'remove_service',
    description: 'Entfernt eine Leistung anhand des Namens',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name der Leistung die entfernt werden soll' },
      },
      required: ['name'],
    },
  },
  {
    name: 'set_services',
    description: 'Setzt alle Leistungen auf einmal (ersetzt bestehende)',
    parameters: {
      type: 'object',
      properties: {
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['name'],
          },
          description: 'Liste aller Leistungen',
        },
      },
      required: ['services'],
    },
  },
  {
    name: 'add_button',
    description: 'Fügt einen Button zur Website hinzu (WhatsApp, Termin buchen, Anrufen, Custom)',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['whatsapp', 'booking', 'call', 'custom'], description: 'Button-Typ' },
        label: { type: 'string', description: 'Button-Text (z.B. "Termin buchen", "WhatsApp")' },
        url: { type: 'string', description: 'URL für booking/custom Buttons (z.B. Calendly-Link)' },
      },
      required: ['type', 'label'],
    },
  },
  {
    name: 'remove_button',
    description: 'Entfernt einen Button anhand des Typs',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Button-Typ der entfernt werden soll' },
      },
      required: ['type'],
    },
  },
  {
    name: 'add_offer',
    description: 'Erstellt ein neues Angebot auf der Website',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Angebots-Titel' },
        description: { type: 'string', description: 'Angebots-Beschreibung' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'remove_offer',
    description: 'Entfernt ein Angebot anhand des Titels',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel des Angebots das entfernt werden soll' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_gallery_image',
    description: 'Fügt ein Bild zur Galerie hinzu',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Bild-URL' },
        caption: { type: 'string', description: 'Optionale Bildbeschreibung' },
      },
      required: ['url'],
    },
  },
  {
    name: 'publish_website',
    description: 'Setzt den Status der Website auf "published" und macht sie live. Nutze dies nach dem Onboarding.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_website',
    description: 'Erstellt eine neue Website für einen Kunden. Nutze dies beim Onboarding wenn du genug Infos hast.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'URL-Slug (z.B. "friseur-marco"). Kleinbuchstaben, keine Leerzeichen, Bindestriche erlaubt.' },
        business_name: { type: 'string' },
        branch: { type: 'string' },
      },
      required: ['slug', 'business_name', 'branch'],
    },
  },
]

// Execute a tool call and update Supabase
async function executeTool(toolName: string, args: Record<string, unknown>, websiteId: string | null, phone: string): Promise<string> {
  switch (toolName) {
    case 'create_website': {
      const slug = (args.slug as string).toLowerCase().replace(/[^a-z0-9-]/g, '-')
      const { data, error } = await supabase
        .from('luna_websites')
        .insert({
          slug,
          phone,
          status: 'onboarding',
          business_name: args.business_name as string,
          branch: args.branch as string,
        })
        .select('id')
        .single()
      if (error) return `Fehler: ${error.message}`
      return `Website erstellt mit ID ${data.id} und Slug "${slug}"`
    }

    case 'update_website': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const field = args.field as string
      const allowedFields = ['business_name', 'hero_title', 'hero_subtitle', 'about_text', 'address', 'phone_display', 'email', 'description', 'color_primary', 'color_secondary', 'font', 'style', 'slug', 'logo_url', 'cover_url']
      if (!allowedFields.includes(field)) return `Fehler: Feld "${field}" nicht erlaubt`
      const { error } = await supabase
        .from('luna_websites')
        .update({ [field]: args.value, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return `${field} aktualisiert`
    }

    case 'set_opening_hours': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { error } = await supabase
        .from('luna_websites')
        .update({ opening_hours: args.hours, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return 'Öffnungszeiten aktualisiert'
    }

    case 'add_service': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { data: site } = await supabase.from('luna_websites').select('services').eq('id', websiteId).single()
      const services = (site?.services || []) as Record<string, unknown>[]
      services.push({ name: args.name, price: args.price || '', description: args.description || '' })
      const { error } = await supabase
        .from('luna_websites')
        .update({ services, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return `Leistung "${args.name}" hinzugefügt`
    }

    case 'remove_service': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { data: site } = await supabase.from('luna_websites').select('services').eq('id', websiteId).single()
      const services = (site?.services || []) as Record<string, unknown>[]
      const filtered = services.filter(s => (s.name as string).toLowerCase() !== (args.name as string).toLowerCase())
      const { error } = await supabase
        .from('luna_websites')
        .update({ services: filtered, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return `Leistung "${args.name}" entfernt`
    }

    case 'set_services': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { error } = await supabase
        .from('luna_websites')
        .update({ services: args.services, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return 'Alle Leistungen aktualisiert'
    }

    case 'add_button': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { data: site } = await supabase.from('luna_websites').select('buttons').eq('id', websiteId).single()
      const buttons = (site?.buttons || []) as Record<string, unknown>[]
      // Remove existing button of same type
      const filtered = buttons.filter(b => b.type !== args.type)
      filtered.push({ type: args.type, label: args.label, url: args.url || '', enabled: true })
      const { error } = await supabase
        .from('luna_websites')
        .update({ buttons: filtered, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return `Button "${args.label}" hinzugefügt`
    }

    case 'remove_button': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { data: site } = await supabase.from('luna_websites').select('buttons').eq('id', websiteId).single()
      const buttons = (site?.buttons || []) as Record<string, unknown>[]
      const filtered = buttons.filter(b => b.type !== args.type)
      const { error } = await supabase
        .from('luna_websites')
        .update({ buttons: filtered, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return `Button vom Typ "${args.type}" entfernt`
    }

    case 'add_offer': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { data: site } = await supabase.from('luna_websites').select('offers').eq('id', websiteId).single()
      const offers = (site?.offers || []) as Record<string, unknown>[]
      offers.push({ title: args.title, description: args.description, active: true })
      const { error } = await supabase
        .from('luna_websites')
        .update({ offers, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return `Angebot "${args.title}" hinzugefügt`
    }

    case 'remove_offer': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { data: site } = await supabase.from('luna_websites').select('offers').eq('id', websiteId).single()
      const offers = (site?.offers || []) as Record<string, unknown>[]
      const filtered = offers.filter(o => (o.title as string).toLowerCase() !== (args.title as string).toLowerCase())
      const { error } = await supabase
        .from('luna_websites')
        .update({ offers: filtered, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return `Angebot "${args.title}" entfernt`
    }

    case 'add_gallery_image': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { data: site } = await supabase.from('luna_websites').select('gallery').eq('id', websiteId).single()
      const gallery = (site?.gallery || []) as Record<string, unknown>[]
      gallery.push({ url: args.url, caption: args.caption || '' })
      const { error } = await supabase
        .from('luna_websites')
        .update({ gallery, updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return 'Bild zur Galerie hinzugefügt'
    }

    case 'publish_website': {
      if (!websiteId) return 'Fehler: Keine Website gefunden'
      const { error } = await supabase
        .from('luna_websites')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', websiteId)
      if (error) return `Fehler: ${error.message}`
      return 'Website ist jetzt live!'
    }

    default:
      return `Unbekanntes Tool: ${toolName}`
  }
}

// Get or create conversation history from Supabase
async function getConversationHistory(phone: string): Promise<ConversationMessage[]> {
  const { data } = await supabase
    .from('luna_conversations')
    .select('messages')
    .eq('phone', phone)
    .single()
  return data?.messages || []
}

async function saveConversationHistory(phone: string, messages: ConversationMessage[]) {
  // Keep last 30 messages
  const trimmed = messages.slice(-30)
  await supabase
    .from('luna_conversations')
    .upsert({ phone, messages: trimmed, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
}

// Main agent function
export async function handleLunaMessage(phone: string, message: string, imageUrl?: string): Promise<string> {
  // 1. Look up existing website for this phone
  const { data: website } = await supabase
    .from('luna_websites')
    .select('*')
    .eq('phone', phone)
    .single()

  const websiteId = website?.id || null

  // 2. Build context about current website state
  let websiteContext = ''
  if (website) {
    websiteContext = `
## Aktuelle Website-Daten des Kunden
- Status: ${website.status}
- Slug: ${website.slug}
- URL: ${website.slug}.luna.site
- Geschäftsname: ${website.business_name || 'Noch nicht gesetzt'}
- Branche: ${website.branch || 'Noch nicht gesetzt'}
- Farbe: ${website.color_primary || 'Noch nicht gesetzt'}
- Schrift: ${website.font || 'inter'}
- Style: ${website.style || 'dark'}
- Buttons: ${JSON.stringify(website.buttons || [])}
- Leistungen: ${(website.services || []).length} Einträge
- Angebote: ${(website.offers || []).filter((o: { active: boolean }) => o.active).length} aktive
- Galerie: ${(website.gallery || []).length} Bilder`
  } else {
    websiteContext = '\n## Dieser Kunde hat noch keine Website. Starte das Onboarding!'
  }

  // 3. Get conversation history
  const history = await getConversationHistory(phone)

  // 4. Build message with optional image
  let userMessage = message
  if (imageUrl) {
    userMessage = `[Kunde hat ein Bild geschickt: ${imageUrl}]\n${message}`
  }

  // 5. Call Gemini with tools
  const fullSystemPrompt = SYSTEM_PROMPT + websiteContext

  const contents = [
    ...history.map(msg => ({
      role: msg.role as 'user' | 'model',
      parts: [{ text: msg.content }],
    })),
    { role: 'user' as const, parts: [{ text: userMessage }] },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolDeclarations = TOOLS as any[]

  let response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: fullSystemPrompt,
      tools: [{ functionDeclarations: toolDeclarations }] as any,
    },
  })

  // 6. Process tool calls in a loop
  let maxIterations = 10
  const toolResults: string[] = []

  while (maxIterations > 0) {
    const candidate = response.candidates?.[0]
    if (!candidate) break

    const parts = candidate.content?.parts || []
    const functionCalls = parts.filter(p => p.functionCall)

    if (functionCalls.length === 0) break

    // Execute all function calls
    const functionResponses = []
    for (const part of functionCalls) {
      const fc = part.functionCall!
      const result = await executeTool(fc.name!, (fc.args || {}) as Record<string, unknown>, websiteId, phone)
      toolResults.push(result)
      functionResponses.push({
        name: fc.name,
        response: { result },
      })
    }

    // Send results back to Gemini
    response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...contents,
        { role: 'model' as const, parts },
        {
          role: 'user' as const,
          parts: functionResponses.map(fr => ({
            functionResponse: fr,
          })),
        },
      ],
      config: {
        systemInstruction: fullSystemPrompt,
        tools: [{ functionDeclarations: toolDeclarations }] as any,
      },
    })

    maxIterations--
  }

  // 7. Extract final text response
  const finalParts = response.candidates?.[0]?.content?.parts || []
  const textResponse = finalParts
    .filter(p => p.text)
    .map(p => p.text)
    .join('\n')
    .trim() || 'Ich konnte deine Nachricht leider nicht verarbeiten. Versuch es nochmal!'

  // 8. Save conversation history
  history.push({ role: 'user', content: userMessage })
  history.push({ role: 'model', content: textResponse })
  await saveConversationHistory(phone, history)

  return textResponse
}
