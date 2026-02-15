import { NextRequest, NextResponse } from 'next/server'
import { parseWhatsAppWebhook, sendWhatsAppMessage, extractPhoneNumber } from '@/lib/twilio'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateWhatsAppUser,
  getLinkedUserIdServer,
  getCustomerProfile,
  loadChatHistory,
  saveWhatsAppMessage,
  trimChatHistory,
  CustomerProfile
} from '@/lib/whatsapp-db'
import { extractAndUpdateProfile } from '@/lib/profile-extractor'

// Server-side Supabase client (for image upload + gallery)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-side image upload (Node.js compatible - uses Buffer instead of atob)
async function uploadImageToStorageServer(base64Image: string): Promise<string | null> {
  try {
    // Extract base64 data and mime type
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/)
    if (!matches) {
      console.error('Invalid base64 image format')
      return null
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const extension = mimeType.split('/')[1] || 'png'

    // Convert base64 to Buffer (Node.js compatible)
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename
    const uniqueName = `whatsapp-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`

    console.log(`Uploading image: ${uniqueName}, size: ${buffer.length} bytes`)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('generated-images')
      .upload(uniqueName, buffer, {
        contentType: mimeType,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(data.path)

    console.log('Image uploaded successfully:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadImageToStorageServer:', error)
    return null
  }
}

// Save image to gallery
async function saveImageToGalleryServer(imageUrl: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gallery_images')
    .insert({
      image_url: imageUrl,
      user_id: userId,
      archived: false
    })

  if (error) {
    console.error('Error saving to gallery:', error)
  }
}

// Initialize Gemini
let ai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
  }
  return ai
}

// Store user images across messages (so "direkt loslegen" can use previously sent image)
const userImages: Map<string, { base64: string; mimeType: string; timestamp: number }> = new Map()

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

BEGRÜSSUNG - Bei "Hallo", "Hi", "Hey" oder Start:
"Hey! Ich bin Lumino, dein KI-Assistent für Produktfotos.

Schick mir ein Bild von deinem Produkt und beschreib mir kurz, wie das Foto aussehen soll!"

WENN KUNDE EIN BILD SCHICKT:
1. Reagiere kurz begeistert
2. Frage: "Wie soll dein Produktfoto aussehen?"
3. Biete 2-3 passende Stil-Vorschläge:
   - Minimalistisch auf weiß
   - Luxuriös auf Marmor
   - Natürlich mit Holz/Pflanzen

WENN KUNDE EINEN STIL BESCHREIBT (kurz, unter 10 Wörter):
Antworte: "Klingt gut! Ich kann dir zwei Wege anbieten:

1. Direkt loslegen - Ich generiere sofort dein Bild
2. Rückfragen - Ich stelle 2-3 kurze Fragen für ein besseres Ergebnis

Was ist dir lieber?"

WENN KUNDE "1", "direkt" ODER "loslegen" SAGT:
Antworte: "Perfekt, ich erstelle dein Bild! Einen Moment..."

WENN KUNDE "2", "fragen" ODER "rückfragen" SAGT:
Stelle 2-3 kurze Fragen zu Farben, Stimmung oder Details.

WICHTIG:
- KURZE Antworten (max 3-4 Sätze)
- Emojis sparsam
- NIEMALS Begrüßung wiederholen
- Du generierst KEINE Bilder selbst - sage nur "Ich erstelle dein Bild..."`

function buildSystemPrompt(profile: CustomerProfile | null): string {
  if (!profile) return WHATSAPP_SYSTEM_PROMPT

  const fields: Array<[string, string | null]> = [
    ['Name', profile.customer_name],
    ['Firma', profile.company_name],
    ['Markenfarben', profile.brand_colors],
    ['Bevorzugte Stile', profile.preferred_styles],
    ['Lieblings-Hintergründe', profile.favorite_backgrounds],
    ['Format-Präferenzen', profile.image_format_preferences],
    ['Anrede', profile.address_form],
    ['Notizen', profile.special_notes],
  ]

  const profileLines = fields
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)

  if (profileLines.length === 0) return WHATSAPP_SYSTEM_PROMPT

  return `${WHATSAPP_SYSTEM_PROMPT}

KUNDENPROFIL:
${profileLines.join('\n')}

Nutze diese Informationen, um personalisierter zu antworten. Sprich den Kunden mit ${profile.address_form || 'Du'} an.`
}

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

    // Get or create WhatsApp user in DB
    const whatsappUserId = await getOrCreateWhatsAppUser(phoneNumber)

    // Load profile and chat history in parallel
    const [profile, dbHistory] = await Promise.all([
      getCustomerProfile(whatsappUserId),
      loadChatHistory(whatsappUserId, 50),
    ])

    // Prepare parts for Gemini
    const parts: any[] = []

    // Add system prompt with profile context
    parts.push({ text: buildSystemPrompt(profile) + '\n\n' })

    // Add conversation history (last 10 messages from DB)
    if (dbHistory.length > 0) {
      const historyText = dbHistory
        .slice(-10)
        .map(m => `${m.role === 'user' ? 'Kunde' : 'Lumino'}: ${m.content}`)
        .join('\n')
      parts.push({ text: `Bisheriges Gespräch:\n${historyText}\n\n` })
    }

    // Handle image if attached
    let hasImage = false
    let freshImageInMessage = false
    let userImageBase64: string | null = null

    console.log('=== WhatsApp Message Debug ===')
    console.log('Media URL:', message.mediaUrl)
    console.log('Media Type:', message.mediaContentType)
    console.log('Message Body:', message.body)

    if (message.mediaUrl && message.mediaContentType?.startsWith('image')) {
      try {
        console.log('Fetching image from Twilio...')
        // Fetch the image from Twilio's URL
        const imageResponse = await fetch(message.mediaUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64')}`
          }
        })

        console.log('Twilio image response status:', imageResponse.status)

        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer()
          const base64Image = Buffer.from(imageBuffer).toString('base64')
          userImageBase64 = base64Image

          console.log('Image fetched successfully, size:', base64Image.length, 'chars')

          // Store the image for later use (e.g., when user says "direkt loslegen")
          userImages.set(phoneNumber, {
            base64: base64Image,
            mimeType: message.mediaContentType!,
            timestamp: Date.now()
          })
          console.log('Image stored for user:', phoneNumber)

          parts.push({
            inlineData: {
              mimeType: message.mediaContentType,
              data: base64Image
            }
          })
          hasImage = true
          freshImageInMessage = true
        } else {
          console.error('Failed to fetch image:', imageResponse.status, imageResponse.statusText)
        }
      } catch (imgError) {
        console.error('Error fetching WhatsApp image:', imgError)
      }
    } else {
      console.log('No image attached or not an image type')
    }

    // If no image in this message, check if we have a stored image from earlier
    if (!hasImage && userImages.has(phoneNumber)) {
      const storedImage = userImages.get(phoneNumber)!
      // Only use if less than 30 minutes old
      if (Date.now() - storedImage.timestamp < 30 * 60 * 1000) {
        console.log('Using stored image from earlier message')
        userImageBase64 = storedImage.base64
        parts.push({
          inlineData: {
            mimeType: storedImage.mimeType,
            data: storedImage.base64
          }
        })
        hasImage = true
      } else {
        console.log('Stored image too old, ignoring')
        userImages.delete(phoneNumber)
      }
    }

    console.log('hasImage:', hasImage)

    // Add user message
    const userText = message.body || (hasImage ? '(Bild gesendet)' : '')
    parts.push({ text: `Kunde: ${userText}\n\nLumino:` })

    // Check if this is an image generation request
    const messageText = message.body.toLowerCase()

    // Direct generation keywords
    const hasDirectKeywords =
      messageText.includes('direkt') ||
      messageText.includes('loslegen') ||
      messageText.includes('generier') ||
      messageText.includes('erstell') ||
      messageText.includes('mach mir') ||
      messageText.includes('zeig mir')

    // Style/description keywords that indicate user wants to generate
    const hasStyleDescription = hasImage && (
      messageText.includes('hintergrund') ||
      messageText.includes('szene') ||
      messageText.includes('foto') ||
      messageText.includes('stil') ||
      messageText.includes('minimalist') ||
      messageText.includes('natur') ||
      messageText.includes('studio') ||
      messageText.includes('marmor') ||
      messageText.includes('weiß') ||
      messageText.includes('weiss') ||
      messageText.includes('schwarz') ||
      messageText.includes('holz') ||
      messageText.includes('luxus') ||
      messageText.includes('elegant') ||
      messageText.includes('modern') ||
      messageText.includes('professionell')
    )

    // Only generate when user explicitly wants to (e.g. "direkt loslegen") with a stored image
    // When a fresh image is sent, ALWAYS go through chat flow first (ask questions about style)
    const shouldGenerateImage = hasImage && !freshImageInMessage && (hasDirectKeywords || hasStyleDescription)

    console.log('hasDirectKeywords:', hasDirectKeywords)
    console.log('hasStyleDescription:', hasStyleDescription)
    console.log('freshImageInMessage:', freshImageInMessage)
    console.log('shouldGenerateImage:', shouldGenerateImage)

    let responseText = ''
    let generatedImageUrl: string | null = null

    if (shouldGenerateImage) {
      // Generate image using Gemini
      try {
        // Build image generation prompt with user's description
        const userDescription = message.body || 'professionelles Produktfoto'
        const imagePrompt = `Bearbeite dieses Produktbild: ${userDescription}. Erstelle ein professionelles Produktfoto mit hoher Qualität, kommerziellem Stil und professioneller Beleuchtung. Behalte das Produkt aus dem Original bei.`

        // Get the image part from the parts array
        const imagePart = parts.find(p => p.inlineData)

        // Create content for image generation
        const imageContents = [
          imagePart,
          { text: imagePrompt }
        ].filter(Boolean)

        console.log('=== Image Generation ===')
        console.log('Prompt:', imagePrompt)
        console.log('Has image part:', !!imagePart)

        const response = await withRetry(() =>
          getClient().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: imageContents,
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          })
        )

        console.log('Gemini response received')
        console.log('Candidates:', response.candidates?.length || 0)

        if (response.candidates && response.candidates[0]?.content?.parts) {
          console.log('Response parts:', response.candidates[0].content.parts.length)
          for (const part of response.candidates[0].content.parts) {
            console.log('Part type:', part.text ? 'text' : part.inlineData ? 'image' : 'unknown')
            if (part.text) {
              responseText += part.text
            } else if (part.inlineData) {
              const imageData = part.inlineData.data
              const mimeType = part.inlineData.mimeType || 'image/png'
              generatedImageUrl = `data:${mimeType};base64,${imageData}`
              console.log('Generated image received, size:', imageData?.length || 0, 'chars')
            }
          }
        } else {
          console.log('No candidates in response')
        }

        if (generatedImageUrl) {
          responseText = responseText || 'Hier ist dein professionelles Produktfoto!'
          console.log('Image generation successful')
        } else {
          responseText = responseText || 'Das Bild konnte nicht generiert werden. Bitte versuche es erneut.'
          console.log('No image in response')
        }
      } catch (error: any) {
        console.error('Image generation error:', error?.message || error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        responseText = 'Die Bildgenerierung ist gerade nicht verfügbar. Bitte versuche es in ein paar Minuten erneut.'
      }
    } else {
      // Regular chat response
      const response = await withRetry(() =>
        getClient().models.generateContent({
          model: 'gemini-2.5-flash',
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

    // Save messages to DB
    await saveWhatsAppMessage(whatsappUserId, 'user', userText)
    await saveWhatsAppMessage(whatsappUserId, 'assistant', responseText)

    // Fire-and-forget: trim history and extract profile updates
    trimChatHistory(whatsappUserId, 50).catch(e => console.error('Trim error:', e))
    extractAndUpdateProfile(getClient(), whatsappUserId, userText, profile).catch(e => console.error('Profile extract error:', e))

    // Send response via WhatsApp
    await sendWhatsAppMessage(message.from, responseText)

    // If we generated an image, upload it and send via WhatsApp
    if (generatedImageUrl) {
      try {
        console.log('Uploading generated image to Supabase...')
        // Upload to Supabase Storage to get public URL (server-side version)
        const publicUrl = await uploadImageToStorageServer(generatedImageUrl)

        if (publicUrl) {
          console.log('Sending image via WhatsApp:', publicUrl)
          // Send image via WhatsApp
          const sent = await sendWhatsAppMessage(message.from, 'Hier ist dein Produktfoto:', publicUrl)
          console.log('WhatsApp image send result:', sent)

          // Save to user's gallery (use linked website user ID if available)
          const linkedUserId = await getLinkedUserIdServer(whatsappUserId)
          await saveImageToGalleryServer(publicUrl, linkedUserId || `whatsapp:${whatsappUserId}`)

          // Clear stored image after successful generation
          userImages.delete(phoneNumber)
          console.log('Cleared stored image for user:', phoneNumber)
        } else {
          console.error('Failed to get public URL from upload')
          await sendWhatsAppMessage(
            message.from,
            'Das Bild wurde generiert, aber konnte nicht gesendet werden. Besuche lumino.studio um es anzusehen.'
          )
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
