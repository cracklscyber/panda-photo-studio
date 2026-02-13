import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER // Format: whatsapp:+14155238886

// Initialize Twilio client
const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export interface WhatsAppMessage {
  from: string // User's phone number
  to: string // Lumino's WhatsApp number
  body: string // Text message
  mediaUrl?: string // Image URL if attached
  mediaContentType?: string
}

// Send a WhatsApp message
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  mediaUrl?: string
): Promise<boolean> {
  if (!client || !whatsappNumber) {
    console.error('Twilio not configured')
    return false
  }

  try {
    const messageOptions: any = {
      from: whatsappNumber,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body: message
    }

    if (mediaUrl) {
      messageOptions.mediaUrl = [mediaUrl]
    }

    await client.messages.create(messageOptions)
    return true
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return false
  }
}

// Send a template message (for initiating conversations)
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  variables?: string[]
): Promise<boolean> {
  if (!client || !whatsappNumber) {
    console.error('Twilio not configured')
    return false
  }

  try {
    await client.messages.create({
      from: whatsappNumber,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      contentSid: templateName,
      contentVariables: variables ? JSON.stringify(variables) : undefined
    })
    return true
  } catch (error) {
    console.error('Error sending WhatsApp template:', error)
    return false
  }
}

// Parse incoming webhook data from Twilio
export function parseWhatsAppWebhook(body: any): WhatsAppMessage {
  return {
    from: body.From || '',
    to: body.To || '',
    body: body.Body || '',
    mediaUrl: body.MediaUrl0,
    mediaContentType: body.MediaContentType0
  }
}

// Extract phone number without whatsapp: prefix
export function extractPhoneNumber(whatsappId: string): string {
  return whatsappId.replace('whatsapp:', '')
}
