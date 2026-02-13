import { NextRequest, NextResponse } from 'next/server'
import { parseWhatsAppWebhook, sendWhatsAppMessage, extractPhoneNumber } from '@/lib/twilio'
import { GoogleGenAI } from '@google/genai'
import { uploadImageToStorage, saveImageToGallery, getOrCreateWhatsAppUser } from '@/lib/database'

// Initialize Gemini
let ai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
  }
  return ai
}

// Store conversation history in memory (in production, use Redis or database)
const conversationHistory: Map<string, Array<{ role: string; content: string }>> = new Map()

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
      const errorCode = error?.status || error?.code
      const errorMessage = error?.message || ''
      const isRateLimit = errorCode === 429 || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')

      if (!isRateLimit || attempt === maxRetries) {
        throw error
      }

      const delay = initialDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

const WHATSAPP_SYSTEM_PROMPT = `Du bist Lumino, ein freundlicher KI-Assistent für professionelle Produktfotografie auf WhatsApp.
Du sprichst Deutsch und antwortest kurz und prägnant (WhatsApp-Stil).

ERSTE NACHRICHT - Wenn ein Kunde "Hallo" oder ähnliches schreibt:
"Hey! Ich bin Lumino, dein KI-Assistent für Produktfotos.

Wie kann ich dir helfen?

1. Du hast ein Produkt und willst ein professionelles Foto davon? Schick mir einfach ein Bild!

2. Du brauchst ein komplett neues Produktbild? Beschreib mir was du dir vorstellst!

Was darfs sein?"

WENN KUNDE EIN BILD SCHICKT:
1. Reagiere begeistert auf das Produkt
2. Frage kurz: "Wie soll das finale Foto aussehen? Minimalistisch, luxuriös, natürlich...?"
3. Gib 2-3 konkrete Vorschläge passend zum Produkt

WENN KUNDE EINE BESCHREIBUNG SCHICKT (ohne Bild):
1. Frage nach wichtigen Details falls nötig
2. Oder bestätige und generiere

WICHTIG:
- Halte Antworten KURZ (max 3-4 Sätze)
- Verwende Emojis sparsam aber freundlich
- Sei enthusiastisch aber professionell
- Du kannst KEINE Bilder generieren - sage "Perfekt, ich erstelle dein Bild..." wenn der Kunde bereit ist`

// Handle incoming WhatsApp messages (POST from Twilio webhook)
export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()
    const body: Record<string, string> = {}
    formData.forEach((value, key) => {
      body[key] = value.toString()
    })

    const message = parseWhatsAppWebhook(body)
    const phoneNumber = extractPhoneNumber(message.from)

    console.log(`WhatsApp message from ${phoneNumber}: ${message.body}`)

    // Get or create conversation history for this user
    if (!conversationHistory.has(phoneNumber)) {
      conversationHistory.set(phoneNumber, [])
    }
    const history = conversationHistory.get(phoneNumber)!

    // Prepare parts for Gemini
    const parts: any[] = []

    // Add system prompt
    parts.push({ text: WHATSAPP_SYSTEM_PROMPT + '\n\n' })

    // Add conversation history (last 6 messages)
    if (history.length > 0) {
      const historyText = history
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Kunde' : 'Lumino'}: ${m.content}`)
        .join('\n')
      parts.push({ text: `Bisheriges Gespräch:\n${historyText}\n\n` })
    }

    // Handle image if attached
    let hasImage = false
    if (message.mediaUrl && message.mediaContentType?.startsWith('image')) {
      try {
        // Fetch the image from Twilio's URL
        const imageResponse = await fetch(message.mediaUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64')}`
          }
        })

        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer()
          const base64Image = Buffer.from(imageBuffer).toString('base64')

          parts.push({
            inlineData: {
              mimeType: message.mediaContentType,
              data: base64Image
            }
          })
          hasImage = true
        }
      } catch (imgError) {
        console.error('Error fetching WhatsApp image:', imgError)
      }
    }

    // Add user message
    const userText = message.body || (hasImage ? '(Bild gesendet)' : '')
    parts.push({ text: `Kunde: ${userText}\n\nLumino:` })

    // Add to history
    history.push({ role: 'user', content: userText })

    // Check if this is an image generation request
    const isImageRequest =
      message.body.toLowerCase().includes('direkt') ||
      message.body.toLowerCase().includes('loslegen') ||
      message.body.toLowerCase().includes('generier') ||
      message.body.toLowerCase().includes('erstell')

    let responseText = ''
    let generatedImageUrl: string | null = null

    if (isImageRequest && hasImage) {
      // Generate image using Gemini
      try {
        const imagePrompt = `${message.body}. Erstelle ein professionelles Produktfoto mit hoher Qualität, kommerziellem Stil und professioneller Beleuchtung.`

        const response = await withRetry(() =>
          getClient().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: parts.slice(-2), // Just the image and prompt
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          })
        )

        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.text) {
              responseText += part.text
            } else if (part.inlineData) {
              // For WhatsApp, we need to host the image somewhere
              // For now, we'll note that the image was generated
              // In production, upload to Supabase Storage and get public URL
              const imageData = part.inlineData.data
              const mimeType = part.inlineData.mimeType || 'image/png'
              generatedImageUrl = `data:${mimeType};base64,${imageData}`
            }
          }
        }

        if (!responseText) {
          responseText = 'Hier ist dein Produktfoto! Schau es dir auf lumino.studio an.'
        }
      } catch (error) {
        console.error('Image generation error:', error)
        responseText = 'Die Bildgenerierung ist gerade nicht verfügbar. Bitte versuche es in ein paar Minuten erneut.'
      }
    } else {
      // Regular chat response
      const response = await withRetry(() =>
        getClient().models.generateContent({
          model: 'gemini-2.0-flash',
          contents: parts,
        })
      )

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            responseText += part.text
          }
        }
      }
    }

    if (!responseText) {
      responseText = 'Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Bitte versuche es erneut.'
    }

    // Add assistant response to history
    history.push({ role: 'assistant', content: responseText })

    // Keep only last 20 messages in history
    if (history.length > 20) {
      history.splice(0, history.length - 20)
    }

    // Send response via WhatsApp
    await sendWhatsAppMessage(message.from, responseText)

    // If we generated an image, upload it and send via WhatsApp
    if (generatedImageUrl) {
      try {
        // Upload to Supabase Storage to get public URL
        const publicUrl = await uploadImageToStorage(generatedImageUrl)

        if (publicUrl) {
          // Send image via WhatsApp
          await sendWhatsAppMessage(message.from, 'Hier ist dein Produktfoto:', publicUrl)

          // Save to user's gallery
          const whatsappUserId = await getOrCreateWhatsAppUser(phoneNumber)
          await saveImageToGallery(publicUrl, `whatsapp:${whatsappUserId}`)
        }
      } catch (uploadError) {
        console.error('Error uploading/sending image:', uploadError)
        await sendWhatsAppMessage(
          message.from,
          'Das Bild wurde generiert! Besuche lumino.studio um es anzusehen.'
        )
      }
    }

    // Return TwiML response (empty is fine, we're handling async)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' }
      }
    )

  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      }
    )
  }
}

// Twilio sends GET requests to verify webhook
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'WhatsApp webhook active' })
}
