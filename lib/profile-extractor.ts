import { GoogleGenAI } from '@google/genai'
import { CustomerProfile, upsertCustomerProfile } from './whatsapp-db'

const EXTRACTION_PROMPT = `Du bist ein Daten-Extrahierer. Analysiere die Kundennachricht und extrahiere persönliche/geschäftliche Informationen.

AKTUELLES KUNDENPROFIL:
{PROFILE}

NEUE NACHRICHT DES KUNDEN:
"{MESSAGE}"

Extrahiere NUR Informationen, die der Kunde EXPLIZIT erwähnt hat. Gib ein JSON-Objekt zurück mit NUR den erkannten Feldern:

- customer_name: Name des Kunden
- company_name: Firmenname
- brand_colors: Markenfarben (z.B. "Blau, Gold")
- preferred_styles: Bevorzugte Bildstile (z.B. "minimalistisch, modern")
- favorite_backgrounds: Bevorzugte Hintergründe (z.B. "weiß, Marmor")
- image_format_preferences: Format-Präferenzen (z.B. "quadratisch, Instagram")
- address_form: "Du" oder "Sie" - nur wenn klar erkennbar
- special_notes: Sonstige relevante Infos

REGELN:
- Gib NUR Felder zurück, für die es KLARE Hinweise in der Nachricht gibt
- Wenn nichts erkannt wird, gib ein leeres Objekt zurück: {}
- Antworte NUR mit dem JSON-Objekt, kein anderer Text
- Keine Vermutungen oder Interpretationen`

// Fields that should replace existing values
const REPLACE_FIELDS = ['customer_name', 'company_name', 'address_form']

// Fields that should append (no duplicates)
const APPEND_FIELDS = ['preferred_styles', 'brand_colors', 'favorite_backgrounds', 'image_format_preferences', 'special_notes']

function mergeAppendField(existing: string | null, newValue: string): string {
  if (!existing) return newValue
  const existingItems = existing.split(',').map(s => s.trim().toLowerCase())
  const newItems = newValue.split(',').map(s => s.trim())
  const unique = newItems.filter(item => !existingItems.includes(item.toLowerCase()))
  if (unique.length === 0) return existing
  return `${existing}, ${unique.join(', ')}`
}

export async function extractAndUpdateProfile(
  aiClient: GoogleGenAI,
  whatsappUserId: string,
  userMessage: string,
  currentProfile: CustomerProfile | null
): Promise<void> {
  try {
    // Build profile string for context
    const profileStr = currentProfile
      ? Object.entries(currentProfile)
          .filter(([k, v]) => v && !['id', 'whatsapp_user_id', 'created_at', 'updated_at'].includes(k))
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      : '(Neuer Kunde, kein Profil vorhanden)'

    const prompt = EXTRACTION_PROMPT
      .replace('{PROFILE}', profileStr)
      .replace('{MESSAGE}', userMessage)

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) return

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const extracted = JSON.parse(jsonStr)

    // Check if anything was extracted
    if (Object.keys(extracted).length === 0) return

    // Merge with existing profile
    const updates: Record<string, string> = {}

    for (const [key, value] of Object.entries(extracted)) {
      if (!value || typeof value !== 'string') continue

      if (REPLACE_FIELDS.includes(key)) {
        updates[key] = value
      } else if (APPEND_FIELDS.includes(key)) {
        updates[key] = mergeAppendField(
          currentProfile?.[key as keyof CustomerProfile] as string | null,
          value
        )
      }
    }

    if (Object.keys(updates).length === 0) return

    await upsertCustomerProfile(whatsappUserId, updates)
    console.log('Profile updated for user:', whatsappUserId, updates)
  } catch (error) {
    console.error('Profile extraction error (non-critical):', error)
  }
}
