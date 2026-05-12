import { NextRequest, NextResponse } from 'next/server'
import { routeMessage } from '@/lib/romy-router'
import { runRomyCoder, sanitizeReply } from '@/lib/romy-coder'
import { ensureVercelSubdomain } from '@/lib/vercel-domains'
import {
  getOrCreateSite,
  updateSiteSandboxId,
  incrementBuildCount,
  markCallbackRequested,
  resetSite,
  publishSite,
  FREE_BUILD_LIMIT,
} from '@/lib/romy-sites'
import { sitePublicUrl } from '@/lib/supabase-storage'
import { loadHistory, appendTurn, resetHistory } from '@/lib/romy-chat'
import { logBuild } from '@/lib/romy-costs'
import {
  detectImageIntent,
  isFeatureEnabled as imageFeatureEnabled,
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

const POST_FIRST_BUILD_AUTH_REPLY =
  'Wenn du mit diesem Entwurf weitermachen willst, lege bitte jetzt dein kostenloses Kundenkonto an. Dann bleiben dein Chatverlauf, deine Entwürfe und deine Website gespeichert.'

const ONBOARDING_JA_REPLY =
  [
    'Alles klar, dann legen wir los. Erzähl mir kurz und knapp über dich und dein Unternehmen:',
    '',
    '· Was machst du?',
    '· Wie heißt deine Firma?',
    '· Wo bist du?',
    '',
    'Erstmal nur Infos zum Unternehmen, keine Bilder schicken. Im nächsten Schritt frag ich nach dem Design.',
  ].join('\n')
const ONBOARDING_NEIN_REPLY =
  'Alles klar, melde dich einfach wenn du soweit bist.'
const DESIGN_QUESTION_REPLY =
  'Super. Jetzt noch grob zum Look: Wie soll die Seite wirken? Eher modern, klassisch, verspielt oder minimal? Beschreib es einfach in eigenen Worten.'
const POST_BUILD_IMAGE_QUESTION =
  'Möchtest du zusammen mit mir Bilder generieren oder hast du bereits eigene? Schick sie mir einfach rein.'

const PUBLISH_MISSING_DRAFT_REPLY =
  'Ich habe noch keinen Entwurf, den ich veröffentlichen kann. Schick mir zuerst einen Link oder erzähl mir kurz, was ich bauen soll.'

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
    'Wir haben jetzt schon einiges zusammen gebaut. Deine Seite bleibt erhalten.',
    '',
    'Wenn du weiter mit mir Änderungen vornehmen möchtest, schließ einfach deine Mitgliedschaft ab. 29 € im Monat, jederzeit kündbar.',
    '',
    'Lieber vorher kurz sprechen? Wir können auch einen kostenlosen Termin vereinbaren.',
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
  if (previousAssistantAskedForDesign(history)) return true
  return /\b(bau|baue|bauen|erstell|erstelle|machen|mach|änder|ändere|aendere|update|aktualisier|aktualisiere|füg|fueg|hinzu|lösch|loesch|entfern|design|farbe|schrift|öffnungszeit|oeffnungszeit|adresse|kontakt|preis|leistung|seite|website|webseite|homepage)\b/i.test(lower)
}

function wantsPublish(text: string): boolean {
  return /\b(veroeffentlichen|veröffentlichen|live schalten|online stellen|freigeben|seite live|go live)\b/i.test(text)
}

function previousAssistantAskedForBusinessInfo(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant')
  if (!lastAssistant) return false
  return lastAssistant.content.includes('Erstmal nur Infos zum Unternehmen')
}

function previousAssistantAskedForDesign(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant')
  if (!lastAssistant) return false
  return lastAssistant.content.includes('Jetzt noch grob zum Look')
}


type StreamEvent =
  | {
      type: 'reply'
      text: string
      intent: 'chat' | 'limit'
      degraded?: boolean
      paymentUrl?: string
      bookingUrl?: string
    }
  | { type: 'ack'; text: string }
  | { type: 'final'; text: string; siteUrl?: string; intent: 'build' }
  | { type: 'error'; text: string; error?: string }
  | { type: 'auth_required'; text: string }
  | { type: 'auth_prompt' }

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
        await resetHistory(sessionKey, text, reply).catch(() => {})
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
      await appendTurn(sessionKey, text, AUTH_REQUIRED_REPLY).catch(() => {})
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
        await appendTurn(sessionKey, text, result.reply).catch(() => {})
        await emit({ type: 'reply', text: result.reply, intent: 'chat' })
        return
      }
    }

    if (wantsPublish(text)) {
      const site = await publishSite(sessionKey).catch((err) => {
        console.error('publishSite failed:', err)
        return null
      })
      const reply = site
        ? `Alles klar, ich habe deinen Entwurf veröffentlicht.\n\n${sitePublicUrl(site.slug)}`
        : PUBLISH_MISSING_DRAFT_REPLY
      await appendTurn(sessionKey, text, reply).catch(() => {})
      await emit({
        type: 'final',
        text: reply,
        siteUrl: site ? sitePublicUrl(site.slug) : undefined,
        intent: 'build',
      })
      return
    }

    if (previousAssistantAskedForBusinessInfo(history)) {
      await appendTurn(sessionKey, text, DESIGN_QUESTION_REPLY).catch(() => {})
      await emit({ type: 'reply', text: DESIGN_QUESTION_REPLY, intent: 'chat' })
      return
    }

    let routed: Awaited<ReturnType<typeof routeMessage>>
    if (previousAssistantAskedForDesign(history)) {
      routed = { intent: 'build', classify_ms: 0 }
    } else {
      try {
        routed = await routeMessage(history, text, !!imageDataUrl)
      } catch (err) {
        console.error('routeMessage failed:', err)
        if (heuristicBuildIntent(text, history)) {
          routed = { intent: 'build', classify_ms: 0 }
        } else {
          const reply = fallbackReply(text)
          await appendTurn(sessionKey, text, reply).catch(() => {})
          await emit({ type: 'reply', text: reply, intent: 'chat', degraded: true })
          return
        }
      }
    }

    if (routed.intent === 'chat') {
      const reply =
        sanitizeReply(routed.chat_reply || '') ||
        'Sag mir einfach, was ich für deine Seite machen soll.'
      await appendTurn(sessionKey, text, reply).catch(() => {})
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
      await appendTurn(sessionKey, text, limit.text).catch(() => {})
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
      await appendTurn(sessionKey, text, reply).catch(() => {})
      await emit({ type: 'error', text: reply, error: (err as Error).message })
      return
    }

    if (coderResult.sandbox_id) {
      await updateSiteSandboxId(sessionKey, coderResult.sandbox_id).catch(() => {})
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
      await ensureVercelSubdomain(site.slug).catch((err) =>
        console.error('ensureVercelSubdomain failed:', err)
      )
      await incrementBuildCount(sessionKey).catch((err) =>
        console.error('incrementBuildCount failed:', err)
      )
      if (isFirstBuild) {
        await markFirstBuild(sessionKey).catch((err) =>
          console.error('markFirstBuild failed:', err)
        )
      }
      const bodyText = sanitizeReply(coderResult.reply || 'Fertig.')
      const shouldPromptForAccount = isFirstBuild && (!customer || !isAuthenticated(customer))
      const publishHint = isFirstBuild
        ? 'Das ist erstmal nur dein Entwurf. Wenn du zufrieden bist, schreib: veröffentlichen. Dann schalte ich die Seite live.'
        : ''
      const imageFollowUp = isFirstBuild ? POST_BUILD_IMAGE_QUESTION : ''
      const reply = [
        `${bodyText}\n\n${coderResult.site_url}`,
        imageFollowUp,
        publishHint,
        shouldPromptForAccount ? POST_FIRST_BUILD_AUTH_REPLY : '',
      ]
        .filter(Boolean)
        .join('\n\n')
      await appendTurn(sessionKey, text, reply).catch(() => {})
      await emit({
        type: 'final',
        text: reply,
        siteUrl: coderResult.site_url,
        intent: 'build',
      })
      if (shouldPromptForAccount) {
        await emit({ type: 'auth_prompt' })
      }
      return
    }

    const failureReply =
      'Tut mir leid, da ist gerade etwas schiefgelaufen. Ich leite das an mein Team weiter.'
    await appendTurn(sessionKey, text, failureReply).catch(() => {})
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
