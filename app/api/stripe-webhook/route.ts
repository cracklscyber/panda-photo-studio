import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { setPaid } from '@/lib/romy-sites'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function verifyStripeSignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string
): boolean {
  if (!sigHeader) return false
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=')
      return [k, v]
    })
  )
  const timestamp = parts.t
  const v1 = parts.v1
  if (!timestamp || !v1) return false

  const ageSec = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (ageSec > 300) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }

  const rawBody = await req.text()
  const sigHeader = req.headers.get('stripe-signature')

  if (!verifyStripeSignature(rawBody, sigHeader, secret)) {
    console.error('stripe signature verify failed')
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'invoice.paid'
  ) {
    const obj = event.data?.object || {}
    const phone =
      (obj.client_reference_id as string | undefined) ||
      ((obj.metadata as Record<string, string> | undefined)?.client_reference_id)

    if (!phone) {
      console.warn('stripe webhook: no client_reference_id', { type: event.type })
      return NextResponse.json({ received: true, note: 'no phone ref' })
    }

    try {
      await setPaid(phone, true)
      console.log('stripe paid set for phone', phone, 'event', event.type)
    } catch (err) {
      console.error('setPaid failed:', err)
      return NextResponse.json({ error: 'db update failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
