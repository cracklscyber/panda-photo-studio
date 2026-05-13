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
  const matchAny = (...keywords: string[]) => keywords.some((k) => lower.includes(k))

  let base: string
  if (matchAny('bäckerei', 'baeckerei', 'bäcker', 'baecker', 'konditor')) {
    base = 'A warm artisan bakery interior, fresh bread loaves and pastries on a wooden counter, natural daylight, flour-dusted surfaces, authentic German Handwerksbäckerei atmosphere, photo-realistic'
  } else if (matchAny('cafe', 'café', 'coffee', 'kaffee', 'rösterei', 'roesterei')) {
    base = 'A warm, inviting specialty coffee shop interior, natural daylight, wooden counter, soft minimalist atmosphere, photo-realistic'
  } else if (matchAny('friseur', 'frisör', 'barber', 'salon', 'hair')) {
    base = 'A modern minimalist hair salon interior, warm wood, soft natural lighting, elegant atmosphere'
  } else if (matchAny('blume', 'florist', 'blumenladen', 'blumenstrauß')) {
    base = 'A bright florist studio with handmade bouquets, soft pastel light, natural blooms, refined minimalist style'
  } else if (matchAny('restaurant', 'bistro', 'gaststätte', 'gaststaette', 'wirtshaus')) {
    base = 'A cosy modern restaurant interior, dim warm lights, set tables, refined hospitality atmosphere'
  } else if (matchAny('elektriker', 'elektro', 'elektroinstallateur', 'elektrotechnik')) {
    base = 'A focused electrician at work in a modern German residential setting, installing or checking an electrical panel and wiring, clean tools, safety helmet, natural light, authentic and trustworthy craftsmanship, photo-realistic'
  } else if (matchAny('klempner', 'sanitär', 'sanitaer', 'heizung', 'installateur')) {
    base = 'A skilled plumber at work, installing or repairing piping under a sink, clean tools, blue work clothes, modern German bathroom or kitchen, authentic and trustworthy craftsmanship, photo-realistic'
  } else if (matchAny('schreiner', 'tischler', 'schreinerei', 'tischlerei')) {
    base = 'A carpentry workshop, hands working on a wooden piece, planing or chiseling, wood shavings, warm natural light, traditional German craftsmanship, photo-realistic'
  } else if (matchAny('maler', 'malermeister', 'malerbetrieb', 'lackierer')) {
    base = 'A professional painter at work in a residential room, applying paint with a roller on a white wall, drop cloth, ladder, clean overalls, natural daylight, German Malerbetrieb craftsmanship, photo-realistic'
  } else if (matchAny('dachdecker', 'spengler')) {
    base = 'A roofer at work on a German residential roof, installing tiles or zinc gutter, safety harness, blue sky, authentic Handwerk, photo-realistic'
  } else if (matchAny('kfz', 'mechatron', 'mechaniker', 'autowerkstatt', 'autohaus', 'kfz-werkstatt')) {
    base = 'A modern car repair garage interior, a vehicle on a lift, mechanic working with diagnostic tools, clean industrial space, photo-realistic'
  } else if (matchAny('hundeschule', 'hundetraining', 'tier', 'tierarzt', 'tierpraxis')) {
    base = 'A bright outdoor dog training scene, a happy dog with a focused trainer, golden hour light, natural park setting, authentic and joyful atmosphere, photo-realistic'
  } else if (matchAny('handwerk', 'werkstatt', 'meisterbetrieb', 'gewerk')) {
    base = 'A traditional German craftsman workshop, focused hands working with quality tools, warm natural light, authentic and trustworthy atmosphere, photo-realistic'
  } else if (matchAny('kosmetik', 'nagel', 'beauty', 'nail', 'wimpern')) {
    base = 'A serene minimalist beauty studio, soft pink and beige tones, elegant minimalist setup, gentle daylight'
  } else if (matchAny('fitness', 'yoga', 'wellness', 'pilates', 'gym', 'studio')) {
    base = 'A bright airy yoga studio with wooden floor, warm sunlight, plants, calm minimalist atmosphere'
  } else if (matchAny('praxis', 'arzt', 'ärztin', 'aerztin', 'physio', 'heilpraktiker', 'therapie')) {
    base = 'A clean modern medical practice waiting room, soft natural light, plants, calming neutral tones, trustworthy atmosphere, photo-realistic'
  } else if (matchAny('kanzlei', 'anwalt', 'rechtsanwalt', 'notar', 'steuerberater')) {
    base = 'A refined modern law-office or consultancy interior, oak desk, leather chair, soft daylight, books, trustworthy and professional atmosphere, photo-realistic'
  } else if (matchAny('fahrschule', 'fahrlehrer')) {
    base = 'A modern driving-school car interior on a sunny German road, dashboard view, calm and reassuring atmosphere, photo-realistic'
  } else if (matchAny('it', 'software', 'agentur', 'webdesign', 'marketing')) {
    base = 'A modern creative agency office, large monitors, warm wood, plants, focused team at work, soft daylight, photo-realistic'
  } else {
    base = 'A welcoming professional small-business interior, natural daylight, modern minimalist branding, warm tones, photo-realistic'
  }

  const variations = [
    `${base}, hero shot, wide composition`,
    `${base}, detail shot, close framing`,
    `${base}, ambiance shot, soft focus`,
    `${base}, people working naturally, candid`,
    `${base}, product close-up, careful styling`,
  ]
  return variations.slice(0, count)
}
