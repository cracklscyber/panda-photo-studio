import { GoogleGenAI } from '@google/genai'
import { uploadSiteFile, sitePreviewUrl } from './supabase-storage'

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

const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-3.1-flash-image-preview'

function isGeminiNativeImageModel(model: string): boolean {
  return model.startsWith('gemini-')
}

export async function generateImage(opts: {
  slug: string
  prompt: string
  aspect?: ImageAspect
  filename?: string
}): Promise<GeneratedImage> {
  const aspect = opts.aspect || '4:3'
  const ai = gemini()
  let imageBytes: string | undefined
  let mimeType = 'image/png'

  if (isGeminiNativeImageModel(GEMINI_IMAGE_MODEL)) {
    const res = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: opts.prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: aspect,
          imageSize: '2K',
        },
      },
    })
    const parts = res.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((part) => part.inlineData?.data)
    imageBytes = imagePart?.inlineData?.data
    mimeType = imagePart?.inlineData?.mimeType || 'image/png'
  } else {
    const res = await ai.models.generateImages({
      model: GEMINI_IMAGE_MODEL,
      prompt: opts.prompt,
      config: { numberOfImages: 1, aspectRatio: aspect },
    })
    const generated = res.generatedImages?.[0]
    imageBytes = generated?.image?.imageBytes
  }

  if (!imageBytes) {
    throw new Error(`No image returned from ${GEMINI_IMAGE_MODEL}.`)
  }

  const buffer = Buffer.from(imageBytes, 'base64')
  const safeName = (opts.filename || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`).replace(
    /[^a-z0-9-_.]/gi,
    '-'
  )
  const path = `${safeName.endsWith('.png') ? safeName : `${safeName}.png`}`

  await uploadSiteFile(opts.slug, path, buffer, mimeType)

  return {
    url: sitePreviewUrl(opts.slug, path),
    storagePath: path,
    bytes: buffer.byteLength,
  }
}

export async function generateImagesForBranche(opts: {
  slug: string
  branche: string
  wish?: string
  count?: number
}): Promise<GeneratedImage[]> {
  const count = Math.min(Math.max(opts.count || 3, 1), 5)
  const prompts = imagePromptsForBranche(opts.branche, count, opts.wish)
  const results: GeneratedImage[] = []
  for (let i = 0; i < prompts.length; i++) {
    try {
      const img = await generateImage({
        slug: opts.slug,
        prompt: prompts[i],
        aspect: i === 0 ? '16:9' : '4:3',
        filename: `gen-${Date.now()}-${i + 1}-${Math.random().toString(36).slice(2, 7)}.png`,
      })
      results.push(img)
    } catch (err) {
      console.error(`generateImagesForBranche: image ${i + 1} failed:`, err)
    }
  }
  return results
}

function imagePromptsForBranche(branche: string, count: number, wish?: string): string[] {
  // Wortgrenzen-Match statt Substring. NFD-Normalisierung räumt
  // Diakritika weg (ä→a, é→e, ß→ss), Bindestriche werden zu Space → so
  // splittet "IT-Dienstleister" sauber in zwei Wörter und matched
  // "it-dienstleister" zuverlässig. Fixt den Bug, bei dem das Keyword "it"
  // innerhalb von "website" matchte und jeden User in den IT-Agentur-Prompt
  // rutschen ließ.
  const normalize = (s: string) =>
    ' ' +
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim() +
    ' '
  const padded = normalize(branche)
  const matchAny = (...keywords: string[]) =>
    keywords.some((k) => padded.includes(normalize(k)))
  const brancheClean = branche.trim().slice(0, 500)
  const wishClean = (wish || '').trim().slice(0, 400)

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
  } else if (
    matchAny(
      'obsthof',
      'obstbauer',
      'obstbau',
      'obsthändler',
      'obsthaendler',
      'obstladen',
      'obstkiste',
      'obstkisten',
      'wochenmarkt',
      'hofladen',
      'regionaler obsthandel',
      'frisches obst',
      'äpfel',
      'aepfel',
      'birnen',
      'beeren'
    )
  ) {
    base =
      'A real regional fruit farm and market scene in Germany: wooden crates filled with fresh apples, pears, berries and seasonal fruit, a friendly farm stand or Hofladen, natural daylight, visible fruit trees or market stall details, warm rural Brandenburg atmosphere, authentic small agricultural business, photo-realistic. Absolutely no office, no conference room, no laptops, no corporate meeting, no generic agency interior, no readable signs, no chalkboard text, no labels with text, no price tags with text'
  } else if (
    matchAny(
      'gemüsehof',
      'gemuesehof',
      'gemüsehändler',
      'gemuesehaendler',
      'gemüseladen',
      'gemueseladen',
      'bauernhof',
      'landwirtschaft',
      'hofmarkt',
      'marktstand',
      'regionaler handel'
    )
  ) {
    base =
      'A real regional farm shop or weekly market stand in Germany: wooden crates filled with fresh seasonal vegetables and produce, hand-written price tags without readable text, natural daylight, rustic wooden tables, warm rural atmosphere, authentic local agricultural business, photo-realistic. Absolutely no office, no conference room, no laptops, no corporate meeting, no generic agency interior'
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
  } else if (matchAny('autohaus', 'autohandel', 'fahrzeughandel', 'gebrauchtwagen', 'neuwagen', 'fahrzeuge verkaufen')) {
    base = 'A premium car dealership scene in Germany: elegant showroom or clean outdoor forecourt with several polished modern cars for sale, realistic vehicle selection, refined sales atmosphere, natural daylight, trustworthy local Autohaus, photo-realistic. Absolutely no repair garage, no mechanic, no vehicle lift, no oily workshop, no diagnostic tools'
  } else if (matchAny('kfz', 'mechatron', 'mechaniker', 'autowerkstatt', 'kfz-werkstatt', 'autoservice', 'reparatur')) {
    base = 'A modern car repair garage interior, a vehicle on a lift, mechanic working with diagnostic tools, clean industrial space, photo-realistic'
  } else if (matchAny('hundeschule', 'hundetraining', 'hundetrainer', 'tier', 'tierarzt', 'tierpraxis')) {
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
  } else if (matchAny('reinigung', 'gebäudereinigung', 'gebaeudereinigung', 'putzfirma', 'cleaning')) {
    base = 'A professional cleaning service team working in a bright modern apartment or office, clean supplies, polished surfaces, fresh daylight, trustworthy local service atmosphere, photo-realistic. No corporate meeting, no laptops, no generic agency workspace'
  } else if (matchAny('gartenbau', 'gärtner', 'gaertner', 'landschaftsbau', 'galabau', 'baumpflege')) {
    base = 'A professional gardener or landscaping team working in a lush private garden, plants, soil, pruning tools, natural daylight, authentic local Gartenbau craftsmanship, photo-realistic. No office, no meeting room, no laptops'
  } else if (matchAny('immobilien', 'makler', 'hausverwaltung')) {
    base = 'A refined real-estate scene in Germany: bright modern apartment interior, elegant entryway or living room, agent showing a home naturally, premium but realistic, soft daylight, photo-realistic. No generic office meeting, no laptop-focused corporate scene'
  } else if (matchAny('kita', 'kindergarten', 'tagesmutter', 'kinderbetreuung')) {
    base = 'A warm childcare or kindergarten environment, bright playroom, wooden toys, calm friendly atmosphere, natural daylight, caring educational setting, photo-realistic. No office, no corporate meeting'
  } else if (matchAny('tattoo', 'tattoostudio', 'piercing')) {
    base = 'A clean modern tattoo studio, artist preparing tools or sketching a tattoo design, black chair, hygienic setup, warm edgy atmosphere, photo-realistic. No office, no generic corporate workspace'
  } else if (matchAny('catering', 'eventservice', 'partyservice')) {
    base = 'A premium catering setup with beautifully arranged food platters, chef hands preparing fresh dishes, elegant event table, natural warm light, photo-realistic. No office, no meeting room'
  } else if (matchAny('fotograf', 'fotografie', 'fotostudio')) {
    base = 'A professional photography studio or natural-light shoot setup, camera gear, softbox or daylight, refined creative atmosphere, photo-realistic. No generic office, no laptop meeting'
  } else if (matchAny('buchhandlung', 'buchladen', 'bücher', 'antiquariat', 'bookstore')) {
    base = 'A warm independent German bookstore interior, floor-to-ceiling wooden bookshelves filled with books, a cosy reading corner with an armchair and a small reading lamp, soft natural daylight through tall windows, books carefully arranged spines outward, calm editorial atmosphere, photo-realistic'
  } else if (matchAny('boutique', 'mode', 'fashion', 'kleidung', 'modegeschäft')) {
    base = 'A refined minimalist fashion boutique interior, curated rack of clothing on a wooden rail, soft warm daylight, natural materials, calm and premium atmosphere, photo-realistic'
  } else if (matchAny('schmuck', 'goldschmied', 'juwelier', 'jewelry')) {
    base = 'A refined jewelry atelier, close-up of hands working on a delicate piece, soft warm spotlight, dark velvet surface, premium craftsmanship atmosphere, photo-realistic'
  } else if (matchAny('software', 'agentur', 'webdesign', 'marketing', 'it-firma', 'it-agentur', 'it-dienstleister', 'it-consulting', 'it-service')) {
    base = 'A modern creative agency office, large monitors, warm wood, plants, focused team at work, soft daylight, photo-realistic'
  } else {
    base = [
      `Infer the exact business category from this German customer description: "${brancheClean || 'local small business'}".`,
      'Create a real, specific scene that visibly belongs to that business: show the typical products, service situation, tools, workplace, materials, customers or environment people would immediately associate with it.',
      'Do not default to an office, meeting room, laptop, agency workspace or generic small-business interior unless the customer description clearly says this is an office-based business.',
      'Authentic local German small-business atmosphere, natural daylight, premium editorial website photography, photo-realistic',
    ].join(' ')
  }

  // When the customer described a concrete wish (mood, motifs, palette),
  // prepend it to the prompt so Imagen actually reflects what they asked for.
  const withWish = (p: string, index: number) =>
    [
      wishClean
        ? `Create a NEW alternative based on this customer direction: ${wishClean}.`
        : 'Create a strong, premium website hero image.',
      p,
      `Variation ${index + 1}: use a clearly different camera angle, subject placement, color mood and composition from the other variations.`,
      'No text anywhere in the image, no readable letters, no signage, no chalkboard writing, no logo, no watermark, no generic stock-photo feeling, no duplicated composition. The image must visibly match the described business category and must not show an unrelated office, meeting room or generic corporate workspace unless the customer explicitly asked for that.',
    ].join(' ')

  const variations = [
    withWish(`${base}, hero shot, wide composition, editorial website photography`, 0),
    withWish(`${base}, detail shot, close framing, tactile and specific`, 1),
    withWish(`${base}, ambiance shot, energetic but clean, strong visual rhythm`, 2),
    withWish(`${base}, people working naturally, candid and premium`, 3),
    withWish(`${base}, product close-up, careful styling, bold but minimal`, 4),
  ]
  return variations.slice(0, count)
}
