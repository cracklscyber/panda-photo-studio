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

const SYSTEM_PROMPT = `Du bist Panda, ein freundlicher und kreativer Assistent für Produktfotografie.
Du sprichst Deutsch und bist immer hilfsbereit und enthusiastisch.

Deine Aufgaben:
1. Kunden bei der Erstellung professioneller Produktfotos helfen
2. Kreative Vorschläge für Szenen, Hintergründe und Stile machen
3. Die hochgeladenen Produktbilder analysieren und Verbesserungen vorschlagen
4. Detaillierte Prompts für die Bildgenerierung erstellen

Wenn ein Kunde ein Bild hochlädt:
- Beschreibe kurz was du siehst
- Frage nach dem gewünschten Stil/Hintergrund falls nicht angegeben
- Schlage 2-3 kreative Ideen vor

Halte deine Antworten freundlich, kurz und hilfreich.`

export async function POST(request: NextRequest) {
  try {
    const { message, image, history } = await request.json()

    // Check if this is a request to generate/edit an image
    const isImageRequest =
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
        message.toLowerCase().includes('bild')
      ))

    let responseText = ''
    let generatedImage: string | null = null

    if (isImageRequest) {
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

      // Build the image generation prompt
      const imagePrompt = image
        ? `${message}. Behalte das Produkt aus dem Bild bei und erstelle ein professionelles Produktfoto mit hoher Qualität, kommerziellem Stil, sauberer Komposition und professioneller Beleuchtung.`
        : `Erstelle ein professionelles Produktfoto: ${message}. Hohe Qualität, kommerzieller Stil, saubere Komposition, professionelle Beleuchtung.`

      contents.push({ text: imagePrompt })

      try {
        const response = await getClient().models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: contents,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        })

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

      } catch (imgError: any) {
        console.error('Image generation error:', imgError)
        responseText = `Es gab ein Problem bei der Bildgenerierung: ${imgError.message || 'Unbekannter Fehler'}. Bitte versuche es mit einer anderen Beschreibung.`
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
          .map((m: any) => `${m.role === 'user' ? 'Kunde' : 'Panda'}: ${m.content}`)
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

      parts.push({ text: `Kunde: ${message}\n\nPanda:` })

      const response = await getClient().models.generateContent({
        model: 'gemini-2.0-flash',
        contents: parts,
      })

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            responseText += part.text
          }
        }
      }
    }

    return NextResponse.json({
      message: responseText || 'Ich konnte keine Antwort generieren. Bitte versuche es erneut.',
      generatedImage: generatedImage
    })

  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { message: `Es tut mir leid, es gab einen Fehler: ${error.message || 'Unbekannt'}` },
      { status: 500 }
    )
  }
}
