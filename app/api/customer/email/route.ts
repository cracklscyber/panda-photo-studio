import { NextRequest, NextResponse } from 'next/server'
import { ensureCustomer, setCustomerEmail } from '@/lib/romy-customers'

export const dynamic = 'force-dynamic'

function cleanSessionId(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
}

export async function POST(req: NextRequest) {
  let body: { sessionId?: unknown; email?: unknown; name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = cleanSessionId(body.sessionId)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : null

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 })
  }

  const sessionKey = `web:${sessionId}`
  await ensureCustomer(sessionKey)
  await setCustomerEmail(sessionKey, email, name)

  return NextResponse.json({ ok: true })
}
