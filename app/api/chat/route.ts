import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

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

Halte deine Antworten freundlich, kurz und hilfreich. Nutze gelegentlich Panda-bezogene Ausdrücke.`

export async function POST(request: NextRequest) {
  try {
    const { message, image, history } = await request.json()

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Build the prompt parts
    const parts: any[] = []

    // Add system prompt for context
    if (history.length <= 1) {
      parts.push({ text: SYSTEM_PROMPT + '\n\n' })
    }

    // Add conversation history context
    if (history.length > 1) {
      const historyText = history
        .slice(-6) // Last 6 messages for context
        .map((m: any) => `${m.role === 'user' ? 'Kunde' : 'Panda'}: ${m.content}`)
        .join('\n')
      parts.push({ text: `Bisheriges Gespräch:\n${historyText}\n\n` })
    }

    // Add image if provided
    if (image) {
      // Extract base64 data from data URL
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      })
    }

    // Add user message
    parts.push({ text: `Kunde: ${message}\n\nPanda:` })

    // Check if this is a request to generate an image
    const isImageGenerationRequest =
      message.toLowerCase().includes('erstell') ||
      message.toLowerCase().includes('generier') ||
      message.toLowerCase().includes('mach mir') ||
      message.toLowerCase().includes('zeig mir') ||
      (image && (
        message.toLowerCase().includes('hintergrund') ||
        message.toLowerCase().includes('szene') ||
        message.toLowerCase().includes('foto')
      ))

    let responseText = ''
    let generatedImage = null

    if (isImageGenerationRequest && image) {
      // Try to generate an image
      try {
        const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        // First, get a creative response
        const chatResponse = await model.generateContent(parts)
        responseText = chatResponse.response.text()

        // Then try to generate the image
        const imagePrompt = `Professional product photography: ${message}.
High quality, commercial style, clean composition, professional lighting.`

        // Note: Image generation with Gemini requires specific setup
        // For now, we'll provide the text response and explain
        responseText += '\n\n(Bildgenerierung wird vorbereitet... In der Vollversion würde hier dein Produktfoto erscheinen!)'

      } catch (imgError) {
        console.error('Image generation error:', imgError)
        const chatResponse = await model.generateContent(parts)
        responseText = chatResponse.response.text()
      }
    } else {
      // Regular chat response
      const response = await model.generateContent(parts)
      responseText = response.response.text()
    }

    return NextResponse.json({
      message: responseText,
      generatedImage: generatedImage
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { message: 'Es tut mir leid, es gab einen Fehler. Bitte versuche es erneut!' },
      { status: 500 }
    )
  }
}
