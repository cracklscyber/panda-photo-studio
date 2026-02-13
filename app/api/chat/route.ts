import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

// Initialize client lazily at runtime, not build time
let ai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
  }
  return ai
}

// Helper function to check if error is retryable (rate limit)
function isRetryableError(error: any): boolean {
  const errorCode = error?.status || error?.code || error?.response?.status
  const errorMessage = error?.message || ''
  return errorCode === 429 || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')
}

// Retry wrapper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error
      }

      const delay = initialDelay * Math.pow(2, attempt)
      console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Text model with fallback
const TEXT_MODEL = 'gemini-2.5-flash'
const TEXT_MODEL_FALLBACK = 'gemini-2.5-flash-lite'

async function generateText(client: GoogleGenAI, parts: any[]): Promise<string> {
  try {
    const response = await withRetry(() =>
      client.models.generateContent({
        model: TEXT_MODEL,
        contents: parts,
      })
    )

    let text = ''
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) text += part.text
      }
    }
    return text
  } catch (error: any) {
    // Try fallback model
    console.log(`Switching to fallback model: ${TEXT_MODEL_FALLBACK}`)
    const response = await client.models.generateContent({
      model: TEXT_MODEL_FALLBACK,
      contents: parts,
    })

    let text = ''
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) text += part.text
      }
    }
    return text
  }
}

// Helper function for user-friendly error messages
function getErrorMessage(error: any): string {
  const errorCode = error?.status || error?.code || error?.response?.status
  const errorMessage = error?.message || ''

  // Rate limit error (429)
  if (errorCode === 429 || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
    return '⏳ Die KI ist gerade sehr beschäftigt! Ich habe es mehrfach versucht, aber das Limit ist erreicht. Bitte warte 1-2 Minuten und versuche es dann erneut.'
  }

  // Authentication error
  if (errorCode === 401 || errorCode === 403 || errorMessage.includes('API_KEY')) {
    return '🔑 Es gibt ein Problem mit der API-Konfiguration. Bitte kontaktiere den Support.'
  }

  // Network/timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('network')) {
    return '🌐 Verbindungsproblem. Bitte überprüfe deine Internetverbindung und versuche es erneut.'
  }

  // Content safety
  if (errorMessage.includes('safety') || errorMessage.includes('blocked') || errorMessage.includes('SAFETY')) {
    return '⚠️ Diese Anfrage konnte nicht verarbeitet werden. Bitte versuche eine andere Beschreibung.'
  }

  // Generic error
  return '😕 Etwas ist schiefgelaufen. Bitte versuche es in ein paar Sekunden erneut.'
}

const SYSTEM_PROMPT = `Du bist Lumino, ein freundlicher und kreativer KI-Assistent für Produktfotografie.
Du sprichst Deutsch und bist immer hilfsbereit und enthusiastisch.

Deine Aufgaben:
1. Kunden bei der Erstellung professioneller Produktfotos helfen
2. Kreative Vorschläge für Szenen, Hintergründe und Stile machen
3. Die hochgeladenen Produktbilder analysieren und Verbesserungen vorschlagen
4. Detaillierte Prompts für die Bildgenerierung erstellen

Wenn ein Kunde NUR ein Bild hochlädt (ohne Text oder mit leerem Text):
1. Beschreibe kurz und begeistert was du siehst
2. Frage: "Wie soll das finale Produktfoto aussehen? Beschreibe mir den gewünschten Hintergrund, Stil oder die Szene!"
3. Schlage 2-3 kreative Ideen als Inspiration vor (z.B. "minimalistisch auf Marmor", "in der Natur", "Studio mit Schatten")

SEHR WICHTIG - Bei kurzen oder wenig detaillierten Beschreibungen (weniger als 15 Wörter oder vage Begriffe wie "modern", "schön", "cool", "minimalistisch" ohne weitere Details):

Du MUSST IMMER diese zwei Optionen anbieten:

"Ich kann dir zwei Wege anbieten:

1. Direkt loslegen - Ich generiere sofort ein Bild basierend auf deiner Idee
2. Kurze Rückfragen - Ich stelle dir 2-3 schnelle Fragen, um deine Vision besser zu verstehen

Was ist dir lieber?"

Generiere NIEMALS sofort ein Bild bei kurzen Prompts. Warte IMMER auf die Antwort des Kunden.

Wenn der Kunde "direkt" oder "loslegen" oder ähnliches sagt, generiere das Bild.
Wenn der Kunde "Fragen" oder "Rückfragen" wählt, stelle 2-3 konkrete Fragen zu Stil, Farben, Stimmung oder Hintergrund.

WICHTIG: Nachdem du ein Bild generiert hast, frage IMMER:
"Soll ich dir auch einen passenden Social Media Text für dieses Produktfoto erstellen? 📱"

Halte deine Antworten freundlich, kurz und hilfreich.

FORMATIERUNG - STRIKT EINHALTEN:
1. Verwende IMMER nummerierte Listen (1. 2. 3.) statt Aufzählungszeichen
2. NIEMALS Sternchen (*) verwenden - weder für Listen noch für Fettschrift
3. NIEMALS Spiegelstriche (-) oder Punkte (•) für Listen
4. Für Betonung einfach normale Wörter verwenden, KEIN **fett** oder *kursiv*

EXTREM WICHTIG - Du kannst KEINE Bilder generieren:
Du bist NUR für Text-Antworten zuständig. Sage NIEMALS "Hier ist dein Bild" oder "Ich habe ein Bild erstellt".
Wenn der Kunde "direkt loslegen" wählt, antworte: "Perfekt, ich generiere jetzt dein Bild! Einen Moment bitte..."
Das eigentliche Bild wird von einem anderen System erstellt.`

export async function POST(request: NextRequest) {
  try {
    const { message, image, history } = await request.json()

    // Check if this is ONLY an image upload (no text or just whitespace)
    const isImageOnlyUpload = image && (!message || message.trim() === '')

    // Check if prompt is too short/vague (needs clarification)
    const wordCount = message.trim().split(/\s+/).length
    const isShortPrompt = wordCount < 12

    // Check if user explicitly chose to generate directly
    const userWantsDirectGeneration =
      message.toLowerCase().includes('direkt') ||
      message.toLowerCase().includes('loslegen') ||
      message.toLowerCase().includes('generier jetzt') ||
      message.toLowerCase().includes('mach einfach') ||
      message.toLowerCase().includes('starten')

    // Check if user wants questions
    const userWantsQuestions =
      message.toLowerCase().includes('fragen') ||
      message.toLowerCase().includes('rückfragen')

    // Find the original image request from history if user is confirming
    let originalImageRequest = ''
    if (userWantsDirectGeneration && history.length > 0) {
      // Look backwards through history to find the user's image request
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i]
        if (msg.role === 'user' && msg.content && msg.content.length > 3) {
          // Found a user message that's likely the image request
          const content = msg.content.toLowerCase()
          if (content.includes('minimalist') || content.includes('foto') ||
              content.includes('bild') || content.includes('hintergrund') ||
              content.includes('szene') || content.includes('studio') ||
              content.includes('natur') || content.includes('marmor') ||
              content.includes('weiß') || content.includes('schwarz')) {
            originalImageRequest = msg.content
            break
          }
        }
      }
    }

    // Check if this is a request to generate/edit an image
    const hasImageKeywords = !isImageOnlyUpload && (
      message.toLowerCase().includes('erstell') ||
      message.toLowerCase().includes('generier') ||
      message.toLowerCase().includes('mach mir') ||
      message.toLowerCase().includes('zeig mir') ||
      message.toLowerCase().includes('ändere') ||
      message.toLowerCase().includes('bearbeite') ||
      (image && (
        message.toLowerCase().includes('hintergrund') ||
        message.toLowerCase().includes('szene') ||
        message.toLowerCase().includes('foto') ||
        message.toLowerCase().includes('bild') ||
        message.toLowerCase().includes('stil') ||
        message.toLowerCase().includes('minimalist') ||
        message.toLowerCase().includes('natur') ||
        message.toLowerCase().includes('studio')
      ))
    )

    // Only generate image if:
    // 1. Has keywords AND (long prompt OR user explicitly wants direct generation)
    // 2. OR user says "direkt loslegen" after being offered options (and we found original request)
    const isImageRequest =
      (hasImageKeywords && (!isShortPrompt || userWantsDirectGeneration)) ||
      (userWantsDirectGeneration && originalImageRequest)

    let responseText = ''
    let generatedImage: string | null = null

    if (isImageOnlyUpload) {
      // Image uploaded without text - analyze and ask for desired style
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]

      const parts = [
        { text: SYSTEM_PROMPT + '\n\n' },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        { text: '\n\nDer Kunde hat dieses Produktbild hochgeladen, aber noch keine Beschreibung gegeben. Analysiere das Bild kurz und frage nach dem gewünschten Stil für das finale Produktfoto. Gib 2-3 konkrete Vorschläge.' }
      ]

      responseText = await generateText(getClient(), parts)

    } else if (isImageRequest) {
      // Use gemini-2.5-flash-image for image generation/editing
      const contents: any[] = []

      // Add image if provided (for editing)
      if (image) {
        const base64Data = image.split(',')[1]
        const mimeType = image.split(';')[0].split(':')[1]
        contents.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        })
      }

      // Build the image generation prompt - use original request if user confirmed with "direkt loslegen"
      const promptToUse = originalImageRequest || message
      const imagePrompt = image
        ? `${promptToUse}. Behalte das Produkt aus dem Bild bei und erstelle ein professionelles Produktfoto mit hoher Qualität, kommerziellem Stil, sauberer Komposition und professioneller Beleuchtung.`
        : `Erstelle ein professionelles Produktfoto: ${promptToUse}. Hohe Qualität, kommerzieller Stil, saubere Komposition, professionelle Beleuchtung.`

      contents.push({ text: imagePrompt })

      try {
        const response = await withRetry(() =>
          getClient().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          })
        )

        // Process response parts
        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.text) {
              responseText += part.text
            } else if (part.inlineData) {
              // Convert image data to base64 data URL
              const imageData = part.inlineData.data
              const mimeType = part.inlineData.mimeType || 'image/png'
              generatedImage = `data:${mimeType};base64,${imageData}`
            }
          }
        }

        if (!responseText) {
          responseText = 'Hier ist dein generiertes Produktfoto!'
        }

        // Add social media offer after image generation
        if (generatedImage) {
          responseText += '\n\nSoll ich dir auch einen passenden Social Media Text für dieses Produktfoto erstellen? 📱'
        }

      } catch (imgError: any) {
        console.error('Image generation error:', imgError)
        responseText = getErrorMessage(imgError)
      }

    } else {
      // Regular chat - use standard Gemini model for conversation
      const parts: any[] = []

      // Add system prompt for first message
      if (history.length <= 1) {
        parts.push({ text: SYSTEM_PROMPT + '\n\n' })
      }

      // Add conversation history
      if (history.length > 1) {
        const historyText = history
          .slice(-6)
          .map((m: any) => `${m.role === 'user' ? 'Kunde' : 'Lumino'}: ${m.content}`)
          .join('\n')
        parts.push({ text: `Bisheriges Gespräch:\n${historyText}\n\n` })
      }

      // Add image if provided
      if (image) {
        const base64Data = image.split(',')[1]
        const mimeType = image.split(';')[0].split(':')[1]
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        })
      }

      // Add context about short prompts needing clarification
      const shortPromptInstruction = (isShortPrompt && hasImageKeywords && !userWantsDirectGeneration && !userWantsQuestions)
        ? '\n\nHINWEIS: Der Kunde hat eine kurze Bildanfrage gestellt. Biete ihm die zwei Optionen an (direkt loslegen oder Rückfragen)!'
        : ''

      parts.push({ text: `Kunde: ${message}${shortPromptInstruction}\n\nLumino:` })

      responseText = await generateText(getClient(), parts)
    }

    return NextResponse.json({
      message: responseText || 'Ich konnte keine Antwort generieren. Bitte versuche es erneut.',
      generatedImage: generatedImage
    })

  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: 200 } // Return 200 so the frontend shows the friendly message
    )
  }
}
