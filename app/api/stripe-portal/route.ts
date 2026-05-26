import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { findCustomer } from '@/lib/romy-customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function cleanSessionId(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Stripe nicht konfiguriert.' }, { status: 500 })
  }

  let body: { sessionId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = cleanSessionId(body.sessionId)
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  const sessionKey = `web:${sessionId}`
  const customer = await findCustomer(sessionKey)
  if (!customer?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          'Du hast noch kein aktives Abo, das du verwalten könntest. Sobald du eines abgeschlossen hast, findest du das Abo-Center hier.',
      },
      { status: 404 }
    )
  }

  const stripe = new Stripe(secret)
  const origin = req.headers.get('origin') || 'https://halloluna.net'

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${origin}/`,
    })
    return NextResponse.json({ url: portal.url })
  } catch (err) {
    console.error('billingPortal session create failed:', err)
    return NextResponse.json(
      { error: 'Konnte das Abo-Center gerade nicht öffnen.' },
      { status: 500 }
    )
  }
}
