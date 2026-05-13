import { NextRequest, NextResponse } from 'next/server'
import { routeMessage } from '@/lib/romy-router'
import { runRomyCoder, sanitizeReply } from '@/lib/romy-coder'
import {
  getOrCreateSite,
  updateSiteSandboxId,
  incrementBuildCount,
  markCallbackRequested,
  resetSite,
  publishSite,
  FREE_BUILD_LIMIT,
} from '@/lib/romy-sites'
import {
  downloadSiteFile,
  sitePublicUrl,
  sitePreviewUrl,
  uploadUserChatImage,
} from '@/lib/supabase-storage'
import { loadHistory, appendTurn, appendAssistantOnly, resetHistory } from '@/lib/romy-chat'
import { logBuild } from '@/lib/romy-costs'
import { generateImagesForBranche } from '@/lib/gemini-images'
import {
  IMAGE_DRAFT_MARKER,
  detectImageIntent,
  isFeatureEnabled as imageFeatureEnabled,
  USER_IMAGE_MARKER,
} from '@/lib/romy-image-intent'
import {
  generateDraftImage,
  confirmDraftImage,
  cancelDraftImage,
} from '@/lib/romy-image-session'
import {
  ensureCustomer,
  findCustomer,
  markFirstBuild,
  isAuthenticated,
  hasCompletedFirstBuild,
  resetCustomer,
} from '@/lib/romy-customers'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CAL_BOOKING_URL = 'https://cal.com/romy.ai'
const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/eVq00k0jc2r4251cZl7EQ00'

const ACK_FIRST_DIRECT =
  'Ich baue dir jetzt einen ersten Entwurf. Bleib bitte hier im Chat und schließe diese Seite nicht, sonst geht der Entwurf verloren. Feinheiten machen wir danach.'
const ACK_FOLLOWUP =
  'Mach ich. Bleib bitte hier im Chat und schließe diese Seite nicht, bis ich fertig bin.'

const AUTH_REQUIRED_REPLY =
  'Damit du deine Seite behältst und ich sie weiter für dich pflegen kann, lege bitte kurz dein Kundenkonto an. Das geht in Sekunden mit Google oder E-Mail. Danach speichere ich deinen Chatverlauf, deine Entwürfe und deine Website, und wir machen genau hier weiter.'

const ONBOARDING_JA_REPLY =
  'Alles klar. Erzähl mir bitte etwas über deine Firma. Was genau machst du?'
const ONBOARDING_NEIN_REPLY =
  'Alles klar, melde dich einfach wenn du soweit bist.'
const IMAGE_INTRO_QUESTION =
  'Ich generiere dir gleich drei Bilder für deinen ersten Entwurf — die sind erstmal als Platzhalter gedacht, damit das Layout steht. Feinheiten und eigene Fotos kommen ganz zum Schluss. Hast du eine konkrete Vorstellung, oder soll ich einfach loslegen?'
const WISH_PROMPT =
  'Erzähl mir kurz, was dir vorschwebt. Stimmung, Farben, was darauf zu sehen sein soll.'
const POST_IMAGES_GENERATING =
  'Geht klar, ich generiere dir gerade drei Vorschläge. Einen Moment.'
const POST_IMAGES_BUILD_QUESTION =
  'Damit kann ich loslegen. Soll ich jetzt deine Seite bauen?'
const POST_IMAGES_FAILED =
  'Mit der Bildgenerierung hat gerade etwas gehakt. Ich leite das an mein Team weiter. Wir können trotzdem mit dem Entwurf weitermachen, magst du loslegen?'
const POST_BUILD_IMAGE_QUESTION =
  'Möchtest du zusammen mit mir Bilder generieren oder hast du bereits eigene? Schick sie mir einfach rein.'

const QUICK_REPLIES_JA_NEIN = ['Ja', 'Nein']

const PUBLISH_MISSING_DRAFT_REPLY =
  'Ich habe noch keinen Entwurf, den ich veröffentlichen kann. Schick mir zuerst einen Link oder erzähl mir kurz, was ich bauen soll.'

// Hard-coded 2-Schritt-Gate: bevor eine Seite öffentlich live geht, muss der
// Nutzer dieses exakte Confirmation-Prompt sehen UND mit einem klaren "Ja"
// antworten. Der Text ist gleichzeitig der Marker, an dem die zweite Stufe
// erkennt, dass sie gerade die Bestätigungsfrage beantwortet.
const PUBLISH_CONFIRMATION_PROMPT =
  'Bist du sicher, dass ich deine Seite jetzt öffentlich veröffentliche? Sobald ich das mache, ist sie für jeden im Internet sichtbar. Antworte mit „Ja, veröffentlichen", wenn ich loslegen soll.'
const PUBLISH_CONFIRMED_REPLY =
  'Alles klar, ich habe deinen Entwurf veröffentlicht.'
const PUBLISH_CANCELLED_REPLY =
  'Okay, ich lasse deine Seite als Entwurf. Du kannst sie weiter ändern, sie ist nicht öffentlich.'

function isExplicitPublishYes(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[!.?,]+$/g, '')
  return (
    /^ja[,\s]*(veroeffentlich|veröffentlich)/i.test(normalized) ||
    normalized === 'ja, veröffentlichen' ||
    normalized === 'ja veröffentlichen' ||
    normalized === 'ja, veroeffentlichen' ||
    normalized === 'ja veroeffentlichen' ||
    normalized === 'ja, mach das' ||
    normalized === 'ja mach das' ||
    /\bja[, ]+(live schalten|online stellen)\b/i.test(normalized)
  )
}

type OnboardingStage = 'business_info' | 'image_intro' | 'image_wish' | 'build_confirm'

function stripUrlsAndLiveWording(text: string, isFirstBuild: boolean): string {
  let cleaned = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b(?:[a-z0-9-]+\.)?halloromy\.com\/\S*/gi, '')
  if (isFirstBuild) {
    cleaned = cleaned
      .replace(/\bdeine Seite ist (jetzt )?live\b/gi, 'dein Entwurf steht')
      .replace(/\bist (jetzt )?live\b/gi, 'ist als Entwurf fertig')
      .replace(/\b(deine|die) (Website|Seite) ist online\b/gi, 'dein Entwurf steht')
      .replace(/\bveröffentlicht\b/gi, 'als Entwurf gebaut')
  }
  return cleaned
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function detectOnboardingAnswer(text: string): 'ja' | 'nein' | null {
  const normalized = text.trim().toLowerCase().replace(/[!.?,]+$/g, '')
  if (normalized === 'ja' || normalized === 'yes' || normalized === 'jep' || normalized === 'jo') return 'ja'
  if (normalized === 'nein' || normalized === 'no' || normalized === 'nope' || normalized === 'nö') return 'nein'
  return null
}

function buildLimitMessage(sessionKey: string): {
  text: string
  paymentUrl: string
  bookingUrl: string
} {
  const paymentUrl = `${STRIPE_PAYMENT_URL}?client_reference_id=${encodeURIComponent(sessionKey)}`
  const text = [
    'Damit ich weiter an deiner Seite arbeiten kann, brauchst du eine Mitgliedschaft. 29 € im Monat, jederzeit kündbar.',
    '',
    'Du kannst direkt zum Stripe Checkout oder vorher kurz einen Beratungstermin buchen.',
  ].join('\n')
  return { text, paymentUrl, bookingUrl: CAL_BOOKING_URL }
}

function cleanSessionId(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
}

function fallbackReply(text: string): string {
  const lower = text.toLowerCase()
  if (/(preis|kost|beta|abo|monat)/.test(lower)) {
    return 'Romy ist gerade noch in der Beta. Du kannst kostenlos starten und mir erstmal erzählen, was deine Website können soll.'
  }
  if (/(hallo|hi|hey|guten)/.test(lower)) {
    return 'Hey, ich bin Romy. Erzähl mir kurz was du machst, wie deine Firma heißt und wo du bist, dann legen wir los.'
  }
  return 'Alles klar. Erzähl mir kurz: Was machst du, wie heißt deine Firma und wo bist du?'
}

function heuristicBuildIntent(
  text: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const lower = text.toLowerCase()
  if (previousAssistantAskedToBuildAfterImages(history)) return true
  return /\b(bau|baue|bauen|erstell|erstelle|machen|mach|änder|ändere|aendere|update|aktualisier|aktualisiere|füg|fueg|hinzu|lösch|loesch|entfern|design|farbe|schrift|öffnungszeit|oeffnungszeit|adresse|kontakt|preis|leistung|seite|website|webseite|homepage)\b/i.test(lower)
}

function wantsPublish(text: string): boolean {
  return /\b(veroeffentlichen|veröffentlichen|live schalten|online stellen|freigeben|seite live|go live)\b/i.test(text)
}

function lastAssistant(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): { content: string } | null {
  return [...history].reverse().find((m) => m.role === 'assistant') ?? null
}

function previousAssistantAskedForBusinessInfo(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const last = lastAssistant(history)
  if (!last) return false
  return last.content.includes('Erzähl mir bitte etwas über deine Firma')
}

function previousAssistantAskedAboutImageWishes(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const last = lastAssistant(history)
  if (!last) return false
  return (
    last.content.includes('Ich generiere dir gleich drei Bilder') ||
    last.content.includes('Ich generiere dir jetzt erstmal drei Bilder')
  )
}

function previousAssistantAskedForWish(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const last = lastAssistant(history)
  if (!last) return false
  return last.content.includes('Erzähl mir kurz, was dir vorschwebt')
}

function previousAssistantAskedToBuildAfterImages(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const last = lastAssistant(history)
  if (!last) return false
  return last.content.includes('Damit kann ich loslegen. Soll ich jetzt deine Seite bauen?')
}

function previousAssistantAskedWhatToChange(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const last = lastAssistant(history)
  if (!last) return false
  return last.content.includes('Was soll ich noch ändern oder ergänzen')
}

function mentionsImages(text: string): boolean {
  return /\b(bild|bilder|foto|fotos|grafik|illustration|hero|aufnahme|aufnahmen|moodboard|langweilig|tristes?|öde|hässlich|schöner|besser|anders|neue?|andere?)\b/i.test(text)
}

// Catch-all: detect LLM-generated promises that images are being generated. Used
// to rescue old sessions where the model said "Moment, ich generiere die Bilder"
// without the state machine ever triggering generateImagesForBranche.
function previousAssistantPromisedImageGen(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const last = lastAssistant(history)
  if (!last) return false
  // Already inside a managed step → don't double-trigger
  if (last.content.includes('Geht klar, ich generiere dir gerade')) return false
  if (last.content.includes('Damit kann ich loslegen')) return false
  if (last.content.includes(IMAGE_DRAFT_MARKER)) return false
  return /\b(moment[, .!]*\s*ich generiere|ich generiere die bilder|lass mich die bilder generier|gleich erscheinen|werden gerade generiert|ich male dir)\b/i.test(
    last.content
  )
}

function onboardingResumePrompt(stage: OnboardingStage): string {
  if (stage === 'business_info') {
    return 'Damit ich deinen Entwurf starten kann: Was machst du, wie heißt dein Unternehmen und in welcher Stadt bist du?'
  }
  if (stage === 'image_intro') {
    return 'Zurück zu den Bildern: Hast du konkrete Wünsche für die Bildrichtung?'
  }
  if (stage === 'image_wish') {
    return 'Welche Stimmung, Farben oder Motive stellst du dir für die Bilder vor?'
  }
  return 'Soll ich jetzt mit dem ersten Website-Entwurf loslegen?'
}

function onboardingDetourReply(
  text: string,
  stage: OnboardingStage
): { text: string; bookingUrl?: string; quickReplies?: string[] } | null {
  const lower = text.toLowerCase()
  const looksLikeQuestion =
    text.includes('?') ||
    /\b(kann|geht|muss|wie|was|welche|welcher|welches|warum|domain|schrift|farbe|design|kost|preis|shop|buchung|technisch|funktioniert|empfiehlst|empfehlen|empfehlung)\b/i.test(text)
  if (!looksLikeQuestion) return null

  const resume = onboardingResumePrompt(stage)
  const quickReplies = stage === 'image_intro' || stage === 'build_confirm' ? QUICK_REPLIES_JA_NEIN : undefined

  if (/\b(domain|url|webadresse|adresse|de$|\.de|\.com|\.ai)\b/i.test(lower)) {
    return {
      text:
        `Ja, eine eigene Domain ist möglich. Dafür vereinbaren wir am besten kurz einen Beratungstermin, damit sie sauber verbunden wird. Für den Entwurf nutzen wir erst mal eine Romy-Vorschau.\n\n${resume}`,
      bookingUrl: CAL_BOOKING_URL,
      quickReplies,
    }
  }

  if (/\b(schrift|font|typografie|farbe|farben|design|look|stil|wirkt|empfiehlst|empfehlen|modern|edel|hochwertig|minimalistisch)\b/i.test(lower)) {
    return {
      text:
        `Für die meisten lokalen Geschäfte wirkt eine ruhige, gut lesbare Sans-Schrift am besten. Wenn es etwas hochwertiger oder persönlicher wirken soll, nehme ich gern eine elegante Serif-Schrift für Überschriften und eine klare Sans-Schrift für den Rest. Farben würde ich aus deiner Branche und deinem Angebot ableiten, damit es stimmig wirkt.\n\n${resume}`,
      quickReplies,
    }
  }

  if (/\b(technisch|technik|hosting|host|server|einrichten|funktioniert|claude|code|frontend|backend|api)\b/i.test(lower)) {
    return {
      text:
        `Du musst dich um die Technik nicht kümmern. Ich erstelle erst einen Entwurf, den du ansehen kannst, und danach können wir Inhalte, Design, Bilder und Domain in Ruhe sauber machen.\n\n${resume}`,
      quickReplies,
    }
  }

  if (/\b(kost|preis|abo|monat|bezahlen|zahlung|gratis|kostenlos)\b/i.test(lower)) {
    return {
      text:
        `Romy ist gerade noch in der Beta, du kannst also erstmal kostenlos mit einem Entwurf starten. Wenn daraus eine laufend gepflegte Website werden soll, klären wir die Mitgliedschaft danach.\n\n${resume}`,
      quickReplies,
    }
  }

  if (/\b(shop|warenkorb|buchung|terminbuchung|newsletter|mehrsprachig|blog|login)\b/i.test(lower)) {
    return {
      text:
        `Das ist je nach Funktion möglich oder kommt später dazu. Für den ersten Entwurf konzentriere ich mich auf eine klare Startseite mit Angebot, Bildern und Kontakt. Spezialfunktionen können wir danach gemeinsam einplanen.\n\n${resume}`,
      quickReplies,
    }
  }

  return null
}

function extractBusinessDescription(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  // Find the user message that came right after the "Erzähl mir bitte etwas über deine Firma" question.
  for (let i = 0; i < history.length - 1; i++) {
    const m = history[i]
    if (m.role === 'assistant' && m.content.includes('Erzähl mir bitte etwas über deine Firma')) {
      const next = history[i + 1]
      if (next && next.role === 'user') return next.content
    }
  }
  return ''
}


type StreamEvent =
  | {
      type: 'reply'
      text: string
      intent: 'chat' | 'limit'
      degraded?: boolean
      paymentUrl?: string
      bookingUrl?: string
      quickReplies?: string[]
    }
  | { type: 'ack'; text: string }
  | { type: 'final'; text: string; siteUrl?: string; intent: 'build' }
  | { type: 'error'; text: string; error?: string }
  | { type: 'auth_required'; text: string }
  | { type: 'auth_prompt' }

async function runImageGenerationStep(opts: {
  sessionKey: string
  loggedUserMessage: string
  branche: string
  extraPromptHint: string
  emit: (event: StreamEvent) => Promise<void>
}): Promise<void> {
  const { sessionKey, loggedUserMessage, branche, extraPromptHint, emit } = opts

  // Tell the user immediately that generation is starting; long Gemini call follows.
  await emit({ type: 'reply', text: POST_IMAGES_GENERATING, intent: 'chat' })
  await appendTurn(sessionKey, loggedUserMessage, POST_IMAGES_GENERATING).catch(() => {})

  const site = await getOrCreateSite(sessionKey, branche || 'kunde').catch((err) => {
    console.error('runImageGenerationStep: getOrCreateSite failed:', err)
    return null
  })
  if (!site) {
    await emit({ type: 'reply', text: POST_IMAGES_FAILED, intent: 'chat' })
    await appendTurn(sessionKey, '', POST_IMAGES_FAILED).catch(() => {})
    return
  }

  let images: Awaited<ReturnType<typeof generateImagesForBranche>> = []
  try {
    images = await generateImagesForBranche({
      slug: site.slug,
      branche,
      wish: extraPromptHint || undefined,
      count: 3,
    })
  } catch (err) {
    console.error('runImageGenerationStep: generation failed:', err)
  }

  if (images.length === 0) {
    await emit({ type: 'reply', text: POST_IMAGES_FAILED, intent: 'chat' })
    await appendTurn(sessionKey, '', POST_IMAGES_FAILED).catch(() => {})
    return
  }

  // Emit one assistant message per image so the chat renders three picture bubbles.
  // Use the apex preview URL so the picture is reachable before the subdomain
  // is registered (subdomain DNS gets set up only after the first build).
  for (const img of images) {
    const previewUrl = sitePreviewUrl(site.slug, img.storagePath)
    const text = `${IMAGE_DRAFT_MARKER}${previewUrl}]`
    await emit({ type: 'reply', text, intent: 'chat' })
    await appendAssistantOnly(sessionKey, text).catch(() => {})
  }

  // Final question: should I build now?
  const buildAsk = POST_IMAGES_BUILD_QUESTION
  await emit({ type: 'reply', text: buildAsk, intent: 'chat', quickReplies: QUICK_REPLIES_JA_NEIN })
  await appendAssistantOnly(sessionKey, buildAsk).catch(() => {})
}

function streamResponse(
  produce: (emit: (event: StreamEvent) => Promise<void>) => Promise<void>
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const emit = async (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }
      try {
        await produce(emit)
      } catch (err) {
        console.error('chat stream error:', err)
        await emit({
          type: 'error',
          text: 'Entschuldige, beim Erstellen deiner Website ist ein technischer Fehler passiert. Ich habe das Problem an mein Team weitergeleitet. Wir beheben das in Kürze.',
          error: (err as Error).message,
        }).catch(() => {})
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function POST(req: NextRequest) {
  let body: {
    sessionId?: unknown
    message?: unknown
    isOnboarding?: unknown
    imageDataUrl?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = cleanSessionId(body.sessionId)
  const rawText = typeof body.message === 'string' ? body.message.trim() : ''
  // Schutz gegen extrem lange User-Inputs, die den Agent in Timeout treiben können.
  const text = rawText.length > 3000 ? rawText.slice(0, 3000) : rawText
  const isOnboarding = body.isOnboarding === true
  const imageDataUrl =
    typeof body.imageDataUrl === 'string' && body.imageDataUrl.startsWith('data:')
      ? body.imageDataUrl
      : undefined

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }
  if (!text) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 })
  }

  const sessionKey = `web:${sessionId}`

  return streamResponse(async (emit) => {
    // Wenn der User ein Bild mitgeschickt hat, persistieren wir es sofort in
    // Supabase, damit es im Verlauf (DB) auftaucht und nicht nur im lokalen
    // Browser-Cache hängt. Der Sandbox-Build nutzt weiterhin die rohe Data-URL
    // unten — der Upload ist additiv und beeinflusst Build-Logik nicht.
    let loggedUserMessage = text
    if (imageDataUrl) {
      try {
        const siteForUpload = await getOrCreateSite(sessionKey, text)
        const publicUrl = await uploadUserChatImage(siteForUpload.slug, imageDataUrl)
        loggedUserMessage = `${USER_IMAGE_MARKER}${publicUrl}]\n${text}`
      } catch (err) {
        console.error('uploadUserChatImage failed:', err)
      }
    }


    if (isOnboarding) {
      const answer = detectOnboardingAnswer(text)
      if (answer === 'ja' || answer === 'nein') {
        const existingCustomer = await findCustomer(sessionKey).catch(() => null)
        const canReset =
          !existingCustomer ||
          (!hasCompletedFirstBuild(existingCustomer) &&
            !isAuthenticated(existingCustomer) &&
            !existingCustomer.stripe_customer_id)
        if (canReset) {
          await resetSite(sessionKey).catch((err) =>
            console.error('resetSite failed:', err)
          )
          await resetCustomer(sessionKey).catch((err) =>
            console.error('resetCustomer failed:', err)
          )
        }
        const reply = answer === 'ja' ? ONBOARDING_JA_REPLY : ONBOARDING_NEIN_REPLY
        await resetHistory(sessionKey, loggedUserMessage, reply).catch(() => {})
        await emit({ type: 'reply', text: reply, intent: 'chat' })
        return
      }
    }

    const customer = await ensureCustomer(sessionKey).catch((err) => {
      console.error('ensureCustomer failed:', err)
      return null
    })

    if (
      customer &&
      hasCompletedFirstBuild(customer) &&
      !isAuthenticated(customer)
    ) {
      await appendTurn(sessionKey, loggedUserMessage, AUTH_REQUIRED_REPLY).catch(() => {})
      await emit({ type: 'auth_required', text: AUTH_REQUIRED_REPLY })
      return
    }

    const history = await loadHistory(sessionKey)

    if (imageFeatureEnabled()) {
      const imageIntent = detectImageIntent(text, history)
      if (imageIntent.kind !== 'none') {
        let result
        if (imageIntent.kind === 'generate') {
          result = await generateDraftImage({
            sessionKey,
            userMessage: imageIntent.rawPrompt,
            history,
            isIteration: false,
          })
        } else if (imageIntent.kind === 'iterate') {
          result = await generateDraftImage({
            sessionKey,
            userMessage: imageIntent.rawPrompt,
            history,
            isIteration: true,
          })
        } else if (imageIntent.kind === 'confirm') {
          result = confirmDraftImage(history)
        } else {
          result = cancelDraftImage()
        }
        await appendTurn(sessionKey, loggedUserMessage, result.reply).catch(() => {})
        await emit({ type: 'reply', text: result.reply, intent: 'chat' })
        return
      }
    }

    // 2-Schritt-Gate für das Veröffentlichen:
    //   1. User sagt etwas wie "veröffentlichen" → wir antworten mit der
    //      Bestätigungsfrage (PUBLISH_CONFIRMATION_PROMPT). publishSite()
    //      wird NICHT aufgerufen.
    //   2. Nur wenn die letzte Assistant-Nachricht GENAU diese
    //      Bestätigungsfrage war UND der User explizit "Ja, veröffentlichen"
    //      sagt, geht die Seite tatsächlich live.
    {
      const lastAsst = lastAssistant(history)
      const lastWasPublishConfirmation = !!lastAsst?.content.includes(
        PUBLISH_CONFIRMATION_PROMPT
      )

      // Stufe 2: User antwortet gerade auf unsere Bestätigungsfrage
      if (lastWasPublishConfirmation) {
        if (isExplicitPublishYes(text)) {
          const site = await publishSite(sessionKey, {
            userExplicitlyConfirmed: true,
          }).catch((err) => {
            console.error('publishSite failed:', err)
            return null
          })
          const reply = site ? PUBLISH_CONFIRMED_REPLY : PUBLISH_MISSING_DRAFT_REPLY
          const persistedReply = site
            ? `${reply}\n[ROMY_SITE:${sitePublicUrl(site.slug)}]`
            : reply
          await appendTurn(sessionKey, loggedUserMessage, persistedReply).catch(
            () => {}
          )
          await emit({
            type: 'final',
            text: reply,
            siteUrl: site ? sitePublicUrl(site.slug) : undefined,
            intent: 'build',
          })
          return
        }
        // Jede andere Antwort (auch "Ja", "okay", "klar" ohne den expliziten
        // Veröffentlichen-Wortlaut) = kein Publish.
        await appendTurn(sessionKey, loggedUserMessage, PUBLISH_CANCELLED_REPLY).catch(
          () => {}
        )
        await emit({ type: 'reply', text: PUBLISH_CANCELLED_REPLY, intent: 'chat' })
        return
      }

      // Stufe 1: User möchte veröffentlichen → erst Bestätigung einholen,
      // niemals direkt live gehen.
      if (wantsPublish(text)) {
        await appendTurn(
          sessionKey,
          loggedUserMessage,
          PUBLISH_CONFIRMATION_PROMPT
        ).catch(() => {})
        await emit({
          type: 'reply',
          text: PUBLISH_CONFIRMATION_PROMPT,
          intent: 'chat',
          quickReplies: ['Ja, veröffentlichen', 'Nein, lieber nicht'],
        })
        return
      }
    }

    // Q2 just answered → Q3 (image-intro + wish question with Ja/Nein quick-replies)
    if (previousAssistantAskedForBusinessInfo(history)) {
      const detour = onboardingDetourReply(text, 'business_info')
      if (detour) {
        await appendTurn(sessionKey, loggedUserMessage, detour.text).catch(() => {})
        await emit({
          type: 'reply',
          text: detour.text,
          intent: 'chat',
          bookingUrl: detour.bookingUrl,
          quickReplies: detour.quickReplies,
        })
        return
      }
      const reply = IMAGE_INTRO_QUESTION
      await appendTurn(sessionKey, loggedUserMessage, reply).catch(() => {})
      await emit({ type: 'reply', text: reply, intent: 'chat', quickReplies: QUICK_REPLIES_JA_NEIN })
      return
    }

    // Q3 answered → either ask for wish (Ja) or kick off image generation immediately (Nein/other)
    if (previousAssistantAskedAboutImageWishes(history)) {
      const detour = onboardingDetourReply(text, 'image_intro')
      if (detour) {
        await appendTurn(sessionKey, loggedUserMessage, detour.text).catch(() => {})
        await emit({
          type: 'reply',
          text: detour.text,
          intent: 'chat',
          bookingUrl: detour.bookingUrl,
          quickReplies: detour.quickReplies,
        })
        return
      }
      const onbAnswer = detectOnboardingAnswer(text)
      if (onbAnswer === 'ja') {
        await appendTurn(sessionKey, loggedUserMessage, WISH_PROMPT).catch(() => {})
        await emit({ type: 'reply', text: WISH_PROMPT, intent: 'chat' })
        return
      }
      // Nein → generate from business description. Free text here is a concrete wish.
      const branche = extractBusinessDescription(history) || text
      await runImageGenerationStep({
        sessionKey,
        loggedUserMessage,
        branche,
        extraPromptHint: onbAnswer === 'nein' ? '' : text,
        emit,
      })
      return
    }

    // User typed their concrete wish → generate images using description + wish
    if (previousAssistantAskedForWish(history)) {
      const detour = onboardingDetourReply(text, 'image_wish')
      if (detour) {
        await appendTurn(sessionKey, loggedUserMessage, detour.text).catch(() => {})
        await emit({
          type: 'reply',
          text: detour.text,
          intent: 'chat',
          bookingUrl: detour.bookingUrl,
          quickReplies: detour.quickReplies,
        })
        return
      }
      const branche = extractBusinessDescription(history) || text
      await runImageGenerationStep({
        sessionKey,
        loggedUserMessage,
        branche,
        extraPromptHint: text,
        emit,
      })
      return
    }

    // After "Kein Problem. Was soll ich noch ändern oder ergänzen?",
    // detect if the customer is complaining about images and redirect to the wish prompt
    // so the next message triggers a fresh image generation round.
    if (previousAssistantAskedWhatToChange(history)) {
      if (mentionsImages(text)) {
        await appendTurn(sessionKey, loggedUserMessage, WISH_PROMPT).catch(() => {})
        await emit({ type: 'reply', text: WISH_PROMPT, intent: 'chat' })
        return
      }
      // Non-image modification → treat as additional build instructions
    }

    // Catch-all: LLM promised image generation (free-form, outside state machine)
    // and the customer is now waiting for those images. Run the real generator.
    if (previousAssistantPromisedImageGen(history)) {
      const branche = extractBusinessDescription(history) || text
      await runImageGenerationStep({
        sessionKey,
        loggedUserMessage,
        branche,
        extraPromptHint: text,
        emit,
      })
      return
    }

    // After images shown, Romy asked "Soll ich jetzt deine Seite bauen?"
    let routed: Awaited<ReturnType<typeof routeMessage>>
    if (previousAssistantAskedToBuildAfterImages(history)) {
      const detour = onboardingDetourReply(text, 'build_confirm')
      if (detour) {
        await appendTurn(sessionKey, loggedUserMessage, detour.text).catch(() => {})
        await emit({
          type: 'reply',
          text: detour.text,
          intent: 'chat',
          bookingUrl: detour.bookingUrl,
          quickReplies: detour.quickReplies,
        })
        return
      }
      const onbAnswer = detectOnboardingAnswer(text)
      if (onbAnswer === 'ja') {
        routed = { intent: 'build', classify_ms: 0 }
      } else if (onbAnswer === 'nein') {
        const reply =
          'Kein Problem. Was soll ich noch ändern oder ergänzen, bevor ich loslege?'
        await appendTurn(sessionKey, loggedUserMessage, reply).catch(() => {})
        await emit({ type: 'reply', text: reply, intent: 'chat' })
        return
      } else if (mentionsImages(text)) {
        const branche = extractBusinessDescription(history) || text
        await runImageGenerationStep({
          sessionKey,
          loggedUserMessage,
          branche,
          extraPromptHint: text,
          emit,
        })
        return
      } else {
        // Treat free-text as additional instructions → still build, the message becomes the build prompt
        routed = { intent: 'build', classify_ms: 0 }
      }
    } else {
      try {
        routed = await routeMessage(history, text, !!imageDataUrl)
      } catch (err) {
        console.error('routeMessage failed:', err)
        if (heuristicBuildIntent(text, history)) {
          routed = { intent: 'build', classify_ms: 0 }
        } else {
          const reply = fallbackReply(text)
          await appendTurn(sessionKey, loggedUserMessage, reply).catch(() => {})
          await emit({ type: 'reply', text: reply, intent: 'chat', degraded: true })
          return
        }
      }
    }

    if (routed.intent === 'chat') {
      const reply =
        sanitizeReply(routed.chat_reply || '') ||
        'Sag mir einfach, was ich für deine Seite machen soll.'
      await appendTurn(sessionKey, loggedUserMessage, reply).catch(() => {})
      await emit({ type: 'reply', text: reply, intent: 'chat' })
      return
    }

    const buildContext = [
      ...history.slice(-8).map((m) => m.content),
      text,
    ].join('\n')
    const site = await getOrCreateSite(sessionKey, buildContext)

    if ((site.builds_used ?? 0) >= FREE_BUILD_LIMIT && !site.paid) {
      const limit = buildLimitMessage(sessionKey)
      if (!site.callback_requested_at) {
        await markCallbackRequested(sessionKey).catch((err) =>
          console.error('markCallbackRequested failed:', err)
        )
      }
      await appendTurn(sessionKey, loggedUserMessage, limit.text).catch(() => {})
      await emit({
        type: 'reply',
        text: limit.text,
        intent: 'limit',
        paymentUrl: limit.paymentUrl,
        bookingUrl: limit.bookingUrl,
      })
      return
    }

    const isFirstBuild = !site.last_sandbox_id
    const ack = isFirstBuild ? ACK_FIRST_DIRECT : ACK_FOLLOWUP
    await emit({ type: 'ack', text: ack })

    const buildStart = Date.now()
    const BUILD_TIMEOUT_MS = 295_000
    let coderResult: Awaited<ReturnType<typeof runRomyCoder>> | null = null
    let timedOut = false

    try {
      coderResult = await Promise.race([
        runRomyCoder({
          slug: site.slug,
          userMessage: text,
          history,
          isFirstBuild,
          imageUrl: imageDataUrl,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            timedOut = true
            reject(new Error(`build_timeout_${BUILD_TIMEOUT_MS}ms`))
          }, BUILD_TIMEOUT_MS)
        ),
      ])
    } catch (err) {
      await logBuild({
        phone: sessionKey,
        slug: site.slug,
        ok: false,
        cost_usd: null,
        duration_ms: Date.now() - buildStart,
        was_warm: !isFirstBuild,
        user_message: text,
        error_step: timedOut ? 'build_timeout' : 'build_exception',
        error_msg: (err as Error).message,
      }).catch((logErr) => console.error('logBuild (timeout) failed:', logErr))

      const reply = timedOut
        ? 'Entschuldige, der Build hat zu lange gedauert und wurde automatisch gestoppt. Ich habe das Problem an mein Team weitergeleitet. Wir beheben das in Kürze.'
        : 'Entschuldige, beim Erstellen deiner Website ist ein technischer Fehler passiert. Ich habe das Problem an mein Team weitergeleitet. Wir beheben das in Kürze.'
      await appendTurn(sessionKey, loggedUserMessage, reply).catch(() => {})
      await emit({ type: 'error', text: reply, error: (err as Error).message })
      return
    }

    await logBuild({
      phone: sessionKey,
      slug: site.slug,
      ok: coderResult.ok,
      cost_usd: coderResult.cost_usd,
      duration_ms: coderResult.duration_ms,
      was_warm: coderResult.was_warm,
      user_message: text,
      error_step: coderResult.ok ? null : (coderResult.error_step ?? 'coder_returned_not_ok'),
      error_msg: coderResult.ok ? null : (coderResult.error ?? null),
    }).catch((err) => console.error('logBuild failed:', err))

    if (coderResult.ok) {
      const indexHtml = await downloadSiteFile(site.slug, 'index.html').catch((err) => {
        console.error('downloadSiteFile index.html after build failed:', err)
        return null
      })
      if (!indexHtml) {
        const failureReply =
          'Tut mir leid, da ist gerade etwas schiefgelaufen. Ich leite das an mein Team weiter.'
        await appendTurn(sessionKey, loggedUserMessage, failureReply).catch(() => {})
        await emit({
          type: 'error',
          text: failureReply,
          error: 'build_missing_index_html',
        })
        return
      }
      if (coderResult.sandbox_id) {
        await updateSiteSandboxId(sessionKey, coderResult.sandbox_id).catch(() => {})
      }
      await incrementBuildCount(sessionKey).catch((err) =>
        console.error('incrementBuildCount failed:', err)
      )
      if (isFirstBuild) {
        await markFirstBuild(sessionKey).catch((err) =>
          console.error('markFirstBuild failed:', err)
        )
      }
      const bodyText = stripUrlsAndLiveWording(
        sanitizeReply(coderResult.reply || 'Fertig.'),
        isFirstBuild
      )
      const publishHint = isFirstBuild
        ? 'Das ist erstmal nur dein Entwurf. Wenn du zufrieden bist, schreib: veröffentlichen. Dann schalte ich ihn online.'
        : ''
      const imageFollowUp = isFirstBuild ? POST_BUILD_IMAGE_QUESTION : ''
      const reply = [bodyText, imageFollowUp, publishHint]
        .filter(Boolean)
        .join('\n\n')
      const previewUrl = sitePreviewUrl(site.slug)
      const persistedReply = `${reply}\n[ROMY_SITE:${previewUrl}]`
      await appendTurn(sessionKey, loggedUserMessage, persistedReply).catch(() => {})
      await emit({
        type: 'final',
        text: reply,
        siteUrl: previewUrl,
        intent: 'build',
      })
      return
    }

    const failureReply =
      'Tut mir leid, da ist gerade etwas schiefgelaufen. Ich leite das an mein Team weiter.'
    await appendTurn(sessionKey, loggedUserMessage, failureReply).catch(() => {})
    await emit({ type: 'error', text: failureReply, error: coderResult.error })
  })
}

export async function GET(req: NextRequest) {
  const sessionId = cleanSessionId(req.nextUrl.searchParams.get('sessionId'))
  if (!sessionId) {
    return NextResponse.json({ messages: [] })
  }

  const messages = await loadHistory(`web:${sessionId}`).catch((err) => {
    console.error('loadHistory failed:', err)
    return []
  })

  return NextResponse.json({ messages })
}
