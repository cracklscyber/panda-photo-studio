import { GoogleGenAI } from '@google/genai'
import { uploadSiteFile, sitePublicUrl } from './supabase-storage'

let _client: GoogleGenAI | null = null
function gemini(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
    if (!apiKey) throw new Error('GEMINI_API_KEY missing')
    _client = new GoogleGenAI({ apiKey })
  }
  return _client
}

export type ImageAspect = '1:1' | '4:3' | '3:4' | '16:9' | '9:16'

export interface GeneratedImage {
  url: string
  storagePath: string
  bytes: number
}

const IMAGEN_MODEL = 'imagen-4.0-generate-001'

export async function generateImage(opts: {
  slug: string
  prompt: string
  aspect?: ImageAspect
  filename?: string
}): Promise<GeneratedImage> {
  const aspect = opts.aspect || '4:3'
  const ai = gemini()
  const res = await ai.models.generateImages({
    model: IMAGEN_MODEL,
    prompt: opts.prompt,
    config: { numberOfImages: 1, aspectRatio: aspect },
  })

  const generated = res.generatedImages?.[0]
  const imageBytes = generated?.image?.imageBytes
  if (!imageBytes) {
    throw new Error('No image returned from Imagen.')
  }

  const buffer = Buffer.from(imageBytes, 'base64')
  const safeName = (opts.filename || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`).replace(
    /[^a-z0-9-_.]/gi,
    '-'
  )
  const path = `${safeName.endsWith('.png') ? safeName : `${safeName}.png`}`

  await uploadSiteFile(opts.slug, path, buffer, 'image/png')

  return {
    url: sitePublicUrl(opts.slug, path),
    storagePath: path,
    bytes: buffer.byteLength,
  }
}

export async function generateImagesForBranche(opts: {
  slug: string
  branche: string
  count?: number
}): Promise<GeneratedImage[]> {
  const count = Math.min(Math.max(opts.count || 3, 1), 5)
  const prompts = imagePromptsForBranche(opts.branche, count)
  const results: GeneratedImage[] = []
  for (let i = 0; i < prompts.length; i++) {
    try {
      const img = await generateImage({
        slug: opts.slug,
        prompt: prompts[i],
        aspect: i === 0 ? '16:9' : '4:3',
        filename: `gen-${i + 1}.png`,
      })
      results.push(img)
    } catch (err) {
      console.error(`generateImagesForBranche: image ${i + 1} failed:`, err)
    }
  }
  return results
}

function imagePromptsForBranche(branche: string, count: number): string[] {
  const lower = branche.toLowerCase()
  const base =
    lower.includes('cafe') || lower.includes('café') || lower.includes('coffee') || lower.includes('bäckerei')
      ? 'A warm, inviting specialty coffee shop interior, natural daylight, wooden counter, soft minimalist atmosphere, photo-realistic'
      : lower.includes('friseur') || lower.includes('barber') || lower.includes('salon')
        ? 'A modern minimalist hair salon interior, warm wood, soft natural lighting, elegant atmosphere'
        : lower.includes('blume') || lower.includes('florist')
          ? 'A bright florist studio with handmade bouquets, soft pastel light, natural blooms, refined minimalist style'
          : lower.includes('restaurant') || lower.includes('bistro')
            ? 'A cosy modern restaurant interior, dim warm lights, set tables, refined hospitality atmosphere'
            : lower.includes('handwerk') || lower.includes('werkstatt')
              ? 'A traditional craftsman workshop, focused hands working with quality tools, warm natural light, authentic atmosphere'
              : lower.includes('kosmetik') || lower.includes('nagel') || lower.includes('beauty')
                ? 'A serene minimalist beauty studio, soft pink and beige tones, elegant minimalist setup, gentle daylight'
                : lower.includes('fitness') || lower.includes('yoga') || lower.includes('wellness')
                  ? 'A bright airy yoga studio with wooden floor, warm sunlight, plants, calm minimalist atmosphere'
                  : 'A welcoming professional small-business interior, natural daylight, modern minimalist branding, warm tones'

  const variations = [
    `${base}, hero shot, wide composition`,
    `${base}, detail shot, close framing`,
    `${base}, ambiance shot, soft focus`,
    `${base}, people working naturally, candid`,
    `${base}, product close-up, careful styling`,
  ]
  return variations.slice(0, count)
}
