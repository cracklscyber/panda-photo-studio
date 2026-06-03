import { GoogleGenAI } from '@google/genai'

let _client: GoogleGenAI | null = null

function gemini(): GoogleGenAI {
  if (!_client) {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
    if (!apiKey) throw new Error('GEMINI_API_KEY missing')
    const originalGoogleKey = process.env.GOOGLE_API_KEY
    if (process.env.GEMINI_API_KEY) delete process.env.GOOGLE_API_KEY
    try {
      _client = new GoogleGenAI({ apiKey })
    } finally {
      if (originalGoogleKey !== undefined) process.env.GOOGLE_API_KEY = originalGoogleKey
    }
  }
  return _client
}

const GEMINI_TRANSCRIBE_MODEL =
  process.env.GEMINI_TRANSCRIBE_MODEL?.trim() || 'gemini-2.5-flash'

export async function transcribeAudio(opts: {
  base64: string
  mimeType: string
}): Promise<string> {
  const res = await gemini().models.generateContent({
    model: GEMINI_TRANSCRIBE_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'Transkribiere diese WhatsApp-Sprachnachricht auf Deutsch. ' +
              'Gib nur den gesprochenen Text zurück, keine Erklärung.',
          },
          {
            inlineData: {
              mimeType: opts.mimeType,
              data: opts.base64,
            },
          },
        ],
      },
    ],
  })

  const text = res.candidates?.[0]?.content?.parts
    ?.map((part) => ('text' in part ? part.text || '' : ''))
    .join('')
    .trim()

  if (!text) throw new Error('No transcript returned from Gemini')
  return text
}
